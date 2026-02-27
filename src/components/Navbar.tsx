import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Settings, Save, CalendarPlus, CheckCircle, UserCircle, LogOut, User, Sun, Moon, ArrowLeft } from 'lucide-react';
import { EditableText } from './EditableText';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { DeviceInfoDisplay } from './DeviceInfoDisplay';
import { PatientData, UserRole, ROLES } from './patient';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
    dashboardTitle: string;
    setDashboardTitle: (s: string) => void;
    dashboardSubtitle: string;
    setDashboardSubtitle: (s: string) => void;
    userRole?: UserRole | null;
    setShowSearchResults: (b: boolean) => void;
    overlayInputRef: React.RefObject<HTMLInputElement | null>;
    searchInputRef: React.RefObject<HTMLInputElement | null>;
    searchQuery: string;
    setSearchQuery: (s: string) => void;
    doSearch: (q?: string) => Promise<void>;
    handleSearchInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    computeDropdownPos: () => void;
    isNewPatientMode: boolean;
    handleSavePatientClick: () => Promise<void>;
    activePatientData: PatientData | null;
    handleReceptionCompleteCheckIn: () => Promise<void>;
    handleOPDSave: () => Promise<void>;
    handleDoctorSave: () => Promise<void>;
    isAuthenticated: boolean;
    handleLogout: () => void;
    notificationCount: number;
    setCurrentView: (v: any) => void;
    currentView?: string;
}

export default function Navbar(props: NavbarProps) {
    const {
        dashboardTitle, setDashboardTitle, dashboardSubtitle, setDashboardSubtitle,
        userRole, setShowSearchResults, overlayInputRef, searchInputRef, searchQuery, setSearchQuery,
        doSearch, handleSearchInputKeyDown, computeDropdownPos,
        isNewPatientMode, handleSavePatientClick, activePatientData,
        handleReceptionCompleteCheckIn, handleOPDSave, handleDoctorSave,
        isAuthenticated, handleLogout, notificationCount, setCurrentView, currentView
    } = props;

    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    const { theme, toggleTheme, isDark } = useTheme();

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <header className="border-b border-[var(--theme-accent)] bg-[var(--theme-bg)] fixed top-0 left-16 right-0 z-40 shadow-lg h-20">
            <div className="h-full flex items-center justify-between px-8">
                <div className="flex items-center gap-2 flex-1">
                    <div className="hidden sm:block min-w-0">
                        <div className="text-[var(--theme-text)] font-bold text-2xl truncate">{dashboardTitle}</div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {isNewPatientMode ? (
                        <button
                            onClick={handleSavePatientClick}
                            className="hidden md:flex items-center gap-2 px-4 py-2 bg-[var(--theme-bg-secondary)] text-[var(--theme-text)] rounded text-sm font-semibold hover:bg-[var(--theme-bg-tertiary)] transition-colors border border-[var(--theme-text-muted)]"
                        >
                            <Save className="w-4 h-4 text-[var(--theme-text)]" /> Save
                        </button>
                    ) : currentView === 'dashboard' && userRole === ROLES.RECEPTIONIST && activePatientData ? (
                        <button
                            onClick={handleReceptionCompleteCheckIn}
                            className="hidden md:flex items-center gap-2 px-4 py-2 bg-[var(--theme-accent)] text-[var(--theme-bg)] rounded text-sm font-semibold hover:opacity-90 transition-colors"
                        >
                            <CheckCircle className="w-4 h-4 text-[var(--theme-bg)]" /> Check-in
                        </button>
                    ) : currentView === 'dashboard' && userRole === ROLES.OPD && activePatientData ? (
                        <button
                            onClick={handleOPDSave}
                            className="hidden md:flex items-center gap-2 px-4 py-2 bg-[var(--theme-accent)] text-[var(--theme-bg)] rounded text-sm font-semibold hover:opacity-90 transition-colors"
                        >
                            <CheckCircle className="w-4 h-4 text-[var(--theme-bg)]" /> OPD
                        </button>
                    ) : currentView === 'dashboard' && userRole === ROLES.DOCTOR && activePatientData ? (
                        <button
                            onClick={handleDoctorSave}
                            className="hidden md:flex items-center gap-2 px-4 py-2 bg-[var(--theme-accent)] text-[var(--theme-bg)] rounded text-sm font-semibold hover:opacity-90 transition-colors"
                        >
                            <CheckCircle className="w-4 h-4 text-[var(--theme-bg)]" /> Done
                        </button>
                    ) : (userRole !== ROLES.DOCTOR && userRole !== ROLES.RECEPTIONIST) ? (
                        <button
                            onClick={() => setCurrentView('appointments')}
                            className="hidden md:flex items-center gap-2 px-4 py-2 bg-[var(--theme-bg-secondary)] text-[var(--theme-text)] border border-[var(--theme-accent)] rounded text-sm font-bold hover:bg-[var(--theme-bg-tertiary)] transition-colors"
                        >
                            <CalendarPlus className="w-5 h-5 text-[var(--theme-accent)]" /> Book
                        </button>
                    ) : null}

                    {/* Theme Toggle Button */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-lg transition-all duration-300 hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-toggle-color)]"
                        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    >
                        {isDark ? (
                            <Sun className="w-6 h-6 transition-transform duration-300 hover:rotate-12" />
                        ) : (
                            <Moon className="w-6 h-6 transition-transform duration-300 hover:-rotate-12" />
                        )}
                    </button>

                    <button
                        onClick={() => setCurrentView('notifications')}
                        className={`p-2 rounded-lg transition-colors relative ${currentView === 'notifications' ? 'bg-[var(--theme-bg-tertiary)]' : 'hover:bg-[var(--theme-bg-tertiary)]'}`}
                        title="Notifications"
                    >
                        <Bell className={`w-6 h-6 ${currentView === 'notifications' ? 'text-[var(--theme-text)]' : 'text-[var(--theme-text-muted)]'}`} />
                        {notificationCount > 0 && (
                            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 rounded-full border border-[var(--theme-accent)] animate-pulse"></span>
                        )}
                    </button>



                    {isAuthenticated && (
                        <div className="relative" ref={profileRef}>
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className={`p-2 rounded-lg transition-colors ${isProfileOpen ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text)]' : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text)]'}`}
                                title="Profile"
                            >
                                <UserCircle className="w-6 h-6" />
                            </button>

                            {isProfileOpen && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)] rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                                    {userRole !== ROLES.RECEPTIONIST && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    console.log('[DEBUG] Profile Settings clicked');
                                                    setIsProfileOpen(false);
                                                    setCurrentView('profile-settings');
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text)] flex items-center gap-2 transition-colors"
                                            >
                                                <Settings className="w-4 h-4" />
                                                Settings
                                            </button>
                                            <div className="h-px bg-[var(--theme-bg-tertiary)] my-1" />
                                        </>
                                    )}
                                    <button
                                        onClick={() => {
                                            setIsProfileOpen(false);
                                            handleLogout();
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <DeviceInfoDisplay />
                </div>
            </div>
        </header>
    );
}
