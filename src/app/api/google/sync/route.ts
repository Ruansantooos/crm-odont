import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
    createGoogleEvent,
    updateGoogleEvent,
    deleteGoogleEvent,
    fetchGoogleEvents,
    appointmentToGoogleEvent,
} from '@/lib/googleCalendar';

/**
 * POST: Sincronizar um appointment para o Google Calendar
 */
export async function POST(request: Request) {
    try {
        const { appointmentId, action } = await request.json();

        if (!appointmentId) {
            return NextResponse.json(
                { error: 'Appointment ID is required' },
                { status: 400 }
            );
        }

        // Buscar o appointment com dados do paciente
        const { data: appointment, error: fetchError } = await supabaseAdmin
            .from('appointments')
            .select('*, patient:patients(name)')
            .eq('id', appointmentId)
            .single();

        if (fetchError || !appointment) {
            console.error(`[Sync] Appointment ${appointmentId} not found:`, fetchError);
            return NextResponse.json(
                { error: 'Appointment not found' },
                { status: 404 }
            );
        }

        const dentistName = appointment.dentist_name;
        console.log(`[Sync] Starting sync for appointment ${appointmentId} (Dentist: ${dentistName}, Action: ${action || 'upsert'})`);

        // Safety check for empty time range
        let startTime = appointment.start_time;
        let endTime = appointment.end_time;

        if (startTime === endTime) {
            console.warn(`[Sync] Start and end time are identical (${startTime}). Adding 30min duration fallback.`);
            const start = new Date(startTime);
            const end = new Date(start.getTime() + 30 * 60000); // +30 minutes
            endTime = end.toISOString();
        }

        // Verificar se já existe sincronização
        const { data: existingSync } = await supabaseAdmin
            .from('appointment_google_sync')
            .select('google_event_id')
            .eq('appointment_id', appointmentId)
            .single();

        if (action === 'delete' && existingSync) {
            console.log(`[Sync] Deleting event ${existingSync.google_event_id} from Google Calendar`);
            // Deletar do Google Calendar
            await deleteGoogleEvent(dentistName, existingSync.google_event_id);

            // Remover do mapeamento
            await supabaseAdmin
                .from('appointment_google_sync')
                .delete()
                .eq('appointment_id', appointmentId);

            return NextResponse.json({ success: true, action: 'deleted' });
        }

        const googleEvent = appointmentToGoogleEvent({
            ...appointment,
            start_time: startTime,
            end_time: endTime
        });

        if (existingSync) {
            console.log(`[Sync] Updating existing event ${existingSync.google_event_id}`);
            // Atualizar evento existente
            await updateGoogleEvent(dentistName, existingSync.google_event_id, googleEvent);

            // Atualizar timestamp de sincronização
            await supabaseAdmin
                .from('appointment_google_sync')
                .update({ last_synced_at: new Date().toISOString() })
                .eq('appointment_id', appointmentId);

            return NextResponse.json({
                success: true,
                action: 'updated',
                eventId: existingSync.google_event_id
            });
        } else {
            console.log(`[Sync] Creating new event in Google Calendar`);
            // Criar novo evento
            const eventId = await createGoogleEvent(dentistName, googleEvent);

            // Salvar mapeamento
            await supabaseAdmin
                .from('appointment_google_sync')
                .insert({
                    appointment_id: appointmentId,
                    google_event_id: eventId,
                    last_synced_at: new Date().toISOString(),
                });

            return NextResponse.json({
                success: true,
                action: 'created',
                eventId
            });
        }
    } catch (error: any) {
        console.error('[Sync] Error syncing to Google Calendar:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to sync with Google Calendar' },
            { status: 500 }
        );
    }
}

/**
 * GET: Buscar eventos do Google Calendar e sincronizar com o banco
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const dentistName = searchParams.get('dentist');

        if (!dentistName) {
            return NextResponse.json(
                { error: 'Dentist name is required' },
                { status: 400 }
            );
        }

        // Buscar/Criar o paciente "Agenda Google" para eventos externos
        let { data: googlePatient } = await supabaseAdmin
            .from('patients')
            .select('id')
            .eq('name', 'Agenda Google')
            .single();

        if (!googlePatient) {
            const { data: newPatient, error: createError } = await supabaseAdmin
                .from('patients')
                .insert({ name: 'Agenda Google' })
                .select('id')
                .single();

            if (createError) throw createError;
            googlePatient = newPatient;
        }

        // Buscar eventos do Google Calendar: 7 dias atrás e 60 dias à frente
        const timeMin = new Date();
        timeMin.setDate(timeMin.getDate() - 7);

        const events = await fetchGoogleEvents(dentistName, timeMin);

        const syncedEvents = [];
        const errors = [];

        for (const event of events) {
            try {
                if (!event.start?.dateTime || !event.end?.dateTime) continue;

                // Verificar se já existe no mapeamento de sincronização
                const { data: existingSync } = await supabaseAdmin
                    .from('appointment_google_sync')
                    .select('appointment_id')
                    .eq('google_event_id', event.id)
                    .single();

                if (!existingSync) {
                    // Criar novo appointment
                    const { data: newAppointment, error: appError } = await supabaseAdmin
                        .from('appointments')
                        .insert({
                            patient_id: googlePatient.id,
                            dentist_name: dentistName,
                            start_time: event.start.dateTime,
                            end_time: event.end.dateTime,
                            type: 'Consulta Google',
                            status: 'confirmed',
                            notes: event.summary || 'Evento importado do Google'
                        })
                        .select('id')
                        .single();

                    if (appError) throw appError;

                    // Salvar mapeamento
                    await supabaseAdmin
                        .from('appointment_google_sync')
                        .insert({
                            appointment_id: newAppointment.id,
                            google_event_id: event.id,
                            last_synced_at: new Date().toISOString(),
                        });

                    syncedEvents.push({
                        id: event.id,
                        summary: event.summary,
                        appointment_id: newAppointment.id
                    });
                }
            } catch (err: any) {
                console.error(`Error syncing event ${event.id}:`, err);
                errors.push({ id: event.id, error: err.message });
            }
        }

        return NextResponse.json({
            success: true,
            syncedCount: syncedEvents.length,
            newEvents: syncedEvents.length,
            syncedEvents,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error: any) {
        console.error('Error fetching from Google Calendar:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch from Google Calendar' },
            { status: 500 }
        );
    }
}
