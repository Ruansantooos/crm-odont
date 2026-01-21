'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Patient {
    id: string;
    name: string;
    age: number;
    gender: string;
    email: string;
    phone: string;
    last_visit: string | null;
    status: string;
    balance: number;
    allergies: string[];
    medications: string[];
    medical_notes: string;
}

interface Treatment {
    id: string;
    title: string;
    description: string;
    cost: number;
    status: string;
    tooth_number: number | null;
    created_at: string;
}

interface PatientFile {
    id: string;
    file_name: string;
    file_url: string;
    file_type: string;
    size: number;
    created_at: string;
}

interface FinancialRecord {
    id: string;
    description: string;
    amount: number;
    type: 'charge' | 'payment';
    status: 'pending' | 'paid' | 'overdue' | 'cancelled';
    due_date: string | null;
    paid_date: string | null;
    created_at: string;
}

export default function PatientDetail() {
    const params = useParams();
    const id = params?.id as string;

    const [patient, setPatient] = useState<Patient | null>(null);
    const [treatments, setTreatments] = useState<Treatment[]>([]);
    const [files, setFiles] = useState<PatientFile[]>([]);
    const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
    const [activeTab, setActiveTab] = useState('Histórico Médico');

    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<Patient>>({});
    const [saving, setSaving] = useState(false);

    // Medical Notes State
    const [notes, setNotes] = useState("");
    const [savingNotes, setSavingNotes] = useState(false);

    // File Upload State
    const [uploading, setUploading] = useState(false);

    // Finance State
    const [isAddingTransaction, setIsAddingTransaction] = useState(false);
    const [transactionForm, setTransactionForm] = useState({
        description: '',
        amount: '',
        type: 'payment', // payment or charge
        status: 'paid',
        due_date: new Date().toISOString().split('T')[0],
        isInstallment: false,
        installments: 1
    });

    useEffect(() => {
        if (id) {
            fetchPatient();
            fetchTreatments();
            fetchFiles();
            fetchFinancialRecords();
        }
    }, [id]);

    const fetchPatient = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('patients')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            setPatient(data);
            setFormData(data);
            setNotes(data.medical_notes || "");
        } catch (error) {
            console.error('Error fetching patient:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTreatments = async () => {
        const { data } = await supabase
            .from('treatments')
            .select('*')
            .eq('patient_id', id)
            .order('created_at', { ascending: false });
        setTreatments(data || []);
    };

    const fetchFiles = async () => {
        const { data } = await supabase
            .from('patient_files')
            .select('*')
            .eq('patient_id', id)
            .order('created_at', { ascending: false });
        setFiles(data || []);
    };

    const fetchFinancialRecords = async () => {
        const { data } = await supabase
            .from('financial_records')
            .select('*')
            .eq('patient_id', id)
            .order('created_at', { ascending: false });
        setFinancialRecords(data || []);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveProfile = async () => {
        try {
            setSaving(true);
            const { error } = await supabase
                .from('patients')
                .update({
                    name: formData.name,
                    age: Number(formData.age),
                    gender: formData.gender,
                    email: formData.email,
                    phone: formData.phone,
                    allergies: formData.allergies
                })
                .eq('id', id);

            if (error) throw error;

            setPatient(prev => ({ ...prev!, ...formData } as Patient));
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating patient:', error);
            alert('Erro ao atualizar dados do paciente.');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveNotes = async () => {
        try {
            setSavingNotes(true);
            const { error } = await supabase
                .from('patients')
                .update({ medical_notes: notes })
                .eq('id', id);

            if (error) throw error;
            alert('Histórico médico atualizado com sucesso!');
        } catch (error) {
            console.error('Error saving notes:', error);
            alert('Erro ao salvar histórico médico.');
        } finally {
            setSavingNotes(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${id}/${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        try {
            setUploading(true);

            // 1. Upload to Storage
            const { error: uploadError } = await supabase.storage
                .from('patient-files')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('patient-files')
                .getPublicUrl(filePath);

            // 3. Save to Database
            const { error: dbError } = await supabase
                .from('patient_files')
                .insert([{
                    patient_id: id,
                    file_name: file.name,
                    file_url: publicUrl,
                    file_type: file.type,
                    size: file.size
                }]);

            if (dbError) throw dbError;

            fetchFiles();
            alert('Arquivo enviado com sucesso!');
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Erro ao enviar arquivo.');
        } finally {
            setUploading(false);
        }
    };

    const handleAddTransaction = async () => {
        try {
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
                        patient_id: id,
                        description: `${transactionForm.description} (${i + 1}/${installmentCount})`,
                        amount: installmentAmount,
                        type: transactionForm.type,
                        status: 'pending', // Installments usually start as pending
                        due_date: dueDate.toISOString().split('T')[0],
                        paid_date: null,
                        installment_number: i + 1,
                        total_installments: installmentCount
                    });
                }
            } else {
                recordsToInsert.push({
                    patient_id: id,
                    description: transactionForm.description,
                    amount: amount,
                    type: transactionForm.type,
                    status: transactionForm.status,
                    due_date: transactionForm.due_date,
                    paid_date: transactionForm.status === 'paid' ? new Date() : null,
                    installment_number: 1,
                    total_installments: 1
                });
            }

            const { error } = await supabase
                .from('financial_records')
                .insert(recordsToInsert);

            if (error) throw error;
            fetchFinancialRecords();
            setIsAddingTransaction(false);
            setTransactionForm({
                description: '',
                amount: '',
                type: 'payment',
                status: 'paid',
                due_date: new Date().toISOString().split('T')[0],
                isInstallment: false,
                installments: 1
            });
        } catch (error) {
            console.error('Error adding transaction:', error);
            alert('Erro ao adicionar transação.');
        }
    };

    const handleUpdateTransactionStatus = async (recordId: string, newStatus: string) => {
        try {
            await supabase
                .from('financial_records')
                .update({
                    status: newStatus,
                    paid_date: newStatus === 'paid' ? new Date() : null
                })
                .eq('id', recordId);
            fetchFinancialRecords();
        } catch (error) {
            console.error('Error updating transaction:', error);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    // Derived Financial Stats
    const totalPaid = financialRecords
        .filter(r => r.type === 'payment' && r.status === 'paid')
        .reduce((sum, r) => sum + r.amount, 0);

    // Total charged (procedures cost)
    const totalCharged = financialRecords
        .filter(r => r.type === 'charge')
        .reduce((sum, r) => sum + r.amount, 0);

    const outstandingBalance = totalCharged - totalPaid;

    if (loading) return <div className="p-10 flex justify-center text-gray-400">Carregando perfil...</div>;
    if (!patient) return <div className="p-10 flex justify-center text-gray-400">Paciente não encontrado.</div>;

    return (
        <>
            <header className="h-20 bg-white border-b border-purple-100 px-10 flex items-center justify-between sticky top-0 z-40">
                <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                        <Link href="/patients" className="text-gray-400 hover:text-primary transition-colors">Pacientes</Link>
                        <span className="material-symbols-outlined text-xs text-gray-300">chevron_right</span>
                        <span className="text-primary font-bold">Perfil de {patient.name}</span>
                    </div>
                </div>
            </header>

            <main className="p-10 space-y-10">
                <div className="grid grid-cols-12 gap-10">
                    {/* Sidebar de Perfil */}
                    <aside className="col-span-12 lg:col-span-4 space-y-8">
                        <div className="bg-white rounded-[2.5rem] p-10 shadow-soft border border-gray-50 transition-all duration-300">
                            {isEditing ? (
                                <div className="flex flex-col gap-4">
                                    <h2 className="text-lg font-bold text-sidebar-bg mb-2">Editar Informações</h2>
                                    <div>
                                        <label className="text-xs uppercase font-bold text-gray-400">Nome</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name || ''}
                                            onChange={handleInputChange}
                                            className="w-full mt-1 p-2 bg-gray-50 rounded-lg border-none text-sm font-bold text-sidebar-bg focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs uppercase font-bold text-gray-400">Idade</label>
                                            <input
                                                type="number"
                                                name="age"
                                                value={formData.age || ''}
                                                onChange={handleInputChange}
                                                className="w-full mt-1 p-2 bg-gray-50 rounded-lg border-none text-sm font-bold text-sidebar-bg focus:ring-2 focus:ring-primary/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs uppercase font-bold text-gray-400">Gênero</label>
                                            <select
                                                name="gender"
                                                value={formData.gender || ''}
                                                onChange={handleInputChange}
                                                className="w-full mt-1 p-2 bg-gray-50 rounded-lg border-none text-sm font-bold text-sidebar-bg focus:ring-2 focus:ring-primary/20"
                                            >
                                                <option value="Masculino">Masculino</option>
                                                <option value="Feminino">Feminino</option>
                                                <option value="Outro">Outro</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase font-bold text-gray-400">Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email || ''}
                                            onChange={handleInputChange}
                                            className="w-full mt-1 p-2 bg-gray-50 rounded-lg border-none text-sm font-bold text-sidebar-bg focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase font-bold text-gray-400">Telefone</label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone || ''}
                                            onChange={handleInputChange}
                                            className="w-full mt-1 p-2 bg-gray-50 rounded-lg border-none text-sm font-bold text-sidebar-bg focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase font-bold text-gray-400">Alergias (separadas por vírgula)</label>
                                        <input
                                            type="text"
                                            name="allergies"
                                            value={formData.allergies?.join(', ') || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, allergies: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                                            placeholder="Ex: Penicilina, Sulfa"
                                            className="w-full mt-1 p-2 bg-gray-50 rounded-lg border-none text-sm font-bold text-sidebar-bg focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>

                                    <div className="flex gap-2 mt-4">
                                        <button
                                            onClick={() => { setIsEditing(false); setFormData(patient); }}
                                            className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-500 font-bold text-sm"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleSaveProfile}
                                            disabled={saving}
                                            className="flex-1 py-2 rounded-xl bg-primary text-white font-bold text-sm shadow-lg disabled:opacity-50"
                                        >
                                            {saving ? 'Salvando...' : 'Salvar'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <div className="relative group">
                                        <div
                                            className="size-32 rounded-[2rem] bg-center bg-cover shadow-2xl ring-4 ring-white transform group-hover:scale-105 transition-transform duration-300 flex items-center justify-center bg-gray-100 text-3xl font-bold text-gray-400"
                                        >
                                            {patient.name.charAt(0)}
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 size-8 bg-green-500 border-4 border-white rounded-2xl shadow-lg"></div>
                                    </div>
                                    <h2 className="mt-6 text-2xl font-extrabold text-sidebar-bg text-center">{patient.name}</h2>
                                    <p className="text-gray-400 font-medium">#{patient.id.slice(0, 8)} • {patient.gender === 'Masculino' ? 'Masc' : 'Fem'} • {patient.age} Anos</p>

                                    {/* Alergias Warning */}
                                    {patient.allergies && patient.allergies.length > 0 && (
                                        <div className="mt-4">
                                            <span className="px-4 py-1.5 bg-red-50 text-red-600 rounded-2xl text-xs font-extrabold uppercase tracking-tight flex items-center gap-2 border border-red-100">
                                                <span className="material-symbols-outlined text-base">warning</span> {patient.allergies[0]}
                                                {patient.allergies.length > 1 && ` +${patient.allergies.length - 1}`}
                                            </span>
                                        </div>
                                    )}

                                    <div className="mt-10 grid grid-cols-1 gap-3 w-full">
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="flex items-center justify-center gap-2 rounded-2xl py-4 bg-gray-50 text-sidebar-bg font-bold transition hover:bg-gray-100 w-full"
                                        >
                                            <span className="material-symbols-outlined">edit</span> Editar Perfil
                                        </button>
                                    </div>

                                    <div className="mt-10 pt-10 border-t border-gray-50 space-y-6 w-full">
                                        <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Informações de Contato</h3>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-4 group cursor-pointer">
                                                <div className="size-10 rounded-2xl bg-gray-50 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                                    <span className="material-symbols-outlined text-xl">alternate_email</span>
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-[10px] text-gray-400 uppercase font-bold">E-mail</p>
                                                    <p className="text-sm font-semibold text-sidebar-bg truncate">{patient.email || 'Não informado'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 group cursor-pointer">
                                                <div className="size-10 rounded-2xl bg-gray-50 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                                    <span className="material-symbols-outlined text-xl">call</span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 uppercase font-bold">Telefone</p>
                                                    <p className="text-sm font-semibold text-sidebar-bg">{patient.phone || 'Não informado'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-gray-50 shadow-soft">
                            <p className="text-xs text-gray-400 font-bold uppercase mb-2">Saldo Devedor Calculado</p>
                            <p className={`text-xl font-extrabold ${outstandingBalance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {formatCurrency(outstandingBalance)}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-2">
                                Total Cobrado: {formatCurrency(totalCharged)} <br />
                                Total Pago: {formatCurrency(totalPaid)}
                            </p>
                        </div>
                    </aside>

                    {/* Conteúdo Principal */}
                    <div className="col-span-12 lg:col-span-8 space-y-8">
                        <div className="bg-white rounded-[2.5rem] shadow-soft border border-gray-50 overflow-hidden">
                            <div className="flex border-b border-gray-50 px-8 bg-gray-50/30 overflow-x-auto">
                                {['Histórico Médico', 'Tratamentos', 'Arquivos', 'Financeiro'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-8 py-6 text-sm font-extrabold transition-all relative whitespace-nowrap ${activeTab === tab ? 'text-primary border-b-4 border-primary' : 'text-gray-400 hover:text-primary'
                                            }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>

                            <div className="p-10">
                                {activeTab === 'Histórico Médico' && (
                                    <div>
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-xl font-extrabold text-sidebar-bg flex items-center gap-3">
                                                <span className="material-symbols-outlined icon-gradient text-3xl">fact_check</span> Avaliação de Saúde
                                            </h3>
                                            <button
                                                onClick={handleSaveNotes}
                                                disabled={savingNotes}
                                                className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-lg hover:bg-primary-dark transition-all disabled:opacity-50"
                                            >
                                                {savingNotes ? 'Salvando...' : 'Salvar Alterações'}
                                            </button>
                                        </div>
                                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                            <label className="text-xs font-bold text-gray-400 uppercase mb-3 block">Anotações e Alergias</label>
                                            <textarea
                                                className="w-full bg-white rounded-xl border-none p-4 text-sm font-medium text-gray-700 min-h-[300px] focus:ring-2 focus:ring-primary/20"
                                                placeholder="Digite aqui todo o histórico médico, alergias, medicamentos e observações importantes do paciente..."
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                            ></textarea>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'Tratamentos' && (
                                    <div>
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-xl font-extrabold text-sidebar-bg flex items-center gap-3">
                                                <span className="material-symbols-outlined icon-gradient text-3xl">dentistry</span> Tratamentos Realizados
                                            </h3>
                                            <Link href="/treatments" className="text-primary text-sm font-bold hover:underline">
                                                Gerenciar Tratamentos
                                            </Link>
                                        </div>
                                        <div className="space-y-4">
                                            {treatments.length === 0 ? (
                                                <p className="text-center text-gray-400 py-10">Nenhum tratamento registrado.</p>
                                            ) : (
                                                treatments.map((treatment) => (
                                                    <div key={treatment.id} className="bg-gray-50 rounded-2xl p-5 flex items-center justify-between border border-gray-100 hover:border-primary/30 transition-colors">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`size-12 rounded-xl flex items-center justify-center text-xl shadow-sm ${treatment.status === 'Concluído' ? 'bg-green-100 text-green-600' :
                                                                treatment.status === 'Urgente' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                                                                }`}>
                                                                <span className="material-symbols-outlined">
                                                                    {treatment.status === 'Concluído' ? 'check' : 'medical_services'}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-gray-800">{treatment.title} {treatment.tooth_number && `(Dente ${treatment.tooth_number})`}</h4>
                                                                <p className="text-xs text-gray-500 font-medium">
                                                                    {new Date(treatment.created_at).toLocaleDateString()} • {treatment.status}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-extrabold text-sidebar-bg">{formatCurrency(treatment.cost)}</p>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'Arquivos' && (
                                    <div>
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-xl font-extrabold text-sidebar-bg flex items-center gap-3">
                                                <span className="material-symbols-outlined icon-gradient text-3xl">folder_open</span> Arquivos e Exames
                                            </h3>
                                            <label className={`cursor-pointer px-6 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold shadow-lg hover:bg-gray-200 transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                                {uploading ? 'Enviando...' : 'Enviar Arquivo'}
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    onChange={handleFileUpload}
                                                    disabled={uploading}
                                                />
                                            </label>
                                        </div>
                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                                            {files.length === 0 ? (
                                                <div className="col-span-full py-10 text-center text-gray-400">
                                                    Nenhum arquivo enviado ainda.
                                                </div>
                                            ) : (
                                                files.map((file) => (
                                                    <a
                                                        key={file.id}
                                                        href={file.file_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="group bg-gray-50 rounded-2xl p-4 border border-gray-100 hover:border-primary/50 hover:shadow-lg transition-all flex flex-col items-center text-center relative"
                                                    >
                                                        <div className="size-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-3 text-primary group-hover:scale-110 transition-transform">
                                                            <span className="material-symbols-outlined text-2xl">
                                                                {file.file_type.includes('image') ? 'image' : 'description'}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs font-bold text-gray-700 w-full truncate px-2">{file.file_name}</p>
                                                        <p className="text-[10px] text-gray-400 font-medium mt-1">
                                                            {(file.size / 1024).toFixed(0)} KB • {new Date(file.created_at).toLocaleDateString()}
                                                        </p>

                                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="material-symbols-outlined text-gray-400 text-sm">open_in_new</span>
                                                        </div>
                                                    </a>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'Financeiro' && (
                                    <div>
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-xl font-extrabold text-sidebar-bg flex items-center gap-3">
                                                <span className="material-symbols-outlined icon-gradient text-3xl">payments</span> Histórico Financeiro
                                            </h3>
                                            <button
                                                onClick={() => setIsAddingTransaction(!isAddingTransaction)}
                                                className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-lg hover:bg-primary-dark transition-all"
                                            >
                                                {isAddingTransaction ? 'Cancelar' : 'Nova Transação'}
                                            </button>
                                        </div>

                                        {isAddingTransaction && (
                                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mb-6 animate-in slide-in-from-top-2">
                                                <h4 className="font-bold text-gray-700 mb-4">Adicionar Pagamento ou Cobrança</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Descrição</label>
                                                        <input
                                                            type="text"
                                                            value={transactionForm.description}
                                                            onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                                                            className="w-full bg-white p-2 rounded-lg text-sm border-none shadow-sm font-semibold"
                                                            placeholder="Ex: Restauração 2x"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Valor (R$)</label>
                                                        <input
                                                            type="number"
                                                            value={transactionForm.amount}
                                                            onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                                                            className="w-full bg-white p-2 rounded-lg text-sm border-none shadow-sm font-semibold"
                                                            placeholder="0,00"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Tipo</label>
                                                        <select
                                                            value={transactionForm.type}
                                                            onChange={(e) => setTransactionForm({ ...transactionForm, type: e.target.value as 'charge' | 'payment' })}
                                                            className="w-full bg-white p-2 rounded-lg text-sm border-none shadow-sm font-semibold"
                                                        >
                                                            <option value="payment">Pagamento (Entrada)</option>
                                                            <option value="charge">Cobrança (Obrigação)</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Status</label>
                                                        <select
                                                            value={transactionForm.status}
                                                            onChange={(e) => setTransactionForm({ ...transactionForm, status: e.target.value as any })}
                                                            className="w-full bg-white p-2 rounded-lg text-sm border-none shadow-sm font-semibold"
                                                        >
                                                            <option value="paid">Pago / Recebido</option>
                                                            <option value="pending">Pendente</option>
                                                            <option value="overdue">Atrasado</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="mt-4 flex items-center gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            id="installmentCheck"
                                                            checked={transactionForm.isInstallment}
                                                            onChange={(e) => setTransactionForm({ ...transactionForm, isInstallment: e.target.checked })}
                                                            className="rounded text-primary focus:ring-primary"
                                                        />
                                                        <label htmlFor="installmentCheck" className="text-sm font-bold text-gray-600">Parcelado?</label>
                                                    </div>

                                                    {transactionForm.isInstallment && (
                                                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                                                            <label className="text-xs font-bold text-gray-400 uppercase">Nº Parcelas:</label>
                                                            <input
                                                                type="number"
                                                                min="2"
                                                                max="24"
                                                                value={transactionForm.installments}
                                                                onChange={(e) => setTransactionForm({ ...transactionForm, installments: parseInt(e.target.value) || 2 })}
                                                                className="w-20 bg-white p-1.5 rounded-lg text-sm border-none shadow-sm font-semibold"
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                <button
                                                    onClick={handleAddTransaction}
                                                    disabled={!transactionForm.amount || !transactionForm.description}
                                                    className="w-full mt-4 py-3 bg-green-500 text-white font-bold rounded-xl shadow-md hover:bg-green-600 transition-colors disabled:opacity-50"
                                                >
                                                    Salvar Transação
                                                </button>
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            {financialRecords.length === 0 ? (
                                                <p className="text-center text-gray-400 py-10">Nenhuma movimentação financeira registrada.</p>
                                            ) : (
                                                financialRecords.map((record) => (
                                                    <div key={record.id} className="bg-white rounded-2xl p-5 flex items-center justify-between border border-gray-100 hover:shadow-md transition-shadow">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`size-10 rounded-full flex items-center justify-center text-lg ${record.type === 'payment' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                                                }`}>
                                                                <span className="material-symbols-outlined">
                                                                    {record.type === 'payment' ? 'arrow_downward' : 'arrow_upward'}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-gray-800">{record.description}</h4>
                                                                <p className="text-xs text-gray-500 font-medium capitalize">
                                                                    {new Date(record.created_at).toLocaleDateString()} • {record.status === 'paid' ? 'Pago' : record.status === 'pending' ? 'Pendente' : 'Atrasado'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <span className={`font-extrabold ${record.type === 'payment' ? 'text-green-600' : 'text-red-500'}`}>
                                                                {record.type === 'payment' ? '+ ' : '- '}
                                                                {formatCurrency(record.amount)}
                                                            </span>
                                                            {record.status !== 'paid' && (
                                                                <button
                                                                    onClick={() => handleUpdateTransactionStatus(record.id, 'paid')}
                                                                    className="size-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-green-100 hover:text-green-600 transition-colors"
                                                                    title="Marcar como Pago"
                                                                >
                                                                    <span className="material-symbols-outlined text-sm">check</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}
