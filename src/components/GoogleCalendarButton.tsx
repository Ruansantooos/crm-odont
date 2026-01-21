'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface GoogleCalendarButtonProps {
    dentistName: string;
}

export default function GoogleCalendarButton({ dentistName }: GoogleCalendarButtonProps) {
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        checkConnection();
    }, [dentistName]);

    useEffect(() => {
        if (searchParams.get('google_connected') === 'true') {
            checkConnection();
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.delete('google_connected');
            newParams.delete('dentist');
            router.replace(`/calendar?${newParams.toString()}`);
        } else if (searchParams.get('error')) {
            const error = searchParams.get('error');
            const details = searchParams.get('details');
            alert(`Erro na conexão: ${error}${details ? ` (${details})` : ''}`);

            // Clear error from URL to prevent recurring alerts
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.delete('error');
            newParams.delete('details');
            router.replace(`/calendar?${newParams.toString()}`);
        }
    }, [searchParams, router]);

    const checkConnection = async () => {
        try {
            // Add timestamp to prevent caching
            const response = await fetch(`/api/google/status?dentist=${encodeURIComponent(dentistName)}&t=${Date.now()}`, {
                cache: 'no-store',
                headers: { 'Pragma': 'no-cache' }
            });
            const data = await response.json();
            setIsConnected(data.connected);
        } catch (error) {
            console.error('Error checking Google Calendar connection:', error);
        }
    };

    const handleConnect = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/google/auth?dentist=${encodeURIComponent(dentistName)}`);
            const data = await response.json();

            if (data.url) {
                // Redirecionar para o fluxo OAuth do Google
                window.location.href = data.url;
            }
        } catch (error) {
            console.error('Error connecting to Google Calendar:', error);
            alert('Erro ao conectar com Google Calendar');
            setIsLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Deseja desconectar do Google Calendar? As consultas já sincronizadas permanecerão no Google Calendar.')) {
            return;
        }

        setIsLoading(true);
        try {
            await fetch(`/api/google/disconnect?dentist=${encodeURIComponent(dentistName)}`, {
                method: 'DELETE',
            });
            setIsConnected(false);
            alert('Desconectado do Google Calendar com sucesso!');
        } catch (error) {
            console.error('Error disconnecting from Google Calendar:', error);
            alert('Erro ao desconectar do Google Calendar');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSync = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/google/sync?dentist=${encodeURIComponent(dentistName)}`);
            const data = await response.json();

            if (data.success) {
                alert(`Sincronização concluída! ${data.newEvents} novos eventos importados.`);
                window.location.reload(); // Reload to show new appointments
            } else {
                throw new Error(data.error || 'Erro desconhecido');
            }
        } catch (error) {
            console.error('Error syncing calendar:', error);
            alert('Erro ao sincronizar calendário.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative flex items-center">
            <button
                onClick={isConnected ? handleDisconnect : handleConnect}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                disabled={isLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isConnected
                    ? 'bg-green-50 text-green-600 border border-green-200 hover:bg-green-100'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                {isLoading ? (
                    <>
                        <div className="size-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                        <span>Conectando...</span>
                    </>
                ) : (
                    <>
                        <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        <span>{isConnected ? 'Conectado' : 'Conectar'} Google Calendar</span>
                        {isConnected && (
                            <span className="size-2 bg-green-500 rounded-full animate-pulse" />
                        )}
                    </>
                )}
            </button>

            {isConnected && !isLoading && (
                <button
                    onClick={handleSync}
                    className="ml-2 flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl text-sm font-bold hover:bg-blue-100 transition-all"
                    title="Sincronizar agora"
                >
                    <span className="material-symbols-outlined text-[18px]">sync</span>
                </button>
            )}

            {showTooltip && (
                <div className="absolute top-full mt-2 left-0 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-50 shadow-lg">
                    {isConnected
                        ? 'Consultas são sincronizadas automaticamente com o Google Calendar'
                        : 'Sincronize suas consultas com o Google Calendar'}
                    <div className="absolute -top-1 left-4 size-2 bg-gray-900 rotate-45" />
                </div>
            )}
        </div>
    );
}
