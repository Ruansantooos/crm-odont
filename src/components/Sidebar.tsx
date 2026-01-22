"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
    { name: "Painel Geral", href: "/", icon: "dashboard" },
    { name: "Pacientes", href: "/patients", icon: "group" },
    { name: "Agenda", href: "/calendar", icon: "calendar_month" },
    { name: "Tratamentos", href: "/treatments", icon: "medical_services" },
    { name: "Financeiro", href: "/finance", icon: "payments" },
    { name: "Relatórios", href: "/reports", icon: "bar_chart" },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 flex-shrink-0 bg-sidebar-bg flex flex-col justify-between p-6 text-white h-screen">
            <div className="flex flex-col gap-10 text-white">
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 rounded-xl p-2.5 backdrop-blur-md">
                        <span className="material-symbols-outlined text-white text-2xl">dentistry</span>
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-white text-lg font-extrabold leading-tight tracking-tight">CRM Odonto</h1>
                        <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Gestão Clínica</p>
                    </div>
                </div>
                <nav className="flex flex-col gap-2">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                                    ? "bg-white/15 text-white shadow-sm ring-1 ring-white/20"
                                    : "text-white/70 hover:bg-white/5 hover:text-white"
                                    }`}
                            >
                                <span className={`material-symbols-outlined ${isActive ? 'fill-1' : ''}`}>
                                    {item.icon}
                                </span>
                                <span className={`text-sm ${isActive ? 'font-bold' : 'font-medium'}`}>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>
            <div className="flex flex-col gap-6">
                <button className="flex items-center justify-center gap-2 rounded-xl h-12 bg-white text-sidebar-bg text-sm font-black w-full shadow-lg hover:scale-[1.02] transition-all active:scale-[0.98]">
                    <span className="material-symbols-outlined text-[20px]">add_circle</span>
                    <span>Novo Paciente</span>
                </button>
                <div className="flex items-center gap-3 px-1 py-4 border-t border-white/10 pt-6">
                    <div
                        className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 ring-2 ring-white/20"
                        style={{
                            backgroundImage:
                                'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDqyqbDIwrliONI7znq1RpwLdDdop_LJ4IpPsUsuuwxO6Yy5DXl9sYhLrktuN77lm00491pO5MKnHKmoFpArXs_md-lg8EEEIcCzfhh9dNBKJZAYzWiAxfpWDUG6w-cJhPnYzYGNMGEh5hguj_Y9r6Ed8Np-xARw70KfnVHrF_oOtASnL40ihB4Xnd75dXOOSCk2-pej869xjhNuLm-KmPGjuyQ-M_zJIM5zc6yYRDAPc1KP5ltsS5vYAmOQzBcT2mGO-1NztTf5Vc")',
                        }}
                    ></div>
                    <div className="flex flex-col min-w-0">
                        <p className="text-white text-sm font-bold truncate">Dr. Fabrício</p>
                        <p className="text-white/40 text-[10px] font-bold uppercase truncate">Administrador</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
