import { useState, useEffect } from 'react';
import { Calendar, Stethoscope, User, Search, Activity, Users, Filter } from 'lucide-react';
import { DoctorQueueView } from './DoctorQueueView';
import { UnifiedOperationsHub } from './UnifiedOperationsHub';
import API_ENDPOINTS from '../config/api';
import { DoctorProfileView } from './DoctorProfileView';
import { useIsLightTheme } from '../hooks/useTheme';

interface DoctorPortalProps {
    username: string;
    onLogout: () => void;
    onViewChange: (view: any) => void;
    onPatientSelected?: (patient: any) => void;
}

type PortalView = 'dashboard' | 'queue';

export function DoctorPortal({ username, onLogout, onViewChange, onPatientSelected }: DoctorPortalProps) {
    const [activeTab, setActiveTab] = useState<PortalView>('dashboard');
    const isLight = useIsLightTheme();
    const activeCol = isLight ? '#753d3e' : '#D4A574';
    const inactiveCol = isLight ? '#6c757d' : '#6B6B6B';

    const navItems = [
        { id: 'dashboard' as PortalView, label: 'Operations Hub', icon: Activity, desc: 'Patient Overview' },
    ];


    const handleCheckIn = async (patient: any) => {
        try {
            if (onPatientSelected) {
                onPatientSelected(patient);
            }
            setActiveTab('queue');
        } catch (e) {
            console.error('Check-in failed:', e);
        }
    };


    return (
        <div className="flex flex-col bg-[var(--theme-bg)] min-h-screen">
            {/* Horizontal Portal Navigation */}
            <div className="bg-[var(--theme-bg-secondary)] border-b border-[var(--theme-accent)]/30 flex items-center justify-between px-10 py-5 sticky top-[80px] z-40 shadow-xl">
                <div className="flex items-center gap-6">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--theme-accent)]/20 to-[var(--theme-accent)]/5 flex items-center justify-center border border-[var(--theme-accent)]/10 shadow-lg group">
                        <User className="w-6 h-6 text-[var(--theme-accent)] transition-transform duration-500 group-hover:scale-110" />
                    </div>
                    <div>
                        <p className="text-[var(--theme-text)] text-[11px] font-black uppercase tracking-[0.25em] leading-none mb-1.5 opacity-80">Doctor Portal</p>
                        <h2 className="text-lg font-bold text-[var(--theme-text)] leading-none tracking-tight">
                            Dr. {username}
                        </h2>
                    </div>
                </div>


                <div className="flex items-center gap-10 ml-auto">
                    <nav className="flex items-center gap-4">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`group flex items-center gap-4 px-6 py-3 rounded-[20px] transition-all duration-500 min-w-[200px] ${activeTab === item.id
                                    ? 'bg-[var(--theme-bg-input)] border border-[var(--theme-accent)] text-[var(--theme-text)] shadow-[0_0_20px_rgba(var(--theme-accent-rgb),0.1)]'
                                    : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] hover:bg-[var(--theme-bg-tertiary)] border border-transparent hover:border-[var(--theme-accent)]'
                                    }`}
                            >
                                <div className={`p-2 rounded-xl transition-all duration-500 ${activeTab === item.id ? 'bg-[var(--theme-accent)]/10' : 'bg-[var(--theme-bg-tertiary)]'}`}>
                                    <item.icon
                                        style={{ color: activeTab === item.id ? activeCol : inactiveCol }}
                                        className={`w-5 h-5 transition-transform duration-500 group-hover:scale-110`}
                                    />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-black leading-none tracking-tight">{item.label}</p>
                                    <p className={`text-[10px] mt-1 transition-colors ${activeTab === item.id ? 'text-[var(--theme-text-secondary)]' : 'text-[var(--theme-text-muted)]'}`}>{item.desc}</p>
                                </div>
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col bg-gradient-to-br from-[var(--theme-bg-gradient-from)] to-[var(--theme-bg-gradient-to)] overflow-hidden">
                {activeTab === 'dashboard' && (
                    <UnifiedOperationsHub
                        username={username}
                        userRole="doctor"
                        onPatientSelected={onPatientSelected}
                        onNavigate={(tab: string) => setActiveTab(tab as PortalView)}
                    />
                )}

                {activeTab === 'queue' && (
                    <div className="flex-1 p-8">
                        <DoctorQueueView onPatientSelected={onPatientSelected} />
                    </div>
                )}
            </div>
        </div>
    );
}
