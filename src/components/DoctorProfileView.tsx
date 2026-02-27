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

interface DoctorProfileViewProps {
    username?: string;
    userRole?: string;
    onBack?: () => void;
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

export function DoctorProfileView({ username, userRole, onBack }: DoctorProfileViewProps) {
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

                // Filter appointments for the selected day
                const selectedDayAppts = appointments.filter((apt: any) =>
                    apt.appointmentDate === dateKey || apt.appointmentDate?.startsWith(dateKey)
                );

                setMyAppointments(selectedDayAppts.slice(0, 5));

                // Calculate stats for the selected day
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
    }, [username, selectedDate, allAppointments.length]);

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
                        patients = data.patients || [];
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
                    .map((patient: any, idx: number) => ({
                        label: idx === 0 ? 'New Patients' : idx === 1 ? 'Existing Patients' : 'Patient On Hold',
                        value: patient.name || patient.patientName || 'Unknown Patient',
                        type: idx === 0 ? 'New Patient' : 'Existing Patient'
                    }));

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
        <div className="max-w-[1600px] mx-auto p-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 text-[var(--theme-text)]">

            <div className="w-full">
                {onBack && (
                    <div className="mb-6 flex items-center">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2.5 px-6 py-3 bg-[var(--theme-accent)] text-[var(--theme-bg)] rounded-2xl shadow-xl hover:shadow-[var(--theme-accent)]/30 hover:opacity-90 transition-all duration-300 font-bold text-sm group"
                        >
                            <ArrowLeft className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1.5" />
                            <span className="tracking-tight">Back to Dashboard</span>
                        </button>
                    </div>
                )}

                {/* Greeting Section */}
                <div className="mb-8 relative">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold mb-2 tracking-tight text-[var(--theme-text)] flex items-center gap-3">
                                {greeting}, <span className="text-[var(--theme-accent)]">{(doctor as any).name || (doctor as any).full_name}</span>
                                {loadingDoctor && <div className="w-5 h-5 border-2 border-[var(--theme-accent)] border-t-transparent rounded-full animate-spin"></div>}
                            </h1>
                            <p className="text-[var(--theme-text-muted)] text-sm tracking-wide font-medium">Have a nice day at work</p>
                        </div>

                    </div>
                </div>

                <div className="mb-4">
                    <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-semibold text-[var(--theme-text)]">Performance Overview</h2>
                            {loadingStats && <div className="w-4 h-4 border-2 border-[var(--theme-accent)] border-t-transparent rounded-full animate-spin"></div>}
                        </div>
                    </div>
                    <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 transition-opacity duration-300 ${loadingStats ? 'opacity-50' : 'opacity-100'}`}>
                        {/* Calendar Card */}
                        <div className="p-5 min-h-[220px] rounded-2xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/20 flex flex-col group hover:border-[var(--theme-accent)] transition-all duration-500 hover:shadow-[0_0_20px_rgba(var(--theme-accent-rgb),0.1)]">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <CalendarIcon className="w-4 h-4 text-[var(--theme-accent)]" />
                                    <span className="text-sm font-bold uppercase tracking-widest text-[var(--theme-text)]">{monthName} {year}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={prevMonth} className="p-1 hover:bg-[var(--theme-accent)]/10 rounded-lg text-[var(--theme-text-muted)] hover:text-[var(--theme-accent)] transition-colors">
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button onClick={nextMonth} className="p-1 hover:bg-[var(--theme-accent)]/10 rounded-lg text-[var(--theme-text-muted)] hover:text-[var(--theme-accent)] transition-colors">
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                                    <span key={day} className="text-[10px] font-black text-[var(--theme-accent)] opacity-40">{day}</span>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 gap-1">
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
                                            className={`
                                                aspect-square flex items-center justify-center text-[11px] font-bold rounded-md transition-all border
                                                ${isSelected
                                                    ? 'bg-[var(--theme-accent)] text-white border-[var(--theme-accent)] shadow-[0_0_10px_rgba(var(--theme-accent-rgb),0.4)] scale-105 z-10'
                                                    : isToday
                                                        ? 'bg-[var(--theme-accent)]/20 text-[var(--theme-accent)] border-[var(--theme-accent)]/30'
                                                        : 'bg-[var(--theme-bg-tertiary)]/40 text-[var(--theme-text)] border-[var(--theme-accent)]/10 hover:border-[var(--theme-accent)]/40 hover:bg-[var(--theme-accent)]/5'
                                                }
                                            `}
                                        >
                                            {day}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="p-5 min-h-[220px] rounded-2xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/20 flex flex-col items-center justify-center group hover:border-[var(--theme-accent)] transition-all duration-500 hover:shadow-[0_0_20px_rgba(var(--theme-accent-rgb),0.1)]">
                            <div className="text-sm text-[var(--theme-text)] mb-2 uppercase tracking-widest font-bold">Total Patients</div>
                            <div className="text-4xl font-bold text-[var(--theme-accent)] mb-1 group-hover:scale-110 transition-transform">{appointmentStats.totalPatients}</div>
                            <div className="text-xs text-[var(--theme-text-muted)]">Unique patients</div>
                        </div>

                        <div className="p-5 min-h-[220px] rounded-2xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/20 flex flex-col items-center group hover:border-[var(--theme-accent)] transition-all duration-500 hover:shadow-[0_0_20px_rgba(var(--theme-accent-rgb),0.1)]">
                            <div className="text-sm text-[var(--theme-text)] mb-4 uppercase tracking-widest font-bold">Visits Distribution</div>
                            <div className="w-full h-[150px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Appointments', value: appointmentStats.appointments },
                                                { name: 'Consultations', value: appointmentStats.consultations }
                                            ]}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={40}
                                            outerRadius={60}
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
                            <div className="flex gap-4 mt-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-[#00A3FF]"></div>
                                    <span className="text-[10px] text-[var(--theme-text)] font-bold uppercase">{appointmentStats.appointments} Appointments</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-[#FF9D00]"></div>
                                    <span className="text-[10px] text-[var(--theme-text)] font-bold uppercase">{appointmentStats.consultations} Consultations</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 min-h-[220px] rounded-2xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/20 flex flex-col items-center justify-center group hover:border-[var(--theme-accent)] transition-all duration-500 hover:shadow-[0_0_20px_rgba(var(--theme-accent-rgb),0.1)]">
                            <div className="text-sm text-[var(--theme-text)] mb-2 uppercase tracking-widest font-bold">Total Surgeries</div>
                            <div className="text-4xl font-bold text-[#BD93F9] mb-1 group-hover:scale-110 transition-transform">{appointmentStats.surgeries}</div>
                            <div className="text-xs text-[var(--theme-text-muted)]">Procedures performed</div>
                        </div>

                    </div>
                </div>


                {/* Lower section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-4">
                    <div className="lg:col-span-2 p-5 min-h-[350px] rounded-2xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/20 shadow-xl">
                        <div className="flex items-center justify-between mb-6">
                            <div className="font-bold text-lg text-[var(--theme-text)]">Appointments for {selectedDate.toLocaleDateString()}</div>
                            <div className="text-sm text-[var(--theme-text-muted)] font-medium bg-[var(--theme-bg-tertiary)] px-3 py-1 rounded-full">
                                {selectedDate.toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                        </div>
                        <div className="divide-y divide-[var(--theme-accent)]/10">
                            {myAppointments.length > 0 ? (
                                myAppointments.map((apt, idx) => (
                                    <div key={apt._id || idx} className="py-4 flex items-center justify-between group hover:bg-[var(--theme-bg-tertiary)]/30 px-2 rounded-xl transition-colors">
                                        <div>
                                            <div className="font-bold text-[var(--theme-text)]">{apt.patientName || `Patient ${idx + 1}`}</div>
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

                    <div className="p-5 min-h-[350px] rounded-2xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/20 shadow-xl">
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
            </div>
        </div>
    );
}
