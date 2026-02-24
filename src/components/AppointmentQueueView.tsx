import { useState, useEffect } from 'react';
import { Calendar, CheckCircle, Clock, Send, AlertCircle, TrendingUp, ChevronLeft, ChevronRight, User, Search, Filter } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { QueuedPatient, AppointmentStatus } from './queueTypes';
import API_ENDPOINTS from '../config/api';
import { useIsLightTheme } from '../hooks/useTheme';

// Helper function to safely format date
const formatDate = (dateValue: any): string => {
  if (!dateValue) return 'Not set';

  if (typeof dateValue === 'string') {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }
    return dateValue;
  }
  return 'Not set';
};

// Helper function to safely format time
const formatTime = (timeValue: any): string => {
  if (!timeValue) return 'Not set';

  if (typeof timeValue === 'string') {
    if (timeValue.match(/^\d{1,2}:\d{2}(\s?(AM|PM))?$/i)) {
      return timeValue;
    }
    const date = new Date(timeValue);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
    return timeValue;
  }
  return 'Not set';
};

// Helper to get a sortable date key
const getDateKey = (dateValue: any): string => {
  if (!dateValue) return '9999-99-99';
  if (typeof dateValue === 'string') {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    return dateValue;
  }
  return '9999-99-99';
};

export function AppointmentQueueView() {
  const [appointments, setAppointments] = useState<QueuedPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<QueuedPatient | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'booked' | 'in_progress' | 'completed'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 6;
  const isLight = useIsLightTheme();
  const textColor = isLight ? 'text-[#111111]' : 'text-[#f5f5f5]';

  useEffect(() => {
    fetchAppointments();
    const handleStorageChange = () => fetchAppointments();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.APPOINTMENTS);
      if (!response.ok) throw new Error(`Failed to fetch appointments: ${response.status}`);
      const data = await response.json();
      setAppointments(data.appointments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load appointments from server');
    } finally {
      setLoading(false);
    }
  };

  const pushToReception = async (appointment: QueuedPatient) => {
    if (appointment.status !== 'booked') {
      alert(`Cannot send to reception: appointment is already ${appointment.status}`);
      return;
    }

    try {
      const updated: QueuedPatient = {
        ...appointment,
        status: 'reception_pending',
        receivedByReceptionAt: new Date().toISOString(),
      };

      const apptId = appointment._id || appointment.appointmentId;
      const payload = {
        appointmentId: apptId,
        registrationId: appointment.patientRegistrationId,
        patientName: appointment.patientName,
        appointmentDate: appointment.appointmentDate,
        receptionData: appointment
      };

      const resp = await fetch(API_ENDPOINTS.QUEUE_RECEPTION, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error(`Failed to queue reception (${resp.status})`);

      setAppointments(prev => prev.map(apt => apt._id === appointment._id ? updated : apt));
      window.dispatchEvent(new CustomEvent('receptionQueueUpdated', { detail: { updated } }));
      setSelectedAppointment(null);
      alert('Patient pushed to reception workflow');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to push to reception');
    }
  };

  const getStatusColor = (status: AppointmentStatus) => {
    const styles: Record<AppointmentStatus, string> = {
      booked: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
      reception_pending: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      reception_completed: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      opd_pending: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
      opd_completed: 'bg-teal-500/10 border-teal-500/20 text-teal-400',
      doctor_pending: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
      doctor_completed: 'bg-green-500/10 border-green-500/20 text-green-400',
      discharged: 'bg-gray-500/10 border-gray-500/20 text-gray-400',
    };
    return styles[status] || 'bg-gray-500/10 border-gray-500/20 text-gray-400';
  };

  const getStatusLabel = (status: AppointmentStatus) => {
    const labels: Record<AppointmentStatus, string> = {
      booked: 'Scheduled',
      reception_pending: 'In Reception',
      reception_completed: 'Registered',
      opd_pending: 'OPD Queue',
      opd_completed: 'OPD Done',
      doctor_pending: 'Consulting',
      doctor_completed: 'Prescribed',
      discharged: 'Discharged',
    };
    return labels[status];
  };

  const filteredAppointments = appointments.filter(apt => {
    if (activeTab === 'booked' && apt.status !== 'booked') return false;
    if (activeTab === 'in_progress' && !['reception_pending', 'reception_completed', 'opd_pending', 'opd_completed', 'doctor_pending', 'doctor_completed'].includes(apt.status)) return false;
    if (activeTab === 'completed' && apt.status !== 'discharged') return false;

    if (selectedDate) {
      const aptDate = getDateKey(apt.appointmentDate);
      const filterDate = new Date(selectedDate).toISOString().split('T')[0];
      if (aptDate !== filterDate) return false;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        apt.patientName.toLowerCase().includes(query) ||
        apt.patientRegistrationId.toLowerCase().includes(query) ||
        (apt.doctorName || '').toLowerCase().includes(query)
      );
    }

    return true;
  }).sort((a, b) => {
    const dateA = getDateKey(a.appointmentDate);
    const dateB = getDateKey(b.appointmentDate);
    return dateB.localeCompare(dateA);
  });

  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const paginatedAppointments = filteredAppointments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#D4A574]/20 border-t-[#D4A574] rounded-full animate-spin"></div>
          <p className="text-[#8B8B8B] font-medium animate-pulse uppercase tracking-widest text-[10px]">Syncing Queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-1 animate-in fade-in duration-700">
      {/* Top Bar - Modern Clean Look */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className={`text-3xl font-bold ${textColor} tracking-tight leading-none mb-2`}>Appointment Queue</h1>
          <p className="text-[10px] uppercase tracking-widest text-[var(--theme-text-muted)] font-bold">Total Appointments: {filteredAppointments.length}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--theme-text-muted)] group-focus-within:text-[var(--theme-accent)] transition-colors" />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`bg-[var(--theme-bg-input)] border border-[var(--theme-accent)] rounded-2xl pl-12 pr-4 h-12 w-64 text-sm ${textColor} focus:border-[var(--theme-accent)]/50 focus:ring-0 transition-all outline-none`}
            />
          </div>

          <div className={`flex items-center gap-2 p-1 bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)] rounded-2xl`}>
            {(['all', 'booked', 'in_progress', 'completed'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setCurrentPage(1);
                }}
                className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === tab
                  ? 'bg-[var(--theme-accent)] force-text-white shadow-lg shadow-[var(--theme-accent)]/20'
                  : `${textColor} hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-accent)]`
                  }`}
              >
                {tab.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className={`relative h-12 bg-[var(--theme-bg-input)] border border-[var(--theme-accent)] rounded-2xl flex items-center px-4 gap-3 cursor-pointer hover:border-[var(--theme-accent)]/70 transition-all group`}>
            <Calendar className="w-4 h-4 text-[var(--theme-accent)]" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setCurrentPage(1);
              }}
              className={`bg-transparent text-sm ${textColor} border-none focus:ring-0 outline-none p-0 cursor-pointer`}
            />
            {selectedDate && (
              <button onClick={() => setSelectedDate('')} className={`${textColor} hover:text-[var(--theme-accent)] transition-colors`}>
                <span className="text-xl leading-none">&times;</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
        {/* Left - List Area */}
        <div className="md:col-span-8 space-y-6">
          {filteredAppointments.length === 0 ? (
            <div className="h-[400px] flex flex-col items-center justify-center bg-[#0a0a0a] border border-dashed border-[#D4A574] rounded-[40px] opacity-50">
              <Calendar className="w-12 h-12 text-[#222] mb-4" />
              <p className="text-[#444] uppercase tracking-[0.2em] font-bold text-xs">No appointments found</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedAppointments.map((appointment, idx) => (
                  <button
                    key={appointment._id || `apt-${idx}`}
                    onClick={() => setSelectedAppointment(appointment)}
                    className={`group relative text-left p-6 rounded-[32px] border transition-all duration-300 overflow-hidden ${selectedAppointment?._id === appointment._id
                      ? 'bg-[#121212] border-[#D4A574] shadow-2xl shadow-[#D4A574]/5'
                      : 'bg-[var(--theme-bg-secondary)] border-[var(--theme-accent)] hover:border-[var(--theme-accent)]'
                      }`}
                  >
                    {/* Status Pip */}
                    <div className={`absolute top-0 right-0 w-24 h-1 ${getStatusColor(appointment.status).split(' ')[0]}`}></div>

                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-[var(--theme-bg-tertiary)] rounded-xl group-hover:bg-[var(--theme-bg-secondary)] transition-colors">
                        <User className="w-4 h-4 text-[var(--theme-accent)]" />
                      </div>
                      <span className={`text-[9px] px-3 py-1 rounded-full border uppercase font-bold tracking-widest ${getStatusColor(appointment.status)}`}>
                        {getStatusLabel(appointment.status)}
                      </span>
                    </div>

                    <div>
                      <h3 className={`${textColor} font-bold text-lg leading-tight mb-1 group-hover:text-[var(--theme-accent)] transition-colors truncate`}>
                        {appointment.patientName}
                      </h3>
                      <p className={`text-xs font-mono opacity-50 mb-4 ${textColor}`}>{appointment.patientRegistrationId}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--theme-accent)]/30">
                      <div>
                        <p className={`text-[9px] font-bold opacity-50 uppercase tracking-widest mb-1 ${textColor}`}>Time</p>
                        <div className={`flex items-center gap-1.5 ${textColor} font-medium text-xs`}>
                          <Clock className="w-3 h-3 text-[var(--theme-accent)]" />
                          {formatTime(appointment.appointmentTime)}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-[9px] font-bold opacity-50 uppercase tracking-widest mb-1 ${textColor}`}>Queue Pos</p>
                        <p className={`${textColor} font-bold text-sm`}>#{idx + 1 + (currentPage - 1) * itemsPerPage}</p>
                      </div>
                    </div>

                    {/* Simple accent for selection */}
                    {selectedAppointment?._id === appointment._id && (
                      <div className="absolute right-4 bottom-4 w-12 h-12 bg-[#D4A574]/10 rounded-full flex items-center justify-center animate-in scale-in">
                        <ChevronRight className="w-5 h-5 text-[#D4A574]" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-8 pb-12">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`w-10 h-10 rounded-xl bg-[var(--theme-bg-input)] border border-[var(--theme-accent)] flex items-center justify-center ${textColor} opacity-60 hover:opacity-100 disabled:opacity-30 transition-all`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 rounded-xl text-xs font-bold transition-all ${currentPage === page
                          ? 'bg-[var(--theme-accent)] force-text-white'
                          : 'bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)] text-[var(--theme-text-muted)] hover:text-[var(--theme-accent)]'
                          }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`w-10 h-10 rounded-xl bg-[var(--theme-bg-input)] border border-[var(--theme-accent)] flex items-center justify-center ${textColor} opacity-60 hover:opacity-100 disabled:opacity-30 transition-all`}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right - Detail Panel */}
        <div className="md:col-span-4">
          <div className="sticky top-0">
            {selectedAppointment ? (
              <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)] rounded-[40px] overflow-hidden shadow-2xl flex flex-col relative animate-in fade-in zoom-in-95 slide-in-from-left-4 duration-500 origin-left">
                {/* Visual Header */}
                <div className="bg-[var(--theme-bg-tertiary)] p-8 border-b border-dashed border-[var(--theme-accent)] relative">
                  <div className="absolute -left-3 -bottom-3 w-6 h-6 bg-[var(--theme-bg)] rounded-full border-r border-[var(--theme-accent)]"></div>
                  <div className="absolute -right-3 -bottom-3 w-6 h-6 bg-[var(--theme-bg)] rounded-full border-l border-[var(--theme-accent)]"></div>

                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-[var(--theme-accent)]/10 rounded-xl text-[var(--theme-accent)]">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <h3 className={`text-sm font-bold ${textColor} uppercase tracking-[0.2em]`}>Appointment File</h3>
                  </div>

                  <div className="space-y-6 text-center">
                    <div className="mx-auto w-24 h-24 bg-[var(--theme-bg-tertiary)] rounded-[32px] flex items-center justify-center border-2 border-[var(--theme-accent)]/20 mb-4 shadow-xl">
                      <User className="w-10 h-10 text-[var(--theme-accent)]" />
                    </div>
                    <div>
                      <h2 className={`text-2xl font-bold ${textColor} tracking-tight mb-1`}>{selectedAppointment.patientName}</h2>
                      <p className="text-[var(--theme-accent)] font-mono text-xs tracking-tighter">{selectedAppointment.patientRegistrationId}</p>
                    </div>
                  </div>
                </div>

                <div className="p-10 space-y-10 bg-[var(--theme-bg-input)]">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-10">
                    <div>
                      <p className={`text-[10px] font-bold opacity-50 uppercase tracking-widest mb-2 ${textColor}`}>Doctor</p>
                      <p className={`${textColor} font-bold text-sm tracking-tight`}>{selectedAppointment.doctorName || 'Not Assigned'}</p>
                    </div>
                    <div>
                      <p className={`text-[10px] font-bold opacity-50 uppercase tracking-widest mb-2 ${textColor}`}>Schedule</p>
                      <div className="space-y-1">
                        <p className={`${textColor} font-bold text-sm`}>{formatTime(selectedAppointment.appointmentTime)}</p>
                        <p className={`text-[10px] opacity-60 ${textColor}`}>{formatDate(selectedAppointment.appointmentDate)}</p>
                      </div>
                    </div>
                    <div>
                      <p className={`text-[10px] font-bold opacity-50 uppercase tracking-widest mb-2 ${textColor}`}>Contact</p>
                      <p className={`${textColor} font-bold text-sm tracking-tight`}>{selectedAppointment.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className={`text-[10px] font-bold opacity-50 uppercase tracking-widest mb-2 ${textColor}`}>Internal Status</p>
                      <span className={`inline-block py-1 text-[10px] font-bold uppercase tracking-widest bg-transparent ${getStatusColor(selectedAppointment.status).split(' ')[2]}`}>
                        • {getStatusLabel(selectedAppointment.status)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-[var(--theme-accent)]/30">
                    {selectedAppointment.status === 'booked' ? (
                      <Button
                        onClick={() => pushToReception(selectedAppointment)}
                        className="w-full h-16 bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] hover:scale-[1.02] active:scale-[0.98] transition-all force-text-white font-bold rounded-2xl shadow-xl uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3"
                      >
                        <Send className="w-4 h-4" />
                        Send to Reception
                      </Button>
                    ) : (
                      <div className="p-6 bg-[var(--theme-accent)]/5 border border-[var(--theme-accent)]/10 rounded-3xl text-center">
                        <TrendingUp className="w-5 h-5 text-[var(--theme-accent)] mx-auto mb-3" />
                        <p className={`text-[10px] font-bold opacity-60 uppercase tracking-widest ${textColor}`}>In Active Workflow</p>
                        <p className={`text-[11px] opacity-50 mt-2 ${textColor}`}>Currently being processed in the {getStatusLabel(selectedAppointment.status)} stage.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[600px] flex flex-col items-center justify-center bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)] rounded-[40px] border-dashed">
                <div className="w-16 h-16 bg-[var(--theme-bg-tertiary)] rounded-3xl flex items-center justify-center mb-6 border border-[var(--theme-accent)]/30">
                  <Filter className="w-6 h-6 text-[var(--theme-accent)]/40" />
                </div>
                <p className={`opacity-40 uppercase tracking-[0.3em] font-bold text-[10px] ${textColor}`}>Selection Required</p>
                <p className={`opacity-30 text-xs mt-2 px-12 text-center ${textColor}`}>Select an entry from the queue to view full file details and take actions.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
