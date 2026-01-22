'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import SearchableSelect from '@/components/SearchableSelect';
import GoogleCalendarButton from '@/components/GoogleCalendarButton';

const DENTISTS = [
    { id: '1', name: 'Dr. Fabrício', specialty: 'Clínica Geral', color: 'primary', ringColor: 'ring-primary/10' },
    { id: '2', name: 'Dra. Carla', specialty: 'Ortodontia', color: 'rose-500', ringColor: 'ring-rose-500/10' }
];

const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

interface Patient {
    id: string;
    label: string;
}

interface Appointment {
    id: string;
    patient_id: string;
    patient?: { name: string };
    dentist_name: string;
    start_time: string;
    end_time: string;
    type: string;
    status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
    notes: string;
}

export default function CalendarPage() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [stats, setStats] = useState({ total: 0, surgeries: 0, occupancy: 0 }); // occupancy is dummy for now
    const [loading, setLoading] = useState(true);

    // View State
    const [view, setView] = useState<'day' | 'week' | 'month'>('day');
    const [selectedDentist, setSelectedDentist] = useState<string>('all');
    const [connectedDentists, setConnectedDentists] = useState<string[]>([]);

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [form, setForm] = useState({
        patient_id: '',
        dentist_name: DENTISTS[0].name,
        date: new Date().toISOString().split('T')[0],
        start_time: '09:00',
        end_time: '10:00',
        type: 'Avaliação',
        notes: ''
    });

    // Details Modal State
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    useEffect(() => {
        fetchAppointments();
        fetchPatients();
        fetchConnectedDentists();
    }, []);

    const fetchConnectedDentists = async () => {
        try {
            const res = await fetch('/api/google/connected');
            if (res.ok) {
                const data = await res.json();
                setConnectedDentists(data.connectedDentists || []);
            }
        } catch (error) {
            console.error('Error fetching connected dentists:', error);
        }
    };

    const fetchPatients = async () => {
        const { data } = await supabase.from('patients').select('id, name');
        if (data) {
            setPatients(data.map((p: any) => ({ id: p.id, label: p.name })));
        }
    };

    const fetchAppointments = async () => {
        setLoading(true);
        // Simple fetch for now, can be optimized to range later
        const { data, error } = await supabase
            .from('appointments')
            .select(`
                *,
                patient:patients(name)
            `);

        if (error) {
            console.error('Error fetching appointments:', error);
        } else {
            setAppointments(data as any || []);
            calculateStats(data as any || []);
        }
        setLoading(false);
    };

    const calculateStats = (apps: Appointment[]) => {
        const total = apps.length;
        const surgeries = apps.filter(a => a.type === 'Cirurgia').length;
        // Mock occupancy logic
        setStats({ total, surgeries, occupancy: 84 });
    };

    const handleCreateAppointment = async () => {
        try {
            if (!form.patient_id) {
                alert('Selecione um paciente');
                return;
            }

            // Combine date and time
            const start = new Date(`${form.date}T${form.start_time}:00`);
            const end = new Date(`${form.date}T${form.end_time}:00`);

            // Validação de horário
            if (end <= start) {
                alert('O horário de término deve ser posterior ao horário de início.');
                return;
            }

            const { data: newAppointment, error } = await supabase.from('appointments').insert({
                patient_id: form.patient_id,
                dentist_name: form.dentist_name,
                start_time: start.toISOString(),
                end_time: end.toISOString(),
                type: form.type,
                status: 'scheduled',
                notes: form.notes
            }).select().single();

            if (error) throw error;

            // Trigger Google Calendar Sync (now waiting for response to show error if needed)
            try {
                const syncResponse = await fetch('/api/google/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ appointmentId: newAppointment.id })
                });

                if (!syncResponse.ok) {
                    const errorData = await syncResponse.json();
                    console.warn('Google Sync Warning:', errorData.error);
                    alert('Consulta agendada no CRM, mas houve um problema ao sincronizar com o Google Calendar: ' + (errorData.error || 'Erro desconhecido'));
                } else {
                    alert('Consulta agendada e sincronizada com sucesso!');
                }
            } catch (syncErr) {
                console.error('Failed to trigger sync:', syncErr);
                alert('Consulta agendada no CRM, mas falhou ao iniciar sincronização com Google.');
            }

            setIsModalOpen(false);
            fetchAppointments();
            // Reset crucial fields
            setForm({ ...form, patient_id: '', notes: '' });

        } catch (error) {
            console.error('Error creating appointment:', error);
            alert('Erro ao agendar consulta.');
        }
    };

    // Filtered Dentists
    const visibleDentists = useMemo(() => {
        if (selectedDentist === 'all') return DENTISTS;
        return DENTISTS.filter(d => d.id === selectedDentist);
    }, [selectedDentist]);

    // Helper to position items on grid
    const getPositionStyle = (startTime: string, endTime: string) => {
        // Grid starts at 08:00
        const start = new Date(startTime);
        const end = new Date(endTime);

        // Simple minutes from 8:00 calculation
        const startMinutes = (start.getHours() * 60 + start.getMinutes()) - (8 * 60);
        const durationMinutes = (end.getTime() - start.getTime()) / 60000;

        // Assuming each hour slot is ~80px height (h-20 = 80px)
        // 60 min = 80px -> 1 min = 1.33px
        const pixelsPerMinute = 80 / 60;

        return {
            top: `${startMinutes * pixelsPerMinute}px`,
            height: `${durationMinutes * pixelsPerMinute}px`
        };
    };

    // Filtered appointments for the current view
    const visibleAppointments = useMemo(() => {
        return appointments.filter(app => {
            const matchesDentist = selectedDentist === 'all' || DENTISTS.find(d => d.id === selectedDentist)?.name === app.dentist_name;
            if (!matchesDentist) return false;

            // Não mostrar consultas canceladas na agenda principal
            if (app.status === 'cancelled') return false;

            const appDate = new Date(app.start_time);
            const viewDate = new Date(form.date + 'T00:00:00');

            if (view === 'day') {
                return appDate.toISOString().split('T')[0] === form.date;
            } else if (view === 'week') {
                const weekStart = new Date(viewDate);
                weekStart.setDate(viewDate.getDate() - viewDate.getDay() + (viewDate.getDay() === 0 ? -6 : 1));
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 7);
                return appDate >= weekStart && appDate < weekEnd;
            } else {
                const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
                const monthEnd = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
                return appDate >= monthStart && appDate < monthEnd;
            }
        });
    }, [appointments, form.date, view, selectedDentist]);

    const weekDays = useMemo(() => {
        const viewDate = new Date(form.date + 'T00:00:00');
        const weekStart = new Date(viewDate);
        weekStart.setDate(viewDate.getDate() - viewDate.getDay() + (viewDate.getDay() === 0 ? -6 : 1));

        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            return d;
        });
    }, [form.date]);

    // Appointments for specific day helper
    const getAppointmentsForDay = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return visibleAppointments.filter(app => new Date(app.start_time).toISOString().split('T')[0] === dateStr);
    };

    const handleAppointmentClick = (app: Appointment, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedAppointment(app);
        setIsDetailsModalOpen(true);
    };

    const handleUpdateStatus = async (status: Appointment['status']) => {
        if (!selectedAppointment) return;
        try {
            const { error } = await supabase
                .from('appointments')
                .update({ status })
                .eq('id', selectedAppointment.id);

            if (error) throw error;

            // Trigger Google Calendar Sync for status update
            fetch('/api/google/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointmentId: selectedAppointment.id, action: 'update' })
            }).catch(err => {
                console.error('Failed to sync status update:', err);
            });

            // Update local state and close
            setAppointments(apps => apps.map(a => a.id === selectedAppointment.id ? { ...a, status } : a));
            setIsDetailsModalOpen(false);
            alert(`Status atualizado para: ${status === 'completed' ? 'Concluído' : 'Cancelado'}`);
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Erro ao atualizar status.');
        }
    };

    return (
        <>
            <header className="flex items-center justify-between border-b border-slate-100 bg-white px-10 py-5 sticky top-0 z-40">
                <div className="flex items-center gap-8">
                    <h2 className="text-2xl font-extrabold tracking-tight text-sidebar-bg">Agenda de Consultas</h2>
                    <div className="relative w-80">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                        <input
                            className="w-full bg-gray-50 border-none rounded-xl pl-12 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 font-semibold"
                            placeholder="Buscar na agenda..."
                            type="text"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* View Selector */}
                    <div className="flex bg-gray-100 p-1 rounded-xl mr-2">
                        <button
                            onClick={() => setView('day')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === 'day' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'
                                }`}
                        >
                            Dia
                        </button>
                        <button
                            onClick={() => setView('week')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === 'week' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'
                                }`}
                        >
                            Semana
                        </button>
                        <button
                            onClick={() => setView('month')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === 'month' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'
                                }`}
                        >
                            Mês
                        </button>
                    </div>

                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                        <button onClick={() => {
                            const d = new Date(form.date);
                            if (view === 'day') d.setDate(d.getDate() - 1);
                            else if (view === 'week') d.setDate(d.getDate() - 7);
                            else if (view === 'month') d.setMonth(d.getMonth() - 1);
                            setForm({ ...form, date: d.toISOString().split('T')[0] });
                        }} className="p-1 hover:bg-gray-200 rounded-lg text-gray-500">
                            <span className="material-symbols-outlined text-sm">chevron_left</span>
                        </button>
                        <span className="text-sm font-bold text-gray-700 min-w-[140px] text-center">
                            {view === 'day' && new Date(form.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                            {view === 'week' && `Semana de ${new Date(form.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`}
                            {view === 'month' && new Date(form.date + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={() => {
                            const d = new Date(form.date);
                            if (view === 'day') d.setDate(d.getDate() + 1);
                            else if (view === 'week') d.setDate(d.getDate() + 7);
                            else if (view === 'month') d.setMonth(d.getMonth() + 1);
                            setForm({ ...form, date: d.toISOString().split('T')[0] });
                        }} className="p-1 hover:bg-gray-200 rounded-lg text-gray-500">
                            <span className="material-symbols-outlined text-sm">chevron_right</span>
                        </button>
                    </div>

                    <Suspense fallback={<div className="h-10 w-40 bg-gray-100 animate-pulse rounded-xl" />}>
                        <GoogleCalendarButton dentistName={DENTISTS[0].name} />
                    </Suspense>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/25"
                    >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        Nova Consulta
                    </button>
                </div>
            </header>

            <div className="flex h-[calc(100vh-140px)]">
                <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
                    <div className="flex gap-3 items-center p-6">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mr-2">Filtrar Dentista:</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSelectedDentist('all')}
                                className={`h-9 px-4 rounded-xl border text-xs font-bold transition-all ${selectedDentist === 'all'
                                    ? 'bg-primary/5 border-primary/20 text-primary'
                                    : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                                    }`}
                            >
                                Todos
                            </button>
                            {DENTISTS.map(dentist => (
                                <button
                                    key={dentist.id}
                                    onClick={() => setSelectedDentist(dentist.id)}
                                    className={`h-9 px-4 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${selectedDentist === dentist.id
                                        ? `bg-${dentist.color}/5 border-${dentist.color}/20 text-sidebar-bg ring-1 ring-${dentist.color}/20`
                                        : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                                        }`}
                                >
                                    <div className={`size-2 rounded-full bg-${dentist.color}`}></div>
                                    {dentist.name.split(' ')[1]}
                                    {connectedDentists.includes(dentist.name) && (
                                        <svg className="size-3 text-blue-500 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M19,3H5C3.89,3 3,3.9 3,5V19C3,20.1 3.89,21 5,21H19C20.1,21 21,20.1 21,19V5C21,3.9 20.1,3 19,3M19,19H5V5H19V19M11.5,15.5C10.12,15.5 9,14.38 9,13C9,11.62 10.12,10.5 11.5,10.5C12.88,10.5 14,11.62 14,13C14,14.38 12.88,15.5 11.5,15.5M11.5,8C14.26,8 16.5,10.24 16.5,13C16.5,15.76 14.26,18 11.5,18C8.74,18 6.5,15.76 6.5,13C6.5,10.24 8.74,8 11.5,8M15,13H14C14,11.62 12.88,10.5 11.5,10.5V9.5C13.43,9.5 15,11.07 15,13Z" />
                                        </svg>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-white relative">
                        {view === 'day' && (
                            <>
                                {/* Header Columns (Dentists) */}
                                <div
                                    className="calendar-grid sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100"
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: `80px repeat(${visibleDentists.length}, 1fr)`
                                    }}
                                >
                                    <div className="h-20 flex flex-col items-center justify-center border-r border-gray-100">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Hora</span>
                                    </div>
                                    {visibleDentists.map(dentist => (
                                        <div key={dentist.id} className="h-20 flex items-center px-6 gap-4 border-r border-gray-100 last:border-r-0">
                                            <div className="relative">
                                                <div className={`size-11 rounded-full bg-gray-200 ring-2 ${dentist.ringColor}`}></div>
                                                <div className="absolute -bottom-1 -right-1 size-4 bg-green-500 border-2 border-white rounded-full"></div>
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-sm font-extrabold text-sidebar-bg">{dentist.name}</span>
                                                    {connectedDentists.includes(dentist.name) && (
                                                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-[8px] text-blue-600 font-bold rounded-md uppercase border border-blue-100">
                                                            <svg className="size-2.5" viewBox="0 0 24 24" fill="currentColor">
                                                                <path d="M19,3H5C3.89,3 3,3.9 3,5V19C3,20.1 3.89,21 5,21H19C20.1,21 21,20.1 21,19V5C21,3.9 20.1,3 19,3M19,19H5V5H19V19M11.5,15.5C10.12,15.5 9,14.38 9,13C9,11.62 10.12,10.5 11.5,10.5C12.88,10.5 14,11.62 14,13C14,14.38 12.88,15.5 11.5,15.5M11.5,8C14.26,8 16.5,10.24 16.5,13C16.5,15.76 14.26,18 11.5,18C8.74,18 6.5,15.76 6.5,13C6.5,10.24 8.74,8 11.5,8M15,13H14C14,11.62 12.88,10.5 11.5,10.5V9.5C13.43,9.5 15,11.07 15,13Z" />
                                                            </svg>
                                                            Google Synced
                                                        </span>
                                                    )}
                                                </div>
                                                <span className={`text-[10px] text-${dentist.color} uppercase font-bold tracking-tight`}>{dentist.specialty}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div
                                    className="calendar-grid relative"
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: `80px repeat(${visibleDentists.length}, 1fr)`
                                    }}
                                >
                                    {/* Time Column */}
                                    <div className="flex flex-col bg-gray-50/50 border-r border-gray-100">
                                        {TIME_SLOTS.map(time => (
                                            <div key={time} className="h-20 flex items-center justify-center border-b border-gray-100/50">
                                                <span className="text-[11px] text-gray-400 font-bold uppercase">{time}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Dentist Columns */}
                                    {visibleDentists.map(dentist => {
                                        const appointmentsForDay = getAppointmentsForDay(new Date(form.date + 'T00:00:00'));
                                        const dentistApps = appointmentsForDay.filter(a => a.dentist_name === dentist.name);

                                        return (
                                            <div key={dentist.id} className="relative border-r border-gray-100 last:border-r-0 min-h-[880px]">
                                                {/* Background Grid Lines */}
                                                {TIME_SLOTS.map((_, i) => (
                                                    <div key={i} className="h-20 border-b border-gray-100/50"></div>
                                                ))}

                                                {/* Appointments */}
                                                {dentistApps.map(app => {
                                                    const style = getPositionStyle(app.start_time, app.end_time);
                                                    // Determine colors based on type or status (simplified mapping)
                                                    let bgClass = 'bg-primary/10 border-primary/20';
                                                    let textClass = 'text-primary';
                                                    if (app.type === 'Cirurgia') {
                                                        bgClass = 'bg-rose-50 border-rose-100';
                                                        textClass = 'text-rose-600';
                                                    } else if (app.type === 'Manutenção') {
                                                        bgClass = 'bg-amber-50 border-amber-100';
                                                        textClass = 'text-amber-700';
                                                    } else if (app.type === 'Consulta Google') {
                                                        bgClass = 'bg-blue-50 border-blue-100';
                                                        textClass = 'text-blue-600';
                                                    }

                                                    return (
                                                        <div
                                                            key={app.id}
                                                            onClick={(e) => handleAppointmentClick(app, e)}
                                                            className={`absolute left-2 right-2 rounded-xl p-3 border shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between overflow-hidden ${bgClass}`}
                                                            style={style}
                                                        >
                                                            <div>
                                                                <div className="flex justify-between items-start">
                                                                    <span className={`text-[10px] font-extrabold uppercase tracking-widest ${textClass}`}>{app.type}</span>
                                                                    <span className={`material-symbols-outlined text-sm opacity-40 group-hover:opacity-100 transition-opacity ${textClass}`}>more_vert</span>
                                                                </div>
                                                                <h4 className="text-xs font-extrabold mt-1 text-sidebar-bg truncate">
                                                                    {app.type === 'Consulta Google' ? app.notes : (app.patient?.name || 'Sem nome')}
                                                                </h4>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 mt-auto">
                                                                <span className={`material-symbols-outlined text-[14px] ${textClass}`}>schedule</span>
                                                                <span className={`text-[10px] font-bold ${textClass} opacity-80`}>
                                                                    {new Date(app.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {view === 'week' && (
                            <>
                                {/* Week View Header */}
                                <div
                                    className="calendar-grid sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100"
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: `80px repeat(7, 1fr)`
                                    }}
                                >
                                    <div className="h-20 flex flex-col items-center justify-center border-r border-gray-100">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Hora</span>
                                    </div>
                                    {weekDays.map(date => (
                                        <div key={date.toISOString()} className="h-20 flex flex-col items-center justify-center border-r border-gray-100 last:border-r-0">
                                            <span className="text-xs font-extrabold text-sidebar-bg">
                                                {date.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase()}
                                            </span>
                                            <span className="text-xl font-black text-primary mt-1">{date.getDate()}</span>
                                        </div>
                                    ))}
                                </div>

                                <div
                                    className="calendar-grid relative"
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: `80px repeat(7, 1fr)`
                                    }}
                                >
                                    {/* Time Column */}
                                    <div className="flex flex-col bg-gray-50/50 border-r border-gray-100">
                                        {TIME_SLOTS.map(time => (
                                            <div key={time} className="h-20 flex items-center justify-center border-b border-gray-100/50">
                                                <span className="text-[11px] text-gray-400 font-bold uppercase">{time}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Day Columns */}
                                    {weekDays.map(date => {
                                        const dayApps = getAppointmentsForDay(date);

                                        return (
                                            <div key={date.toISOString()} className="relative border-r border-gray-100 last:border-r-0 min-h-[880px]">
                                                {/* Background Grid Lines */}
                                                {TIME_SLOTS.map((_, i) => (
                                                    <div key={i} className="h-20 border-b border-gray-100/50"></div>
                                                ))}

                                                {/* Appointments */}
                                                {dayApps.map((app: Appointment) => {
                                                    const style = getPositionStyle(app.start_time, app.end_time);
                                                    let bgClass = 'bg-primary/10 border-primary/20';
                                                    let textClass = 'text-primary';
                                                    if (app.type === 'Cirurgia') {
                                                        bgClass = 'bg-rose-50 border-rose-100';
                                                        textClass = 'text-rose-600';
                                                    } else if (app.type === 'Manutenção') {
                                                        bgClass = 'bg-amber-50 border-amber-100';
                                                        textClass = 'text-amber-700';
                                                    } else if (app.type === 'Consulta Google') {
                                                        bgClass = 'bg-blue-50 border-blue-100';
                                                        textClass = 'text-blue-600';
                                                    }

                                                    return (
                                                        <div
                                                            key={app.id}
                                                            onClick={(e) => handleAppointmentClick(app, e)}
                                                            className={`absolute left-1 right-1 rounded-lg p-2 border shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col overflow-hidden ${bgClass}`}
                                                            style={style}
                                                        >
                                                            <div className="min-w-0">
                                                                <p className="text-[9px] font-black leading-none truncate mb-1">
                                                                    {app.type === 'Consulta Google' ? app.notes : app.patient?.name}
                                                                </p>
                                                                <span className={`text-[8px] font-bold uppercase ${textClass} opacity-80 leading-none`}>
                                                                    {new Date(app.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {view === 'month' && (
                            <div className="p-8 flex flex-col">
                                <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                    {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
                                        <div key={day} className="bg-gray-50 p-4 text-center">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{day}</span>
                                        </div>
                                    ))}
                                    {(() => {
                                        const viewDate = new Date(form.date + 'T00:00:00');
                                        const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);

                                        // Calculate the start of the grid (Monday of the first week)
                                        // getDay() returns 0 for Sunday, 1 for Monday, etc.
                                        // We want Monday (1) to be 0 offset, Tue (2) to be 1, ..., Sun (0) to be 6.
                                        let startOffset = firstDayOfMonth.getDay() - 1;
                                        if (startOffset < 0) startOffset = 6; // Sunday becomes 6

                                        const startDate = new Date(firstDayOfMonth);
                                        startDate.setDate(firstDayOfMonth.getDate() - startOffset);

                                        const days = [];
                                        const todayStr = new Date().toISOString().split('T')[0];

                                        // Optimize: Group appointments by date
                                        const appsByDate: Record<string, Appointment[]> = {};
                                        appointments.forEach(app => {
                                            const matchesDentist = selectedDentist === 'all' || DENTISTS.find(d => d.id === selectedDentist)?.name === app.dentist_name;
                                            if (matchesDentist) {
                                                const dateKey = new Date(app.start_time).toISOString().split('T')[0];
                                                if (!appsByDate[dateKey]) appsByDate[dateKey] = [];
                                                appsByDate[dateKey].push(app);
                                            }
                                        });

                                        // Generate 42 days (6 weeks)
                                        for (let i = 0; i < 42; i++) {
                                            const currentDate = new Date(startDate);
                                            currentDate.setDate(startDate.getDate() + i);
                                            const dateStr = currentDate.toISOString().split('T')[0];
                                            const isCurrentMonth = currentDate.getMonth() === viewDate.getMonth();
                                            const isToday = dateStr === todayStr;

                                            const dayApps = appsByDate[dateStr] || [];

                                            days.push(
                                                <div
                                                    key={dateStr}
                                                    className={`bg-white min-h-[120px] p-2 border-t border-l border-gray-100 flex flex-col gap-1 overflow-hidden hover:bg-gray-50/50 transition-colors ${!isCurrentMonth ? 'bg-gray-50/30' : ''
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className={`size-7 flex items-center justify-center rounded-full text-xs font-black transition-colors ${isToday
                                                            ? 'bg-primary text-white'
                                                            : isCurrentMonth ? 'text-sidebar-bg' : 'text-gray-300'
                                                            }`}>
                                                            {currentDate.getDate()}
                                                        </span>
                                                        {dayApps.length > 0 && isCurrentMonth && (
                                                            <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">
                                                                {dayApps.length}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar pr-0.5">
                                                        {dayApps.slice(0, 4).map((app: Appointment) => {
                                                            let bgClass = 'bg-primary/10 border-primary/20 text-primary';
                                                            if (app.type === 'Cirurgia') bgClass = 'bg-rose-50 border-rose-100 text-rose-600';
                                                            else if (app.type === 'Manutenção') bgClass = 'bg-amber-50 border-amber-100 text-amber-700';
                                                            else if (app.type === 'Consulta Google') bgClass = 'bg-blue-50 border-blue-100 text-blue-600';

                                                            return (
                                                                <div
                                                                    key={app.id}
                                                                    onClick={(e) => handleAppointmentClick(app, e)}
                                                                    className={`px-2 py-1 rounded-lg border text-[9px] font-bold truncate cursor-pointer hover:brightness-95 transition-all shadow-sm ${bgClass}`}
                                                                >
                                                                    <span className="opacity-60 mr-1">
                                                                        {new Date(app.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                    {app.type === 'Consulta Google' ? app.notes : app.patient?.name}
                                                                </div>
                                                            );
                                                        })}
                                                        {dayApps.length > 4 && (
                                                            <button
                                                                onClick={() => {
                                                                    const targetDate = new Date(currentDate);
                                                                    setForm(prev => ({ ...prev, date: targetDate.toISOString().split('T')[0] }));
                                                                    setView('day');
                                                                }}
                                                                className="text-[9px] font-black text-gray-400 mt-1 hover:text-primary transition-colors text-left pl-1"
                                                            >
                                                                + {dayApps.length - 4} mais...
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return days;
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>

                    <footer className="h-14 border-t border-gray-100 bg-white flex items-center justify-between px-10 shrink-0">
                        <div className="flex gap-8">
                            <div className="flex items-center gap-2">
                                <div className="size-2 rounded-full bg-primary shadow-sm shadow-primary/40"></div>
                                <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest">Consultas: {stats.total}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="size-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500/40"></div>
                                <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest">Cirurgias: {stats.surgeries}</span>
                            </div>
                        </div>
                    </footer>
                </div>

                {/* Sidebar Stats */}
                <aside className="w-80 border-l border-gray-100 bg-white p-8 flex flex-col gap-8">
                    <div>
                        <h3 className="font-extrabold text-xl text-sidebar-bg mb-6">Próxima Consulta</h3>
                        {visibleAppointments.length > 0 ? (
                            <div className="p-5 bg-gray-50 rounded-3xl flex flex-col gap-5 border border-gray-100">
                                <div className="flex items-center gap-4">
                                    <div className="size-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-xl font-black text-primary">
                                        {visibleAppointments[0].patient?.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-black text-sidebar-bg truncate">{visibleAppointments[0].patient?.name}</p>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">{new Date(visibleAppointments[0].start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                                <button className="w-full py-3 text-xs font-black bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all">Ver Detalhes</button>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 font-medium">Nenhuma consulta agendada.</p>
                        )}
                    </div>
                </aside>
            </div>

            {/* Modal Nova Consulta */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-extrabold text-sidebar-bg">Nova Consulta</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><span className="material-symbols-outlined">close</span></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Paciente</label>
                                <SearchableSelect
                                    options={patients}
                                    value={form.patient_id}
                                    onChange={(id) => setForm({ ...form, patient_id: id })}
                                    placeholder="Buscar paciente..."
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Dentista</label>
                                <select
                                    value={form.dentist_name}
                                    onChange={(e) => setForm({ ...form, dentist_name: e.target.value })}
                                    className="w-full bg-gray-50 p-3 rounded-xl text-sm border-none font-semibold focus:ring-2 focus:ring-primary/20"
                                >
                                    {DENTISTS.map(d => <option key={d.id} value={d.name}>{d.name} - {d.specialty}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Data</label>
                                    <input
                                        type="date"
                                        value={form.date}
                                        onChange={(e) => setForm({ ...form, date: e.target.value })}
                                        className="w-full bg-gray-50 p-2 rounded-xl text-sm font-semibold"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Início</label>
                                    <input
                                        type="time"
                                        value={form.start_time}
                                        onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                                        className="w-full bg-gray-50 p-2 rounded-xl text-sm font-semibold"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Fim</label>
                                    <input
                                        type="time"
                                        value={form.end_time}
                                        onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                                        className="w-full bg-gray-50 p-2 rounded-xl text-sm font-semibold"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Tipo de Consulta</label>
                                <select
                                    value={form.type}
                                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                                    className="w-full bg-gray-50 p-3 rounded-xl text-sm border-none font-semibold focus:ring-2 focus:ring-primary/20"
                                >
                                    <option value="Avaliação">Avaliação</option>
                                    <option value="Tratamento">Tratamento</option>
                                    <option value="Cirurgia">Cirurgia</option>
                                    <option value="Manutenção">Manutenção</option>
                                    <option value="Emergência">Emergência</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Observações</label>
                                <textarea
                                    value={form.notes}
                                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                    className="w-full bg-gray-50 p-3 rounded-xl text-sm border-none font-semibold focus:ring-2 focus:ring-primary/20 h-20"
                                    placeholder="Ex: Paciente sente dor no dente 38..."
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleCreateAppointment}
                            className="w-full mt-6 py-4 bg-primary text-white font-bold rounded-2xl shadow-xl hover:bg-primary-dark transition-all transform hover:scale-[1.02]"
                        >
                            Agendar Horário
                        </button>
                    </div>
                </div>
            )}

            {/* Modal Detalhes da Consulta */}
            {isDetailsModalOpen && selectedAppointment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-extrabold text-sidebar-bg">Detalhes da Consulta</h3>
                                <p className="text-sm text-gray-400 font-bold mt-1">#{selectedAppointment.id.slice(0, 8)}</p>
                            </div>
                            <button onClick={() => setIsDetailsModalOpen(false)} className="size-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200">
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <div className="size-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-xl font-black text-primary">
                                    {selectedAppointment.patient?.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase">Paciente</p>
                                    <p className="font-extrabold text-sidebar-bg text-lg">{selectedAppointment.patient?.name}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Dentista</p>
                                    <p className="font-bold text-gray-700">{selectedAppointment.dentist_name}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Tipo</p>
                                    <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-bold uppercase">
                                        {selectedAppointment.type}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Data</p>
                                    <p className="font-bold text-gray-700">{new Date(selectedAppointment.start_time).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Horário</p>
                                    <p className="font-bold text-gray-700">
                                        {new Date(selectedAppointment.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                        {new Date(selectedAppointment.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>

                            {selectedAppointment.notes && (
                                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                                    <p className="text-xs font-bold text-orange-400 uppercase mb-1">Observações</p>
                                    <p className="text-sm font-medium text-orange-800">{selectedAppointment.notes}</p>
                                </div>
                            )}

                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Status Atual</p>
                                <div className="flex gap-2">
                                    {['scheduled', 'confirmed', 'completed', 'cancelled'].map(s => (
                                        <button
                                            key={s}
                                            disabled={true} // For now just display, buttons below change it
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${selectedAppointment.status === s
                                                ? 'bg-gray-800 text-white'
                                                : 'bg-gray-100 text-gray-400'
                                                }`}
                                        >
                                            {s === 'scheduled' ? 'Agendado' : s === 'confirmed' ? 'Confirmado' : s === 'completed' ? 'Concluído' : 'Cancelado'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => handleUpdateStatus('cancelled')}
                                    className="py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-lg">cancel</span>
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => handleUpdateStatus('completed')}
                                    className="py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-lg">check_circle</span>
                                    Concluir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
