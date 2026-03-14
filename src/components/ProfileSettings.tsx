import React, { useState, useEffect } from 'react';
import { User, CheckCircle2, Circle, Plus, TrendingUp, Users, Activity, IndianRupee, Pill, Zap, CalendarPlus } from 'lucide-react';
import { useIsLightTheme } from '../hooks/useTheme';
import { API_ENDPOINTS } from '../config/api';

type PortalView = 'dashboard' | 'booking';

interface ProfileSettingsProps {
   username?: string;
   role?: string;
   onNavigateToDashboard?: () => void;
   onNavigateToBooking?: () => void;
   onPatientSelected?: (patient: any) => void;
}

export function ProfileSettings({ username, role }: ProfileSettingsProps) {
   const [profile, setProfile] = useState({
      fullName: username || 'Dr. Meeraa',
      email: username ? `${username.toLowerCase().replace(/\s+/g, '.')}@chakravue.ai` : 'meeraa@chakravue.ai',
      phone: '+91 98765 43210',
      role: role || 'Clinical Lead',
      department: role === 'doctor' ? 'Cardiology' : 'Operations'
   });

   // Calendar state
   const [selectedDate, setSelectedDate] = useState(new Date());
   const [selectedCalendarDate, setSelectedCalendarDate] = useState<number | null>(new Date().getDate());
   const [showMonthDropdown, setShowMonthDropdown] = useState(false);
   const [showYearDropdown, setShowYearDropdown] = useState(false);

   // Todo state
   const [todos, setTodos] = useState([
      { id: 1, text: 'Review patient reports', completed: false },
      { id: 2, text: 'Staff meeting at 2 PM', completed: true },
      { id: 3, text: 'Update clinic schedule', completed: false },
   ]);
   const [newTodo, setNewTodo] = useState('');

   // Appts and Stats state
   const [allAppointments, setAllAppointments] = useState<any[]>([]);
   const [stats, setStats] = useState({
      patients: 0,
      consultations: 0,
      surgeries: 0,
      totalIncome: 0,
      consultationIncome: 0,
      surgeryIncome: 0,
      pharmacyIncome: 0
   });

   // Fetch global data on mount
   useEffect(() => {
      const fetchData = async () => {
         try {
            const res = await fetch(API_ENDPOINTS.APPOINTMENTS);
            if (!res.ok) {
               throw new Error(`Failed to fetch appointments: ${res.status}`);
            }
            const data = await res.json();
            setAllAppointments(data.appointments || []);
         } catch (err) {
            console.error('Failed to fetch appointments', err);
         }
      };
      fetchData();
   }, []);

   // Dynamically generate stats when selected date or appointments change
   useEffect(() => {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      
      let filteredAppts = allAppointments;

      // Filter by specific day if a calendar day is selected, else filter by month
      if (selectedCalendarDate) {
         const dayStr = String(selectedCalendarDate).padStart(2, '0');
         const dateStr = `${year}-${month}-${dayStr}`;
         filteredAppts = allAppointments.filter((a: any) => a?.appointmentDate?.startsWith?.(dateStr));
      } else {
         const monthStr = `${year}-${month}`;
         filteredAppts = allAppointments.filter((a: any) => a?.appointmentDate?.startsWith?.(monthStr));
      }

      const uniquePatients = new Set(filteredAppts.map((a: any) => a?.patientId || a?.patientName || a?.name || 'Unknown')).size;
      const totalPatients = uniquePatients;
      const statsConsultations = filteredAppts.length;
      
      // Calculate realistic corresponding stats from real appointment counts 
      const statsSurgeries = Math.floor(statsConsultations * 0.15); // Rough ~15% conversion to surgery
      const consultationInc = statsConsultations * 500;
      const surgeryInc = statsSurgeries * 15000;
      const pharmacyInc = Math.floor(statsConsultations * 200);
      const totalInc = consultationInc + surgeryInc + pharmacyInc;

      setStats({
         patients: totalPatients,
         consultations: statsConsultations,
         surgeries: statsSurgeries,
         totalIncome: totalInc,
         consultationIncome: consultationInc,
         surgeryIncome: surgeryInc,
         pharmacyIncome: pharmacyInc
      });
   }, [selectedDate, selectedCalendarDate, allAppointments]);

   const [activeTab, setActiveTab] = useState<PortalView>('dashboard');
   const isLight = useIsLightTheme();
   const activeCol = isLight ? '#753d3e' : 'var(--theme-accent)';
   const inactiveCol = isLight ? '#6c757d' : 'var(--theme-text-muted)';

   // Update profile when props change
   React.useEffect(() => {
      if (username || role) {
         setProfile(prev => ({
            ...prev,
            fullName: username || prev.fullName,
            email: username ? `${username.toLowerCase().replace(/\s+/g, '.')}@chakravue.ai` : prev.email,
            role: role || prev.role,
            department: role === 'doctor' ? 'Cardiology' : prev.department
         }));
      }
   }, [username, role]);

   const handleChange = (field: string, value: string) => {
      setProfile(prev => ({ ...prev, [field]: value }));
   };

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
      setSelectedCalendarDate(day);
   };

   const handleAddTodo = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && newTodo.trim()) {
         setTodos([...todos, { id: Date.now(), text: newTodo.trim(), completed: false }]);
         setNewTodo('');
      }
   };

   const toggleTodo = (id: number) => {
      setTodos(todos.map(todo => todo.id === id ? { ...todo, completed: !todo.completed } : todo));
   };

   const navItems = [
      { id: 'dashboard' as PortalView, label: 'Operations Hub', icon: Zap, desc: 'Overview & Status' },
      { id: 'booking' as PortalView, label: 'Fix Appointment', icon: CalendarPlus, desc: 'New Patient Booking' },
   ];

   // DEBUG: Log role for troubleshooting
   console.log('ProfileSettings - Current role:', role, 'Username:', username);

   // Default Profile Settings for non-receptionist roles
   return (
      <div className="max-w-7xl mx-auto p-8 h-[calc(100vh-5rem)] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">
         {/* Header */}
         <div className="flex flex-col gap-2 mb-8 flex-shrink-0">
            <h1 className="text-4xl font-light text-[var(--theme-text)] tracking-tight">
               Profile <span className="font-bold text-[var(--theme-accent)]">Overview</span>
            </h1>
            <p className="text-[var(--theme-text-muted)] text-sm font-medium uppercase tracking-[0.2em] opacity-60">
               Your Professional Dashboard
            </p>
         </div>

         <div className="flex gap-8 flex-1 min-h-0">
            {/* LEFT SECTION (Sticky Panel) */}
            <div className="w-[320px] flex-shrink-0 flex flex-col gap-6 h-full overflow-y-auto pr-2 scrollbar-hide">
               {/* Calendar Card */}
               <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/20 rounded-2xl p-6 shadow-xl">
                  <h3 className="text-sm font-bold text-[var(--theme-text)] uppercase tracking-widest mb-4">Calendar</h3>
                  <div className="flex items-center justify-between mb-4">
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
                                       ? 'bg-[var(--theme-accent)] text-[var(--theme-bg)]'
                                       : 'text-[var(--theme-text)] hover:bg-[var(--theme-accent)]/10'
                                       }`}
                                 >
                                    {month}
                                 </button>
                              ))}
                           </div>
                        )}
                     </div>

                     <div className="relative">
                        <button
                           onClick={() => setShowYearDropdown(!showYearDropdown)}
                           className="text-xs font-bold text-[var(--theme-text)] hover:text-[var(--theme-accent)] transition-colors px-2 py-1 rounded hover:bg-[var(--theme-bg-tertiary)]"
                        >
                           {selectedDate.getFullYear()}
                        </button>
                        {showYearDropdown && (
                           <div className="absolute top-full right-0 mt-1 bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)] rounded-xl overflow-hidden shadow-2xl z-50 max-h-48 overflow-y-auto">
                              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((year) => (
                                 <button
                                    key={year}
                                    onClick={() => {
                                       setSelectedDate(new Date(year, selectedDate.getMonth(), 1));
                                       setSelectedCalendarDate(null);
                                       setShowYearDropdown(false);
                                    }}
                                    className={`w-full px-4 py-2 text-xs font-bold text-left transition-colors ${selectedDate.getFullYear() === year
                                       ? 'bg-[var(--theme-accent)] text-[var(--theme-bg)]'
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
                                    ? 'bg-[var(--theme-accent)] text-[var(--theme-bg)] font-bold shadow-md scale-110 z-10'
                                    : isToday
                                       ? 'border border-[var(--theme-accent)] text-[var(--theme-accent)] font-medium'
                                       : 'text-[var(--theme-text)] hover:bg-[var(--theme-bg-tertiary)] font-normal'
                                 }`}
                           >
                              {dayObj.day}
                           </button>
                        );
                     })}
                  </div>
               </div>

               {/* To-Do List Card */}
               <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/20 rounded-2xl p-6 shadow-xl flex flex-col flex-1 min-h-[250px]">
                  <h3 className="text-sm font-bold text-[var(--theme-text)] uppercase tracking-widest mb-4">To-Do List</h3>
                  
                  <div className="relative mb-4">
                     <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--theme-text-muted)]" />
                     <input
                        type="text"
                        value={newTodo}
                        onChange={(e) => setNewTodo(e.target.value)}
                        onKeyDown={handleAddTodo}
                        placeholder="Add a task..."
                        className="w-full bg-[var(--theme-bg-input)] border border-[var(--theme-border)] rounded-xl pl-9 pr-4 py-2 text-sm text-[var(--theme-text)] focus:border-[var(--theme-accent)]/50 outline-none transition-all"
                     />
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 space-y-2 scrollbar-hide">
                     {todos.map(todo => (
                        <div 
                           key={todo.id} 
                           className="flex items-start gap-3 p-3 rounded-xl hover:bg-[var(--theme-bg-tertiary)] transition-colors cursor-pointer group"
                           onClick={() => toggleTodo(todo.id)}
                        >
                           <button className="mt-0.5 flex-shrink-0 text-[var(--theme-text-muted)] group-hover:text-[var(--theme-accent)] transition-colors">
                              {todo.completed ? (
                                 <CheckCircle2 className="w-4 h-4 text-[var(--theme-accent)]" />
                              ) : (
                                 <Circle className="w-4 h-4" />
                              )}
                           </button>
                           <span className={`text-sm transition-all ${todo.completed ? 'text-[var(--theme-text-muted)] line-through opacity-50' : 'text-[var(--theme-text)]'}`}>
                              {todo.text}
                           </span>
                        </div>
                     ))}
                  </div>
               </div>
            </div>

            {/* RIGHT SECTION (Main Content - Scrollable) */}
            <div className="flex-1 h-full overflow-y-auto pr-4 scrollbar-hide space-y-6 pb-10">
               
               {/* Greeting Banner */}
               <div className="bg-gradient-to-r from-[var(--theme-bg-secondary)] to-[var(--theme-bg-tertiary)] border border-[var(--theme-accent)]/20 rounded-2xl p-8 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-10">
                     <User className="w-32 h-32 text-[var(--theme-accent)]" />
                  </div>
                  <div className="relative z-10">
                     <h2 className="text-2xl font-bold text-[var(--theme-text)] mb-2">
                        Good Afternoon, <span className="text-[var(--theme-accent)]">{profile.fullName.split(' ')[0] || profile.fullName}</span>
                     </h2>
                     <p className="text-[var(--theme-text-muted)] text-sm">Here's your practice performance summary.</p>
                  </div>
               </div>

               {/* Primary Metrics Row */}
               <div className="grid grid-cols-3 gap-6">
                  <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/30 rounded-2xl p-6 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                     <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Total Patients</h3>
                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                           <Users className="w-4 h-4 text-orange-500" />
                        </div>
                     </div>
                     <div className="text-4xl font-bold text-[#FFFFFF] group-hover:scale-105 transition-transform origin-left">{stats.patients.toLocaleString()}</div>
                     <p className="text-xs text-[var(--theme-text-muted)] mt-2 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-green-500" /> <span className="text-green-500">+12%</span> from last month
                     </p>
                  </div>

                  <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/30 rounded-2xl p-6 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                     <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Total Consultations</h3>
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                           <Activity className="w-4 h-4 text-blue-500" />
                        </div>
                     </div>
                     <div className="text-4xl font-bold text-[#FFFFFF] group-hover:scale-105 transition-transform origin-left">{stats.consultations.toLocaleString()}</div>
                     <p className="text-xs text-[var(--theme-text-muted)] mt-2 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-green-500" /> <span className="text-green-500">+8%</span> from last month
                     </p>
                  </div>

                  <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/30 rounded-2xl p-6 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                     <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Total Surgeries</h3>
                        <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                           <User className="w-4 h-4 text-green-500" />
                        </div>
                     </div>
                     <div className="text-4xl font-bold text-[#FFFFFF] group-hover:scale-105 transition-transform origin-left">{stats.surgeries.toLocaleString()}</div>
                     <p className="text-xs text-[var(--theme-text-muted)] mt-2 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-green-500" /> <span className="text-green-500">+15%</span> from last month
                     </p>
                  </div>
               </div>

               {/* Total Income Section */}
               <div className="bg-gradient-to-br from-[var(--theme-bg-secondary)] to-[var(--theme-bg)] border border-[var(--theme-accent)]/40 rounded-2xl p-8 shadow-2xl relative overflow-hidden group">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-[var(--theme-accent)]/10 rounded-full blur-3xl group-hover:bg-[var(--theme-accent)]/20 transition-colors duration-500"></div>
                  <div className="relative z-10">
                     <h3 className="text-sm font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mb-2">Total Income</h3>
                     <div className="flex items-end gap-4">
                        <div className="text-5xl font-bold text-[#FFFFFF] tracking-tight">₹ {stats.totalIncome.toLocaleString('en-IN')}</div>
                        <div className="flex items-center gap-1 text-sm font-bold text-green-500 mb-2 bg-green-500/10 px-2 py-1 rounded-lg">
                           <TrendingUp className="w-4 h-4" /> +24.5%
                        </div>
                     </div>
                     <p className="text-xs text-[var(--theme-text-muted)] mt-2">Total revenue generated this month</p>
                  </div>
               </div>

               {/* Income Breakdown Row */}
               <div className="grid grid-cols-3 gap-6">
                  <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-border)] rounded-2xl p-6 shadow-md hover:border-[var(--theme-accent)]/30 transition-all duration-300">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                           <IndianRupee className="w-4 h-4 text-blue-500" />
                        </div>
                        <h3 className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Consultations</h3>
                     </div>
                     <div className="text-2xl font-bold text-[#FFFFFF]">₹ {stats.consultationIncome.toLocaleString('en-IN')}</div>
                     <div className="w-full bg-[var(--theme-bg-tertiary)] h-1.5 rounded-full mt-4 overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full" style={{ width: `${stats.totalIncome > 0 ? (stats.consultationIncome / stats.totalIncome) * 100 : 0}%` }}></div>
                     </div>
                  </div>

                  <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-border)] rounded-2xl p-6 shadow-md hover:border-[var(--theme-accent)]/30 transition-all duration-300">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                           <IndianRupee className="w-4 h-4 text-green-500" />
                        </div>
                        <h3 className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Surgeries</h3>
                     </div>
                     <div className="text-2xl font-bold text-[#FFFFFF]">₹ {stats.surgeryIncome.toLocaleString('en-IN')}</div>
                     <div className="w-full bg-[var(--theme-bg-tertiary)] h-1.5 rounded-full mt-4 overflow-hidden">
                        <div className="bg-green-500 h-full rounded-full" style={{ width: `${stats.totalIncome > 0 ? (stats.surgeryIncome / stats.totalIncome) * 100 : 0}%` }}></div>
                     </div>
                  </div>

                  <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-border)] rounded-2xl p-6 shadow-md hover:border-[var(--theme-accent)]/30 transition-all duration-300">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                           <Pill className="w-4 h-4 text-purple-500" />
                        </div>
                        <h3 className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Pharmacy</h3>
                     </div>
                     <div className="text-2xl font-bold text-[#FFFFFF]">₹ {stats.pharmacyIncome.toLocaleString('en-IN')}</div>
                     <div className="w-full bg-[var(--theme-bg-tertiary)] h-1.5 rounded-full mt-4 overflow-hidden">
                        <div className="bg-purple-500 h-full rounded-full" style={{ width: `${stats.totalIncome > 0 ? (stats.pharmacyIncome / stats.totalIncome) * 100 : 0}%` }}></div>
                     </div>
                  </div>
               </div>

            </div>
         </div>
      </div>
   );
}