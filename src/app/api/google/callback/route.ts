import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const dentistName = searchParams.get('state'); // Recupera o dentista do state

        if (!code || !dentistName) {
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/calendar?error=auth_failed`
            );
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            `${process.env.NEXT_PUBLIC_APP_URL}/api/google/callback`
        );

        // Trocar o código por tokens
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Buscar o calendário principal do usuário
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        const calendarList = await calendar.calendarList.list();
        const primaryCalendar = calendarList.data.items?.find(cal => cal.primary);

        if (!primaryCalendar) {
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/calendar?error=no_calendar`
            );
        }

        // Salvar tokens no banco de dados
        // Usando lógica manual de upsert para maior robustez e melhor tratamento de erro
        const { data: existingToken } = await supabaseAdmin
            .from('google_calendar_tokens')
            .select('id')
            .eq('dentist_name', dentistName)
            .single();

        let saveError;
        if (existingToken) {
            const { error } = await supabaseAdmin
                .from('google_calendar_tokens')
                .update({
                    access_token: tokens.access_token!,
                    refresh_token: tokens.refresh_token || undefined, // Só atualiza refresh se vier um novo
                    token_expiry: new Date(tokens.expiry_date!).toISOString(),
                    calendar_id: primaryCalendar.id!,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existingToken.id);
            saveError = error;
        } else {
            const { error } = await supabaseAdmin
                .from('google_calendar_tokens')
                .insert({
                    dentist_name: dentistName,
                    access_token: tokens.access_token!,
                    refresh_token: tokens.refresh_token!,
                    token_expiry: new Date(tokens.expiry_date!).toISOString(),
                    calendar_id: primaryCalendar.id!,
                });
            saveError = error;
        }

        if (saveError) {
            console.error('Error saving Google tokens:', saveError);
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/calendar?error=save_failed&details=${encodeURIComponent(saveError.message)}`
            );
        }

        // Redirecionar de volta para o calendário com sucesso
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/calendar?google_connected=true&dentist=${encodeURIComponent(dentistName)}`
        );
    } catch (error) {
        console.error('Error in Google OAuth callback:', error);
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/calendar?error=callback_failed`
        );
    }
}
