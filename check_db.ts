
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('Checking database...');

    // 1. Check Google Calendar Tokens
    const { data: tokens, error: tokensError } = await supabase
        .from('google_calendar_tokens')
        .select('*');

    if (tokensError) {
        console.error('Error fetching tokens:', tokensError);
    } else {
        console.log('--- Google Calendar Tokens ---');
        tokens.forEach(t => {
            console.log(`Dentist: "${t.dentist_name}", Calendar ID: ${t.calendar_id}`);
        });
    }

    // 2. Check Dentists in Appointments
    const { data: dentistNames, error: dentistError } = await supabase
        .from('appointments')
        .select('dentist_name')
        .distinct(); // Wait, Supabase JS doesn't have .distinct() like this, use select then unique

    const { data: appointments, error: appError } = await supabase
        .from('appointments')
        .select('dentist_name');

    if (appError) {
        console.error('Error fetching appointments:', appError);
    } else {
        const uniqueDentists = Array.from(new Set(appointments.map(a => a.dentist_name)));
        console.log('\n--- Unique Dentists in Appointments ---');
        uniqueDentists.forEach(d => console.log(`"${d}"`));
    }

    // 3. Check Sync Stats
    const { data: syncData, error: syncError } = await supabase
        .from('appointment_google_sync')
        .select('google_event_id, last_synced_at');

    if (syncError) {
        console.error('Error fetching sync data:', syncError);
    } else {
        console.log(`\nTotal synced appointments: ${syncData.length}`);
    }
}

check();
