import { useState, useEffect } from 'react';
import { User, Activity, Zap, ArrowLeft } from 'lucide-react';
import { UnifiedOperationsHub } from './UnifiedOperationsHub';
import { OpdQueueView } from './OpdQueueView';
import { PatientDashboard } from './dashboard/PatientDashboard';
import { PatientData, UserRole, ROLES } from './patient';
import API_ENDPOINTS from '../config/api';
import { useIsLightTheme } from '../hooks/useTheme';

interface OpdPortalProps {
  username: string;
  userRole?: string;
  onLogout: () => void;
  onViewChange: (view: any) => void;
  onPatientSelected?: (patient: any) => void;
  activePatientData?: PatientData | null;
  onClearPatient?: () => void;
  handleOPDSave?: () => Promise<void>;
  handleReceptionCompleteCheckIn?: () => Promise<void>;
  updateActivePatientData?: (path: (string | number)[], value: any) => void;
  setActivePatientData?: (data: PatientData | null) => void;
  isPatientDischarged?: boolean;
  setIsPatientDischarged?: (v: boolean) => void;
  visitIndex?: number;
  totalVisits?: number;
  setVisitIndex?: React.Dispatch<React.SetStateAction<number>>;
  handlePrevVisit?: () => void;
  handleNextVisit?: () => void;
  newVisit?: boolean;
}

type PortalView = 'dashboard' | 'queue';

export function OpdPortal({
  username, userRole, onLogout, onViewChange, onPatientSelected,
  activePatientData, onClearPatient, handleOPDSave, handleReceptionCompleteCheckIn,
  updateActivePatientData, setActivePatientData, isPatientDischarged, setIsPatientDischarged,
  visitIndex = 0, totalVisits = 1, setVisitIndex, handlePrevVisit, handleNextVisit, newVisit = false
}: OpdPortalProps) {
  const [activeTab, setActiveTab] = useState<PortalView>('dashboard');

  const handleBackToDashboard = () => {
    if (onClearPatient) onClearPatient();
    setActiveTab('dashboard');
  };
  const [stats, setStats] = useState({ opdWaiting: 0, doctorConsulting: 0, status: 'Live' });
  const isLight = useIsLightTheme();
  const activeCol = isLight ? '#753d3e' : '#e07b7c'; // Explicit color for dark theme active
  const inactiveCol = isLight ? '#6c757d' : '#9ca3af'; // Explicit color for dark theme inactive

  const isDoctor = userRole === 'doctor';

  const fetchStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [opdRes, docRes] = await Promise.all([
        fetch(`${API_ENDPOINTS.QUEUE_OPD}?status=waiting`),
        fetch(`${API_ENDPOINTS.QUEUE_DOCTOR}?status=waiting`)
      ]);
      const opdData = await opdRes.json();
      const docData = await docRes.json();

      const opdToday = (opdData.items || []).filter((item: any) => {
        const itemDate = item.appointmentDate || (item.receptionData && item.receptionData.appointmentDate);
        return itemDate === today;
      }).length;

      const docToday = (docData.items || []).filter((item: any) => {
        const itemDate = item.appointmentDate || (item.receptionData && item.receptionData.appointmentDate);
        return itemDate === today;
      }).length;

      setStats({
        opdWaiting: opdToday,
        doctorConsulting: docToday,
        status: 'Optimal'
      });
    } catch (e) {
      console.error('OPD Stats fetch failed');
    }
  };

  useEffect(() => {
    fetchStats();
    window.addEventListener('opdQueueUpdated', fetchStats);
    window.addEventListener('doctorQueueUpdated', fetchStats);
    const interval = setInterval(fetchStats, 10000);
    return () => {
      window.removeEventListener('opdQueueUpdated', fetchStats);
      window.removeEventListener('doctorQueueUpdated', fetchStats);
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { id: 'dashboard' as PortalView, label: 'Operations Hub', icon: Zap, desc: 'Unified Queue Monitoring' },
  ];

  return (
    <div className="flex flex-col bg-[var(--theme-bg)]">
      {/* Horizontal Portal Navigation - Sticky below App Header */}
      <div className="bg-[var(--theme-bg-secondary)] border-b border-[var(--theme-accent)]/30 flex items-center justify-between px-10 py-5 sticky top-[80px] z-40 shadow-xl">
        {/* Left Side: User Info */}
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--theme-accent)]/20 to-[var(--theme-accent)]/5 flex items-center justify-center border border-[var(--theme-accent)]/10 shadow-lg group">
            <Activity className="w-6 h-6 text-[var(--theme-accent)] transition-transform duration-500 group-hover:rotate-12" />
          </div>
          <div>
            <p className="text-[var(--theme-text)] text-[11px] font-black uppercase tracking-[0.25em] leading-none mb-1.5 opacity-80">OPD Portal</p>
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
                  <p className={`text-[10px] mt-1 transition-colors ${activeTab === item.id ? 'text-[var(--theme-text)]' : 'text-[var(--theme-text-muted)]'}`}>{item.desc}</p>
                </div>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-[var(--theme-bg-gradient-from)] to-[var(--theme-bg-gradient-to)] overflow-hidden">
        {activePatientData ? (
          <div className="flex-1 p-8 overflow-y-auto scrollbar-hide">
            <div className="mb-6">
              <button
                onClick={handleBackToDashboard}
                className="flex items-center gap-2.5 px-6 py-3 bg-[var(--theme-accent)] text-white force-text-white rounded-xl shadow-lg hover:opacity-90 transition-all font-bold text-sm group"
              >
                <ArrowLeft className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1.5" />
                Back to Dashboard
              </button>
            </div>
            <PatientDashboard
              activePatientData={activePatientData}
              userRole={'opd' as UserRole}
              updateActivePatientData={updateActivePatientData || (() => {})}
              visitIndex={visitIndex}
              totalVisits={totalVisits}
              setVisitIndex={setVisitIndex || (() => {})}
              handlePrevVisit={handlePrevVisit || (() => {})}
              handleNextVisit={handleNextVisit || (() => {})}
              isPatientDischarged={isPatientDischarged || false}
              handleReceptionCompleteCheckIn={handleReceptionCompleteCheckIn || (async () => {})}
              handleOPDSave={handleOPDSave || (async () => {})}
              handleDoctorSave={async () => {}}
              setActivePatientData={setActivePatientData || (() => {})}
              setIsPatientDischarged={setIsPatientDischarged || (() => {})}
              setCurrentView={onViewChange}
              newVisit={newVisit}
            />
          </div>
        ) : (
          <div className="flex-1 scrollbar-hide px-12 pb-12 pt-0 overflow-y-auto">
            {activeTab === 'dashboard' && (
              <UnifiedOperationsHub
                username={username}
                userRole="opd"
                onPatientSelected={onPatientSelected}
                onNavigate={(tab) => setActiveTab(tab as PortalView)}
              />
            )}
            {activeTab === 'queue' && (
              <div className="h-full pt-6">
                <OpdQueueView onPatientSelected={onPatientSelected} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
