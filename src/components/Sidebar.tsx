import { Home, TrendingUp, CreditCard, FileText, Bell, Users, CalendarDays, ClipboardList, UserCircle, Activity, Stethoscope, History, Database, Settings, User, ShoppingCart, Layers, Video } from 'lucide-react';
import { useIsLightTheme } from '../hooks/useTheme';

interface SidebarProps {
  currentView: 'dashboard' | 'analytics' | 'billing' | 'billing-dashboard' | 'individual-billing' | 'login' | 'documents' | 'notifications' | 'settings' | 'profile-settings' | 'patients' | 'appointments' | 'appointment-queue' | 'reception-queue' | 'opd-queue' | 'doctor-queue' | 'patient-history' | 'data-repair' | 'pharmacy-billing' | 'medicine-management' | 'invoice-upload' | 'grn-history' | 'payment-setup' | 'organization-login' | 'admin-dashboard' | 'admin-data-management' | 'telemedicine' | 'reception-patient-view' | 'doctor-profile' | 'surgical-record' | 'discharge-summary';
  onViewChange: (view: 'dashboard' | 'analytics' | 'billing' | 'billing-dashboard' | 'individual-billing' | 'login' | 'documents' | 'notifications' | 'settings' | 'profile-settings' | 'patients' | 'appointments' | 'appointment-queue' | 'reception-queue' | 'opd-queue' | 'doctor-queue' | 'patient-history' | 'data-repair' | 'pharmacy-billing' | 'medicine-management' | 'invoice-upload' | 'grn-history' | 'payment-setup' | 'organization-login' | 'admin-dashboard' | 'admin-data-management' | 'telemedicine' | 'reception-patient-view' | 'doctor-profile' | 'surgical-record' | 'discharge-summary') => void;
  userRole?: string;
  notificationCount?: number;
}

export function Sidebar({ currentView, onViewChange, userRole, notificationCount = 0 }: SidebarProps) {
  const isReception = userRole === 'receptionist' || userRole === 'reception';
  const isOpd = userRole === 'opd';
  const isDoctor = userRole === 'doctor';
  const isClinical = isOpd || isDoctor;

  const showAllQueues = !userRole || userRole === 'admin' || userRole === 'patient';

  // Hide specific queue icons if the user has a unified Portal (ReceptionistPortal or OpdPortal)
  const hideSpecificQueues = isReception || isClinical;

  const showBillingAndPharmacy = !isClinical && currentView !== 'opd-queue' && currentView !== 'doctor-queue';
  const isLight = useIsLightTheme();
  const inactiveCol = isLight ? '#1a1a1a' : 'var(--theme-text-muted)';


  return (
    <div className="fixed left-0 top-0 h-full w-16 bg-[var(--theme-bg)] border-r border-[var(--theme-accent)] flex flex-col items-center py-4 z-[200] shadow-lg">

      {/* Logo */}
      <div className="w-10 h-10 rounded-full mb-8 flex items-center justify-center transition-all duration-500 ease-out border border-[var(--theme-accent)]/30 hover:border-[var(--theme-accent)] hover:shadow-[0_0_15px_rgba(var(--theme-accent-rgb),0.3)] hover:scale-105 cursor-pointer overflow-hidden group">
        <img
          src="/logo.jpeg"
          alt="Chakravue AI Logo"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
      </div>

      {/* Navigation Icons */}
      <nav className="flex flex-col gap-3 flex-1">
        <button
          onClick={() => {
            if (isDoctor) onViewChange('doctor-profile');
            else if (isReception) onViewChange('profile-settings');
            else onViewChange('login');
          }}
          className={`group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ease-out ${currentView === 'login' || currentView === 'doctor-profile' || (isReception && currentView === 'profile-settings')
            ? 'bg-gradient-to-br from-[var(--theme-accent)] to-[var(--theme-accent-hover)] text-[var(--theme-bg)] shadow-lg shadow-[var(--theme-accent)]/30'
            : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-accent)] hover:scale-105'
            }`}
        >
          <User
            style={{ color: (currentView === 'login' || currentView === 'doctor-profile' || (isReception && currentView === 'profile-settings')) ? 'var(--theme-bg)' : inactiveCol }}
            className="w-5 h-5 transition-all duration-500 ease-out group-hover:scale-110"
          />
          <div className="absolute left-full ml-3 px-3 py-1.5 bg-[var(--theme-bg-secondary)] text-[var(--theme-text)] text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-[var(--theme-text-muted)]">
            {userRole ? 'Profile' : 'Login'}
          </div>
        </button>

        <button
          onClick={() => onViewChange('dashboard')}
          className={`group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ease-out ${currentView === 'dashboard' || currentView === 'opd-queue' || currentView === 'doctor-queue' || currentView === 'reception-patient-view'
            ? 'bg-gradient-to-br from-[var(--theme-accent)] to-[var(--theme-accent-hover)] text-[var(--theme-bg)] shadow-lg shadow-[var(--theme-accent)]/30'
            : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-accent)] hover:scale-105'
            }`}
        >
          <Home
            style={{ color: (currentView === 'dashboard' || currentView === 'opd-queue' || currentView === 'doctor-queue' || currentView === 'reception-patient-view') ? 'var(--theme-bg)' : inactiveCol }}
            className="w-5 h-5 transition-all duration-500 ease-out group-hover:scale-110"
          />
          <div className="absolute left-full ml-3 px-3 py-1.5 bg-[var(--theme-bg-secondary)] text-[var(--theme-text)] text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-[var(--theme-text-muted)]">
            Dashboard
          </div>
        </button>

        {!isReception && !isOpd && (
          <button
            onClick={() => onViewChange('analytics')}
            className={`group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ease-out ${currentView === 'analytics'
              ? 'bg-gradient-to-br from-[var(--theme-accent)] to-[var(--theme-accent-hover)] text-[var(--theme-bg)] shadow-lg shadow-[var(--theme-accent)]/30'
              : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-accent)] hover:scale-105'
              }`}
          >
            <TrendingUp
              style={{ color: currentView === 'analytics' ? 'var(--theme-bg)' : inactiveCol }}
              className="w-5 h-5 transition-all duration-500 ease-out group-hover:scale-110 group-hover:translate-y-[-1px]"
            />
            <div className="absolute left-full ml-3 px-3 py-1.5 bg-[var(--theme-bg-secondary)] text-[var(--theme-text)] text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-[var(--theme-text-muted)]">
              Analytics
            </div>
          </button>
        )}

        {showBillingAndPharmacy && (
          <button
            onClick={() => onViewChange('individual-billing')}
            className={`group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ease-out ${currentView === 'individual-billing' || currentView === 'billing'
              ? 'bg-gradient-to-br from-[var(--theme-accent)] to-[var(--theme-accent-hover)] text-[var(--theme-bg)] shadow-lg shadow-[var(--theme-accent)]/30'
              : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-accent)] hover:scale-105'
              }`}
          >
            <CreditCard className="w-5 h-5 transition-all duration-500 ease-out group-hover:scale-110" />
            <div className="absolute left-full ml-3 px-3 py-1.5 bg-[var(--theme-bg-secondary)] text-[var(--theme-text)] text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-[var(--theme-text-muted)]">
              Patient Billing
            </div>
          </button>
        )}

        {showBillingAndPharmacy && (
          <button
            onClick={() => onViewChange('billing-dashboard')}
            className={`group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ease-out ${currentView === 'billing-dashboard'
              ? 'bg-gradient-to-br from-[var(--theme-accent)] to-[var(--theme-accent-hover)] text-[var(--theme-bg)] shadow-lg shadow-[var(--theme-accent)]/30'
              : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-accent)] hover:scale-105'
              }`}
          >
            <Layers
              style={{ color: currentView === 'billing-dashboard' ? 'var(--theme-bg)' : inactiveCol }}
              className="w-5 h-5 transition-all duration-500 ease-out group-hover:scale-110"
            />
            <div className="absolute left-full ml-3 px-3 py-1.5 bg-[var(--theme-bg-secondary)] text-[var(--theme-text)] text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-[var(--theme-text-muted)]">
              Billing Dashboard
            </div>
          </button>
        )}
        {isDoctor && (
          <button
            onClick={() => onViewChange('telemedicine')}
            className={`group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ease-out ${currentView === 'telemedicine'
              ? 'bg-gradient-to-br from-[var(--theme-accent)] to-[var(--theme-accent-hover)] text-[var(--theme-bg)] shadow-lg shadow-[var(--theme-accent)]/30'
              : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-accent)] hover:scale-105'
              }`}
          >
            <Video
              style={{ color: currentView === 'telemedicine' ? 'var(--theme-bg)' : inactiveCol }}
              className="w-5 h-5 transition-all duration-500 ease-out group-hover:scale-110"
            />
            <div className="absolute left-full ml-3 px-3 py-1.5 bg-[var(--theme-bg-secondary)] text-[var(--theme-text)] text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-[var(--theme-text-muted)]">
              Telemedicine
            </div>
          </button>
        )}
        <button
          onClick={() => onViewChange('documents')}
          className={`group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ease-out ${currentView === 'documents'
            ? 'bg-gradient-to-br from-[var(--theme-accent)] to-[var(--theme-accent-hover)] text-[var(--theme-bg)] shadow-lg shadow-[var(--theme-accent)]/30'
            : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-accent)] hover:scale-105'
            }`}
        >
          <FileText
            style={{ color: currentView === 'documents' ? 'var(--theme-bg)' : inactiveCol }}
            className="w-5 h-5 transition-all duration-500 ease-out group-hover:scale-110"
          />
          <div className="absolute left-full ml-3 px-3 py-1.5 bg-[var(--theme-bg-secondary)] text-[var(--theme-text)] text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-[var(--theme-text-muted)]">
            Documents
          </div>
        </button>

        {showBillingAndPharmacy && (
          <button
            onClick={() => onViewChange('pharmacy-billing')}
            className={`group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ease-out ${currentView === 'pharmacy-billing'
              ? 'bg-gradient-to-br from-[var(--theme-accent)] to-[var(--theme-accent-hover)] text-[var(--theme-bg)] shadow-lg shadow-[var(--theme-accent)]/30'
              : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-accent)] hover:scale-105'
              }`}
          >
            <ShoppingCart
              style={{ color: currentView === 'pharmacy-billing' ? 'var(--theme-bg)' : inactiveCol }}
              className="w-5 h-5 transition-all duration-500 ease-out group-hover:scale-110"
            />
            <div className="absolute left-full ml-3 px-3 py-1.5 bg-[var(--theme-bg-secondary)] text-[var(--theme-text)] text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-[var(--theme-text-muted)]">
              Pharmacy
            </div>
          </button>
        )}

        {showBillingAndPharmacy && (userRole === 'receptionist' || userRole === 'reception') && (
          <button
            onClick={() => onViewChange('medicine-management')}
            className={`group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ease-out ${currentView === 'medicine-management'
              ? 'bg-gradient-to-br from-[var(--theme-accent)] to-[var(--theme-accent-hover)] text-[var(--theme-bg)] shadow-lg shadow-[var(--theme-accent)]/30'
              : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-accent)] hover:scale-105'
              }`}
          >
            <Activity
              style={{ color: currentView === 'medicine-management' ? 'var(--theme-bg)' : inactiveCol }}
              className="w-5 h-5 transition-all duration-500 ease-out group-hover:scale-110"
            />
            <div className="absolute left-full ml-3 px-3 py-1.5 bg-[var(--theme-bg-secondary)] text-[var(--theme-text)] text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-[var(--theme-text-muted)]">
              Medicines
            </div>
          </button>
        )}


        {/* Patient Directory completely removed per user request */}

        {/* Reception actions are now embedded in the "Reception Portal" Dashboard icon */}
        {!hideSpecificQueues && (
          <button
            onClick={() => onViewChange('appointments')}
            className={`group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ease-out ${currentView === 'appointments'
              ? 'bg-gradient-to-br from-[var(--theme-accent)] to-[var(--theme-accent-hover)] text-[var(--theme-bg)] shadow-lg shadow-[var(--theme-accent)]/30'
              : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-accent)] hover:scale-105'
              }`}
          >
            <CalendarDays
              style={{ color: currentView === 'appointments' ? 'var(--theme-bg)' : inactiveCol }}
              className="w-5 h-5 transition-all duration-500 ease-out group-hover:scale-110"
            />
            <div className="absolute left-full ml-3 px-3 py-1.5 bg-[var(--theme-bg-secondary)] text-[var(--theme-text)] text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-[var(--theme-text-muted)]">
              Appointments
            </div>
          </button>
        )}

        {!hideSpecificQueues && (
          <button
            onClick={() => onViewChange('appointment-queue')}
            className={`group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ease-out ${currentView === 'appointment-queue'
              ? 'bg-gradient-to-br from-[var(--theme-accent)] to-[var(--theme-accent-hover)] text-[var(--theme-bg)] shadow-lg shadow-[var(--theme-accent)]/30'
              : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-accent)] hover:scale-105'
              }`}
            title="Appointment Queue"
          >
            <ClipboardList
              style={{ color: currentView === 'appointment-queue' ? 'var(--theme-bg)' : inactiveCol }}
              className="w-5 h-5 transition-all duration-500 ease-out group-hover:scale-110"
            />
            <div className="absolute left-full ml-3 px-3 py-1.5 bg-[var(--theme-bg-secondary)] text-[var(--theme-text)] text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-[var(--theme-text-muted)]">
              Appointment Queue
            </div>
          </button>
        )}

        {!hideSpecificQueues && showAllQueues && (
          <button
            onClick={() => onViewChange('reception-queue')}
            className={`group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ease-out ${currentView === 'reception-queue'
              ? 'bg-gradient-to-br from-[var(--theme-accent)] to-[var(--theme-accent-hover)] text-[var(--theme-bg)] shadow-lg shadow-[var(--theme-accent)]/30'
              : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-accent)] hover:scale-105'
              }`}
            title="Reception Queue"
          >
            <UserCircle
              style={{ color: currentView === 'reception-queue' ? 'var(--theme-bg)' : inactiveCol }}
              className="w-5 h-5 transition-all duration-500 ease-out group-hover:scale-110"
            />
            <div className="absolute left-full ml-3 px-3 py-1.5 bg-[var(--theme-bg-secondary)] text-[var(--theme-text)] text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-[var(--theme-text-muted)]">
              Reception Queue
            </div>
          </button>
        )}

        {(!hideSpecificQueues || showAllQueues) && !isClinical && (
          <button
            onClick={() => onViewChange('opd-queue')}
            className={`group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ease-out ${currentView === 'opd-queue'
              ? 'bg-gradient-to-br from-[var(--theme-accent)] to-[var(--theme-accent-hover)] text-[var(--theme-bg)] shadow-lg shadow-[var(--theme-accent)]/30'
              : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-accent)] hover:scale-105'
              }`}
            title="OPD Queue"
          >
            <Activity
              style={{ color: currentView === 'opd-queue' ? 'var(--theme-bg)' : inactiveCol }}
              className="w-5 h-5 transition-all duration-500 ease-out group-hover:scale-110"
            />
            <div className="absolute left-full ml-3 px-3 py-1.5 bg-[var(--theme-bg-secondary)] text-[var(--theme-text)] text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-[var(--theme-text-muted)]">
              OPD Queue
            </div>
          </button>
        )}

        {(!hideSpecificQueues || showAllQueues) && !isClinical && (
          <button
            onClick={() => onViewChange('doctor-queue')}
            className={`group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ease-out ${currentView === 'doctor-queue'
              ? 'bg-gradient-to-br from-[var(--theme-accent)] to-[var(--theme-accent-hover)] text-[var(--theme-bg)] shadow-lg shadow-[var(--theme-accent)]/30'
              : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-accent)] hover:scale-105'
              }`}
            title="Doctor Queue"
          >
            <Stethoscope
              style={{ color: currentView === 'doctor-queue' ? 'var(--theme-bg)' : inactiveCol }}
              className="w-5 h-5 transition-all duration-500 ease-out group-hover:scale-110"
            />
            <div className="absolute left-full ml-3 px-3 py-1.5 bg-[var(--theme-bg-secondary)] text-[var(--theme-text)] text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-[var(--theme-text-muted)]">
              Doctor Queue
            </div>
          </button>
        )}
      </nav>

      {/* Bottom Icons */}
      <div className="flex flex-col gap-3">
        <button
          onClick={() => onViewChange('patient-history')}
          className={`group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ease-out ${currentView === 'patient-history'
            ? 'bg-gradient-to-br from-[var(--theme-accent)] to-[var(--theme-accent-hover)] text-[var(--theme-bg)] shadow-lg shadow-[var(--theme-accent)]/30'
            : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-accent)] hover:scale-105'
            }`}
          title="Patient History"
        >
          <History
            style={{ color: currentView === 'patient-history' ? 'var(--theme-bg)' : inactiveCol }}
            className="w-5 h-5 transition-all duration-500 ease-out group-hover:scale-110 group-hover:rotate-[-15deg]"
          />
          <div className="absolute left-full ml-3 px-3 py-1.5 bg-[var(--theme-bg-secondary)] text-[var(--theme-accent)] text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-[var(--theme-accent)]">
            Patient History
          </div>
        </button>

        {!isReception && (
        <button
          onClick={() => onViewChange('surgical-record')}
          className={`group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ease-out ${currentView === 'surgical-record'
            ? 'bg-gradient-to-br from-[var(--theme-accent)] to-[var(--theme-accent-hover)] text-[var(--theme-bg)] shadow-lg shadow-[var(--theme-accent)]/30'
            : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-accent)] hover:scale-105'
            }`}
          title="Surgical Record"
        >
          <ClipboardList
            style={{ color: currentView === 'surgical-record' ? 'var(--theme-bg)' : inactiveCol }}
            className="w-5 h-5 transition-all duration-500 ease-out group-hover:scale-110"
          />
          <div className="absolute left-full ml-3 px-3 py-1.5 bg-[var(--theme-bg-secondary)] text-[var(--theme-accent)] text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-[var(--theme-accent)]">
            Surgical Record
          </div>
        </button>
        )}

        <button
          onClick={() => onViewChange('data-repair')}
          className={`group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ease-out ${currentView === 'data-repair'
            ? 'bg-gradient-to-br from-[var(--theme-accent)] to-[var(--theme-accent-hover)] text-[var(--theme-bg)] shadow-lg shadow-[var(--theme-accent)]/30'
            : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-accent)] hover:scale-105'
            }`}
          title="Data Repair"
        >
          <Database
            style={{ color: currentView === 'data-repair' ? 'var(--theme-bg)' : inactiveCol }}
            className="w-5 h-5 transition-all duration-500 ease-out group-hover:scale-110"
          />
          <div className="absolute left-full ml-3 px-3 py-1.5 bg-[var(--theme-bg-secondary)] text-[var(--theme-accent)] text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-[var(--theme-accent)]">
            Data Repair
          </div>
        </button>

        {isReception && (
          <button
            onClick={() => onViewChange('settings')}
            className={`group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ease-out ${currentView === 'settings'
              ? 'bg-gradient-to-br from-[var(--theme-accent)] to-[var(--theme-accent-hover)] text-[var(--theme-bg)] shadow-lg shadow-[var(--theme-accent)]/30'
              : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-accent)] hover:scale-105'
              }`}
          >
            <Settings
              style={{ color: currentView === 'settings' ? 'var(--theme-bg)' : inactiveCol }}
              className="w-5 h-5 transition-all duration-500 ease-out group-hover:rotate-45 group-hover:scale-110"
            />
            <div className="absolute left-full ml-3 px-3 py-1.5 bg-[var(--theme-bg-secondary)] text-[var(--theme-accent)] text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-[var(--theme-accent)]">
              Settings
            </div>
          </button>
        )}

        {!isReception && (
          <button
            onClick={() => onViewChange('settings')}
            className={`group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ease-out ${currentView === 'settings'
              ? 'bg-gradient-to-br from-[var(--theme-accent)] to-[var(--theme-accent-hover)] text-[var(--theme-bg)] shadow-lg shadow-[var(--theme-accent)]/30'
              : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-accent)] hover:scale-105'
              }`}
          >
            <Settings
              style={{ color: currentView === 'settings' ? 'var(--theme-bg)' : inactiveCol }}
              className="w-5 h-5 transition-all duration-500 ease-out group-hover:rotate-45 group-hover:scale-110"
            />
            <div className="absolute left-full ml-3 px-3 py-1.5 bg-[var(--theme-bg-secondary)] text-[var(--theme-accent)] text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-[var(--theme-accent)]">
              Settings
            </div>
          </button>
        )}
      </div>
    </div>
  );
}