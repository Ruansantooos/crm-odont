
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Portably read .env.local
const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

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
        console.log(`\nTotal synced appointments (mapping table entries): ${syncData.length}`);
    }

    // 4. Check for un-synced appointments for dentists who ARE connected
    const connectedDentists = tokens ? tokens.map(t => t.dentist_name) : [];
    if (connectedDentists.length > 0) {
        console.log('\n--- Un-synced Appointments for Connected Dentists ---');
        for (const d of connectedDentists) {
            const { data: apps, error: e } = await supabase
                .from('appointments')
                .select('id, patient_id, dentist_name, start_time')
                .eq('dentist_name', d);

            if (apps) {
                const { data: syncs } = await supabase
                    .from('appointment_google_sync')
                    .select('appointment_id');

                const syncedIds = new Set(syncs.map(s => s.appointment_id));
                const unsynced = apps.filter(a => !syncedIds.has(a.id));

                console.log(`Dentist "${d}": ${unsynced.length} unsynced appointments out of ${apps.length} total.`);
                if (unsynced.length > 0) {
                    unsynced.slice(0, 5).forEach(a => console.log(`  - App ID: ${a.id}, Start: ${a.start_time}`));
                }
            }
        }
    }
}

check();
