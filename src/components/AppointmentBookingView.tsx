import { useState, useEffect } from 'react';
import { Search, Calendar, Clock, Users, X, Plus, AlertCircle, CheckCircle, User, ChevronRight, Stethoscope, CalendarPlus, ClipboardList } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card } from './ui/card';
import API_ENDPOINTS from '../config/api';

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  available: boolean;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface Appointment {
  _id: string;
  patientRegistrationId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

interface Patient {
  _id: string;
  name: string;
  registrationId: string;
  contactInfo?: {
    phone?: string;
    email?: string;
  };
}

export function AppointmentBookingView() {
  // Patient Selection
  const [patientSearch, setPatientSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientEmail, setNewPatientEmail] = useState('');
  const [newRegistrationId, setNewRegistrationId] = useState<string | null>(null);

  // Appointment Details
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [bookedAppointments, setBookedAppointments] = useState<Appointment[]>([]);

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  // Fetch doctors from database
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.USERS_BY_ROLE('DOCTOR'));
        if (res.ok) {
          const data = await res.json();
          const doctorsList = (data.users || []).map((user: any) => ({
            id: user._id || user.username,
            name: user.full_name || `Dr. ${user.username}`,
            specialization: user.specialty || 'General Ophthalmology',
            available: true,
          }));
          setDoctors(doctorsList);
        } else {
          console.error('Failed to fetch doctors');
          setDoctors([]);
        }
      } catch (error) {
        console.error('Error fetching doctors:', error);
        setDoctors([]);
      }
    };

    fetchDoctors();
  }, []);

  // Fetch appointments when date changes
  useEffect(() => {
    if (appointmentDate) {
      fetchBookedAppointments(appointmentDate);
      generateTimeSlots(appointmentDate);
    }
  }, [appointmentDate]);

  const generateTimeSlots = (date: string) => {
    const slots: TimeSlot[] = [];
    const startHour = 9;
    const endHour = 21;  // Now goes until 20:30 (8:30 PM)

    for (let hour = startHour; hour < endHour; hour++) {
      const time = `${String(hour).padStart(2, '0')}:00`;
      slots.push({ time, available: true });
      const halfTime = `${String(hour).padStart(2, '0')}:30`;
      slots.push({ time: halfTime, available: true });
    }

    setTimeSlots(slots);
    setSelectedTime('');
  };

  const fetchBookedAppointments = async (date: string) => {
    try {
      // Fetch appointments from backend and filter by date
      try {
        const response = await fetch(API_ENDPOINTS.APPOINTMENTS);
        if (response.ok) {
          const data = await response.json();
          const appointments = data.appointments || [];
          const dayAppointments = appointments.filter(
            (apt: Appointment) => apt.appointmentDate === date
          );
          setBookedAppointments(dayAppointments);
          return;
        }
      } catch (err) {
        console.warn('Could not fetch appointments from backend, fallback disabled:', err);
      }
      // If backend fetch fails, leave bookedAppointments empty and surface an error
      setBookedAppointments([]);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    }
  };

  const searchPatients = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(`${API_ENDPOINTS.PATIENTS_SEARCH}?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        const formattedResults = (data.results || []).map((r: any) => ({
          _id: r.registrationId,
          name: r.name,
          registrationId: r.registrationId,
          contactInfo: {
            phone: r.phone,
            email: r.email,
          },
        }));
        setSearchResults(formattedResults);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setSearchResults([]);
    setPatientSearch('');
    setIsNewPatient(false);
    setNewPatientName('');
    setNewPatientPhone('');
    setNewPatientEmail('');
    setNewRegistrationId(null);
  };

  const generateNewRegistrationId = () => {
    const prefix = 'REG';
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000000);
    return `${prefix}-${year}-${String(random).padStart(6, '0')}`;
  };

  const handleCreateNewPatient = async () => {
    if (!newPatientName.trim()) {
      setError('Patient name is required');
      return;
    }

    // Check if a patient with this name already exists
    try {
      const response = await fetch(`${API_ENDPOINTS.PATIENTS_SEARCH}?q=${encodeURIComponent(newPatientName)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          // Patient with this name already exists
          const existingPatient = data.results[0];
          setError(`A patient named "${newPatientName}" already exists with ID ${existingPatient.registrationId}. Please select from search results instead.`);
          return;
        }
      }
    } catch (err) {
      console.warn('Could not check for duplicates:', err);
      // Continue anyway if search fails
    }

    const regId = generateNewRegistrationId();
    setNewRegistrationId(regId);

    const newPatient: Patient = {
      _id: regId,
      name: newPatientName,
      registrationId: regId,
      contactInfo: {
        phone: newPatientPhone,
        email: newPatientEmail,
      },
    };

    setSelectedPatient(newPatient);
    setError(null);
  };

  const isTimeSlotAvailable = (time: string): boolean => {
    if (!selectedDoctor) return true;
    return !bookedAppointments.some(
      (apt) => apt.doctorId === selectedDoctor.id && apt.appointmentTime === time && apt.status !== 'cancelled'
    );
  };

  const handleBookAppointment = async () => {
    // Validation
    if (!selectedPatient) {
      setError('Please select or create a patient');
      return;
    }
    if (!selectedDoctor) {
      setError('Please select a doctor');
      return;
    }
    if (!appointmentDate) {
      setError('Please select a date');
      return;
    }
    if (!selectedTime) {
      setError('Please select a time slot');
      return;
    }

    if (!isTimeSlotAvailable(selectedTime)) {
      setError('Selected time slot is no longer available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const appointmentId = `APT-${Date.now()}`;

      // Step 1: If it's a new patient, save them to the backend first
      if (isNewPatient && newRegistrationId) {
        // Generate a default password from the registration ID (patient can change it later)
        const defaultPassword = newRegistrationId.replace(/-/g, '').slice(0, 8).toLowerCase();

        const newPatientData = {
          registrationId: newRegistrationId,
          patientDetails: {
            name: selectedPatient.name,
            password: defaultPassword,
            age: '',
            sex: '',
            phone: selectedPatient.contactInfo?.phone || '',
            email: selectedPatient.contactInfo?.email || '',
            address: '',
            bloodType: '',
            allergies: '',
            emergencyContact: ''
          },
          presentingComplaints: {
            complaints: [{ id: '1', complaint: '', duration: '' }],
            history: { severity: '', onset: '', aggravating: '', relieving: '', associated: '' }
          },
          medicalHistory: {
            medical: [],
            surgical: [],
            familyHistory: ''
          },
          drugHistory: {}
        };

        try {
          console.log('ðŸ“¤ Attempting to save new patient with data:', newPatientData);
          const patientResponse = await fetch(API_ENDPOINTS.PATIENTS_NEW, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newPatientData)
          });

          console.log('Patient save response status:', patientResponse.status);

          if (!patientResponse.ok) {
            const errorData = await patientResponse.json();
            console.error('âŒ Failed to save new patient:', errorData);
            setError(`Failed to save patient: ${JSON.stringify(errorData.detail || errorData)}`);
          } else {
            const savedPatient = await patientResponse.json();
            console.log('âœ“ New patient saved to MongoDB with registrationId:', newRegistrationId, 'Response:', savedPatient);
            // Small delay to ensure patient is fully persisted before creating appointment
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (err) {
          console.error('âŒ Could not save patient data:', err);
          setError(`Patient save error: ${err instanceof Error ? err.message : String(err)}`);
          // Continue with appointment booking even if patient save fails
        }
      }

      // Verify we have the correct registrationId
      console.log('ðŸ” Creating appointment with patientRegistrationId:', selectedPatient.registrationId, 'newRegistrationId:', newRegistrationId);

      // Create appointment with QueuedPatient structure for queue system
      const queuedAppointment = {
        _id: appointmentId,
        appointmentId: appointmentId,
        patientName: selectedPatient.name,
        patientRegistrationId: selectedPatient.registrationId,
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        appointmentDate,
        appointmentTime: selectedTime,
        status: 'booked' as const,
        receptionQueuePosition: undefined,
        opdQueuePosition: undefined,
        doctorQueuePosition: undefined,
        bookedAt: new Date().toISOString(),
        phone: selectedPatient.contactInfo?.phone,
        email: selectedPatient.contactInfo?.email,
      };

      // Try to save to MongoDB first
      try {
        const response = await fetch(API_ENDPOINTS.APPOINTMENTS, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(queuedAppointment)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to save appointment');
        }

        console.log('âœ“ Appointment saved to MongoDB');
      } catch (mongoErr) {
        console.error('Appointment book error:', mongoErr);
        setError(mongoErr instanceof Error ? mongoErr.message : 'Failed to book appointment');
        setLoading(false);
        return;
      }

      setSuccess(`Appointment booked successfully for ${selectedPatient.name}`);

      // Reset form
      setTimeout(() => {
        setSelectedPatient(null);
        setSelectedDoctor(null);
        setAppointmentDate('');
        setSelectedTime('');
        setPatientSearch('');
        setNewPatientName('');
        setNewPatientPhone('');
        setNewPatientEmail('');
        setNewRegistrationId(null);
        setSuccess(null);
        setIsNewPatient(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  const getTodayStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getAvailableTimeSlots = () => {
    if (!appointmentDate) return [];

    const isToday = appointmentDate === getTodayStr();
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    return timeSlots.filter(slot => {
      // 1. If it's today, ensure the slot is in the future
      if (isToday) {
        const [slotHour, slotMinute] = slot.time.split(':').map(Number);
        if (slotHour < currentHour || (slotHour === currentHour && slotMinute <= currentMinute)) {
          return false;
        }
      }

      // 2. Check if the slot is available for the selected doctor
      return isTimeSlotAvailable(slot.time);
    });
  };

  const getMinDate = () => {
    return getTodayStr();
  };

  return (
    <div className="text-white space-y-8 animate-in fade-in duration-700">
      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-center gap-3 animate-in slide-in-from-top-2">
          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-green-500 text-sm font-bold">Appointment Scheduled</p>
            <p className="text-white/60 text-xs">{success}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 animate-in shake duration-500">
          <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-red-400 text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Booking Flow */}
        <div className="lg:col-span-8 space-y-10">

          {/* STEP 1: PATIENT SELECTION */}
          <section className="relative">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#D4A574] to-[#C89B67] flex items-center justify-center text-[#0a0a0a] shadow-lg shadow-[#D4A574]/20">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--theme-text)] tracking-tight">Patient Information</h2>
                <p className="text-[var(--theme-text-muted)] text-[10px] uppercase tracking-widest font-bold">Step 01 / Select Or Create</p>
              </div>
            </div>

            {selectedPatient ? (
              <div className="bg-[var(--theme-bg)] border border-[var(--theme-accent)]/30 rounded-3xl p-6 flex items-center justify-between group hover:border-[var(--theme-accent)] transition-all duration-500 shadow-xl">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-[var(--theme-bg-secondary)] flex items-center justify-center border border-[var(--theme-accent)] group-hover:border-[var(--theme-accent)]/30">
                    <User className="w-8 h-8 text-[var(--theme-accent)]" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-[var(--theme-text)] leading-none mb-2">{selectedPatient.name}</h3>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="bg-[var(--theme-accent)]/10 text-[var(--theme-accent)] px-2 py-1 rounded-md font-mono border border-[var(--theme-accent)]/20">{selectedPatient.registrationId}</span>
                      {selectedPatient.contactInfo?.phone && (
                        <span className="text-[var(--theme-text-muted)] flex items-center gap-1">
                          <Plus className="w-3 h-3 rotate-45" /> {selectedPatient.contactInfo.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedPatient(null);
                    setIsNewPatient(false);
                    setNewPatientName('');
                  }}
                  className="p-3 bg-[var(--theme-bg-secondary)] hover:bg-red-500/10 text-[var(--theme-text-muted)] hover:text-red-500 rounded-2xl transition-all"
                  title="Remove patient"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Search Box */}
                <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)] rounded-3xl p-6 hover:border-[var(--theme-accent)] transition-all shadow-lg">
                  <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mb-4 block italic">Find existing record</label>
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--theme-text-muted)] group-focus-within:text-[var(--theme-accent)] transition-colors" />
                    <Input
                      type="text"
                      placeholder="Name or Patient ID..."
                      value={patientSearch}
                      onChange={(e) => {
                        setPatientSearch(e.target.value);
                        searchPatients(e.target.value);
                        setIsNewPatient(false);
                      }}
                      className="!pl-14 h-12 bg-[var(--theme-bg-tertiary)] border-[var(--theme-accent)] rounded-2xl focus:border-[var(--theme-accent)]/50 focus:ring-0 text-[var(--theme-text)] placeholder:text-[var(--theme-text-muted)]"
                    />
                  </div>

                  {/* Search Results Dropdown-like list */}
                  {searchResults.length > 0 && (
                    <div className="mt-4 space-y-2 max-h-[250px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[var(--theme-bg-tertiary)]">
                      {searchResults.map((patient) => (
                        <button
                          key={patient._id}
                          onClick={() => handleSelectPatient(patient)}
                          className="w-full text-left bg-[var(--theme-bg-tertiary)] border border-[var(--theme-accent)] hover:border-[var(--theme-accent)] p-4 rounded-2xl transition-all group flex items-center justify-between"
                        >
                          <div>
                            <p className="text-sm font-bold text-[var(--theme-text)] group-hover:text-[var(--theme-accent)] transition-colors">{patient.name}</p>
                            <p className="text-[10px] font-mono text-[var(--theme-text-muted)] group-hover:text-[var(--theme-accent)]/50 transition-colors uppercase tracking-widest">{patient.registrationId}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[var(--theme-text-muted)] group-hover:text-[var(--theme-accent)] transition-all group-hover:translate-x-1" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Create New patient button / indicator */}
                <div className={`transition-all duration-500 ${isNewPatient ? 'md:col-span-2' : ''}`}>
                  {!isNewPatient ? (
                    <button
                      onClick={() => setIsNewPatient(true)}
                      className="w-full h-full min-h-[140px] bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)] border-dashed rounded-3xl flex flex-col items-center justify-center gap-3 hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-accent)] transition-all text-[var(--theme-text-muted)] hover:text-[var(--theme-accent)] group shadow-lg"
                    >
                      <div className="p-3 bg-[var(--theme-bg-tertiary)] rounded-2xl group-hover:bg-[var(--theme-accent)] group-hover:force-text-white transition-all">
                        <Plus className="w-6 h-6 text-[var(--theme-accent)] group-hover:force-text-white" />
                      </div>
                      <span className="text-sm font-bold uppercase tracking-widest text-[var(--theme-accent)]">Register New Patient</span>
                    </button>
                  ) : (
                    <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/20 rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in-95">
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-bold text-[var(--theme-text)]">Create New Patient Record</h3>
                        <button onClick={() => setIsNewPatient(false)} className="text-[var(--theme-text-muted)] hover:text-[var(--theme-accent)]"><X className="w-5 h-5" /></button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-2">Full Name *</label>
                            <Input
                              placeholder="Enter legal name"
                              value={newPatientName}
                              onChange={(e) => setNewPatientName(e.target.value)}
                              className="bg-[var(--theme-bg-tertiary)] border-[var(--theme-accent)] h-12 rounded-xl focus:border-[var(--theme-accent)]/50 text-[var(--theme-text)] placeholder:text-[var(--theme-text-muted)]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-2">Contact Number</label>
                            <Input
                              placeholder="+91 XXXXX XXXXX"
                              value={newPatientPhone}
                              onChange={(e) => setNewPatientPhone(e.target.value)}
                              className="bg-[var(--theme-bg-tertiary)] border-[var(--theme-accent)] h-12 rounded-xl focus:border-[var(--theme-accent)]/50 text-[var(--theme-text)] placeholder:text-[var(--theme-text-muted)]"
                            />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-2">Email (Optional)</label>
                            <Input
                              placeholder="patient@email.com"
                              value={newPatientEmail}
                              onChange={(e) => setNewPatientEmail(e.target.value)}
                              className="bg-[var(--theme-bg-tertiary)] border-[var(--theme-accent)] h-12 rounded-xl focus:border-[var(--theme-accent)]/50 text-[var(--theme-text)] placeholder:text-[var(--theme-text-muted)]"
                            />
                          </div>
                          <div className="flex items-end pt-2">
                            <Button
                              onClick={handleCreateNewPatient}
                              className="w-full h-12 bg-gradient-to-r from-[var(--theme-accent)] to-[var(--theme-accent-hover)] hover:scale-[1.05] active:scale-[0.98] transition-all force-text-white font-bold rounded-xl shadow-xl shadow-[var(--theme-accent)]/20 border-0"
                            >
                              Confirm Registration
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* STEP 2: DOCTOR & SCHEDULE */}
          {selectedPatient && (
            <section className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-500">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)] flex items-center justify-center text-[var(--theme-accent)]">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--theme-text)] tracking-tight">Schedule Visit</h2>
                  <p className="text-[var(--theme-text-muted)] text-[10px] uppercase tracking-widest font-bold">Step 02 / Select Date & Doctor</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Date Side */}
                <div className="space-y-6">
                  <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)] rounded-3xl p-6 shadow-lg">
                    <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mb-4 block">Select Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--theme-accent)]" />
                      <Input
                        type="date"
                        value={appointmentDate}
                        onChange={(e) => setAppointmentDate(e.target.value)}
                        min={getMinDate()}
                        className="!pl-16 h-14 bg-[var(--theme-bg-tertiary)] border-[var(--theme-accent)] rounded-2xl focus:border-[var(--theme-accent)] text-[var(--theme-text)] focus:ring-0 text-lg font-light uppercase"
                      />
                    </div>
                  </div>

                  {/* Doctor List */}
                  <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)] rounded-3xl p-6 shadow-lg">
                    <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mb-4 block">Available Specialist</label>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[var(--theme-bg-tertiary)]">
                      {doctors.map((doctor) => (
                        <button
                          key={doctor.id}
                          onClick={() => setSelectedDoctor(doctor)}
                          className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden group ${selectedDoctor?.id === doctor.id
                            ? 'border-[var(--theme-accent)] bg-[var(--theme-accent)]/5'
                            : 'border-[var(--theme-accent)] bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-accent)]'
                            }`}
                        >
                          {selectedDoctor?.id === doctor.id && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 bg-[var(--theme-accent)] rounded-full flex items-center justify-center force-text-white">
                              <CheckCircle className="w-4 h-4" />
                            </div>
                          )}
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-xl transition-colors ${selectedDoctor?.id === doctor.id ? 'bg-[var(--theme-accent)] force-text-white' : 'bg-[var(--theme-bg-secondary)] text-[var(--theme-text-muted)] group-hover:text-[var(--theme-accent)]'}`}>
                              <Stethoscope className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[var(--theme-text)]">{doctor.name}</p>
                              <p className="text-[10px] text-[var(--theme-text-muted)] uppercase tracking-wider">{doctor.specialization}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Time Grid Side */}
                <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)] rounded-3xl p-6 shadow-lg flex flex-col h-full">
                  <div className="flex items-center justify-between mb-6">
                    <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Select Available Time</label>
                    {appointmentDate && selectedDoctor && getAvailableTimeSlots().length > 0 && (
                      <span className="bg-green-500/10 text-green-500 text-[10px] font-bold px-2 py-1 rounded-lg">Available Slots Found</span>
                    )}
                    {appointmentDate && selectedDoctor && getAvailableTimeSlots().length === 0 && (
                      <span className="bg-red-500/10 text-red-500 text-[10px] font-bold px-2 py-1 rounded-lg">No Slots Available</span>
                    )}
                  </div>

                  {appointmentDate ? (
                    <div className="flex-1">
                      {getAvailableTimeSlots().length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {getAvailableTimeSlots().map((slot) => (
                            <button
                              key={slot.time}
                              onClick={() => setSelectedTime(slot.time)}
                              className={`py-4 rounded-2xl border-2 transition-all text-xs font-bold tracking-widest ${selectedTime === slot.time
                                ? 'bg-[var(--theme-accent)] force-text-white border-[var(--theme-accent)] shadow-lg shadow-[var(--theme-accent)]/20'
                                : 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text)] border-[var(--theme-accent)] hover:border-[var(--theme-accent)]/50'
                                }`}
                            >
                              {slot.time}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-[var(--theme-text-muted)] border-2 border-dashed border-[var(--theme-accent)] rounded-3xl p-8 text-center">
                          <Clock className="w-8 h-8 mb-3 opacity-20" />
                          <p className="text-sm font-medium">No slots on this date</p>
                          <p className="text-[10px] mt-1 italic">Try selecting a different day</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-[var(--theme-text-muted)] border-2 border-dashed border-[var(--theme-accent)] rounded-3xl p-8 text-center">
                      <CalendarPlus className="w-10 h-10 mb-3 opacity-10" />
                      <p className="text-sm font-medium">Date Required</p>
                      <p className="text-[10px] mt-1 italic">Select a date to unlock time slots</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Right Column - Booking Summary (The Ticket) */}
        {selectedPatient && (
          <div className="lg:col-span-4 lg:block">
            <div className="sticky top-0 space-y-6">
              <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)] rounded-[40px] overflow-hidden shadow-2xl flex flex-col relative">
                {/* Ticket Top */}
                <div className="bg-[var(--theme-bg-tertiary)] p-8 border-b border-dashed border-[var(--theme-accent)] relative">
                  {/* Decorative punched holes */}
                  <div className="absolute -left-3 -bottom-3 w-6 h-6 bg-[var(--theme-bg)] rounded-full border-r border-[var(--theme-accent)]"></div>
                  <div className="absolute -right-3 -bottom-3 w-6 h-6 bg-[var(--theme-bg)] rounded-full border-l border-[var(--theme-accent)]"></div>

                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-[var(--theme-accent)]/10 rounded-xl text-[var(--theme-accent)]">
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-[var(--theme-text)] uppercase tracking-[0.2em]">Booking Summary</h3>
                  </div>

                  <div className="space-y-6">
                    {/* Summary: Patient */}
                    <div>
                      <p className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mb-2">Patient Details</p>
                      <div className="animate-in fade-in slide-in-from-left-2 transition-all">
                        <p className="text-lg font-bold text-[var(--theme-text)] leading-tight">{selectedPatient.name}</p>
                        <p className="text-xs font-mono text-[var(--theme-accent)] tracking-tighter mt-1">{selectedPatient.registrationId}</p>
                      </div>
                    </div>

                    {/* Summary: Doctor */}
                    <div>
                      <p className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mb-2">Consultant Specialist</p>
                      {selectedDoctor ? (
                        <div className="animate-in fade-in slide-in-from-left-2 transition-all">
                          <p className="text-sm font-bold text-[var(--theme-text)]">{selectedDoctor.name}</p>
                          <p className="text-[10px] text-[var(--theme-text-muted)] uppercase tracking-widest">{selectedDoctor.specialization}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-[var(--theme-text-muted)] italic">None selected</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ticket Bottom */}
                <div className="p-8 space-y-8 bg-[var(--theme-bg-secondary)]">
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mb-2 block">Visit Date</label>
                      {appointmentDate ? (
                        <div className="flex items-center gap-2 text-[var(--theme-text)] font-bold text-sm">
                          <Calendar className="w-3.5 h-3.5 text-[var(--theme-accent)]" />
                          {new Date(appointmentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      ) : (
                        <span className="text-[10px] text-[var(--theme-text-muted)]">N/A</span>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mb-2 block">Scheduled Time</label>
                      {selectedTime ? (
                        <div className="flex items-center gap-2 text-[var(--theme-text)] font-bold text-sm">
                          <Clock className="w-3.5 h-3.5 text-[var(--theme-accent)]" />
                          {selectedTime}
                        </div>
                      ) : (
                        <span className="text-[10px] text-[var(--theme-text-muted)]">N/A</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-[var(--theme-accent)]">
                    <Button
                      onClick={handleBookAppointment}
                      disabled={loading || !selectedPatient || !selectedDoctor || !appointmentDate || !selectedTime}
                      className={`w-full h-16 rounded-2xl font-bold uppercase tracking-widest transition-all shadow-xl ${!selectedPatient || !selectedDoctor || !appointmentDate || !selectedTime
                        ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-muted)] border border-[var(--theme-accent)] cursor-not-allowed'
                        : 'bg-gradient-to-r from-[var(--theme-accent)] to-[var(--theme-accent-hover)] force-text-white hover:scale-[1.02] active:scale-[0.98]'
                        }`}
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-[var(--theme-bg)]/30 border-t-[var(--theme-bg)] rounded-full animate-spin"></div>
                          Processing...
                        </div>
                      ) : (
                        'Confirm Appointment'
                      )}
                    </Button>
                    <p className="text-center text-[9px] text-[var(--theme-text-muted)] mt-4 uppercase tracking-widest italic font-medium">Valid for current billing session only</p>
                  </div>
                </div>
              </div>

              {/* Quick Tips */}
              <div className="bg-[#D4A574]/5 border border-[#D4A574]/10 rounded-3xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-[#D4A574]" />
                  <h4 className="text-[10px] font-bold text-white uppercase tracking-widest">Efficiency Tip</h4>
                </div>
                <p className="text-[10px] text-[#6B6B6B] leading-relaxed">
                  Check-ins are automatically pushed to the <span className="text-[#D4A574]">Appt Queue</span> after confirmation. Inform the patient to arrive 15 mins early.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
