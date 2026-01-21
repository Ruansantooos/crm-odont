'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Patient {
    id: string;
    name: string;
    age: number;
    gender: string;
    last_visit: string | null;
    status: string;
    balance: number;
    phone: string;
    email: string;
}

export default function PatientsPage() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newPatient, setNewPatient] = useState({
        name: "",
        age: "",
        gender: "Masculino",
        phone: "",
        email: "",
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('patients')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPatients(data || []);
        } catch (error) {
            console.error("Error fetching patients:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNewPatient(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const { data, error } = await supabase
                .from('patients')
                .insert([
                    {
                        name: newPatient.name,
                        age: parseInt(newPatient.age),
                        gender: newPatient.gender,
                        phone: newPatient.phone,
                        email: newPatient.email,
                        status: 'Ativo',
                        balance: 0
                    }
                ])
                .select();

            if (error) throw error;

            setNewPatient({ name: "", age: "", gender: "Masculino", phone: "", email: "" });
            setIsModalOpen(false);
            fetchPatients();
        } catch (error) {
            console.error("Error creating patient:", error);
            alert("Erro ao criar paciente. Verifique se o banco de dados está configurado.");
        } finally {
            setSubmitting(false);
        }
    };

    const filteredPatients = patients.filter(patient =>
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (patient.id && patient.id.toLowerCase().includes(searchTerm.toLowerCase()))
    );

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
                    <h2 className="text-sidebar-bg text-xl font-extrabold tracking-tight">Gestão de Pacientes</h2>
                    <div className="relative max-w-md w-full">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400">
                            <span className="material-symbols-outlined text-[20px]">search</span>
                        </div>
                        <input
                            className="block w-full pl-11 pr-4 py-2.5 border-none bg-gray-50 rounded-xl text-sm placeholder-gray-400 focus:ring-2 focus:ring-primary/20 transition-all"
                            placeholder="Buscar por nome, ID ou telefone..."
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 rounded-xl px-5 py-2.5 bg-sidebar-bg text-white text-sm font-bold shadow-lg hover:bg-accent-purple transition-all"
                    >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        <span>Novo Paciente</span>
                    </button>
                </div>
            </header>

            <div className="p-10">
                <div className="bg-white rounded-2xl shadow-soft border border-gray-50 overflow-hidden min-h-[400px]">
                    {loading ? (
                        <div className="flex items-center justify-center h-64 text-gray-400">
                            Carregando participantes...
                        </div>
                    ) : filteredPatients.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <span className="material-symbols-outlined text-4xl mb-2">person_off</span>
                            <p>Nenhum paciente encontrado.</p>
                        </div>
                    ) : (
                        <>
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-400 border-b border-gray-100">
                                    <tr>
                                        <th className="px-8 py-5">ID Paciente</th>
                                        <th className="px-8 py-5">Nome</th>
                                        <th className="px-8 py-5">Status</th>
                                        <th className="px-8 py-5">Última Visita</th>
                                        <th className="px-8 py-5">Saldo</th>
                                        <th className="px-8 py-5 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredPatients.map((patient) => (
                                        <tr key={patient.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-8 py-5">
                                                <span className="text-xs font-bold text-gray-400">#{patient.id.slice(0, 8)}</span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                        {patient.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <Link href={`/patients/${patient.id}`} className="text-sm font-bold text-sidebar-bg hover:text-accent-purple transition-colors">
                                                        {patient.name}
                                                    </Link>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${patient.status === 'Ativo' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    {patient.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="text-sm text-gray-500 font-medium">
                                                    {patient.last_visit ? new Date(patient.last_visit).toLocaleDateString() : '-'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`text-sm font-bold ${patient.balance > 0 ? 'text-red-500' : 'text-gray-900'}`}>
                                                    {formatCurrency(patient.balance)}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <button className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-sidebar-bg transition-all">
                                                    <span className="material-symbols-outlined text-[20px]">more_vert</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="px-8 py-4 bg-gray-50/50 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400 font-medium">
                                <p>Mostrando {filteredPatients.length} pacientes</p>
                                <div className="flex gap-2">
                                    <button className="px-3 py-1 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-all" disabled>Anterior</button>
                                    <button className="px-3 py-1 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-all" disabled>Próximo</button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Modal Novo Paciente */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl transform transition-all">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-extrabold text-sidebar-bg">Novo Paciente</h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nome Completo</label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    value={newPatient.name}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-primary/20 text-sm font-medium"
                                    placeholder="Ex: João da Silva"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Idade</label>
                                    <input
                                        type="number"
                                        name="age"
                                        required
                                        value={newPatient.age}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-primary/20 text-sm font-medium"
                                        placeholder="Ex: 38"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Gênero</label>
                                    <select
                                        name="gender"
                                        value={newPatient.gender}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-primary/20 text-sm font-medium"
                                    >
                                        <option value="Masculino">Masculino</option>
                                        <option value="Feminino">Feminino</option>
                                        <option value="Outro">Outro</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Telefone</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={newPatient.phone}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-primary/20 text-sm font-medium"
                                        placeholder="(11) 99999-9999"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">E-mail</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={newPatient.email}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-primary/20 text-sm font-medium"
                                        placeholder="email@exemplo.com"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-3 rounded-xl border border-gray-100 text-gray-500 font-bold text-sm hover:bg-gray-50 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-3 rounded-xl bg-sidebar-bg text-white font-bold text-sm hover:bg-accent-purple transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? 'Salvando...' : 'Cadastrar Paciente'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
