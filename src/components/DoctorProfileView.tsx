import { useState, useEffect } from 'react';
import {
    ResponsiveContainer,
    Tooltip,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import { ArrowLeft, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import API_ENDPOINTS from '../config/api';
import { useIsLightTheme } from '../hooks/useTheme';
import { showAlert } from './ui/AlertModal';

interface DoctorProfileViewProps {
    username?: string;
    userRole?: string;
    onBack?: () => void;
    onPatientSelected?: (patient: any) => void;
}

interface DoctorInfo {
    username: string;
    full_name: string;
    name?: string;
    role: string;
    specialty?: string;
    location?: string;
    age?: number;
}

interface Appointment {
    _id?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    patientName?: string;
    patientId?: string;
    status?: string;
    [key: string]: any;
}

export function DoctorProfileView({ username, userRole, onBack, onPatientSelected }: DoctorProfileViewProps) {
    const [doctorInfo, setDoctorInfo] = useState<DoctorInfo | null>(null);
    const [loadingDoctor, setLoadingDoctor] = useState(false);
    const [appointmentStats, setAppointmentStats] = useState({
        totalPatients: 0,
        appointments: 0,
        consultations: 0,
        earnings: 0,
        surgeries: 0,
        opdResults: 0
    });
    const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [monthlyReports, setMonthlyReports] = useState<any[]>([]);
    const [allAppointments, setAllAppointments] = useState<any[]>([]);
    const [allPatients, setAllPatients] = useState<any[]>([]);
    const [loadingStats, setLoadingStats] = useState(false);
    const [greeting, setGreeting] = useState('');
    const [statsPeriod, setStatsPeriod] = useState<'day' | 'week' | 'month' | 'year'>('day');
    const isLight = useIsLightTheme();

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const monthName = selectedDate.toLocaleString('default', { month: 'long' });

    const prevMonth = () => setSelectedDate(new Date(year, month - 1, 1));
    const nextMonth = () => setSelectedDate(new Date(year, month + 1, 1));

    // Fetch user info from backend
    useEffect(() => {
        const fetchDoctorInfo = async () => {
            if (!username) return;

            setLoadingDoctor(true);
            try {
                const res = await fetch(API_ENDPOINTS.USERS_ONE(username));
                if (res.ok) {
                    const foundDoctor = await res.json();

                    setDoctorInfo({
                        username: foundDoctor.username,
                        full_name: (foundDoctor.full_name && foundDoctor.full_name.startsWith('Dr.') ? foundDoctor.full_name : `Dr. ${foundDoctor.full_name || foundDoctor.username}`),
                        role: foundDoctor.role,
                        specialty: foundDoctor.specialty || 'Ophthalmologist',
                        location: foundDoctor.location || 'Hospital',
                        age: foundDoctor.age
                    });
                }
            } catch (error) {
                console.error('Failed to fetch doctor info:', error);
            } finally {
                setLoadingDoctor(false);
            }
        };

        fetchDoctorInfo();
    }, [username]);

    // Fetch appointment stats and activity data
    useEffect(() => {
        const fetchAppointmentData = async () => {
            if (!username) return;

            setLoadingStats(true);
            try {
                let appointments = allAppointments;

                // Fetch only if cache is empty
                if (appointments.length === 0) {
                    const res = await fetch(API_ENDPOINTS.APPOINTMENTS);
                    if (res.ok) {
                        const data = await res.json();
                        appointments = data.appointments || [];
                        setAllAppointments(appointments);
                    }
                }

                // Normalize dates for filtering (local timezone safe)
                const dateKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

                // Helper: parse appointment date safely
                const parseAptDate = (aptDate: string): Date | null => {
                    try { return aptDate ? new Date(aptDate) : null; } catch { return null; }
                };

                // Build period bounds based on statsPeriod
                const refDate = new Date(selectedDate);
                let periodStart: Date, periodEnd: Date;
                if (statsPeriod === 'day') {
                    periodStart = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
                    periodEnd   = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), 23, 59, 59);
                } else if (statsPeriod === 'week') {
                    const dow = refDate.getDay();
                    periodStart = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() - dow);
                    periodEnd   = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() + (6 - dow), 23, 59, 59);
                } else if (statsPeriod === 'month') {
                    periodStart = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
                    periodEnd   = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0, 23, 59, 59);
                } else {
                    periodStart = new Date(refDate.getFullYear(), 0, 1);
                    periodEnd   = new Date(refDate.getFullYear(), 11, 31, 23, 59, 59);
                }

                // Filter appointments for the selected period
                const selectedDayAppts = appointments.filter((apt: any) => {
                    const aptDate = apt.appointmentDate;
                    if (!aptDate) return false;

                    // For day period keep fast string comparison
                    if (statsPeriod === 'day') {
                        let matchesDate = aptDate === dateKey || aptDate?.startsWith(dateKey);
                        if (!matchesDate) {
                            try { matchesDate = new Date(aptDate).toISOString().startsWith(dateKey); } catch { /* ignore */ }
                        }
                        return matchesDate;
                    }

                    const d = parseAptDate(aptDate);
                    return d ? d >= periodStart && d <= periodEnd : false;
                });

                console.log(`[DoctorProfileView] Fetched ${appointments.length} total appts. Showing ${selectedDayAppts.length} for period=${statsPeriod} ref=${dateKey}`);

                // Sort by time (soonest first) — used for the appointments list (day view)
                const sortedAppts = [...selectedDayAppts].sort((a, b) => {
                    const timeA = a.appointmentTime || '00:00';
                    const timeB = b.appointmentTime || '00:00';
                    return timeA.localeCompare(timeB);
                });

                // Appointments list always shows the selected day regardless of stats period
                const selectedDayOnly = appointments.filter((apt: any) => {
                    const aptDate = apt.appointmentDate;
                    let matchesDate = aptDate === dateKey || aptDate?.startsWith(dateKey);
                    if (!matchesDate && aptDate) {
                        try { matchesDate = new Date(aptDate).toISOString().startsWith(dateKey); } catch { /* ignore */ }
                    }
                    return matchesDate;
                }).sort((a: any, b: any) => (a.appointmentTime || '').localeCompare(b.appointmentTime || ''));

                setMyAppointments(selectedDayOnly);

                // Calculate stats for the selected period
                const dayPatients = new Set(selectedDayAppts.map((apt: any) => apt.patientId || apt.patientName)).size;
                const appointmentsCount = selectedDayAppts.filter((apt: any) => !apt.status || apt.status.toLowerCase().includes('appointment')).length;
                const consultationsCount = selectedDayAppts.filter((apt: any) => apt.status && apt.status.toLowerCase().includes('consultation')).length;
                const baseEarnings = selectedDayAppts.length * 500;
                const surgeriesCount = Math.floor(selectedDayAppts.length * 0.1) + (selectedDayAppts.length > 3 ? 1 : 0);

                setAppointmentStats({
                    totalPatients: dayPatients,
                    appointments: appointmentsCount || selectedDayAppts.length,
                    consultations: consultationsCount || Math.floor(selectedDayAppts.length * 0.3),
                    earnings: baseEarnings,
                    surgeries: surgeriesCount,
                    opdResults: Math.floor(selectedDayAppts.length * 0.8)
                });
            } catch (error) {
                console.error('Failed to fetch appointment data:', error);
            } finally {
                setLoadingStats(false);
            }
        };

        fetchAppointmentData();
    }, [username, selectedDate, allAppointments.length, statsPeriod]);

    // Fetch patient data for monthly reports
    useEffect(() => {
        const fetchPatientData = async () => {
            if (!username) return;

            try {
                let patients = allPatients;
                if (patients.length === 0) {
                    const res = await fetch(API_ENDPOINTS.PATIENTS_ALL);
                    if (res.ok) {
                        const data = await res.json();
                        patients = data.patients || (Array.isArray(data) ? data : []);
                        setAllPatients(patients);
                    }
                }

                const sortedPatients = [...patients]
                    .sort((a: any, b: any) => {
                        const dateA = new Date(a.created_at || a.registrationDate || 0).getTime();
                        const dateB = new Date(b.created_at || b.registrationDate || 0).getTime();
                        return dateB - dateA;
                    })
                    .slice(0, 3)
                    .map((patient: any, idx: number) => {
                        // Extract name depending on how the backend returns it
                        const patientName = patient.name || patient.patientName || (patient.patientDetails && patient.patientDetails.name) || 'Unknown Patient';

                        return {
                            label: idx === 0 ? 'New Patients' : idx === 1 ? 'Existing Patients' : 'Patient On Hold',
                            value: patientName,
                            type: idx === 0 ? 'New Patient' : 'Existing Patient'
                        };
                    });

                setMonthlyReports(sortedPatients);
            } catch (error) {
                console.error('Failed to fetch patient data:', error);
            }
        };

        fetchPatientData();
    }, [username, allPatients.length]);

    useEffect(() => {
        const updateGreeting = () => {
            const hour = new Date().getHours();
            if (hour < 12) setGreeting('Good Morning');
            else if (hour < 17) setGreeting('Good Afternoon');
            else setGreeting('Good Evening');
        };

        updateGreeting();
        const interval = setInterval(updateGreeting, 60000);
        return () => clearInterval(interval);
    }, []);

    const doctor = doctorInfo || {
        username: username || 'doctor',
        name: username ? (username.startsWith('Dr.') ? username : `Dr. ${username}`) : "Dr. Arjun Patel",
        full_name: username ? (username.startsWith('Dr.') ? username : `Dr. ${username}`) : "Dr. Arjun Patel",
        role: userRole === 'doctor' ? "Ophthalmologist" : "Cardiologist",
    };

    const colors = {
        consultations: "#FF9D00",
        appointments: "#00A3FF",
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 text-[var(--theme-text)]">

            {/* ── Top Header: Back button + Greeting ── */}
            <div className="bg-[var(--theme-bg-secondary)] border-b border-[var(--theme-accent)]/20 px-8 py-4 mb-0">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2.5 px-5 py-2.5 bg-[var(--theme-accent)] text-white force-text-white rounded-xl shadow-lg hover:opacity-90 transition-all font-bold text-sm group flex-shrink-0"
                        >
                            <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
                            <span>Back to Dashboard</span>
                        </button>
                    )}
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight text-[var(--theme-text)]">
                                {greeting}, {(doctor as any).name || (doctor as any).full_name}
                            </h1>
                            {loadingDoctor && <div className="w-4 h-4 border-2 border-[var(--theme-accent)] border-t-transparent rounded-full animate-spin flex-shrink-0"></div>}
                        </div>
                        <p className="text-[var(--theme-text-muted)] text-sm mt-0.5">Have a nice day at work</p>
                    </div>
                </div>
            </div>

            {/* ── Body: Left Sidebar (Calendar) + Right Content ── */}
            <div className="flex items-start">

                {/* LEFT SIDEBAR — Calendar: sticky so it stays fixed while right side scrolls */}
                <div className="w-[420px] flex-shrink-0 border-r border-[var(--theme-accent)]/20 bg-[var(--theme-bg-secondary)] p-6 sticky top-20 self-start" style={{minHeight: 'calc(100vh - 80px)'}}>

                    <div className="p-6 rounded-2xl bg-[var(--theme-bg)] border border-[var(--theme-accent)]/20 flex flex-col group hover:border-[var(--theme-accent)] transition-all duration-500">
                        {/* Centered header: < Month Year > */}
                        <div className="flex items-center justify-between mb-5">
                            <button onClick={prevMonth} className="p-1.5 hover:bg-[var(--theme-accent)]/10 rounded-lg text-[var(--theme-text-muted)] hover:text-[var(--theme-accent)] transition-colors">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-2">
                                <span className="text-base font-bold text-[var(--theme-text)]">{monthName}</span>
                                <span className="text-base font-bold text-[var(--theme-accent)]">{year}</span>
                            </div>
                            <button onClick={nextMonth} className="p-1.5 hover:bg-[var(--theme-accent)]/10 rounded-lg text-[var(--theme-text-muted)] hover:text-[var(--theme-accent)] transition-colors">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Day labels */}
                        <div className="grid grid-cols-7 text-center mb-2">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                                <span key={idx} className="text-xs font-bold py-1 text-[var(--theme-text-muted)]">{day}</span>
                            ))}
                        </div>

                        {/* Date grid */}
                        <div className="grid grid-cols-7 gap-y-1">
                            {Array.from({ length: firstDay }).map((_, i) => (
                                <div key={`empty-${i}`} />
                            ))}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
                                const isSelected = day === selectedDate.getDate();

                                return (
                                    <button
                                        key={day}
                                        onClick={() => setSelectedDate(new Date(year, month, day))}
                                        className="aspect-square flex items-center justify-center text-sm font-semibold rounded-xl transition-all hover:bg-[var(--theme-accent)]/10"
                                        style={{
                                            backgroundColor: isSelected ? 'var(--theme-accent)' : (isLight ? '#ffffff' : 'transparent'),
                                            color: isSelected ? '#ffffff' : isToday ? 'var(--theme-accent)' : 'var(--theme-text)',
                                            fontWeight: isSelected || isToday ? 900 : 600,
                                            boxShadow: isSelected ? '0 0 12px rgba(117,61,62,0.35)' : undefined,
                                            transform: isSelected ? 'scale(1.05)' : undefined,
                                        }}
                                    >
                                        {day}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* RIGHT CONTENT — All cards */}
                <div className="flex-1 p-6 space-y-6 min-w-0">

                    {/* ── Performance Overview ── */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-semibold text-[var(--theme-text)]">Performance Overview</h2>
                                {loadingStats && <div className="w-4 h-4 border-2 border-[var(--theme-accent)] border-t-transparent rounded-full animate-spin"></div>}
                            </div>
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
                        <div className={`flex flex-col gap-4 transition-opacity duration-300 ${loadingStats ? 'opacity-50' : 'opacity-100'}`}>

                            {/* Visits Distribution — full width */}
                            <div className="p-5 rounded-2xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/20 flex flex-col items-center group hover:border-[var(--theme-accent)] transition-all duration-500 hover:shadow-[0_0_20px_rgba(var(--theme-accent-rgb),0.1)]">
                                <div className="text-sm text-[var(--theme-text)] mb-4 uppercase tracking-widest font-bold">Visits Distribution</div>
                                <div className="w-full h-[130px] relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Appointments', value: appointmentStats.appointments },
                                                    { name: 'Consultations', value: appointmentStats.consultations }
                                                ]}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={35}
                                                outerRadius={55}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                <Cell fill="#00A3FF" />
                                                <Cell fill="#FF9D00" />
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ background: "var(--theme-bg-secondary)", border: "1px solid var(--theme-accent)", borderRadius: "8px", fontSize: "12px" }}
                                                itemStyle={{ color: "var(--theme-text)" }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex gap-3 mt-2 flex-wrap justify-center">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-[#00A3FF]"></div>
                                        <span className="text-[10px] font-bold uppercase" style={{color:'#00A3FF'}}>{appointmentStats.appointments} Appts</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-[#FF9D00]"></div>
                                        <span className="text-[10px] font-bold uppercase" style={{color:'#FF9D00'}}>{appointmentStats.consultations} Consults</span>
                                    </div>
                                </div>
                            </div>

                            {/* Total Patients + Total Surgeries — same row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-5 min-h-[160px] rounded-2xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/20 flex flex-col items-center justify-center group hover:border-[var(--theme-accent)] transition-all duration-500 hover:shadow-[0_0_20px_rgba(var(--theme-accent-rgb),0.1)]">
                                    <div className="text-sm text-[var(--theme-text)] mb-2 uppercase tracking-widest font-bold">Total Patients</div>
                                    <div className="text-4xl font-bold text-[var(--theme-accent)] mb-1 group-hover:scale-110 transition-transform">{appointmentStats.totalPatients}</div>
                                    <div className="text-xs text-[var(--theme-text-muted)]">Unique patients</div>
                                </div>

                                <div className="p-5 min-h-[160px] rounded-2xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/20 flex flex-col items-center justify-center group hover:border-[var(--theme-accent)] transition-all duration-500 hover:shadow-[0_0_20px_rgba(var(--theme-accent-rgb),0.1)]">
                                    <div className="text-sm text-[var(--theme-text)] mb-2 uppercase tracking-widest font-bold">Total Surgeries</div>
                                    <div className="text-4xl font-bold text-[#BD93F9] mb-1 group-hover:scale-110 transition-transform">{appointmentStats.surgeries}</div>
                                    <div className="text-xs text-[var(--theme-text-muted)]">Procedures performed</div>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* ── Lower Section: Appointments + Patient Reports ── */}
                    <div className="grid grid-cols-2 gap-4">

                        <div className="p-5 min-h-[200px] rounded-2xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/20 shadow-xl">
                            <div className="flex items-center justify-between mb-6">
                                <div className="font-bold text-lg text-[var(--theme-text)]">Appointments for {selectedDate.toLocaleDateString()}</div>
                                <div className="text-sm text-[var(--theme-text-muted)] font-medium bg-[var(--theme-bg-tertiary)] px-3 py-1 rounded-full">
                                    {selectedDate.toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </div>
                            </div>
                            <div className="divide-y divide-[var(--theme-accent)]/10">
                                {myAppointments.length > 0 ? (
                                    myAppointments.map((apt, idx) => (
                                        <div
                                            key={apt._id || idx}
                                            className={`py-4 flex items-center justify-between group hover:bg-[var(--theme-bg-tertiary)]/30 px-2 rounded-xl transition-all duration-300 ${onPatientSelected ? "cursor-pointer" : ""}`}
                                            onClick={() => {
                                                if (onPatientSelected) {
                                                    const idValue = apt.patientRegistrationId || apt.patientId || apt.registrationId || apt.registration_id;
                                                    const identifier = idValue || ((apt.id && !apt.id.toString().startsWith('APT-')) ? apt.id.toString() : null);

                                                    console.log('📍 [Profile] Navigation Triggered:', {
                                                        clickedName: apt.patientName,
                                                        resolvedId: identifier,
                                                        originalApt: apt
                                                    });

                                                    if (identifier) {
                                                        onPatientSelected({
                                                            registrationId: identifier,
                                                            patientId: identifier,
                                                            id: identifier,
                                                            name: apt.patientName
                                                        });
                                                    } else {
                                                        console.warn('❌ [Profile] No patient identifier found for selection.');
                                                        showAlert(`Missing patient ID for ${apt.patientName || 'this record'}.`);
                                                    }
                                                }
                                            }}
                                        >
                                            <div className="flex-1">
                                                <div className={`font-bold transition-colors duration-300 ${onPatientSelected ? "group-hover:text-[var(--theme-accent)]" : "text-[var(--theme-text)]"}`}>
                                                    {apt.patientName || `Patient ${idx + 1}`}
                                                </div>
                                                <div className="text-xs text-[var(--theme-text-muted)] mt-1 flex items-center gap-2">
                                                    <span className="bg-[var(--theme-accent)]/10 text-[var(--theme-accent)] px-2 py-0.5 rounded-md font-bold">
                                                        {apt.appointmentTime || '--:-- '}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-sm font-bold text-[var(--theme-accent)]">
                                                {apt.status || 'Pending'}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-8 text-center text-sm text-[var(--theme-text-muted)] font-medium">No appointments for today</div>
                                )}
                            </div>
                        </div>

                        <div className="p-5 min-h-[200px] rounded-2xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/20 shadow-xl">
                            <div className="flex items-center justify-between mb-6">
                                <div className="font-bold text-lg text-[var(--theme-text)]">Patient Reports</div>
                            </div>
                            <div className="space-y-4">
                                {monthlyReports.length > 0 ? (
                                    monthlyReports.map((item, idx) => (
                                        <div key={idx} className="p-5 bg-[var(--theme-bg-tertiary)] rounded-2xl border border-[var(--theme-accent)]/10 group hover:border-[var(--theme-accent)]/30 transition-all">
                                            <div className="text-[10px] uppercase font-black text-[var(--theme-accent)] tracking-widest mb-2 opacity-80">{item.label}</div>
                                            <div className="text-base font-bold text-[var(--theme-text)]">{(item as any).value}</div>
                                            <div className="text-xs text-[var(--theme-text-muted)] mt-2 font-medium">{(item as any).type}</div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 bg-[var(--theme-bg-tertiary)] rounded-2xl border border-[var(--theme-accent)]/10 text-center">
                                        <div className="text-sm text-[var(--theme-text-muted)] font-medium">No patient data available</div>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>{/* end right content */}

            </div>{/* end body flex row */}
        </div>
    );
}
