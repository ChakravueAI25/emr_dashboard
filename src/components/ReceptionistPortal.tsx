import { useState, useEffect } from 'react';
import { CalendarPlus, User, Zap, Activity } from 'lucide-react';
import API_ENDPOINTS from '../config/api';
import { AppointmentBookingView } from './AppointmentBookingView';
import { UnifiedOperationsHub } from './UnifiedOperationsHub';
import { useIsLightTheme } from '../hooks/useTheme';

interface ReceptionistPortalProps {
    username: string;
    onLogout: () => void;
    onViewChange: (view: any) => void;
    onPatientSelected?: (patient: any) => void;
}

type PortalView = 'dashboard' | 'booking' | 'ops-center';

export function ReceptionistPortal({ username, onLogout, onViewChange, onPatientSelected }: ReceptionistPortalProps) {
    const [activeTab, setActiveTab] = useState<PortalView>('dashboard');
    const [stats, setStats] = useState({ bookings: 0, waiting: 0, active: 'Active' });
    const isLight = useIsLightTheme();
    const activeCol = isLight ? '#753d3e' : 'var(--theme-accent)';
    const inactiveCol = isLight ? '#6c757d' : 'var(--theme-text-muted)';

    const fetchStats = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const [apptRes, recRes] = await Promise.all([
                fetch(API_ENDPOINTS.APPOINTMENTS),
                fetch(`${API_ENDPOINTS.QUEUE_RECEPTION}?status=waiting`)
            ]);
            const apptData = await apptRes.json();
            const recData = await recRes.json();

            const bookingsToday = apptData.filter((a: any) => a.appointmentDate === today).length;
            const waitingCount = (recData.items || []).length;

            setStats({
                bookings: bookingsToday,
                waiting: waitingCount,
                active: 'Live'
            });
        } catch (e) {
            console.error('Stats fetch failed');
        }
    };

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 30000);
        window.addEventListener('receptionQueueUpdated', fetchStats);
        return () => {
            window.removeEventListener('receptionQueueUpdated', fetchStats);
            clearInterval(interval);
        };
    }, []);

    const navItems = [
        { id: 'dashboard' as PortalView, label: 'Operations Hub', icon: Zap, desc: 'Overview & Status' },
        { id: 'booking' as PortalView, label: 'Fix Appointment', icon: CalendarPlus, desc: 'New Patient Booking' },
    ];

    return (
        <div className="flex flex-col bg-[var(--theme-bg)] min-h-screen">
            {/* Horizontal Portal Navigation - Sticky below App Header */}
            <div className="bg-[var(--theme-bg-secondary)] border-b border-[var(--theme-accent)] flex items-center justify-between px-10 py-5 sticky top-[80px] z-40 shadow-xl">
                {/* Left Side: User Info */}
                <div className="flex items-center gap-6">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--theme-accent)]/20 to-[var(--theme-accent)]/5 flex items-center justify-center border border-[var(--theme-accent)]/10 shadow-lg group">
                        <User className="w-6 h-6 text-[var(--theme-accent)] transition-transform duration-500 group-hover:scale-110" />
                    </div>
                    <div>
                        <p className="text-[var(--theme-text)] text-[11px] font-black uppercase tracking-[0.25em] leading-none mb-1.5 opacity-80">Receptionist Portal</p>
                        <h2 className="text-lg font-bold text-[var(--theme-text)] leading-none tracking-tight">
                            {username}
                        </h2>
                    </div>
                </div>


                {/* Right Side: Navigation Tabs pushed to corner */}
                <div className="flex items-center gap-10 ml-auto">
                    <nav className="flex items-center gap-4">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`group flex items-center gap-4 px-6 py-3 rounded-[20px] transition-all duration-500 min-w-[200px] ${activeTab === item.id
                                    ? 'bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)] text-[var(--theme-text)] shadow-[0_0_20px_rgba(var(--theme-accent-rgb),0.1)]'
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

            {/* Main Content Workspace */}
            <div className="flex-1 flex flex-col bg-gradient-to-br from-[var(--theme-bg-gradient-from)] to-[var(--theme-bg-gradient-to)] overflow-hidden">
                {/* Dynamic Content Area */}
                <div className={`flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#222] px-8 pb-8 pt-0 ${activeTab === 'ops-center' ? 'p-4' : ''}`}>
                    {activeTab === 'dashboard' && (
                        <UnifiedOperationsHub
                            username={username}
                            userRole="receptionist"
                            onPatientSelected={onPatientSelected}
                            onNavigate={(tab: string) => { console.log('Navigation to', tab); /* No-op or handle future nav */ }}
                        />
                    )}
                    {activeTab === 'booking' && (
                        <div className="h-full pt-6">
                            <AppointmentBookingView />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
