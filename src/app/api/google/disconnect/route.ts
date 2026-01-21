import { NextResponse } from 'next/server';
import { disconnectGoogleCalendar } from '@/lib/googleCalendar';

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const dentistName = searchParams.get('dentist');

        if (!dentistName) {
            return NextResponse.json(
                { error: 'Dentist name is required' },
                { status: 400 }
            );
        }

        await disconnectGoogleCalendar(dentistName);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error disconnecting Google Calendar:', error);
        return NextResponse.json(
            { error: 'Failed to disconnect from Google Calendar' },
            { status: 500 }
        );
    }
}
