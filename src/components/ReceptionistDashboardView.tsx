import { useState, useEffect, useMemo } from 'react';
import { AppointmentBookingView } from './AppointmentBookingView';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    CartesianGrid,
} from "recharts";
import { User, Search, Filter, Users, Activity } from 'lucide-react';
import API_ENDPOINTS from '../config/api';
import { useIsLightTheme } from '../hooks/useTheme';

interface ReceptionistDashboardViewProps {
    username: string;
    userRole?: string;
    onPatientSelected?: (patient: any) => void;
    onNavigate?: (tab: string) => void;
    onLogout?: () => void;
}

type FilterType = 'all' | 'incoming' | 'at-desk';

export function ReceptionistDashboardView({ username, userRole = 'receptionist', onPatientSelected, onNavigate, onLogout }: ReceptionistDashboardViewProps) {
        // Action bar toggle state
        const isLight = useIsLightTheme();
        const [activeBar, setActiveBar] = useState<'operations' | 'appointment'>('operations');
    const [stats, setStats] = useState({ scheduled: 0, opdFlow: 0, consulting: 0 });
    const [appointmentStats, setAppointmentStats] = useState({ totalPatients: 0, appointments: 0, consultations: 0 });
    const [activityData, setActivityData] = useState<any[]>([]);
    const [range, setRange] = useState("7");
    const [allAppointments, setAllAppointments] = useState<any[]>([]);
    const [scheduledPatients, setScheduledPatients] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedCalendarDate, setSelectedCalendarDate] = useState<number | null>(new Date().getDate());
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<FilterType>('all');
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [showMonthDropdown, setShowMonthDropdown] = useState(false);
    const [showYearDropdown, setShowYearDropdown] = useState(false);
    const textColor = isLight ? 'text-[#111111]' : 'text-[#f5f5f5]';

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const today = new Date().toISOString().split('T')[0];
                const apptRes = await fetch(API_ENDPOINTS.APPOINTMENTS);
                const apptData = await apptRes.json();
                const allAppts = apptData.appointments || [];
                setAllAppointments(allAppts);
                const todayAppointments = allAppts.filter((a: any) => a.appointmentDate && a.appointmentDate.startsWith(today));
                setStats({ scheduled: todayAppointments.length, opdFlow: 0, consulting: 0 });

                // Calculate stats for cards
                const uniquePatients = new Set(allAppts.map((apt: any) => apt.patientId || apt.patientName)).size;
                setAppointmentStats({
                  totalPatients: uniquePatients,
                  appointments: allAppts.length,
                  consultations: Math.round(allAppts.length * 0.33)
                });

                // Generate activity data for chart
                const activityByDay: Record<string, any> = {};
                for (let i = parseInt(range) - 1; i >= 0; i--) {
                  const d = new Date();
                  d.setDate(d.getDate() - i);
                  const dateStr = d.toISOString().split('T')[0];
                  const dateLabel = `${d.getDate()}/${d.getMonth() + 1}`;
                  const dayAppts = allAppts.filter((apt: any) =>
                    apt.appointmentDate?.startsWith(dateStr) || apt.appointmentDate === dateStr
                  );
                  activityByDay[dateLabel] = {
                    date: dateLabel,
                    consultations: Math.max(1, Math.round(dayAppts.length * 0.4)),
                    appointments: dayAppts.length,
                    followups: Math.max(1, Math.round(dayAppts.length * 0.3))
                  };
                }
                setActivityData(Object.values(activityByDay));
            } catch (e) {
                console.error('Stats fetch failed');
            }
        };
        fetchStats();
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, [range]);

    useEffect(() => {
        if (allAppointments.length > 0 && selectedCalendarDate) {
            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const day = String(selectedCalendarDate).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            const filtered = allAppointments.filter((a: any) => a.appointmentDate && a.appointmentDate.startsWith(dateStr));
            setScheduledPatients(filtered);
        }
    }, [allAppointments, selectedDate, selectedCalendarDate]);

    const generateCalendar = () => {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        const days = [];
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push({ day: '', isCurrentMonth: false });
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({ day: i, isCurrentMonth: true });
        }
        return days;
    };

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    const handleDateClick = (day: number) => {
        if (day) setSelectedCalendarDate(day);
    };

    const handleCheckIn = async (patient: any) => {
        try {
            if (onPatientSelected) onPatientSelected(patient);
            if (onNavigate) onNavigate('queue');
        } catch (e) {
            console.error('Check-in failed:', e);
        }
    };

    const getFilteredPatients = () => {
        let filtered = scheduledPatients;
        if (searchQuery) {
            filtered = filtered.filter((patient) =>
                patient.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                patient.patientId?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        if (filterType === 'incoming') {
            filtered = filtered.filter((p) => !p.checkedIn);
        } else if (filterType === 'at-desk') {
            filtered = filtered.filter((p) => p.checkedIn);
        }
        return filtered;
    };

    const filteredPatients = getFilteredPatients();
    const filterOptions = [
        { value: 'all' as FilterType, label: 'All Patients' },
        { value: 'at-desk' as FilterType, label: 'At Desk' },
    ];

        // Line chart colors
        const colors = {
            consultations: "#FF9D00",
            appointments: "#00A3FF",
            followups: "#7CFF6B",
        };

        return (
            <div className="flex-1 p-0 overflow-hidden flex flex-col bg-[#0a0a0a]">
                {/* Welcome/Action Bar - pixel perfect */}
                <div className="w-full flex items-center justify-between px-8 py-4 bg-[#0a0a0a] border-b border-[#D4A574]" style={{minHeight:'88px'}}>
                    {/* Left Section */}
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isLight ? 'bg-[#1a1a1a]' : 'bg-[#2A241D]'}`}>
                            <User className={`w-6 h-6 ${isLight ? 'text-[#444444]' : 'text-[#D4A574]'}`} />
                        </div>
                        <div className="flex flex-col">
                            <span className={`text-[10px] font-black uppercase tracking-[0.25em] mb-1 ${isLight ? 'text-[#666666]' : 'text-[#C0C0C0]'}`}>RECEPTIONIST VIEW</span>
                            <span className={`text-xl font-bold leading-none ${isLight ? 'text-[#1a1a1a]' : 'text-white'}`}>Welcome, {username}</span>
                        </div>
                    </div>
                    {/* Right Section */}
                    <div className="flex items-center gap-2">
                        {/* Operations Hub Button */}
                        <button
                            className={`flex items-center gap-3 px-6 py-2.5 rounded-full transition-all duration-300 ${activeBar === 'operations' ? 'border border-[#D4A574] bg-[#0a0a0a]' : 'border border-transparent hover:bg-[#1a1a1a]'}`}
                            onClick={()=>setActiveBar('operations')}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${activeBar === 'operations' ? (isLight ? 'bg-[#8B2C2C]' : 'bg-[#2A241D]') : (isLight ? 'bg-[#f0f0f0]' : 'bg-[#1a1a1a]')}`}>
                                {/* Heartbeat/Activity icon */}
                                <Activity className={`w-5 h-5 ${activeBar === 'operations' ? (isLight ? 'text-white force-white-text' : 'text-[#D4A574]') : (isLight ? 'text-[#1a1a1a]' : 'text-[#8B8B8B]')}`} />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className={`text-sm font-bold ${isLight ? 'text-[#1a1a1a]' : 'text-white'}`}>Operations Hub</span>
                                <span className={`text-[10px] font-medium ${isLight ? 'text-[#666666]' : 'text-[#8B8B8B]'}`}>Overview & Status</span>
                            </div>
                        </button>
                        {/* Fix Appointment Button */}
                        <button
                            className={`flex items-center gap-3 px-6 py-2.5 rounded-full transition-all duration-300 ${activeBar === 'appointment' ? (isLight ? 'border border-[#8B2C2C] bg-white' : 'border border-[#D4A574] bg-[#0a0a0a]') : 'border border-transparent hover:bg-[#1a1a1a] dark:hover:bg-[#1a1a1a] hover:bg-gray-100'}`}
                            onClick={()=>setActiveBar('appointment')}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${activeBar === 'appointment' ? (isLight ? 'bg-[#8B2C2C]' : 'bg-[#2A241D]') : (isLight ? 'bg-[#f0f0f0]' : 'bg-[#1a1a1a]')}`}>
                                {/* Calendar icon */}
                                <svg width="20" height="20" fill="none" stroke={activeBar === 'appointment' ? (isLight ? '#ffffff' : '#D4A574') : (isLight ? '#1a1a1a' : '#8B8B8B')} strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                            </div>
                            <div className="flex flex-col items-start">
                                <span className={`text-sm font-bold ${isLight ? 'text-[#1a1a1a]' : 'text-white'}`}>Fix Appointment</span>
                                <span className={`text-[10px] font-medium ${isLight ? 'text-[#666666]' : 'text-[#8B8B8B]'}`}>New Patient Booking</span>
                            </div>
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 p-8 space-y-6 overflow-y-auto">
                {activeBar === 'appointment' ? (
                    <AppointmentBookingView 
                        onNavigateToBilling={(registrationId, patientData) => {
                            console.log('📍 [ReceptionistDashboardView] AppointmentBooking callback invoked with:', { registrationId, patientData });
                            if (window && typeof window.dispatchEvent === 'function') {
                                window.dispatchEvent(new CustomEvent('navigate-to-billing', {
                                    detail: { registrationId, patientData }
                                }));
                            }
                        }}
                    />
                ) : (
                    <>
                        {/* Chart + filters removed for receptionist view */}
                        {/* Top Row: Stats/Filter */}
                        <div className="flex items-center justify-between gap-4 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/30 p-2.5 rounded-xl hover:bg-[var(--theme-accent)]/10 hover:border-[var(--theme-accent)]/50 transition-all w-[130px] h-20 flex flex-col justify-center shadow-sm">
                        <p className="text-[var(--theme-text-muted)] text-xs font-bold uppercase tracking-wider mb-1 opacity-80">Scheduled</p>
                        <h4 className="text-2xl font-light text-[var(--theme-text)] leading-none mb-1">{stats.scheduled.toString().padStart(2, '0')}</h4>
                        <div className="flex items-center gap-1 text-[10px] text-green-500">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                            <span>Today</span>
                        </div>
                    </div>
                </div>
                <div className="relative">
                    <button
                        onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                        className={`flex items-center gap-2 px-3 py-2 bg-[var(--theme-bg-input)] border border-[var(--theme-accent)] rounded-xl text-xs font-bold ${textColor} hover:bg-[var(--theme-accent)] hover:text-white transition-all shadow-sm`}
                    >
                        <Filter className="w-3.5 h-3.5" />
                        <span>{filterOptions.find(f => f.value === filterType)?.label}</span>
                    </button>
                    {showFilterDropdown && (
                        <div className="absolute right-0 top-full mt-2 bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/50 rounded-xl overflow-hidden shadow-2xl z-50 min-w-[160px]">
                            {filterOptions.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => {
                                        setFilterType(option.value);
                                        setShowFilterDropdown(false);
                                    }}
                                    className={`w-full px-4 py-2.5 text-xs font-bold text-left transition-colors ${filterType === option.value
                                        ? 'bg-[var(--theme-accent)] force-text-white shadow-sm'
                                        : `${textColor} hover:bg-[var(--theme-accent)]/10 hover:text-[var(--theme-accent)]`
                                        }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-12 gap-6 flex-1 overflow-hidden">
                {/* Left Column: Search + Calendar */}
                <div className="col-span-3 space-y-4">
                    <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/20 rounded-xl p-2 shadow-sm">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--theme-text-muted)]" />
                            <input
                                type="text"
                                placeholder="Search patient..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-[var(--theme-bg-input)] border border-[var(--theme-accent)]/30 rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--theme-text)] focus:border-[var(--theme-accent)] focus:ring-0 transition-all outline-none placeholder:text-[var(--theme-text-muted)]"
                            />
                        </div>
                    </div>
                    <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/20 rounded-2xl p-3 shadow-sm">
                        <div className="flex items-center justify-center gap-2 mb-3">
                            {/* Month Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                                    className="text-xs font-bold text-[var(--theme-text)] hover:text-[var(--theme-accent)] transition-colors px-2 py-1 rounded hover:bg-[var(--theme-bg-tertiary)]"
                                >
                                    {monthNames[selectedDate.getMonth()]}
                                </button>
                                {showMonthDropdown && (
                                    <div className="absolute top-full left-0 mt-1 bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)] rounded-xl overflow-hidden shadow-2xl z-50 max-h-48 overflow-y-auto">
                                        {monthNames.map((month, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    setSelectedDate(new Date(selectedDate.getFullYear(), idx, 1));
                                                    setSelectedCalendarDate(null);
                                                    setShowMonthDropdown(false);
                                                }}
                                                className={`w-full px-4 py-2 text-xs font-bold text-left transition-colors whitespace-nowrap ${selectedDate.getMonth() === idx
                                                    ? 'bg-[var(--theme-accent)] force-text-white'
                                                    : `${textColor} hover:bg-[var(--theme-accent)]/10`
                                                    }`}
                                            >
                                                {month}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {/* Year Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowYearDropdown(!showYearDropdown)}
                                    className={`text-xs font-bold ${textColor} hover:text-[var(--theme-accent)] transition-colors px-2 py-1 rounded hover:bg-[var(--theme-bg-tertiary)]`}
                                >
                                    {selectedDate.getFullYear()}
                                </button>
                                {showYearDropdown && (
                                    <div className="absolute top-full left-0 mt-1 bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)] rounded-xl overflow-hidden shadow-2xl z-50 max-h-48 overflow-y-auto">
                                        {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((year) => (
                                            <button
                                                key={year}
                                                onClick={() => {
                                                    setSelectedDate(new Date(year, selectedDate.getMonth(), 1));
                                                    setSelectedCalendarDate(null);
                                                    setShowYearDropdown(false);
                                                }}
                                                className={`w-full px-4 py-2 text-xs font-bold text-left transition-colors ${selectedDate.getFullYear() === year
                                                    ? 'bg-[var(--theme-accent)] force-text-white'
                                                    : `${textColor} hover:bg-[var(--theme-accent)]/10`
                                                    }`}
                                            >
                                                {year}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-7 gap-0.5">
                            {dayNames.map((day, i) => (
                                <div key={i} className="text-center text-[10px] font-black text-[var(--theme-text-muted)] uppercase py-1 opacity-40">
                                    {day}
                                </div>
                            ))}
                            {generateCalendar().map((dayObj, i) => {
                                const isToday = dayObj.day === new Date().getDate() &&
                                    selectedDate.getMonth() === new Date().getMonth() &&
                                    selectedDate.getFullYear() === new Date().getFullYear();
                                const isSelected = dayObj.day === selectedCalendarDate;
                                return (
                                    <button
                                        key={i}
                                        onClick={() => handleDateClick(dayObj.day as number)}
                                        disabled={!dayObj.isCurrentMonth}
                                        className={`aspect-square rounded-lg text-xs transition-all ${!dayObj.isCurrentMonth
                                            ? 'text-[var(--theme-text-muted)] opacity-20 cursor-default'
                                            : isSelected
                                                ? 'bg-[var(--theme-accent)] force-text-white font-bold shadow-md scale-110 z-10'
                                                : isToday
                                                    ? `border border-[var(--theme-accent)] text-[var(--theme-accent)] font-medium`
                                                    : `${textColor} hover:bg-[var(--theme-bg-tertiary)] font-normal`
                                            }`}
                                    >
                                        {dayObj.day}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
                {/* Right Column: Patients List */}
                <div className="col-span-9 flex flex-col overflow-hidden">
                    <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/20 rounded-2xl p-6 flex flex-col overflow-hidden h-full shadow-xl">
                        <div className="flex items-center justify-between mb-4 flex-shrink-0">
                            <h3 className={`text-lg font-bold ${textColor} uppercase tracking-widest`}>Scheduled Patients</h3>
                            <span className={`text-xs ${textColor} font-bold bg-[var(--theme-accent)]/10 px-2 py-1 rounded`}>{filteredPatients.length} Total</span>
                        </div>
                        {filteredPatients.length === 0 ? (
                            <div className="text-center py-12 text-[var(--theme-text-muted)]">
                                <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                <p className="text-sm uppercase tracking-widest font-bold">No Patients Found</p>
                                <p className="text-[10px] mt-2 font-medium opacity-60">
                                    {searchQuery ? 'Try a different search term' : selectedCalendarDate ? 'No appointments for selected date' : 'Select a date to view'}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-y-auto flex-1 pr-2 scrollbar-hide">
                                <div className="grid grid-cols-3 gap-4">
                                    {filteredPatients.map((patient, idx) => (
                                        <div
                                            key={idx}
                                            className="bg-[var(--theme-bg-input)] border border-[var(--theme-border)] rounded-2xl p-4 hover:border-[var(--theme-accent)]/30 transition-all group shadow-sm hover:shadow-md"
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-muted)] opacity-60">Reserved</span>
                                                </div>
                                                <span className="text-[10px] font-mono font-bold text-[var(--theme-text-muted)]">{patient.appointmentTime || '09:30 AM'}</span>
                                            </div>
                                            <h4
                                                className={`text-sm font-bold ${textColor} mb-1 group-hover:text-[var(--theme-accent)] transition-colors cursor-pointer`}
                                                onClick={() => handleCheckIn(patient)}
                                            >
                                                {patient.patientName || 'Patient Name'}
                                            </h4>
                                            <p className={`text-xs font-mono font-bold mb-1 opacity-70 ${textColor}`}>{patient.patientId || 'N/A'}</p>
                                            <p className={`text-[10px] font-bold mb-3 opacity-50 ${textColor}`}>{patient.appointmentDate || ''}</p>
                                            <button
                                                onClick={() => handleCheckIn(patient)}
                                                className="w-full bg-[var(--theme-accent)] force-text-white py-2.5 rounded-xl text-xs font-bold hover:bg-[var(--theme-accent-hover)] transition-all shadow-lg active:scale-95"
                                            >
                                                Verify
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )}
</div>
</div>
    );
}
