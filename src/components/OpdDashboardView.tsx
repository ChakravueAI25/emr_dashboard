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

interface OpdDashboardViewProps {
  appSettings: any;
  setAppSettings: (settings: any) => void;
  username?: string;
  userRole?: string;
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

export function OpdDashboardView({ appSettings, setAppSettings, username, userRole }: OpdDashboardViewProps) {
  const [doctorInfo, setDoctorInfo] = useState<DoctorInfo | null>(null);
  const [loadingDoctor, setLoadingDoctor] = useState(false);
  const [appointmentStats, setAppointmentStats] = useState({ totalPatients: 0, appointments: 0, consultations: 0 });
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [todayAppointmentsCount, setTodayAppointmentsCount] = useState(0);
  const [weeklyAppointmentsCount, setWeeklyAppointmentsCount] = useState(0);
  const [monthlyAppointmentsCount, setMonthlyAppointmentsCount] = useState(0);
  const [operationsFilter, setOperationsFilter] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showPatientOverlay, setShowPatientOverlay] = useState(false);
  const [patientSearchFilter, setPatientSearchFilter] = useState('');
  const [activityData, setActivityData] = useState<any[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<any[]>([]);
  const [range, setRange] = useState("7");
  const [greeting, setGreeting] = useState('');
  const [opdQueue, setOpdQueue] = useState<any[]>([]);
  const [todoItems, setTodoItems] = useState<Array<{id: string, text: string, completed: boolean}>>([]);
  const [todoInput, setTodoInput] = useState('');

  // Handle adding to-do item
  const addTodoItem = () => {
    if (todoInput.trim()) {
      setTodoItems([...todoItems, { id: Date.now().toString(), text: todoInput, completed: false }]);
      setTodoInput('');
    }
  };

  // Handle deleting to-do item
  const deleteTodoItem = (id: string) => {
    setTodoItems(todoItems.filter(item => item.id !== id));
  };

  // Handle toggling to-do completion
  const toggleTodoCompletion = (id: string) => {
    setTodoItems(todoItems.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

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

        // Store all appointments for later filtering
        setAllAppointments(appointments);

        // Filter appointments for today and this doctor
        const today = new Date().toISOString().split('T')[0];
        const todayAppts = appointments.filter((apt: any) =>
          apt.appointmentDate === today || apt.appointmentDate?.startsWith(today)
        );

        // Set today's appointment count (total for wait list)
        setTodayAppointmentsCount(todayAppts.length);

        // Set my appointments (limit to 5 most recent for display)
        setMyAppointments(todayAppts.slice(0, 5));

        // Calculate weekly appointments (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
        const weeklyAppts = appointments.filter((apt: any) => {
          const aptDate = apt.appointmentDate ? apt.appointmentDate.split('T')[0] : '';
          return aptDate >= sevenDaysAgoStr;
        });
        setWeeklyAppointmentsCount(weeklyAppts.length);

        // Calculate monthly appointments (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
        const monthlyAppts = appointments.filter((apt: any) => {
          const aptDate = apt.appointmentDate ? apt.appointmentDate.split('T')[0] : '';
          return aptDate >= thirtyDaysAgoStr;
        });
        setMonthlyAppointmentsCount(monthlyAppts.length);

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

  // Fetch OPD Queue data
  useEffect(() => {
    const fetchOpdQueue = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.QUEUE_OPD);
        if (!res.ok) throw new Error('Failed to fetch OPD queue');
        
        const data = await res.json();
        const queueData = data.queue || data.patients || [];
        setOpdQueue(Array.isArray(queueData) ? queueData : []);
      } catch (error) {
        console.error('Failed to fetch OPD queue:', error);
        setOpdQueue([]);
      }
    };

    fetchOpdQueue();
    // Refresh queue every 30 seconds for real-time updates
    const interval = setInterval(fetchOpdQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  // Get appointments for selected date
  const selectedDateAppointments = useMemo(() => {
    return allAppointments.filter((apt: any) => {
      const aptDate = apt.appointmentDate ? apt.appointmentDate.split('T')[0] : '';
      return aptDate === selectedDate;
    });
  }, [allAppointments, selectedDate]);

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

  const colors = {
    consultations: "#FF9D00",
    appointments: "#00A3FF",
    followups: "#7CFF6B",
  };

  return (
    <div className="flex flex-col h-screen bg-[#050406] overflow-hidden">
      {/* Greeting Navbar - Full Width Static */}
      <div className="sticky top-0 flex-shrink-0 bg-gradient-to-br from-[#1a1520] to-[#0f0c12] border-b border-[#D4A574]/30 px-8 py-4 relative overflow-hidden z-20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF9D00]/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#00A3FF]/5 rounded-full blur-3xl"></div>

        <div className="relative flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight leading-tight">
              {greeting}, <span className="text-[#FF9D00]">{(doctor.name || doctor.full_name)?.replace(/^Dr\.\s*/, '')}</span>
            </h1>
            <p className="text-[#C2BAB1] text-sm tracking-wide mt-0.5">Have a nice day at work</p>
          </div>
        </div>
      </div>

      {/* Content Area: Left Sidebar + Right Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT SIDEBAR: 1/4 Width */}
        <div className="w-1/4 border-r border-[#D4A574]/30 bg-[#0a0809] overflow-y-auto" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
          <style>{`
            div[style*="scrollbarWidth"] {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
            div[style*="scrollbarWidth"]::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <div className="p-6 flex flex-col gap-6">
            {/* Search Box */}
            <input
              type="text"
              placeholder="Search patient..."
              value={patientSearchFilter}
              onChange={(e) => setPatientSearchFilter(e.target.value)}
              className="w-full px-4 py-2 text-sm bg-[#121015] border border-[#D4A574]/30 rounded-lg text-[#C2BAB1] placeholder-[#8C847B] focus:outline-none focus:border-[#D4A574] focus:ring-1 focus:ring-[#FF9D00]"
            />

            {/* Calendar Card */}
            <div className="sticky top-0 p-4 rounded-lg bg-[#121015] border border-[#D4A574]/30">
              <div className="text-sm text-[#C2BAB1] mb-4 font-semibold">Calendar</div>
              
              <div className="flex flex-col gap-3">
                <div className="text-center text-sm text-[#C2BAB1] font-medium">
                  {new Date(selectedDate).toLocaleString('default', { month: 'long', year: 'numeric' })}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
                    <div key={day} className="text-center text-xs text-[#8C847B] font-semibold py-1">
                      {day}
                    </div>
                  ))}
                  {Array.from({ length: 35 }).map((_, idx) => {
                    const firstDay = new Date(selectedDate.substring(0, 7) + '-01');
                    const startDay = firstDay.getDay();
                    const daysInMonth = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0).getDate();
                    const day = idx - startDay + 1;

                    if (day < 1 || day > daysInMonth) {
                      return <div key={idx} className="text-xs text-[#4a4440] text-center py-1">-</div>;
                    }

                    const dateStr = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isSelected = dateStr === selectedDate;

                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedDate(dateStr)}
                        className={`text-xs py-1 rounded font-medium transition-all ${
                          isSelected
                            ? 'bg-[#FF9D00] text-[#050406] font-bold'
                            : 'text-[#C2BAB1] hover:bg-[#D4A574]/20'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT CONTENT: 3/4 Width */}
        <div className="flex-1 bg-[#050406] overflow-y-auto" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
          <style>{`
            div[style*="scrollbarWidth"] {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
            div[style*="scrollbarWidth"]::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <div className="max-w-full p-12 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#F5F3EF] mb-3">Weekly Reports</h2>
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-[110px] p-3 rounded-lg bg-[#121015] border border-[#D4A574] flex flex-col items-center">
              <div className="text-xs text-[#C2BAB1] mb-1">Total Patients</div>
              <div className="text-2xl font-bold text-white mb-0.5">{appointmentStats.totalPatients}</div>
              <div className="text-xs text-[#8C847B]">Unique patients</div>
            </div>

            <div className="flex-1 min-w-[110px] p-3 rounded-lg bg-[#121015] border border-[#D4A574] flex flex-col items-center">
              <div className="text-xs text-[#C2BAB1] mb-1">Appointments</div>
              <div className="text-2xl font-bold text-white mb-0.5">{appointmentStats.appointments}</div>
              <div className="text-xs text-[#8C847B]">Total appointments</div>
            </div>

            <div className="flex-1 min-w-[110px] p-3 rounded-lg bg-[#121015] border border-[#D4A574] flex flex-col items-center">
              <div className="text-xs text-[#C2BAB1] mb-1">Consultations</div>
              <div className="text-2xl font-bold text-white mb-0.5">{appointmentStats.consultations}</div>
              <div className="text-xs text-[#8C847B]">Estimated from data</div>
            </div>
          </div>
        </div>

        {/* Custom OPD Cards Section - Larger Box */}
        <div className="mb-6 p-6 rounded-2xl bg-[#121015] border border-[#D4A574] min-h-[300px]">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#F5F3EF]">OPD Operations</h2>
              <p className="text-xs text-[#8C847B] mt-1">Key metrics and status</p>
            </div>
            {/* Universal Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setOperationsFilter('daily')}
                className={`px-3 py-1 text-xs rounded font-medium ${operationsFilter === 'daily' ? 'bg-[#FF9D00] text-[#050406]' : 'bg-[#D4A574]/20 text-[#C2BAB1] hover:bg-[#D4A574]/30'} transition-all`}
              >
                Daily
              </button>
              <button
                onClick={() => setOperationsFilter('weekly')}
                className={`px-3 py-1 text-xs rounded font-medium ${operationsFilter === 'weekly' ? 'bg-[#FF9D00] text-[#050406]' : 'bg-[#D4A574]/20 text-[#C2BAB1] hover:bg-[#D4A574]/30'} transition-all`}
              >
                Weekly
              </button>
              <button
                onClick={() => setOperationsFilter('monthly')}
                className={`px-3 py-1 text-xs rounded font-medium ${operationsFilter === 'monthly' ? 'bg-[#FF9D00] text-[#050406]' : 'bg-[#D4A574]/20 text-[#C2BAB1] hover:bg-[#D4A574]/30'} transition-all`}
              >
                Monthly
              </button>
            </div>
          </div>
          
          {/* Cards Grid - 6 Cards (3 per row) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Card 1: Patient Wait List */}
            <div className="p-4 rounded-lg bg-[#0A0809] border border-[#D4A574]/30 hover:border-[#D4A574] transition-all">
              <div className="text-xs text-[#C2BAB1] mb-2">Patient Wait List</div>
              <div className="text-2xl font-bold text-white">{todayAppointmentsCount}</div>
              <div className="mt-3 space-y-1 max-h-16 overflow-y-auto">
                {myAppointments.slice(0, 2).map((apt: any, idx: number) => (
                  <p key={idx} className="text-xs text-[#C2BAB1] truncate">
                    {idx + 1}. {apt.patientName || 'Unknown'}
                  </p>
                ))}
                {todayAppointmentsCount === 0 && (
                  <p className="text-xs text-[#8C847B]">No appointments today</p>
                )}
              </div>
              <p className="text-xs text-[#8C847B] mt-2">Booked today</p>
            </div>

            {/* Card 2: Doctor Availability */}
            <div className="p-4 rounded-lg bg-[#0A0809] border border-[#D4A574]/30 hover:border-[#D4A574] transition-all">
              <div className="text-xs text-[#C2BAB1] mb-2">Doctor Availability</div>
              <div className="text-2xl font-bold text-white">0</div>
              <p className="text-xs text-[#8C847B] mt-1">Currently consulting</p>
            </div>

            {/* Card 3: Total Patients */}
            <div className="p-4 rounded-lg bg-[#0A0809] border border-[#D4A574]/30 hover:border-[#D4A574] transition-all">
              <div className="text-xs text-[#C2BAB1] mb-2">Total Patients</div>
              <div className="text-2xl font-bold text-white">
                {operationsFilter === 'daily' && todayAppointmentsCount}
                {operationsFilter === 'weekly' && weeklyAppointmentsCount}
                {operationsFilter === 'monthly' && monthlyAppointmentsCount}
              </div>
              <p className="text-xs text-[#8C847B] mt-3">
                {operationsFilter === 'daily' && 'Today'}
                {operationsFilter === 'weekly' && 'Last 7 days'}
                {operationsFilter === 'monthly' && 'Last 30 days'}
              </p>
            </div>
          </div>

          {/* Cards 4 and 5 - Half Width Each */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 mt-4">
            {/* Card 4 Expanded: Patient Details - Half Width */}
            <div className="p-4 rounded-lg bg-[#0A0809] border border-[#D4A574]/30 hover:border-[#D4A574] transition-all">
              <div className="text-xs text-[#C2BAB1] mb-3">Patient Details</div>
              
              {/* Search Filter */}
              <input
                type="text"
                placeholder="Search by name..."
                value={patientSearchFilter}
                onChange={(e) => setPatientSearchFilter(e.target.value)}
                className="w-full px-2 py-1 text-xs bg-[#1a1520] border border-[#D4A574]/30 rounded text-[#C2BAB1] placeholder-[#8C847B] focus:outline-none focus:border-[#D4A574] focus:ring-1 focus:ring-[#FF9D00] mb-2"
              />
              
              {/* Patient List */}
              <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-2" style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#FF9D00 #1a1520'
              }}>
                {selectedDateAppointments
                  .filter((apt: any) => {
                    const searchTerm = patientSearchFilter.toLowerCase();
                    const name = (apt.patientName || 'Unknown').toLowerCase();
                    return name.includes(searchTerm);
                  }).length > 0 ? (
                  selectedDateAppointments
                    .filter((apt: any) => {
                      const searchTerm = patientSearchFilter.toLowerCase();
                      const name = (apt.patientName || 'Unknown').toLowerCase();
                      return name.includes(searchTerm);
                    })
                    .map((apt: any, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedPatient(apt);
                        setShowPatientOverlay(true);
                      }}
                      className="p-2 bg-[#1a1520] rounded border border-[#D4A574]/20 hover:border-[#D4A574] cursor-pointer transition-all text-xs text-[#C2BAB1]"
                    >
                      <div className="truncate font-medium">{apt.patientName || 'Unknown'}</div>
                      <div className="text-xs text-[#8C847B] truncate">
                        {apt.regId || apt.reg_id || apt.registrationId || apt.patientId || '-'} {apt.patientPhone || apt.phone ? `• ${apt.patientPhone || apt.phone}` : ''}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#8C847B]">
                    {selectedDateAppointments.length === 0 ? 'No patients on selected date' : 'No matching patients'}
                  </p>
                )}
              </div>
            </div>

            {/* Card 5 Expanded: To Do List - Half Width */}
            <div className="p-4 rounded-lg bg-[#0A0809] border border-[#D4A574]/30 hover:border-[#D4A574] transition-all flex flex-col">
              <div className="text-xs text-[#C2BAB1] mb-3 font-semibold">To Do List</div>
              
              {/* Add To-Do Input */}
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Add a task..."
                  value={todoInput}
                  onChange={(e) => setTodoInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTodoItem()}
                  className="flex-1 px-2 py-1 text-xs bg-[#1a1520] border border-[#D4A574]/30 rounded text-[#C2BAB1] placeholder-[#8C847B] focus:outline-none focus:border-[#D4A574] focus:ring-1 focus:ring-[#FF9D00]"
                />
                <button
                  onClick={addTodoItem}
                  className="px-3 py-1 text-xs bg-[#FF9D00] text-[#050406] rounded font-medium hover:bg-[#FFB839] transition-all"
                >
                  Add
                </button>
              </div>

              {/* To-Do Items List */}
              <div className="flex-1 space-y-2 overflow-y-auto pr-2 max-h-64" style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#FF9D00 #1a1520'
              }}>
                {todoItems.length > 0 ? (
                  todoItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-2 bg-[#1a1520] rounded border border-[#D4A574]/20 hover:border-[#D4A574] transition-all flex items-start gap-2"
                    >
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => toggleTodoCompletion(item.id)}
                        className="mt-1 cursor-pointer accent-[#FF9D00]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs ${item.completed ? 'line-through text-[#8C847B]' : 'text-[#C2BAB1]'}`}>
                          {item.text}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteTodoItem(item.id)}
                        className="text-xs text-[#FF6B6B] hover:text-[#FF9D00] transition-all font-medium"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#8C847B] text-center py-4">No tasks yet. Add one to get started!</p>
                )}
              </div>

              {/* Summary */}
              {todoItems.length > 0 && (
                <div className="mt-3 pt-2 border-t border-[#D4A574]/20 text-xs text-[#8C847B]">
                  {todoItems.filter(item => item.completed).length} of {todoItems.length} completed
                </div>
              )}
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

        {/* Patient Details Overlay Modal */}
        {showPatientOverlay && selectedPatient && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#121015] border border-[#D4A574] rounded-xl p-8 max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-[#F5F3EF]">Patient Details</h2>
                <button
                  onClick={() => setShowPatientOverlay(false)}
                  className="text-[#8C847B] hover:text-[#FF9D00] transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-[#C2BAB1]">
                <div>
                  <p className="text-xs text-[#8C847B] mb-1">Patient Name</p>
                  <p className="text-sm font-semibold">{selectedPatient.patientName || 'Unknown'}</p>
                </div>

                <div>
                  <p className="text-xs text-[#8C847B] mb-1">Appointment Date</p>
                  <p className="text-sm font-semibold">{selectedPatient.appointmentDate || '-'}</p>
                </div>

                <div>
                  <p className="text-xs text-[#8C847B] mb-1">Appointment Time</p>
                  <p className="text-sm font-semibold">{selectedPatient.appointmentTime || '-'}</p>
                </div>

                <div>
                  <p className="text-xs text-[#8C847B] mb-1">Status</p>
                  <p className="text-sm font-semibold">{selectedPatient.status || 'Scheduled'}</p>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => setShowPatientOverlay(false)}
                  className="flex-1 px-4 py-2 bg-[#D4A574]/20 text-[#C2BAB1] rounded-lg hover:bg-[#D4A574]/30 transition-all text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-xs text-[#8C847B]">
          Dashboard view: shows concise, relevant metrics for quick monitoring. Contact IT to enable real live data.
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}

