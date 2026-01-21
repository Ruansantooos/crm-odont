'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import SearchableSelect from "@/components/SearchableSelect";

interface Treatment {
    id: string;
    patient_id: string;
    title: string;
    description: string;
    cost: number;
    status: string;
    tooth_number: number | null;
    created_at: string;
    patients?: {
        name: string;
    };
}

interface Patient {
    id: string;
    name: string;
}

export default function TreatmentsPage() {
    const [treatments, setTreatments] = useState<Treatment[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [newTreatment, setNewTreatment] = useState({
        patient_id: "",
        title: "",
        description: "",
        cost: "",
        status: "Planejado",
        tooth_number: "",
    });

    useEffect(() => {
        fetchTreatments();
        fetchPatients();
    }, []);

    const fetchTreatments = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('treatments')
                .select('*, patients(name)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTreatments(data || []);
        } catch (error) {
            console.error("Error fetching treatments:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPatients = async () => {
        try {
            const { data, error } = await supabase
                .from('patients')
                .select('id, name')
                .order('name');

            if (error) throw error;
            setPatients(data || []);
        } catch (error) {
            console.error("Error fetching patients:", error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setNewTreatment(prev => ({ ...prev, [name]: value }));
    };

    const handleEdit = (treatment: Treatment) => {
        setEditingId(treatment.id);
        setNewTreatment({
            patient_id: treatment.patient_id,
            title: treatment.title,
            description: treatment.description || "",
            cost: treatment.cost.toString(),
            status: treatment.status,
            tooth_number: treatment.tooth_number ? treatment.tooth_number.toString() : "",
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const treatmentData = {
                patient_id: newTreatment.patient_id || selectedPatientId,
                title: newTreatment.title,
                description: newTreatment.description,
                cost: parseFloat(newTreatment.cost) || 0,
                status: newTreatment.status,
                tooth_number: newTreatment.tooth_number ? parseInt(newTreatment.tooth_number) : null
            };

            if (editingId) {
                const { error } = await supabase
                    .from('treatments')
                    .update(treatmentData)
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('treatments')
                    .insert([treatmentData]);
                if (error) throw error;
            }

            setIsModalOpen(false);
            setEditingId(null);
            setNewTreatment({
                patient_id: selectedPatientId,
                title: "",
                description: "",
                cost: "",
                status: "Planejado",
                tooth_number: "",
            });
            fetchTreatments();
        } catch (error) {
            console.error("Error saving treatment:", error);
            alert("Erro ao salvar tratamento. Verifique se um paciente foi selecionado.");
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const filteredTreatments = selectedPatientId
        ? treatments.filter(t => t.patient_id === selectedPatientId)
        : treatments;

    const getToothStyle = (toothNumber: number) => {
        if (!selectedPatientId) return 'border-gray-200 bg-gray-50 text-gray-300';

        const toothTreatments = filteredTreatments.filter(t => t.tooth_number === toothNumber);

        if (toothTreatments.some(t => t.status === 'Urgente')) return 'border-2 border-red-500 bg-red-50 text-red-500';
        if (toothTreatments.some(t => t.status === 'Em Andamento')) return 'border-2 border-primary bg-primary/5 text-primary';
        if (toothTreatments.some(t => t.status === 'Concluído')) return 'border-2 border-green-500 bg-green-50 text-green-600';
        if (toothTreatments.some(t => t.status === 'Planejado')) return 'border-2 border-yellow-400 bg-yellow-50 text-yellow-600';

        return 'border-gray-200 bg-gray-50 text-gray-300';
    };

    const getToothIcon = (toothNumber: number) => {
        if (!selectedPatientId) return 'dentistry';

        const toothTreatments = filteredTreatments.filter(t => t.tooth_number === toothNumber);
        if (toothTreatments.some(t => t.status === 'Urgente')) return 'warning';
        if (toothTreatments.some(t => t.status === 'Concluído')) return 'check_circle';

        return 'dentistry';
    }

    const openModalForTooth = (tooth: number) => {
        if (!selectedPatientId) return;
        setNewTreatment(prev => ({
            ...prev,
            tooth_number: tooth.toString(),
            patient_id: selectedPatientId
        }));
        setIsModalOpen(true);
    };

    return (
        <>
            <header className="flex items-center justify-between border-b border-gray-100 bg-white px-10 py-5 sticky top-0 z-40">
                <div className="flex items-center gap-6 flex-1 max-w-2xl">
                    <h2 className="text-2xl font-extrabold tracking-tight text-sidebar-bg whitespace-nowrap">Tratamentos</h2>

                    <div className="w-full max-w-sm">
                        <SearchableSelect
                            options={patients.map(p => ({ id: p.id, label: p.name }))}
                            value={selectedPatientId}
                            onChange={setSelectedPatientId}
                            placeholder="Buscar Paciente..."
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            setEditingId(null);
                            setNewTreatment(prev => ({ ...prev, patient_id: selectedPatientId || "", title: "", description: "", cost: "", status: "Planejado", tooth_number: "" }));
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/25 whitespace-nowrap"
                    >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        Novo Plano de Tratamento
                    </button>
                </div>
            </header>

            <main className="p-10 space-y-10">
                <div className="bg-white rounded-[2.5rem] border border-gray-50 shadow-soft overflow-hidden">
                    <div className="flex items-center justify-between p-8 border-b border-gray-50">
                        <h2 className="text-lg font-bold text-sidebar-bg flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">analytics</span>
                            {selectedPatientId
                                ? `Odontograma: ${patients.find(p => p.id === selectedPatientId)?.name}`
                                : 'Odontograma (Selecione um paciente para visualizar)'}
                        </h2>
                        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            <div className="flex items-center gap-1.5"><span className="size-3 rounded-md bg-green-500"></span> Concluído</div>
                            <div className="flex items-center gap-1.5"><span className="size-3 rounded-md bg-primary"></span> Em Andamento</div>
                            <div className="flex items-center gap-1.5"><span className="size-3 rounded-md bg-yellow-400"></span> Planejado</div>
                            <div className="flex items-center gap-1.5"><span className="size-3 rounded-md bg-red-500"></span> Urgente</div>
                        </div>
                    </div>

                    <div className={`p-10 transition-all duration-300 ${!selectedPatientId ? 'opacity-40 grayscale pointer-events-none filter' : ''}`}>
                        {/* Upper Teeth */}
                        <div className="mb-12">
                            <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-3 px-2">
                                <span>Superior Direito (18-11)</span>
                                <span>Superior Esquerdo (21-28)</span>
                            </div>
                            <div className="calendar-grid gap-4" style={{ gridTemplateColumns: 'repeat(16, 1fr)' }}>
                                {[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map(tooth => (
                                    <button
                                        key={tooth}
                                        onClick={() => openModalForTooth(tooth)}
                                        className="flex flex-col items-center gap-1 group focus:outline-none"
                                        type="button"
                                    >
                                        <span className="text-[10px] font-bold text-gray-400 group-hover:text-primary transition-colors">{tooth}</span>
                                        <div className={`w-full aspect-[2/3] border rounded-xl p-1 flex items-center justify-center transition-all shadow-sm ${getToothStyle(tooth)} transform group-hover:scale-110`}>
                                            <span className="material-symbols-outlined text-[18px]">{getToothIcon(tooth)}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* Lower Teeth */}
                        <div>
                            <div className="calendar-grid gap-4 mt-6" style={{ gridTemplateColumns: 'repeat(16, 1fr)' }}>
                                {[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map(tooth => (
                                    <button
                                        key={tooth}
                                        onClick={() => openModalForTooth(tooth)}
                                        className="flex flex-col items-center gap-1 group focus:outline-none"
                                        type="button"
                                    >
                                        <div className={`w-full aspect-[2/3] border rounded-xl p-1 flex items-center justify-center rotate-180 transition-all shadow-sm ${getToothStyle(tooth)} transform group-hover:scale-110`}>
                                            <span className="material-symbols-outlined text-[18px] transform rotate-180">{getToothIcon(tooth)}</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-400 group-hover:text-primary transition-colors">{tooth}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="flex justify-between text-[10px] font-bold text-gray-400 mt-3 px-2">
                                <span>Inferior Direito (48-41)</span>
                                <span>Inferior Esquerdo (31-38)</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="bg-white rounded-[2.5rem] border border-gray-50 shadow-soft overflow-hidden">
                        <div className="border-b border-gray-100 px-8 flex bg-gray-50/30">
                            {['Histórico de Tratamentos'].map((tab, idx) => (
                                <button
                                    key={tab}
                                    className={`px-8 py-6 text-sm font-extrabold transition-all text-primary border-b-4 border-primary`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                        <div className="p-0">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-400 border-b border-gray-100">
                                    <tr>
                                        <th className="px-8 py-5">Paciente</th>
                                        <th className="px-8 py-5">Tratamento</th>
                                        <th className="px-8 py-5">Status</th>
                                        <th className="px-8 py-5">Custo</th>
                                        <th className="px-8 py-5 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-5 text-center text-gray-400">Carregando tratamentos...</td>
                                        </tr>
                                    ) : filteredTreatments.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-5 text-center text-gray-400">
                                                {selectedPatientId
                                                    ? 'Nenhum tratamento encontrado para este paciente.'
                                                    : 'Mostrando todos os tratamentos. Selecione um paciente para filtrar.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredTreatments.map((treatment) => (
                                            <tr key={treatment.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-8 py-5 font-bold text-sidebar-bg">{treatment.patients?.name || 'Desconhecido'}</td>
                                                <td className="px-8 py-5 text-sm text-gray-600">
                                                    {treatment.title}
                                                    {treatment.tooth_number && <span className="ml-1 text-xs text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded">(Dente {treatment.tooth_number})</span>}
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${treatment.status === 'Urgente' ? 'bg-red-50 text-red-600' :
                                                        treatment.status === 'Em Andamento' ? 'bg-purple-50 text-primary' :
                                                            treatment.status === 'Concluído' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'
                                                        }`}>
                                                        {treatment.status}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-sm font-medium text-gray-900">{formatCurrency(treatment.cost)}</td>
                                                <td className="px-8 py-5 text-right">
                                                    <button
                                                        onClick={() => handleEdit(treatment)}
                                                        className="text-primary font-bold text-xs hover:underline"
                                                    >
                                                        Editar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>

            {/* Modal Novo Tratamento */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl transform transition-all">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-extrabold text-sidebar-bg">
                                {editingId ? 'Editar Tratamento' : 'Novo Tratamento'}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Paciente</label>
                                <SearchableSelect
                                    options={patients.map(p => ({ id: p.id, label: p.name }))}
                                    value={newTreatment.patient_id || selectedPatientId}
                                    onChange={(val) => setNewTreatment(prev => ({ ...prev, patient_id: val }))}
                                    placeholder="Selecione um paciente"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Título do Tratamento</label>
                                <input
                                    type="text"
                                    name="title"
                                    required
                                    value={newTreatment.title}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-primary/20 text-sm font-medium"
                                    placeholder="Ex: Restauração, Limpeza, Canal"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Dente (Opcional)</label>
                                    <input
                                        type="number"
                                        name="tooth_number"
                                        value={newTreatment.tooth_number}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-primary/20 text-sm font-medium"
                                        placeholder="Ex: 18"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Status</label>
                                    <select
                                        name="status"
                                        value={newTreatment.status}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-primary/20 text-sm font-medium"
                                    >
                                        <option value="Planejado">Planejado</option>
                                        <option value="Em Andamento">Em Andamento</option>
                                        <option value="Concluído">Concluído</option>
                                        <option value="Urgente">Urgente</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Custo Estimado (R$)</label>
                                <input
                                    type="number"
                                    name="cost"
                                    step="0.01"
                                    value={newTreatment.cost}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-primary/20 text-sm font-medium"
                                    placeholder="0.00"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Descrição</label>
                                <textarea
                                    name="description"
                                    rows={3}
                                    value={newTreatment.description}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-primary/20 text-sm font-medium resize-none"
                                    placeholder="Detalhes adicionais..."
                                />
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
                                    className="flex-1 py-3 rounded-xl bg-sidebar-bg text-white font-bold text-sm hover:bg-accent-purple transition-all shadow-lg disabled:opacity-50"
                                >
                                    {submitting ? 'Salvando...' : editingId ? 'Atualizar Tratamento' : 'Criar Tratamento'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
