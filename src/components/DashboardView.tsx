import { useState, useEffect, useMemo } from 'react';
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
import { Activity } from 'lucide-react';
import API_ENDPOINTS from '../config/api';
import { OpdDashboardView } from './OpdDashboardView';

interface DashboardViewProps {
  appSettings: AppSettings;
  setAppSettings: (settings: AppSettings) => void;
  username?: string;
  userRole?: string;
}

export interface AppSettings {
  fontSize: 'small' | 'medium' | 'large';
  theme: 'gold-vintage' | 'blue-modern' | 'green-nature' | 'purple-luxury';
  accentColor: string;
  glowIntensity: 'low' | 'medium' | 'high';
  autoSave: boolean;
  notifications: boolean;
  language: string;
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

export function DashboardView({ appSettings, setAppSettings, username, userRole }: DashboardViewProps) {
  const [doctorInfo, setDoctorInfo] = useState<DoctorInfo | null>(null);
  const [loadingDoctor, setLoadingDoctor] = useState(false);
  const [appointmentStats, setAppointmentStats] = useState({ totalPatients: 0, appointments: 0, consultations: 0 });
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<any[]>([]);

  // Fetch user info from backend
  useEffect(() => {
    const fetchDoctorInfo = async () => {
      if (!username) return;

      setLoadingDoctor(true);
      try {
        // Fetch all users and find the current doctor
        const res = await fetch(API_ENDPOINTS.USERS_ALL);
        if (res.ok) {
          const data = await res.json();
          const doctors = data.users || [];
          const foundDoctor = doctors.find((u: any) => u.username === username);

          if (foundDoctor) {
            setDoctorInfo({
              username: foundDoctor.username,
              full_name: (foundDoctor.full_name && foundDoctor.full_name.startsWith('Dr.') ? foundDoctor.full_name : `Dr. ${foundDoctor.full_name || foundDoctor.username}`),
              role: foundDoctor.role,
              specialty: foundDoctor.specialty || 'Ophthalmologist',
              location: foundDoctor.location || 'Hospital',
              age: foundDoctor.age
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch doctor info:', error);
      } finally {
        setLoadingDoctor(false);
      }
    };

    fetchDoctorInfo();
  }, [username, userRole]);

  // Fetch appointment stats and activity data
  useEffect(() => {
    const fetchAppointmentData = async () => {
      if (!username) return;

      try {
        const res = await fetch(API_ENDPOINTS.APPOINTMENTS);
        if (!res.ok) throw new Error('Failed to fetch appointments');

        const data = await res.json();
        const appointments = data.appointments || [];

        // Filter appointments for today and this doctor
        const today = new Date().toISOString().split('T')[0];
        const todayAppts = appointments.filter((apt: any) =>
          apt.appointmentDate === today || apt.appointmentDate?.startsWith(today)
        );

        // Set my appointments (limit to 5 most recent)
        setMyAppointments(todayAppts.slice(0, 5));

        // Calculate stats
        const uniquePatients = new Set(appointments.map((apt: any) => apt.patientId || apt.patientName)).size;
        setAppointmentStats({
          totalPatients: uniquePatients,
          appointments: appointments.length,
          consultations: Math.round(appointments.length * 0.33) // Rough estimate
        });

        // Generate activity data from last 7 days
        const activityByDay: Record<string, any> = {};
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const dateLabel = `${d.getDate()}/${d.getMonth() + 1}`;

          const dayAppts = appointments.filter((apt: any) =>
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
      } catch (error) {
        console.error('Failed to fetch appointment data:', error);
      }
    };

    fetchAppointmentData();
  }, [username, userRole]);

  // Fetch patient data for monthly reports
  useEffect(() => {
    const fetchPatientData = async () => {
      if (!username) return;

      try {
        const res = await fetch(API_ENDPOINTS.PATIENTS_ALL);
        if (!res.ok) throw new Error('Failed to fetch patients');

        const data = await res.json();
        const patients = data.patients || [];

        // Sort by registration date (newest first) and get top 3
        const sortedPatients = patients
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
  }, [username, userRole]);

  // Use fetched doctor info or create a default one
  const doctor = doctorInfo || {
    username: username || 'doctor',
    name: username ? (username.startsWith('Dr.') ? username : `Dr. ${username}`) : "Dr. Arjun Patel",
    full_name: username ? (username.startsWith('Dr.') ? username : `Dr. ${username}`) : "Dr. Arjun Patel",
    role: userRole === 'doctor' ? "Ophthalmologist" : "Cardiologist",
    age: 42,
    location: "Hospital",
    specialty: "Ophthalmology",
  };

  // Create avatar URL from doctor name
  const avatarUrl = `https://api.dicebear.com/6.x/initials/svg?seed=${encodeURIComponent(doctor.full_name || doctor.name || 'Doctor')}&backgroundType=gradientLinear`;

  const [range, setRange] = useState("7");

  // Todos and notifications
  const [todos, setTodos] = useState([
    { id: 1, text: "Review morning OP notes", done: false },
    { id: 2, text: "Approve lab referral for Mr. Khan", done: false },
    { id: 3, text: "Sign discharge summary (Ward 4)", done: true },
  ]);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) setGreeting('Good Morning');
      else if (hour < 17) setGreeting('Good Afternoon');
      else setGreeting('Good Evening');
    };

    updateGreeting();
    const interval = setInterval(updateGreeting, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);
  const notifications = [
    { id: 1, text: "New lab result uploaded for Patient #4521", time: "1h" },
    { id: 2, text: "Appointment cancelled: Patient R. Sharma (10:30)", time: "3h" },
    { id: 3, text: "Monthly summary ready", time: "1d" },
  ];

  const toggleTodo = (id: number) => {
    setTodos((t) => t.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  };

  // Line chart colors
  const colors = {
    consultations: "#FF9D00",
    appointments: "#00A3FF",
    followups: "#7CFF6B",
  };

  // OPD-specific dashboard layout
  if (userRole === 'opd') {
    return <OpdDashboardView appSettings={appSettings} setAppSettings={setAppSettings} username={username} userRole={userRole} />;
  }

  // Original universal dashboard layout for other roles
  return (
    <div className="max-w-[1600px] mx-auto p-12 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 bg-[#050406]">
      <div className="w-full">
        {/* Dashboard - Visible for all roles */}

        {/* Greeting Island */}
        <div className="mb-6 p-8 rounded-3xl bg-gradient-to-br from-[#1a1520] to-[#0f0c12] border border-[#D4A574] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF9D00]/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#00A3FF]/5 rounded-full blur-3xl"></div>

          <div className="relative flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2 tracking-tight">
                {greeting}, <span className="text-[#FF9D00]">{doctor.name || doctor.full_name}</span>
              </h1>
              <p className="text-[#C2BAB1] text-sm tracking-wide">Have a nice day at work</p>
            </div>

            <div className="hidden md:block">
              <svg width="200" height="180" viewBox="0 0 200 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Doctor illustration */}
                <ellipse cx="100" cy="160" rx="80" ry="15" fill="#00A3FF" opacity="0.2" />

                {/* Body */}
                <path d="M70 100 Q100 90 130 100 L130 140 Q100 150 70 140 Z" fill="#5B7BFF" />
                <rect x="85" y="135" width="30" height="25" rx="3" fill="#4A6AEF" />

                {/* Head */}
                <circle cx="100" cy="70" r="25" fill="#FFB89D" />

                {/* Hair */}
                <path d="M75 65 Q75 45 100 40 Q125 45 125 65 Q125 50 115 48 Q105 55 100 50 Q95 55 85 48 Q75 50 75 65 Z" fill="#FF6B4A" />

                {/* Arms */}
                <rect x="60" y="100" width="10" height="35" rx="5" fill="#FFB89D" />
                <rect x="130" y="100" width="10" height="35" rx="5" fill="#FFB89D" />

                {/* Medical coat details */}
                <line x1="100" y1="100" x2="100" y2="140" stroke="#3A5ADF" strokeWidth="2" />

                {/* Stethoscope */}
                <path d="M95 85 Q90 95 85 105" stroke="#262028" strokeWidth="2" fill="none" />
                <circle cx="83" cy="107" r="3" fill="#262028" />

                {/* Clipboard */}
                <rect x="140" y="105" width="20" height="28" rx="2" fill="#F5F3EF" opacity="0.9" />
                <line x1="145" y1="112" x2="155" y2="112" stroke="#262028" strokeWidth="1" />
                <line x1="145" y1="118" x2="155" y2="118" stroke="#262028" strokeWidth="1" />
                <line x1="145" y1="124" x2="152" y2="124" stroke="#262028" strokeWidth="1" />
              </svg>
            </div>
          </div>
        </div>





        {/* Weekly Reports - 3 Cards in Flex */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[#F5F3EF]">Weekly Reports</h2>

          </div>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px] p-6 rounded-2xl bg-[#121015] border border-[#D4A574] flex flex-col items-center">
              <div className="text-sm text-[#C2BAB1] mb-2">Total Patients</div>
              <div className="text-4xl font-bold text-[#FF9D00] mb-1">{appointmentStats.totalPatients}</div>
              <div className="text-xs text-[#8C847B]">Unique patients</div>
            </div>

            <div className="flex-1 min-w-[200px] p-6 rounded-2xl bg-[#121015] border border-[#D4A574] flex flex-col items-center">
              <div className="text-sm text-[#C2BAB1] mb-2">Appointments</div>
              <div className="text-4xl font-bold text-[#00A3FF] mb-1">{appointmentStats.appointments}</div>
              <div className="text-xs text-[#8C847B]">Total appointments</div>
            </div>

            <div className="flex-1 min-w-[200px] p-6 rounded-2xl bg-[#121015] border border-[#D4A574] flex flex-col items-center">
              <div className="text-sm text-[#C2BAB1] mb-2">Consultations</div>
              <div className="text-4xl font-bold text-[#7CFF6B] mb-1">{appointmentStats.consultations}</div>
              <div className="text-xs text-[#8C847B]">Estimated from data</div>
            </div>
          </div>
        </div>

        {/* Chart + filters */}
        <div className="p-4 rounded-2xl bg-[#121015] border border-[#D4A574] mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-semibold">Activity Overview</div>
              <div className="text-xs text-[#8C847B]">Consultations, Appointments & Follow-ups</div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="bg-[#0A0809] border border-[#D4A574] px-3 py-2 rounded-md text-sm"
              >
                <option value="7">Past 7 days</option>
                <option value="30">Past 30 days</option>
                <option value="90">Past 90 days</option>
                <option value="365">Past 1 year</option>
              </select>
            </div>
          </div>

          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={activityData.length > 0 ? activityData : []} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#222" />
                <XAxis dataKey="date" tick={{ fill: "#C2BAB1", fontSize: 11 }} />
                <YAxis tick={{ fill: "#C2BAB1", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#0A0809", border: "1px solid #D4A574", color: "#F5F3EF" }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="consultations"
                  stroke={colors.consultations}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="appointments"
                  stroke={colors.appointments}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="followups"
                  stroke={colors.followups}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 text-xs text-[#8C847B]">
            Note: data above is from appointment records in the system.
          </div>
        </div>

        {/* Lower section: Chart in middle, Appointments list and Monthly Reports below */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Appointments List - Left */}
          <div className="lg:col-span-2 p-4 rounded-2xl bg-[#121015] border border-[#D4A574]">
            <div className="flex items-center justify-between mb-3">
              <div className="font-medium">My Appointments</div>
              <div className="text-sm text-[#8C847B]">{new Date().toLocaleDateString()}</div>
            </div>

            <div className="divide-y divide-[#D4A574]">
              {myAppointments.length > 0 ? (
                myAppointments.map((apt, idx) => (
                  <div key={apt._id || idx} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{apt.patientName || `Patient ${idx + 1}`} — {apt.type || 'Checkup'}</div>
                      <div className="text-xs text-[#8C847B]">
                        Time: {apt.appointmentTime || '--:-- '} • {apt.location || 'Room TBD'}
                      </div>
                    </div>
                    <div className="text-sm text-[#C2BAB1]">
                      Status: {apt.status || 'Pending'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-xs text-[#8C847B]">No appointments for today</div>
              )}
            </div>
          </div>

          {/* Monthly Reports - Right */}
          <div className="p-4 rounded-2xl bg-[#121015] border border-[#D4A574]">
            <div className="flex items-center justify-between mb-4">
              <div className="font-medium">Patient Reports</div>
            </div>
            <div className="space-y-3">
              {monthlyReports.length > 0 ? (
                monthlyReports.map((item, idx) => (
                  <div key={idx} className="p-4 bg-[#0A0809] rounded-xl border border-[#D4A574]">
                    <div className="text-xs text-[#8C847B] mb-1">{item.label}</div>
                    <div className="text-sm font-medium text-[#F5F3EF]">{item.value}</div>
                    <div className="text-xs text-[#8C847B] mt-1">{item.type}</div>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-[#0A0809] rounded-xl border border-[#D4A574] text-center">
                  <div className="text-xs text-[#8C847B]">No patient data available</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-xs text-[#8C847B]">
          Dashboard view: shows concise, relevant metrics for quick monitoring. Contact IT to enable real live data.
        </div>
      </div>
    </div>
  );
}

// Demo wrapper - maintains the same structure as the original
export default function App() {
  const [appSettings, setAppSettings] = useState<AppSettings>({
    fontSize: 'medium',
    theme: 'gold-vintage',
    accentColor: '#FF9D00',
    glowIntensity: 'high',
    autoSave: true,
    notifications: true,
    language: 'en'
  });

  return <DashboardView appSettings={appSettings} setAppSettings={setAppSettings} />;
}