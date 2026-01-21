export default function ReportsPage() {
    return (
        <>
            <header className="flex items-center justify-between border-b border-gray-100 bg-white px-10 py-5 sticky top-0 z-40">
                <h2 className="text-2xl font-extrabold tracking-tight text-sidebar-bg">Relatórios e Métricas</h2>
                <div className="flex items-center gap-4">
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-bold transition-all text-gray-600">
                        <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                        Últimos 30 Dias
                    </button>
                </div>
            </header>

            <main className="p-10 space-y-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Tendência de Faturamento */}
                    <div className="bg-white rounded-[2.5rem] border border-gray-50 shadow-soft p-10">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-lg font-bold text-sidebar-bg">Desempenho de Faturamento</h3>
                            <span className="text-[10px] font-bold text-green-500 bg-green-50 px-3 py-1 rounded-full uppercase">+18% vs mês ant.</span>
                        </div>
                        <div className="h-64 flex items-end gap-3 px-4">
                            {[40, 60, 45, 90, 65, 80, 50, 75, 85, 95, 70, 100].map((h, i) => (
                                <div key={i} className="flex-1 bg-primary/10 rounded-t-lg group relative cursor-pointer hover:bg-primary/30 transition-all" style={{ height: `${h}%` }}>
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-sidebar-bg text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap">
                                        R$ {(h * 250).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between mt-4 text-[10px] font-bold text-gray-400 px-4 uppercase tracking-widest">
                            <span>Jan</span><span>Mar</span><span>Jun</span><span>Set</span><span>Dez</span>
                        </div>
                    </div>

                    {/* Retenção de Pacientes */}
                    <div className="bg-white rounded-[2.5rem] border border-gray-50 shadow-soft p-10">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-lg font-bold text-sidebar-bg">Satisfação dos Pacientes</h3>
                            <div className="flex items-center gap-1 text-yellow-400">
                                {[...Array(5)].map((_, i) => <span key={i} className="material-symbols-outlined text-sm shrink-0">star</span>)}
                                <span className="text-sm font-bold text-sidebar-bg ml-2">4.9/5.0</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-center h-64 relative">
                            <div className="size-48 rounded-full border-[12px] border-primary/10 flex items-center justify-center">
                                <div className="size-48 rounded-full border-[12px] border-primary border-t-transparent border-r-transparent rotate-45 absolute"></div>
                                <div className="text-center">
                                    <p className="text-4xl font-black text-sidebar-bg">92%</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Taxa de Retenção</p>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-8">
                            <div className="bg-gray-50 p-4 rounded-2xl flex items-center gap-3">
                                <span className="size-3 rounded-full bg-primary"></span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Pacientes Recorrentes</span>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-2xl flex items-center gap-3">
                                <span className="size-3 rounded-full bg-primary/20"></span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Novas Indicações</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-gray-50 shadow-soft p-10">
                    <h3 className="text-lg font-bold text-sidebar-bg mb-10">Categorias de Relatórios</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { name: 'Excelência Operacional', desc: 'Tempo de espera e taxa de ocupação dos consultórios.', icon: 'clinical_notes' },
                            { name: 'Marketing e ROI', desc: 'Custo de aquisição de pacientes e conversão de leads.', icon: 'campaign' },
                            { name: 'Estoque e Insumos', desc: 'Frequência de uso de materiais e previsão de estoque.', icon: 'inventory_2' },
                        ].map((category, i) => (
                            <div key={i} className="p-6 rounded-3xl border border-gray-100 hover:border-primary/40 hover:bg-primary/5 transition-all group cursor-pointer">
                                <div className="size-12 rounded-2xl bg-gray-50 flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-all">
                                    <span className="material-symbols-outlined">{category.icon}</span>
                                </div>
                                <h4 className="font-bold text-sidebar-bg mb-2">{category.name}</h4>
                                <p className="text-xs text-gray-400 font-medium leading-relaxed">{category.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </>
    );
}
