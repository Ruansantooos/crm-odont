import { NextResponse } from 'next/server';
import { isConnectedToGoogle } from '@/lib/googleCalendar';

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

        const connected = await isConnectedToGoogle(dentistName);

        return NextResponse.json({ connected });
    } catch (error) {
        console.error('Error checking Google Calendar status:', error);
        return NextResponse.json(
            { error: 'Failed to check connection status' },
            { status: 500 }
        );
    }
}
