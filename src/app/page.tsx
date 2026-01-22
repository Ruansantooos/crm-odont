'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface DashboardStats {
  totalPatients: number;
  appointmentsToday: number;
  monthlyRevenue: number;
  completedToday: number;
}

interface Activity {
  id: string;
  patient_name: string;
  type: string;
  time: string;
  dentist: string;
  status: string;
}

interface UpcomingAppointment {
  id: string;
  patient_name: string;
  type: string;
  time: string;
  status: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    appointmentsToday: 0,
    monthlyRevenue: 0,
    completedToday: 0
  });
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      // 1. Total Patients
      const { count: patientCount } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });

      // 2. Appointments Today
      const { data: todayApps } = await supabase
        .from('appointments')
        .select('*, patients(name)')
        .gte('start_time', `${today}T00:00:00`)
        .lte('start_time', `${today}T23:59:59`)
        .neq('status', 'cancelled');

      const completedToday = todayApps?.filter(a => a.status === 'completed').length || 0;

      // 3. Revenue (Sum of costs from treatments or financial records)
      const { data: financialData } = await supabase
        .from('financial_records')
        .select('amount')
        .eq('type', 'payment')
        .eq('status', 'paid')
        .gte('created_at', monthStart.toISOString());

      const monthlyRevenue = financialData?.reduce((sum, r) => sum + r.amount, 0) || 0;

      // 4. Recent Activities (Recent appointments or status updates)
      const { data: recent } = await supabase
        .from('appointments')
        .select('*, patients(name)')
        .order('created_at', { ascending: false })
        .limit(4);

      // 5. Upcoming (next 3 non-cancelled)
      const { data: upcomingApps } = await supabase
        .from('appointments')
        .select('*, patients(name)')
        .gte('start_time', new Date().toISOString())
        .neq('status', 'cancelled')
        .order('start_time', { ascending: true })
        .limit(3);

      setStats({
        totalPatients: patientCount || 0,
        appointmentsToday: todayApps?.length || 0,
        monthlyRevenue,
        completedToday
      });

      setRecentActivities(recent?.map(a => ({
        id: a.id,
        patient_name: a.patients?.name || 'Desconhecido',
        type: a.type,
        time: new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        dentist: a.dentist_name,
        status: a.status
      })) || []);

      setUpcoming(upcomingApps?.map(a => ({
        id: a.id,
        patient_name: a.patients?.name || 'Desconhecido',
        type: a.type,
        time: new Date(a.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: a.status
      })) || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <>
      <header className="flex items-center justify-between bg-white px-10 py-5 sticky top-0 z-10 border-b border-gray-100">
        <div className="flex items-center gap-10 flex-1">
          <h2 className="text-sidebar-bg text-xl font-extrabold tracking-tight">Painel Geral</h2>
        </div>
        <div className="flex items-center gap-4">
          <button className="relative p-2.5 rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors">
            <span className="material-symbols-outlined">notifications</span>
          </button>
        </div>
      </header>

      <div className="p-10 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col gap-2 rounded-2xl p-7 bg-white shadow-soft border border-transparent hover:border-primary/10 transition-all">
            <div className="flex justify-between items-start">
              <p className="text-gray-400 text-sm font-bold uppercase tracking-wider">Total de Pacientes</p>
              <span className="p-3 bg-icon-gradient rounded-2xl text-white shadow-purple-glow">
                <span className="material-symbols-outlined">group</span>
              </span>
            </div>
            <p className="text-sidebar-bg text-4xl font-extrabold mt-1">{stats.totalPatients}</p>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl p-7 bg-white shadow-soft border border-transparent hover:border-primary/10 transition-all">
            <div className="flex justify-between items-start">
              <p className="text-gray-400 text-sm font-bold uppercase tracking-wider">Consultas Hoje</p>
              <span className="p-3 bg-icon-gradient rounded-2xl text-white shadow-purple-glow">
                <span className="material-symbols-outlined">event_available</span>
              </span>
            </div>
            <p className="text-sidebar-bg text-4xl font-extrabold mt-1">{stats.appointmentsToday}</p>
            <div className="flex items-center gap-1 mt-3">
              <span className="text-gray-400 text-sm font-medium bg-gray-50 px-2 py-0.5 rounded-lg">{stats.completedToday} concluídas</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl p-7 bg-white shadow-soft border border-transparent hover:border-primary/10 transition-all">
            <div className="flex justify-between items-start">
              <p className="text-gray-400 text-sm font-bold uppercase tracking-wider">Faturamento Mensal</p>
              <span className="p-3 bg-icon-gradient rounded-2xl text-white shadow-purple-glow">
                <span className="material-symbols-outlined">account_balance_wallet</span>
              </span>
            </div>
            <p className="text-sidebar-bg text-4xl font-extrabold mt-1">{formatCurrency(stats.monthlyRevenue)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-sidebar-bg text-xl font-extrabold tracking-tight px-2">Atividades Recentes</h3>
            <div className="bg-white rounded-2xl p-8 shadow-soft border border-gray-50">
              <div className="space-y-8">
                {recentActivities.length === 0 ? (
                  <p className="text-center text-gray-400">Nenhuma atividade recente.</p>
                ) : (
                  recentActivities.map((activity, idx) => (
                    <div key={activity.id} className="grid grid-cols-[48px_1fr] gap-x-5 group">
                      <div className="flex flex-col items-center">
                        <div className={`p-2.5 rounded-full flex items-center justify-center shadow-lg ${activity.status === 'cancelled' ? 'bg-red-500' : 'bg-icon-gradient'
                          }`}>
                          <span className="material-symbols-outlined text-[20px] text-white">
                            {activity.status === 'cancelled' ? 'cancel' : 'check_circle'}
                          </span>
                        </div>
                        {idx !== recentActivities.length - 1 && <div className="w-[2px] bg-gray-100 h-14 my-1"></div>}
                      </div>
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-center justify-between">
                          <p className="text-sidebar-bg text-base font-bold">
                            {activity.patient_name} - {activity.type}
                          </p>
                          <p className="text-gray-400 text-sm font-medium">{activity.time}</p>
                        </div>
                        <p className="text-gray-500 text-sm mt-1">
                          <span className={`${activity.status === 'cancelled' ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                            {activity.status === 'cancelled' ? 'CANCELADO' : `Atendido por ${activity.dentist}`}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sidebar-bg text-xl font-extrabold tracking-tight">Próximos</h3>
              <Link href="/calendar" className="text-accent-purple text-sm font-bold hover:text-primary transition-colors">Ver Agenda</Link>
            </div>
            <div className="space-y-4">
              {upcoming.length === 0 ? (
                <p className="text-center text-gray-400 py-10 bg-white rounded-2xl border border-dashed border-gray-200">
                  Nenhuma consulta agendada.
                </p>
              ) : (
                upcoming.map((app) => (
                  <div key={app.id} className="bg-white p-5 rounded-2xl shadow-soft border border-gray-50 flex items-center gap-5 hover:translate-x-1 transition-transform cursor-pointer">
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 flex flex-col items-center justify-center text-accent-purple font-extrabold shadow-inner">
                      <span className="text-sm leading-none">{app.time}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sidebar-bg font-bold text-base truncate">{app.patient_name}</p>
                      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider truncate">{app.type}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
