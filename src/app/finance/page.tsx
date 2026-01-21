'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import SearchableSelect from '@/components/SearchableSelect';

interface Patient {
    id: string;
    label: string;
}

interface FinancialRecord {
    id: string;
    patient_id: string;
    patient?: { name: string };
    description: string;
    amount: number;
    type: 'charge' | 'payment';
    status: 'pending' | 'paid' | 'overdue' | 'cancelled';
    due_date: string | null;
    paid_date: string | null;
    created_at: string;
}

export default function FinancePage() {
    const [records, setRecords] = useState<FinancialRecord[]>([]);
    const [loading, setLoading] = useState(true);

    // Stats
    const [stats, setStats] = useState({
        totalIncome: 0,
        pendingIncome: 0,
        totalExpenses: 0,
        pendingCount: 0
    });

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [patients, setPatients] = useState<Patient[]>([]);

    // Form State
    const [transactionForm, setTransactionForm] = useState({
        patient_id: '',
        description: '',
        amount: '',
        type: 'payment', // payment or charge
        status: 'paid',
        due_date: new Date().toISOString().split('T')[0],
        isInstallment: false,
        installments: 1
    });

    useEffect(() => {
        fetchRecords();
        fetchPatients();
    }, []);

    const fetchRecords = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('financial_records')
            .select(`
                *,
                patient:patients(name)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching financial records:', error);
        } else {
            setRecords(data as any || []);
            calculateStats(data as any || []);
        }
        setLoading(false);
    };

    const fetchPatients = async () => {
        const { data } = await supabase.from('patients').select('id, name');
        if (data) {
            setPatients(data.map((p: any) => ({ id: p.id, label: p.name }))); // Map to Option interface
        }
    };

    const calculateStats = (data: FinancialRecord[]) => {
        let totalIncome = 0;
        let pendingIncome = 0;
        let totalExpenses = 0; // If we had expenses not linked to patients, but currently 'charge' is usually 'patient debt' not 'expense'.
        // Let's assume 'charge' is 'Revenue to be received' and 'payment' is 'Revenue received' for simplicity in this clinic context?
        // Actually, typically:
        // charge = procedure cost (what patient owes)
        // payment = what patient paid (cash inflow)

        // Wait, the user logic in Patient Profile was:
        // Charge = "Cobrança" (Patient owes clinic). 
        // Payment = "Pagamento" (Patient paid).

        // So for "Faturamento Mensal" (Revenue), we look at 'payment' records that are 'paid'.
        // For "Débitos Pendentes" (Receivables), we look at 'charge' records (minus payments? Or just pending charges?).
        // In the simple model:
        // Total Income = Sum of payments made.
        // Pending Income = Sum of pending charges (or overdue).

        const income = data
            .filter(r => r.type === 'payment' && r.status === 'paid')
            .reduce((sum, r) => sum + r.amount, 0);

        const pending = data
            .filter(r => r.type === 'charge' && (r.status === 'pending' || r.status === 'overdue'))
            .reduce((sum, r) => sum + r.amount, 0);

        const pendingCount = data.filter(r => r.status === 'pending').length;

        setStats({
            totalIncome: income,
            pendingIncome: pending,
            totalExpenses: 0, // Placeholder
            pendingCount
        });
    };

    const handleAddTransaction = async () => {
        try {
            if (!transactionForm.patient_id) {
                alert('Selecione um paciente.');
                return;
            }

            const amount = parseFloat(transactionForm.amount);
            if (isNaN(amount) || amount <= 0) return;

            const recordsToInsert = [];

            if (transactionForm.isInstallment && transactionForm.installments > 1) {
                const totalAmount = amount;
                const installmentCount = transactionForm.installments;
                const baseAmount = Math.floor((totalAmount / installmentCount) * 100) / 100;
                const remainder = Number((totalAmount - (baseAmount * installmentCount)).toFixed(2));

                for (let i = 0; i < installmentCount; i++) {
                    const installmentAmount = i === 0 ? baseAmount + remainder : baseAmount;
                    const dueDate = new Date(transactionForm.due_date);
                    dueDate.setMonth(dueDate.getMonth() + i);

                    recordsToInsert.push({
                        patient_id: transactionForm.patient_id,
                        description: `${transactionForm.description} (${i + 1}/${installmentCount})`,
                        amount: installmentAmount,
                        type: transactionForm.type,
                        status: 'pending',
                        due_date: dueDate.toISOString().split('T')[0],
                        paid_date: null,
                        installment_number: i + 1,
                        total_installments: installmentCount
                    });
                }
            } else {
                recordsToInsert.push({
                    patient_id: transactionForm.patient_id,
                    description: transactionForm.description,
                    amount: amount,
                    type: transactionForm.type,
                    status: transactionForm.status,
                    due_date: transactionForm.due_date,
                    paid_date: transactionForm.status === 'paid' ? new Date().toISOString() : null,
                    installment_number: 1,
                    total_installments: 1
                });
            }

            const { error } = await supabase
                .from('financial_records')
                .insert(recordsToInsert);

            if (error) throw error;
            fetchRecords();
            setIsModalOpen(false);
            setTransactionForm({
                patient_id: '',
                description: '',
                amount: '',
                type: 'payment',
                status: 'paid',
                due_date: new Date().toISOString().split('T')[0],
                isInstallment: false,
                installments: 1
            });
            alert('Transação criada com sucesso!');
        } catch (error) {
            console.error('Error adding transaction:', error);
            alert('Erro ao adicionar transação.');
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
            <header className="flex items-center justify-between border-b border-gray-100 bg-white px-10 py-5 sticky top-0 z-40">
                <h2 className="text-2xl font-extrabold tracking-tight text-sidebar-bg">Controle Financeiro</h2>
                <div className="flex items-center gap-4">
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-bold transition-all text-gray-600">
                        <span className="material-symbols-outlined text-[20px]">file_download</span>
                        Exportar PDF
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/25"
                    >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        Nova Transação
                    </button>
                </div>
            </header>

            <main className="p-10 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { label: 'Receita Total (Pago)', value: formatCurrency(stats.totalIncome), icon: 'payments', color: 'text-green-500', bg: 'bg-green-50' },
                        { label: 'A Receber (Pendente)', value: formatCurrency(stats.pendingIncome), icon: 'pending_actions', color: 'text-orange-500', bg: 'bg-orange-50' },
                        { label: 'Transações Pendentes', value: `${stats.pendingCount} Itens`, icon: 'receipt_long', color: 'text-blue-500', bg: 'bg-blue-50' },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white p-6 rounded-[2rem] border border-gray-50 shadow-soft">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`size-10 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                                    <span className="material-symbols-outlined">{stat.icon}</span>
                                </div>
                            </div>
                            <p className="text-2xl font-black text-sidebar-bg">{stat.value}</p>
                            <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">{stat.label}</p>
                        </div>
                    ))}
                </div>

                <div className="bg-white rounded-[2.5rem] border border-gray-50 shadow-soft overflow-hidden">
                    <div className="flex items-center justify-between p-8 border-b border-gray-100">
                        <div className="flex items-center gap-8">
                            <h3 className="text-lg font-bold text-sidebar-bg">Transações Recentes</h3>
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-10 text-center text-gray-400">Carregando financeiro...</div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-400 border-b border-gray-100">
                                <tr>
                                    <th className="px-8 py-5">Vencimento</th>
                                    <th className="px-8 py-5">Paciente</th>
                                    <th className="px-8 py-5">Descrição</th>
                                    <th className="px-8 py-5">Valor</th>
                                    <th className="px-8 py-5">Tipo</th>
                                    <th className="px-8 py-5">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {records.map((row) => (
                                    <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-8 py-5 text-xs font-bold text-gray-400">
                                            {row.due_date ? new Date(row.due_date).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-8 py-5 font-bold text-sidebar-bg">{row.patient?.name || 'Desconhecido'}</td>
                                        <td className="px-8 py-5 text-sm font-medium text-gray-600">{row.description}</td>
                                        <td className={`px-8 py-5 font-black ${row.type === 'payment' ? 'text-green-500' : 'text-red-500'}`}>
                                            {row.type === 'payment' ? '+ ' : '- '}{formatCurrency(row.amount)}
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-lg ${row.type === 'payment' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                                }`}>
                                                {row.type === 'payment' ? 'Entrada' : 'Cobrança'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${row.status === 'paid' ? 'bg-green-100 text-green-700' :
                                                row.status === 'overdue' ? 'bg-red-100 text-red-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {row.status === 'paid' ? 'Pago' : row.status === 'pending' ? 'Pendente' : 'Atrasado'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>

            {/* Modal Nova Transação */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-extrabold text-sidebar-bg">Nova Transação</h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="size-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200"
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Paciente</label>
                                <SearchableSelect
                                    options={patients}
                                    value={transactionForm.patient_id}
                                    onChange={(id) => setTransactionForm({ ...transactionForm, patient_id: id })}
                                    placeholder="Buscar paciente..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Valor (R$)</label>
                                    <input
                                        type="number"
                                        value={transactionForm.amount}
                                        onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                                        className="w-full bg-gray-50 p-2 rounded-xl text-sm border-none font-semibold focus:ring-2 focus:ring-primary/20"
                                        placeholder="0,00"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Data Vencimento</label>
                                    <input
                                        type="date"
                                        value={transactionForm.due_date}
                                        onChange={(e) => setTransactionForm({ ...transactionForm, due_date: e.target.value })}
                                        className="w-full bg-gray-50 p-2 rounded-xl text-sm border-none font-semibold focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Descrição</label>
                                <input
                                    type="text"
                                    value={transactionForm.description}
                                    onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                                    className="w-full bg-gray-50 p-2 rounded-xl text-sm border-none font-semibold focus:ring-2 focus:ring-primary/20"
                                    placeholder="Ex: Tratamento Canal"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Tipo</label>
                                    <select
                                        value={transactionForm.type}
                                        onChange={(e) => setTransactionForm({ ...transactionForm, type: e.target.value as any })}
                                        className="w-full bg-gray-50 p-2 rounded-xl text-sm border-none font-semibold focus:ring-2 focus:ring-primary/20"
                                    >
                                        <option value="payment">Pagamento (Entrada)</option>
                                        <option value="charge">Cobrança (Obrigação)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Status Inicial</label>
                                    <select
                                        value={transactionForm.status}
                                        onChange={(e) => setTransactionForm({ ...transactionForm, status: e.target.value as any })}
                                        className="w-full bg-gray-50 p-2 rounded-xl text-sm border-none font-semibold focus:ring-2 focus:ring-primary/20"
                                    >
                                        <option value="paid">Pago / Recebido</option>
                                        <option value="pending">Pendente</option>
                                        <option value="overdue">Atrasado</option>
                                    </select>
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="modalInstallmentCheck"
                                        checked={transactionForm.isInstallment}
                                        onChange={(e) => setTransactionForm({ ...transactionForm, isInstallment: e.target.checked })}
                                        className="rounded text-primary focus:ring-primary"
                                    />
                                    <label htmlFor="modalInstallmentCheck" className="text-sm font-bold text-gray-600">Parcelar Transação?</label>
                                </div>

                                {transactionForm.isInstallment && (
                                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase">Nº Parcelas:</label>
                                        <input
                                            type="number"
                                            min="2"
                                            max="24"
                                            value={transactionForm.installments}
                                            onChange={(e) => setTransactionForm({ ...transactionForm, installments: parseInt(e.target.value) || 2 })}
                                            className="w-20 bg-white p-1.5 rounded-lg text-sm border border-gray-200 font-semibold"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={handleAddTransaction}
                            className="w-full mt-8 py-4 bg-primary text-white font-bold rounded-2xl shadow-xl hover:bg-primary-dark transition-all transform hover:scale-[1.02]"
                        >
                            Salvar Transação
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
