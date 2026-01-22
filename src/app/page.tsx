export default function Dashboard() {
  return (
    <>
      <header className="flex items-center justify-between bg-white px-10 py-5 sticky top-0 z-10 border-b border-gray-100">
        <div className="flex items-center gap-10 flex-1">
          <h2 className="text-sidebar-bg text-xl font-extrabold tracking-tight">Painel Geral</h2>
          <div className="relative max-w-md w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </div>
            <input
              className="block w-full pl-11 pr-4 py-2.5 border-none bg-gray-50 rounded-xl text-sm placeholder-gray-400 focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="Buscar pacientes, registros..."
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="relative p-2.5 rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-pink-500 rounded-full border-2 border-white"></span>
          </button>
          <button className="p-2.5 rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors">
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </header>
      <div className="p-10 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Total de Pacientes */}
          <div className="flex flex-col gap-2 rounded-2xl p-7 bg-white shadow-soft border border-transparent hover:border-primary/10 transition-all">
            <div className="flex justify-between items-start">
              <p className="text-gray-400 text-sm font-bold uppercase tracking-wider">Total de Pacientes</p>
              <span className="p-3 bg-icon-gradient rounded-2xl text-white shadow-purple-glow">
                <span className="material-symbols-outlined">group</span>
              </span>
            </div>
            <p className="text-sidebar-bg text-4xl font-extrabold mt-1">1.240</p>
            <div className="flex items-center gap-1 mt-3">
              <span className="text-green-500 text-sm font-bold flex items-center bg-green-50 px-2 py-0.5 rounded-lg">
                <span className="material-symbols-outlined text-[16px] mr-1">trending_up</span>
                +12%
              </span>
              <span className="text-gray-400 text-xs font-medium ml-1">desde o mês passado</span>
            </div>
          </div>
          {/* Consultas Hoje */}
          <div className="flex flex-col gap-2 rounded-2xl p-7 bg-white shadow-soft border border-transparent hover:border-primary/10 transition-all">
            <div className="flex justify-between items-start">
              <p className="text-gray-400 text-sm font-bold uppercase tracking-wider">Consultas Hoje</p>
              <span className="p-3 bg-icon-gradient rounded-2xl text-white shadow-purple-glow">
                <span className="material-symbols-outlined">event_available</span>
              </span>
            </div>
            <p className="text-sidebar-bg text-4xl font-extrabold mt-1">12</p>
            <div className="flex items-center gap-1 mt-3">
              <span className="text-gray-400 text-sm font-medium bg-gray-50 px-2 py-0.5 rounded-lg">8 concluídas, 4 próximas</span>
            </div>
          </div>
          {/* Faturamento Mensal */}
          <div className="flex flex-col gap-2 rounded-2xl p-7 bg-white shadow-soft border border-transparent hover:border-primary/10 transition-all">
            <div className="flex justify-between items-start">
              <p className="text-gray-400 text-sm font-bold uppercase tracking-wider">Faturamento Mensal</p>
              <span className="p-3 bg-icon-gradient rounded-2xl text-white shadow-purple-glow">
                <span className="material-symbols-outlined">account_balance_wallet</span>
              </span>
            </div>
            <p className="text-sidebar-bg text-4xl font-extrabold mt-1">R$ 45.200</p>
            <div className="flex items-center gap-1 mt-3">
              <span className="text-pink-500 text-sm font-bold flex items-center bg-pink-50 px-2 py-0.5 rounded-lg">
                <span className="material-symbols-outlined text-[16px] mr-1">trending_down</span>
                -5%
              </span>
              <span className="text-gray-400 text-xs font-medium ml-1">em relação à meta</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sidebar-bg text-xl font-extrabold tracking-tight">Atividades Recentes</h3>
              <button className="text-accent-purple text-sm font-bold hover:text-primary transition-colors flex items-center gap-1">
                Ver Tudo <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-soft border border-gray-50">
              <div className="grid grid-cols-[48px_1fr] gap-x-5">
                {/* Atividade 1 */}
                <div className="flex flex-col items-center">
                  <div className="bg-icon-gradient p-2.5 rounded-full flex items-center justify-center shadow-lg">
                    <span className="material-symbols-outlined text-[20px] text-white">check_circle</span>
                  </div>
                  <div className="w-[2px] bg-gray-100 h-14 my-1"></div>
                </div>
                <div className="flex flex-1 flex-col pb-8">
                  <div className="flex items-center justify-between">
                    <p className="text-sidebar-bg text-base font-bold">João Silva fez check-in</p>
                    <p className="text-gray-400 text-sm font-medium">10:30</p>
                  </div>
                  <p className="text-gray-500 text-sm mt-1">Atendido por <span className="text-accent-purple font-semibold">Dr. Fabrício</span> • Consultório 04</p>
                </div>
                {/* Atividade 2 */}
                <div className="flex flex-col items-center">
                  <div className="bg-icon-gradient p-2.5 rounded-full flex items-center justify-center shadow-lg">
                    <span className="material-symbols-outlined text-[20px] text-white">calendar_add_on</span>
                  </div>
                  <div className="w-[2px] bg-gray-100 h-14 my-1"></div>
                </div>
                <div className="flex flex-1 flex-col pb-8">
                  <div className="flex items-center justify-between">
                    <p className="text-sidebar-bg text-base font-bold">Consulta agendada: Maria Oliveira</p>
                    <p className="text-gray-400 text-sm font-medium">09:45</p>
                  </div>
                  <p className="text-gray-500 text-sm mt-1">Tratamento de Canal • <span className="text-accent-purple font-semibold">14 Out, 2023</span></p>
                </div>
                {/* Atividade 3 */}
                <div className="flex flex-col items-center">
                  <div className="bg-icon-gradient p-2.5 rounded-full flex items-center justify-center shadow-lg">
                    <span className="material-symbols-outlined text-[20px] text-white">clinical_notes</span>
                  </div>
                  <div className="w-[2px] bg-gray-100 h-14 my-1"></div>
                </div>
                <div className="flex flex-1 flex-col pb-8">
                  <div className="flex items-center justify-between">
                    <p className="text-sidebar-bg text-base font-bold">Plano de tratamento concluído</p>
                    <p className="text-gray-400 text-sm font-medium">09:15</p>
                  </div>
                  <p className="text-gray-500 text-sm mt-1">Ricardo Souza • Revisão Ortodôntica Fase 2</p>
                </div>
                {/* Atividade 4 */}
                <div className="flex flex-col items-center">
                  <div className="bg-icon-gradient p-2.5 rounded-full flex items-center justify-center shadow-lg">
                    <span className="material-symbols-outlined text-[20px] text-white">payments</span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col">
                  <div className="flex items-center justify-between">
                    <p className="text-sidebar-bg text-base font-bold">Pagamento recebido</p>
                    <p className="text-gray-400 text-sm font-medium">08:30</p>
                  </div>
                  <p className="text-gray-500 text-sm mt-1">Ana Costa • <span className="text-accent-purple font-bold">R$ 320,00</span> • Recibo #8829</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sidebar-bg text-xl font-extrabold tracking-tight">Próximos</h3>
              <button className="text-accent-purple text-sm font-bold hover:text-primary transition-colors">Ver Agenda</button>
            </div>
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl shadow-soft border border-gray-50 flex items-center gap-5 hover:translate-x-1 transition-transform cursor-pointer">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex flex-col items-center justify-center text-accent-purple font-extrabold shadow-inner">
                  <span className="text-sm leading-none">11:00</span>
                  <span className="text-[10px] uppercase font-bold text-gray-400">AM</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sidebar-bg font-bold text-base truncate">Roberto J. Wilson</p>
                  <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Limpeza Dental</p>
                </div>
                <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-200" title="Confirmado"></div>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-soft border border-gray-50 flex items-center gap-5 hover:translate-x-1 transition-transform cursor-pointer">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex flex-col items-center justify-center text-gray-500 font-extrabold shadow-inner">
                  <span className="text-sm leading-none">01:30</span>
                  <span className="text-[10px] uppercase font-bold text-gray-400">PM</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sidebar-bg font-bold text-base truncate">Emily Brown</p>
                  <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Restauração</p>
                </div>
                <div className="w-3 h-3 rounded-full bg-orange-400 shadow-lg shadow-orange-200" title="A caminho"></div>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-soft border border-gray-50 flex items-center gap-5 hover:translate-x-1 transition-transform cursor-pointer opacity-70">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex flex-col items-center justify-center text-gray-500 font-extrabold shadow-inner">
                  <span className="text-sm leading-none">03:00</span>
                  <span className="text-[10px] uppercase font-bold text-gray-400">PM</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sidebar-bg font-bold text-base truncate">David Lee</p>
                  <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Consulta Inicial</p>
                </div>
                <div className="w-3 h-3 rounded-full bg-gray-200" title="Agendado"></div>
              </div>
            </div>
            <div className="mt-8 p-7 rounded-2xl bg-icon-gradient text-white space-y-4 relative overflow-hidden shadow-purple-glow">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-[18px]">lightbulb</span>
                  <p className="text-xs font-bold uppercase tracking-widest text-white/80">Dica do Dia</p>
                </div>
                <p className="text-sm font-medium leading-relaxed">Você tem 4 sessões seguidas à tarde. Certifique-se de que o Consultório 2 esteja esterilizado até as 13:00.</p>
                <button className="mt-4 text-xs font-bold bg-white text-sidebar-bg px-4 py-2 rounded-xl shadow-lg hover:bg-white/90 transition-all">Entendido</button>
              </div>
              <div className="absolute -right-6 -bottom-6 opacity-15">
                <span className="material-symbols-outlined text-[120px]">dentistry</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
