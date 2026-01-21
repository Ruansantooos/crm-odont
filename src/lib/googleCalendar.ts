import { google } from 'googleapis';
import { supabaseAdmin } from './supabase';

export interface GoogleCalendarToken {
    access_token: string;
    refresh_token: string;
    token_expiry: string;
    calendar_id: string;
}

export interface CalendarEvent {
    id?: string;
    summary: string;
    description?: string;
    start: {
        dateTime: string;
        timeZone: string;
    };
    end: {
        dateTime: string;
        timeZone: string;
    };
    attendees?: Array<{ email: string }>;
}

/**
 * Cria um cliente OAuth2 autenticado
 */
export async function getAuthClient(dentistName: string) {
    const { data: tokenData, error } = await supabaseAdmin
        .from('google_calendar_tokens')
        .select('*')
        .eq('dentist_name', dentistName)
        .single();

    if (error || !tokenData) {
        throw new Error('Dentista não conectado ao Google Calendar');
    }

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXT_PUBLIC_APP_URL}/api/google/callback`
    );

    oauth2Client.setCredentials({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expiry_date: new Date(tokenData.token_expiry).getTime(),
    });

    // Verificar se o token expirou e renovar se necessário
    const tokenInfo = await oauth2Client.getAccessToken();
    if (tokenInfo.token !== tokenData.access_token) {
        // Token foi renovado, atualizar no banco
        await supabaseAdmin
            .from('google_calendar_tokens')
            .update({
                access_token: tokenInfo.token!,
                token_expiry: new Date(oauth2Client.credentials.expiry_date!).toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('dentist_name', dentistName);
    }

    return { oauth2Client, calendarId: tokenData.calendar_id };
}

/**
 * Cria um evento no Google Calendar
 */
export async function createGoogleEvent(
    dentistName: string,
    event: CalendarEvent
): Promise<string> {
    const { oauth2Client, calendarId } = await getAuthClient(dentistName);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const response = await calendar.events.insert({
        calendarId,
        requestBody: event,
    });

    return response.data.id!;
}

/**
 * Atualiza um evento no Google Calendar
 */
export async function updateGoogleEvent(
    dentistName: string,
    eventId: string,
    event: CalendarEvent
): Promise<void> {
    const { oauth2Client, calendarId } = await getAuthClient(dentistName);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.update({
        calendarId,
        eventId,
        requestBody: event,
    });
}

/**
 * Deleta um evento no Google Calendar
 */
export async function deleteGoogleEvent(
    dentistName: string,
    eventId: string
): Promise<void> {
    const { oauth2Client, calendarId } = await getAuthClient(dentistName);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.delete({
        calendarId,
        eventId,
    });
}

/**
 * Busca eventos do Google Calendar criados após uma data
 */
export async function fetchGoogleEvents(
    dentistName: string,
    since?: Date
): Promise<any[]> {
    const { oauth2Client, calendarId } = await getAuthClient(dentistName);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const response = await calendar.events.list({
        calendarId,
        timeMin: since?.toISOString() || new Date().toISOString(),
        maxResults: 100,
        singleEvents: true,
        orderBy: 'startTime',
    });

    return response.data.items || [];
}

/**
 * Verifica se um dentista está conectado ao Google Calendar
 */
export async function isConnectedToGoogle(dentistName: string): Promise<boolean> {
    const { data } = await supabaseAdmin
        .from('google_calendar_tokens')
        .select('id')
        .eq('dentist_name', dentistName)
        .single();

    return !!data;
}

/**
 * Desconecta um dentista do Google Calendar
 */
export async function disconnectGoogleCalendar(dentistName: string): Promise<void> {
    await supabaseAdmin
        .from('google_calendar_tokens')
        .delete()
        .eq('dentist_name', dentistName);
}

/**
 * Converte um appointment para o formato de evento do Google Calendar
 */
export function appointmentToGoogleEvent(appointment: any): CalendarEvent {
    const statusMap: Record<string, string> = {
        'scheduled': 'Agendado',
        'confirmed': 'Confirmado',
        'completed': 'Concluído',
        'cancelled': 'Cancelado',
        'no_show': 'Faltou'
    };

    const statusLabel = statusMap[appointment.status] || appointment.status || 'Agendado';

    return {
        summary: `${appointment.type} - ${appointment.patient?.name || 'Paciente'}`,
        description: `Status: ${statusLabel}\n\n${appointment.notes || ''}`.trim(),
        start: {
            dateTime: appointment.start_time,
            timeZone: 'America/Sao_Paulo',
        },
        end: {
            dateTime: appointment.end_time,
            timeZone: 'America/Sao_Paulo',
        },
    };
}
