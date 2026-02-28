import React, { useState, useEffect } from 'react';
import { User, Zap, CalendarPlus, Search, Filter, Users, UserCheck, UserX, FileText, CheckCircle2, TrendingUp, ListTodo, Trash2, Check, Plus, IndianRupee, Activity, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { UnifiedOperationsHub } from './UnifiedOperationsHub';
import { AppointmentBookingView } from './AppointmentBookingView';
import API_ENDPOINTS from '../config/api';

interface ReceptionistProfileViewProps {
   username?: string;
   onPatientSelected?: (patient: any) => void;
}

type PortalView = 'dashboard' | 'booking';
type FilterType = 'all' | 'incoming' | 'at-desk';

export function ReceptionistProfileView({ username, onPatientSelected }: ReceptionistProfileViewProps) {
    const [activeBar, setActiveBar] = useState<'operations' | 'appointment'>('operations');
    const [activeTab, setActiveTab] = useState<PortalView>('dashboard');
    
    // Calendar and Stats State
    const [stats, setStats] = useState({ scheduled: 0, opdFlow: 0, consulting: 0 });
    const [appointmentStats, setAppointmentStats] = useState({ totalPatients: 0, appointments: 0, consultations: 0 });
    const [allAppointments, setAllAppointments] = useState<any[]>([]);
    const [scheduledPatients, setScheduledPatients] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedCalendarDate, setSelectedCalendarDate] = useState<number | null>(new Date().getDate());
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<FilterType>('all');
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [showMonthDropdown, setShowMonthDropdown] = useState(false);
    const [showYearDropdown, setShowYearDropdown] = useState(false);
    
    // New Card States
    const [doctors, setDoctors] = useState<any[]>([]);
    const [billingStats, setBillingStats] = useState({ pendingBills: 0, totalRevenue: 0, completedToday: 0 });
    const [todoList, setTodoList] = useState<{id: string, text: string, completed: boolean}[]>([]);
    const [todoInput, setTodoInput] = useState('');
    const [statsPeriod, setStatsPeriod] = useState<'day' | 'week' | 'month' | 'year'>('day');

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
            } catch (e) {
                console.error('Stats fetch failed');
            }
        };

        const fetchAdditionalData = async () => {
             // Doctors
             try {
                 const docRes = await fetch(API_ENDPOINTS.USERS_BY_ROLE('DOCTOR'));
                 if (docRes.ok) {
                     const data = await docRes.json();
                     setDoctors((data.users || []).map((u: any) => ({
                          name: u.full_name || u.username,
                          available: true 
                     })));
                 }
             } catch (e) { console.error(e); }

             // Billing
             try {
                const billRes = await fetch(API_ENDPOINTS.BILLING_DASHBOARD.STATS);
                if (billRes.ok) {
                    const data = await billRes.json();
                    setBillingStats({
                        pendingBills: data.pendingBills || 0,
                        totalRevenue: data.totalRevenue || 0,
                        completedToday: data.completedToday || 0
                    });
                }
             } catch (e) { console.error(e); }
        };

        fetchStats();
        fetchAdditionalData();
        const interval = setInterval(() => {
            fetchStats();
            fetchAdditionalData();
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    // Helper for Todo
    const addTodo = () => {
        if (!todoInput.trim()) return;
        setTodoList([...todoList, { id: Date.now().toString(), text: todoInput, completed: false }]);
        setTodoInput('');
    };

    const toggleTodo = (id: string) => {
        setTodoList(todoList.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    };

    const removeTodo = (id: string) => {
        setTodoList(todoList.filter(t => t.id !== id));
    };

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

    const prevMonth = () => {
        setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1));
        setSelectedCalendarDate(null);
    };

    const nextMonth = () => {
        setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1));
        setSelectedCalendarDate(null);
    };

    // ── Period filtering ──────────────────────────────────────────────────────
    const getPeriodBounds = () => {
        const ref = selectedDate;
        if (statsPeriod === 'day') {
            return {
                start: new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()),
                end:   new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 23, 59, 59),
            };
        } else if (statsPeriod === 'week') {
            const dow = ref.getDay();
            return {
                start: new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - dow),
                end:   new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + (6 - dow), 23, 59, 59),
            };
        } else if (statsPeriod === 'month') {
            return {
                start: new Date(ref.getFullYear(), ref.getMonth(), 1),
                end:   new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59),
            };
        } else {
            return {
                start: new Date(ref.getFullYear(), 0, 1),
                end:   new Date(ref.getFullYear(), 11, 31, 23, 59, 59),
            };
        }
    };

    const periodFilteredAppointments = allAppointments.filter((apt: any) => {
        const aptDate = apt.appointmentDate;
        if (!aptDate) return false;
        const { start, end } = getPeriodBounds();
        if (statsPeriod === 'day') {
            const dateKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
            return aptDate === dateKey || aptDate?.startsWith(dateKey);
        }
        try { const d = new Date(aptDate); return d >= start && d <= end; } catch { return false; }
    });

    const periodRevenue = allAppointments.length > 0
        ? billingStats.totalRevenue * (periodFilteredAppointments.length / allAppointments.length)
        : 0;

    const periodPatientCount = new Set(periodFilteredAppointments.map((a: any) => a.patientId || a.patientName)).size;

    const periodLabel = statsPeriod === 'day' ? 'Today'
        : statsPeriod === 'week' ? 'This Week'
        : statsPeriod === 'month' ? 'This Month'
        : 'This Year';

    const completedConsultations = periodFilteredAppointments.slice(0, 8);

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

    return (
        <div className="flex flex-col bg-[var(--theme-bg)] min-h-screen">
            {/* Profile Header Bar */}
            <div className="w-full flex items-center justify-between px-8 py-4 bg-[var(--theme-bg-secondary)] border-b border-[var(--theme-accent)]/30" style={{minHeight:'88px'}}>
                {/* Left Section - Profile Identity */}
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--theme-accent)] to-[var(--theme-accent)]/60 flex items-center justify-center shadow-lg border-2 border-[var(--theme-accent)]/40">
                        <User className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] mb-0.5 text-[var(--theme-accent)]">MY PROFILE</span>
                        <span className="text-xl font-bold leading-tight text-[var(--theme-text)]">{username || 'Receptionist'}</span>
                        <span className="text-[11px] text-[var(--theme-text-muted)] font-medium">Front Desk · Receptionist</span>
                    </div>
                </div>
                {/* Right Section - Tab Navigation */}
                <div className="flex items-center gap-2">
                    <button
                        className={`flex items-center gap-3 px-6 py-2.5 rounded-xl transition-all duration-300 ${activeBar === 'operations' ? 'bg-[var(--theme-accent)] shadow-lg' : 'border border-[var(--theme-accent)]/30 hover:bg-[var(--theme-bg-tertiary)]'}`}
                        onClick={() => {
                            setActiveBar('operations');
                            setActiveTab('dashboard');
                        }}
                    >
                        <Activity className={`w-4 h-4 ${activeBar === 'operations' ? 'text-white' : 'text-[var(--theme-text-muted)]'}`} />
                        <div className="flex flex-col items-start">
                            <span className={`text-sm font-bold ${activeBar === 'operations' ? 'text-white' : 'text-[var(--theme-text)]'}`}>Dashboard</span>
                            <span className={`text-[10px] font-medium ${activeBar === 'operations' ? 'text-white/70' : 'text-[var(--theme-text-muted)]'}`}>Overview & Stats</span>
                        </div>
                    </button>
                    {/* Book Appointment Button */}
                    <button
                        className={`flex items-center gap-3 px-6 py-2.5 rounded-xl transition-all duration-300 ${activeBar === 'appointment' ? 'bg-[var(--theme-accent)] shadow-lg' : 'border border-[var(--theme-accent)]/30 hover:bg-[var(--theme-bg-tertiary)]'}`}
                        onClick={() => {
                            setActiveBar('appointment');
                            setActiveTab('booking');
                        }}
                    >
                        <svg width="16" height="16" fill="none" stroke={activeBar === 'appointment' ? '#ffffff' : 'var(--theme-text-muted)'} strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                        <div className="flex flex-col items-start">
                            <span className={`text-sm font-bold ${activeBar === 'appointment' ? 'text-white' : 'text-[var(--theme-text)]'}`}>Book Appointment</span>
                            <span className={`text-[10px] font-medium ${activeBar === 'appointment' ? 'text-white/70' : 'text-[var(--theme-text-muted)]'}`}>New Patient Booking</span>
                        </div>
                    </button>
                </div>
            </div>

            {/* Main Content Workspace */}
            <div className="flex-1 flex bg-[var(--theme-bg)] overflow-hidden">
                {/* Left Sidebar - Static Calendar */}
                <div className="w-[420px] flex-shrink-0 border-r border-[var(--theme-accent)]/20 p-6 flex flex-col gap-6 overflow-hidden">
                    {/* Search */}
                    <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/20 rounded-xl p-2 shadow-sm">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8B8B8B]" />
                            <input
                                type="text"
                                placeholder="Search patient..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/30 rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--theme-text)] focus:border-[var(--theme-accent)] focus:ring-0 transition-all outline-none placeholder:text-[var(--theme-text-muted)]"
                            />
                        </div>
                    </div>

                    {/* Calendar */}
                    <div className="p-6 rounded-2xl bg-[var(--theme-bg)] border border-[var(--theme-accent)]/20 flex flex-col group hover:border-[var(--theme-accent)] transition-all duration-500">
                        {/* Header: < Month Year > */}
                        <div className="flex items-center justify-between mb-5">
                            <button onClick={prevMonth} className="p-1.5 hover:bg-[var(--theme-accent)]/10 rounded-lg text-[var(--theme-text-muted)] hover:text-[var(--theme-accent)] transition-colors">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-2">
                                {/* Month — clickable dropdown */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                                        className="text-base font-bold text-[var(--theme-text)] hover:text-[var(--theme-accent)] transition-colors px-1 rounded"
                                    >
                                        {monthNames[selectedDate.getMonth()]}
                                    </button>
                                    {showMonthDropdown && (
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)] rounded-xl overflow-hidden shadow-2xl z-50 max-h-48 overflow-y-auto">
                                            {monthNames.map((month, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        setSelectedDate(new Date(selectedDate.getFullYear(), idx, 1));
                                                        setSelectedCalendarDate(null);
                                                        setShowMonthDropdown(false);
                                                    }}
                                                    className={`w-full px-4 py-2 text-xs font-bold text-left transition-colors whitespace-nowrap ${selectedDate.getMonth() === idx
                                                        ? 'bg-[var(--theme-accent)] text-white'
                                                        : 'text-[var(--theme-text)] hover:bg-[var(--theme-accent)]/10'
                                                    }`}
                                                >
                                                    {month}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {/* Year — clickable dropdown */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowYearDropdown(!showYearDropdown)}
                                        className="text-base font-bold text-[var(--theme-accent)] hover:opacity-80 transition-opacity px-1 rounded"
                                    >
                                        {selectedDate.getFullYear()}
                                    </button>
                                    {showYearDropdown && (
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)] rounded-xl overflow-hidden shadow-2xl z-50 max-h-48 overflow-y-auto">
                                            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((year) => (
                                                <button
                                                    key={year}
                                                    onClick={() => {
                                                        setSelectedDate(new Date(year, selectedDate.getMonth(), 1));
                                                        setSelectedCalendarDate(null);
                                                        setShowYearDropdown(false);
                                                    }}
                                                    className={`w-full px-4 py-2 text-xs font-bold text-left transition-colors ${selectedDate.getFullYear() === year
                                                        ? 'bg-[var(--theme-accent)] text-white'
                                                        : 'text-[var(--theme-text)] hover:bg-[var(--theme-accent)]/10'
                                                    }`}
                                                >
                                                    {year}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button onClick={nextMonth} className="p-1.5 hover:bg-[var(--theme-accent)]/10 rounded-lg text-[var(--theme-text-muted)] hover:text-[var(--theme-accent)] transition-colors">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Day labels */}
                        <div className="grid grid-cols-7 text-center mb-2">
                            {dayNames.map((day, i) => (
                                <span key={i} className="text-xs font-bold py-1 text-[var(--theme-text-muted)]">{day}</span>
                            ))}
                        </div>

                        {/* Date grid */}
                        <div className="grid grid-cols-7 gap-y-1">
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
                                        className="aspect-square flex items-center justify-center text-sm font-semibold rounded-xl transition-all hover:bg-[var(--theme-accent)]/10"
                                        style={{
                                            backgroundColor: !dayObj.isCurrentMonth ? 'transparent' : isSelected ? 'var(--theme-accent)' : undefined,
                                            color: !dayObj.isCurrentMonth ? 'var(--theme-text-muted)' : isSelected ? '#ffffff' : isToday ? 'var(--theme-accent)' : 'var(--theme-text)',
                                            opacity: !dayObj.isCurrentMonth ? 0.2 : 1,
                                            fontWeight: isSelected || isToday ? 900 : 600,
                                            boxShadow: isSelected ? '0 0 12px rgba(117,61,62,0.35)' : undefined,
                                            transform: isSelected ? 'scale(1.05)' : undefined,
                                            cursor: !dayObj.isCurrentMonth ? 'default' : 'pointer',
                                        }}
                                    >
                                        {dayObj.day}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                </div>

               {/* Dynamic Content Area (Scrollable) */}
               <div className={`flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#222] p-8`}>
                  {activeTab === 'dashboard' && (
                     <div className="flex flex-col gap-6">

                        {/* Period Filter Row */}
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-[var(--theme-text)]">Reception Overview</h2>
                            <div className="flex items-center gap-1 bg-[var(--theme-bg)] border border-[var(--theme-accent)]/20 rounded-xl p-1">
                                {(['day', 'week', 'month', 'year'] as const).map((period) => (
                                    <button
                                        key={period}
                                        onClick={() => setStatsPeriod(period)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 capitalize ${
                                            statsPeriod === period
                                                ? 'bg-[var(--theme-accent)] text-white shadow'
                                                : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] hover:bg-[var(--theme-bg-secondary)]'
                                        }`}
                                    >
                                        {period.charAt(0).toUpperCase() + period.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Card 1: Total Revenue - Donut Pie Chart - Full Width */}
                        <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/20 rounded-2xl p-6 shadow-xl">
                            <div className="flex items-center gap-2 mb-3 border-b border-[var(--theme-accent)]/10 pb-2">
                                <IndianRupee className="w-4 h-4 text-[var(--theme-accent)]" />
                                <h3 className="text-sm font-bold text-[var(--theme-text)] uppercase tracking-wider">Total Revenue</h3>
                                <span className="ml-auto text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">{periodLabel}</span>
                            </div>
                            <div className="flex items-center justify-center gap-12 py-2">
                                {/* Donut Chart */}
                                <div className="relative flex items-center justify-center">
                                    <svg width="160" height="160" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="35" fill="none" stroke="var(--theme-bg-tertiary)" strokeWidth="12" />
                                        {billingStats.totalRevenue > 0 ? (
                                            <>
                                                <circle cx="50" cy="50" r="35" fill="none" stroke="#3b82f6" strokeWidth="12"
                                                    strokeDasharray={`${219.91 * 0.7} ${219.91 * 0.3}`}
                                                    strokeDashoffset="0"
                                                    transform="rotate(-90 50 50)"
                                                />
                                                <circle cx="50" cy="50" r="35" fill="none" stroke="#FF9D00" strokeWidth="12"
                                                    strokeDasharray={`${219.91 * 0.3} ${219.91 * 0.7}`}
                                                    strokeDashoffset={`${-(219.91 * 0.7)}`}
                                                    transform="rotate(-90 50 50)"
                                                />
                                            </>
                                        ) : null}
                                    </svg>
                                </div>
                                {/* Revenue Details */}
                                <div className="flex flex-col gap-3">
                                    <div>
                                        <div className="text-3xl font-bold text-[#FF9D00] leading-none">₹{periodRevenue.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
                                        <div className="text-[10px] text-[var(--theme-text-muted)] uppercase tracking-widest font-medium mt-1">Overall Total</div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0"></div>
                                            <div>
                                                <div className="text-sm font-bold text-[var(--theme-text)]">₹{(periodRevenue * 0.7).toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
                                                <div className="text-[9px] text-[var(--theme-text-muted)] uppercase tracking-wider">Surgical</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-[#FF9D00] flex-shrink-0"></div>
                                            <div>
                                                <div className="text-sm font-bold text-[var(--theme-text)]">₹{(periodRevenue * 0.3).toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
                                                <div className="text-[9px] text-[var(--theme-text-muted)] uppercase tracking-wider">Consultation</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Doctor Availability + Patients Today */}
                        <div className="grid grid-cols-2 gap-6">
                            {/* Card 2: Doctor Availability */}
                            <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/20 rounded-2xl p-6 shadow-xl flex flex-col h-[220px]">
                                <div className="flex items-center gap-2 mb-2 border-b border-[var(--theme-accent)]/10 pb-1">
                                    <Users className="w-4 h-4 text-[var(--theme-accent)]" />
                                    <h3 className="text-sm font-bold text-[var(--theme-text)] uppercase tracking-wider">Doctor Availability</h3>
                                </div>
                                <div className="flex-1 overflow-y-auto scrollbar-hide space-y-1.5 pr-2">
                                    {(doctors.length > 0 ? doctors : [
                                        {name: 'Dr. John Doe', available: true}, 
                                        {name: 'Dr. Jane Smith', available: false},
                                        {name: 'Dr. Robert Brown', available: true}
                                    ]).map((doc, i) => (
                                        <div key={i} className="flex items-center justify-between bg-[var(--theme-bg-tertiary)] p-2 rounded-lg border border-[var(--theme-accent)]/10 hover:border-[var(--theme-accent)]/30 transition-colors">
                                            <span className="text-[var(--theme-text)] text-sm font-medium">{doc.name}</span>
                                            <div className={`w-2 h-2 rounded-full ${doc.available ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'}`}></div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Card 3: Total Patients Today */}
                            <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/20 rounded-2xl p-6 shadow-xl flex flex-col h-[220px] justify-center items-center relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Users className="w-20 h-20 text-[var(--theme-accent)]" />
                                </div>
                                <h3 className="text-sm font-extrabold text-[var(--theme-text-muted)] uppercase tracking-wider mb-3 z-10">Patients {periodLabel}</h3>
                                <div className="text-5xl font-bold text-[#FF9D00] z-10 drop-shadow-lg">{statsPeriod === 'day' ? stats.scheduled : periodPatientCount}</div>
                                <div className="text-xs text-[var(--theme-text-muted)] mt-2 uppercase tracking-widest z-10 font-medium">{periodFilteredAppointments.length} appointment{periodFilteredAppointments.length !== 1 ? 's' : ''}</div>
                            </div>
                        </div>

                        {/* Row 3: Follow Ups + To Do List (taller, scrollable) */}
                        <div className="grid grid-cols-2 gap-6">
                            {/* Card 4: Follow Ups */}
                            <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/20 rounded-2xl p-6 shadow-xl flex flex-col h-[320px]">
                                <div className="flex items-center gap-2 mb-2 border-b border-[var(--theme-accent)]/10 pb-1">
                                    <CheckCircle2 className="w-4 h-4 text-[var(--theme-accent)]" />
                                    <h3 className="text-sm font-bold text-[var(--theme-text)] uppercase tracking-wider">Follow Ups</h3>
                                    <span className="ml-auto text-[10px] text-[var(--theme-text-muted)] font-medium">{periodLabel}</span>
                                </div>
                                <div className="flex-1 space-y-1.5 overflow-y-auto scrollbar-hide">
                                    {completedConsultations.length > 0 ? completedConsultations.map((appt: any, i: number) => (
                                        <div key={i} className="flex flex-col bg-[var(--theme-bg-tertiary)] p-2 rounded-lg border border-[var(--theme-accent)]/10">
                                            <span className="text-[var(--theme-text)] text-sm font-medium">{appt.patientName || 'Unknown Patient'}</span>
                                            <span className="text-[var(--theme-text-muted)] text-[10px] font-mono">{new Date(appt.appointmentDate).toLocaleDateString()} • {appt.appointmentTime || 'Completed'}</span>
                                        </div>
                                    )) : (
                                        <div className="h-full flex flex-col items-center justify-center text-[var(--theme-text-muted)]">
                                            <Activity className="w-6 h-6 mb-1 opacity-20" />
                                            <span className="text-[10px] font-medium">No recent completions</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Card 5: To Do List */}
                            <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/20 rounded-2xl p-6 shadow-xl flex flex-col h-[320px]">
                                <div className="flex items-center gap-2 mb-2 border-b border-[var(--theme-accent)]/10 pb-1">
                                    <ListTodo className="w-4 h-4 text-[var(--theme-accent)]" />
                                    <h3 className="text-sm font-bold text-[var(--theme-text)] uppercase tracking-wider">To Do List</h3>
                                </div>
                                <div className="flex gap-2 mb-2">
                                    <input 
                                        type="text" 
                                        value={todoInput}
                                        onChange={(e) => setTodoInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addTodo()}
                                        placeholder="Add task..."
                                        className="flex-1 bg-[var(--theme-bg-tertiary)] border border-[var(--theme-accent)]/30 rounded px-3 py-1.5 text-xs text-[var(--theme-text)] focus:border-[var(--theme-accent)] focus:outline-none placeholder:text-[var(--theme-text-muted)]"
                                    />
                                    <button onClick={addTodo} className="bg-[var(--theme-accent)] text-white rounded px-2 hover:opacity-80 transition-colors flex items-center justify-center">
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#222] space-y-1.5 pr-1">
                                    {todoList.map(todo => (
                                        <div key={todo.id} className="flex items-center justify-between bg-[var(--theme-bg-tertiary)] p-1 rounded border border-[var(--theme-accent)]/10 group hover:border-[var(--theme-accent)]/30 transition-all">
                                            <div className="flex items-center gap-1.5 overflow-hidden">
                                                <button 
                                                    onClick={() => toggleTodo(todo.id)}
                                                    className={`w-3 h-3 rounded border flex items-center justify-center transition-colors ${todo.completed ? 'bg-[var(--theme-accent)] border-[var(--theme-accent)]' : 'border-[var(--theme-text-muted)] hover:border-[var(--theme-accent)]'}`}
                                                >
                                                    {todo.completed && <Check className="w-2 h-2 text-white" />}
                                                </button>
                                                <span className={`text-xs truncate ${todo.completed ? 'text-[var(--theme-text-muted)] line-through' : 'text-[var(--theme-text)]'}`}>{todo.text}</span>
                                            </div>
                                            <button onClick={() => removeTodo(todo.id)} className="opacity-0 group-hover:opacity-100 text-[var(--theme-text-muted)] hover:text-red-500 transition-all">
                                                <Trash2 className="w-2.5 h-2.5" />
                                            </button>
                                        </div>
                                    ))}
                                    {todoList.length === 0 && <div className="text-center text-[var(--theme-text-muted)] text-[10px] italic mt-4">No tasks pending</div>}
                                </div>
                            </div>
                        </div>

                     </div>
                  )}
                  {activeTab === 'booking' && (
                     <div className="h-full">
                        <AppointmentBookingView 
                           onNavigateToBilling={(registrationId, patientData) => {
                              console.log('📍 [ReceptionistProfileView] AppointmentBooking callback invoked with:', { registrationId, patientData });
                              if (window && typeof window.dispatchEvent === 'function') {
                                 window.dispatchEvent(new CustomEvent('navigate-to-billing', {
                                    detail: { registrationId, patientData }
                                 }));
                              }
                           }}
                        />
                     </div>
                  )}
               </div>
            </div>
        </div>
    );
}
