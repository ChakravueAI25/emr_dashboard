import { useState, useEffect } from 'react';
import { User, Search, Filter, Users } from 'lucide-react';
import API_ENDPOINTS from '../config/api';
import { useIsLightTheme } from '../hooks/useTheme';

interface UnifiedOperationsHubProps {
    username: string;
    userRole?: string;
    onPatientSelected?: (patient: any) => void;
    onNavigate?: (tab: string) => void;
}

type FilterType = 'all' | 'incoming' | 'at-desk';

export function UnifiedOperationsHub({ username, userRole, onPatientSelected, onNavigate }: UnifiedOperationsHubProps) {
    const [stats, setStats] = useState({ scheduled: 0, opdFlow: 0, consulting: 0 });
    const [allAppointments, setAllAppointments] = useState<any[]>([]);
    const [scheduledPatients, setScheduledPatients] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedCalendarDate, setSelectedCalendarDate] = useState<number | null>(new Date().getDate());
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<FilterType>('all');
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [showMonthDropdown, setShowMonthDropdown] = useState(false);
    const [showYearDropdown, setShowYearDropdown] = useState(false);
    const [allDoctorQueue, setAllDoctorQueue] = useState<any[]>([]);
    const [allOpdQueue, setAllOpdQueue] = useState<any[]>([]);
    const isLight = useIsLightTheme();
    const textColor = isLight ? 'text-[#111111]' : 'text-[#f5f5f5]';

    const fetchStats = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const [apptRes, doctorQueueRes, opdQueueRes] = await Promise.all([
                fetch(API_ENDPOINTS.APPOINTMENTS),
                fetch(`${API_ENDPOINTS.QUEUE_DOCTOR}?status=waiting`),
                fetch(`${API_ENDPOINTS.QUEUE_OPD}?status=waiting`)
            ]);
            const apptData = await apptRes.json();
            const doctorQueueData = await doctorQueueRes.json();
            const opdQueueData = await opdQueueRes.json();

            const allAppts = apptData.appointments || [];
            setAllAppointments(allAppts);

            const allDocQueue = doctorQueueData.items || [];
            const allOpdQ = opdQueueData.items || [];
            setAllDoctorQueue(allDocQueue);
            setAllOpdQueue(allOpdQ);

            const todayAppointments = allAppts.filter((a: any) =>
                a.appointmentDate && a.appointmentDate.startsWith(today)
            );

            const consultingToday = allDocQueue.filter((item: any) => {
                const itemDate = item.appointmentDate || (item.receptionData && item.receptionData.appointmentDate);
                return itemDate === today;
            }).length;

            const opdFlowToday = allOpdQ.filter((item: any) => {
                const itemDate = item.appointmentDate || (item.receptionData && item.receptionData.appointmentDate);
                return itemDate === today;
            }).length;

            setStats({
                scheduled: todayAppointments.length,
                opdFlow: opdFlowToday,
                consulting: consultingToday
            });
        } catch (e) {
            console.error('Stats fetch failed');
        }
    };

    useEffect(() => {
        if (allAppointments.length > 0 && selectedCalendarDate) {
            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const day = String(selectedCalendarDate).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            const filtered = allAppointments.filter((a: any) =>
                a.appointmentDate && a.appointmentDate.startsWith(dateStr)
            );
            setScheduledPatients(filtered);
        }
    }, [allAppointments, selectedDate, selectedCalendarDate]);

    // Update stats dynamically based on selected date
    useEffect(() => {
        if (selectedCalendarDate && allAppointments.length > 0) {
            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const day = String(selectedCalendarDate).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            const scheduledForDate = allAppointments.filter((a: any) =>
                a.appointmentDate && a.appointmentDate.startsWith(dateStr)
            ).length;

            const consultingForDate = allDoctorQueue.filter((item: any) => {
                const itemDate = item.appointmentDate || (item.receptionData && item.receptionData.appointmentDate);
                return itemDate === dateStr;
            }).length;

            const opdFlowForDate = allOpdQueue.filter((item: any) => {
                const itemDate = item.appointmentDate || (item.receptionData && item.receptionData.appointmentDate);
                return itemDate === dateStr;
            }).length;

            setStats({
                scheduled: scheduledForDate,
                opdFlow: opdFlowForDate,
                consulting: consultingForDate
            });
        }
    }, [selectedDate, selectedCalendarDate, allAppointments, allDoctorQueue, allOpdQueue]);

    useEffect(() => {
        fetchStats();
        window.addEventListener('doctorQueueUpdated', fetchStats);
        window.addEventListener('opdQueueUpdated', fetchStats);
        const interval = setInterval(fetchStats, 30000);
        return () => {
            window.removeEventListener('doctorQueueUpdated', fetchStats);
            window.removeEventListener('opdQueueUpdated', fetchStats);
            clearInterval(interval);
        };
    }, []);

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
        if (day) {
            setSelectedCalendarDate(day);
        }
    };

    const handleCheckIn = async (patient: any) => {
        try {
            if (onPatientSelected) {
                onPatientSelected(patient);
            }
            if (onNavigate) {
                onNavigate('queue'); // Default to queue/ops-center navigation
            }
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

    return (
        <div className="flex-1 p-8 space-y-6 overflow-hidden flex flex-col bg-[var(--theme-bg)]">
            {/* Top Row: Title and Stats/Filter */}
            <div className="flex items-center gap-4 flex-shrink-0">
                {/* Operations Hub Title */}
                <div className="flex-shrink-0">
                    <h1 className="text-3xl font-light text-[var(--theme-text)] tracking-tight whitespace-nowrap">
                        Operations Hub
                    </h1>
                </div>

                {/* Stats and Filter Row */}
                <div className="flex items-center justify-evenly flex-1">
                    <div className="flex items-center justify-evenly flex-1">
                        <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/30 p-2.5 rounded-xl hover:bg-[var(--theme-accent)]/10 hover:border-[var(--theme-accent)]/50 transition-all w-[130px] h-20 flex flex-col justify-center shadow-sm">
                            <p className="text-[var(--theme-text-muted)] text-xs font-bold uppercase tracking-wider mb-1 opacity-80">Scheduled</p>
                            <h4 className="text-2xl font-light text-[var(--theme-text)] leading-none mb-1">{stats.scheduled.toString().padStart(2, '0')}</h4>
                            <div className="flex items-center gap-1 text-[10px] text-green-500">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                <span>Today</span>
                            </div>
                        </div>

                        <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/30 p-2.5 rounded-xl hover:bg-[var(--theme-accent)]/10 hover:border-[var(--theme-accent)]/50 transition-all w-[130px] h-20 flex flex-col justify-center shadow-sm">
                            <p className="text-[var(--theme-text-muted)] text-xs font-bold uppercase tracking-wider mb-1 opacity-80">OPD Flow</p>
                            <h4 className="text-2xl font-light text-[var(--theme-text)] leading-none mb-1">{stats.opdFlow.toString().padStart(2, '0')}</h4>
                            <div className="flex items-center gap-1 text-[10px] text-[var(--theme-text-muted)]">
                                <div className="w-1.5 h-1.5 bg-[var(--theme-accent)] rounded-full"></div>
                                <span>Active</span>
                            </div>
                        </div>

                        <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/30 p-2.5 rounded-xl hover:bg-[var(--theme-accent)]/10 hover:border-[var(--theme-accent)]/50 transition-all w-[130px] h-20 flex flex-col justify-center shadow-sm">
                            <p className="text-[var(--theme-text-muted)] text-xs font-bold uppercase tracking-wider mb-1 opacity-80">Consulting</p>
                            <h4 className="text-2xl font-light text-[var(--theme-text)] leading-none mb-1">{stats.consulting.toString().padStart(2, '0')}</h4>
                            <div className="flex items-center gap-1 text-[10px] text-blue-500">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                <span>Queue</span>
                            </div>
                        </div>
                    </div>

                    {/* Filter Dropdown */}
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
            </div>

            {/* Main Grid: Search/Calendar (Left) + Patients (Right) */}
            <div className="grid grid-cols-12 gap-6 flex-1 overflow-hidden">
                {/* Left Column: Search + Calendar */}
                <div className="col-span-3 space-y-4">
                    {/* Search Bar */}
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

                    {/* Calendar */}
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
                                                {userRole === 'receptionist' ? 'Verify' : 'Check-In'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
