import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('google_calendar_tokens')
            .select('dentist_name');

        if (error) throw error;

        const connectedDentists = data.map(item => item.dentist_name);

        return NextResponse.json({ connectedDentists });
    } catch (error) {
        console.error('Error fetching connected dentists:', error);
        return NextResponse.json(
            { error: 'Failed to fetch connected dentists' },
            { status: 500 }
        );
    }
}
