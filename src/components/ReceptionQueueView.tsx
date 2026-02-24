import { useState, useEffect } from 'react';
import { CheckCircle2, Clock, User, Search, Activity, ChevronRight, ClipboardList, Phone, UserPlus } from 'lucide-react';
import API_ENDPOINTS from '../config/api';
import { Button } from './ui/button';
import { QueuedPatient } from './queueTypes';
import { PatientData } from './patient';

interface ReceptionQueueViewProps {
  userRole?: string;
  onPatientSelected?: (patient: QueuedPatient, patientData: PatientData) => void;
  updatedPatientData?: PatientData;
  hideDetailView?: boolean;
}

export function ReceptionQueueView({ userRole, onPatientSelected, updatedPatientData, hideDetailView = false }: ReceptionQueueViewProps) {
  const [queue, setQueue] = useState<QueuedPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<QueuedPatient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  const filteredQueue = queue.filter(p =>
    p.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.patientRegistrationId || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    fetchReceptionQueue();

    const handleStorageChange = () => fetchReceptionQueue();
    const handleReceptionQueueUpdated = () => fetchReceptionQueue();
    const handleCompleteCheckIn = () => {
      if (selectedPatient) completeReception();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('completeCheckIn', handleCompleteCheckIn);
    window.addEventListener('receptionQueueUpdated', handleReceptionQueueUpdated);

    const pollInterval = setInterval(fetchReceptionQueue, 5000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('completeCheckIn', handleCompleteCheckIn);
      window.removeEventListener('receptionQueueUpdated', handleReceptionQueueUpdated);
      clearInterval(pollInterval);
    };
  }, [selectedPatient]);

  const fetchReceptionQueue = async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.QUEUE_RECEPTION}?status=waiting`);
      if (!response.ok) throw new Error('Failed to load queue');
      const data = await response.json();
      const today = new Date().toISOString().split('T')[0];

      const waitingItems = (data.items || []).filter((item: any) => {
        const isWaiting = item.status === 'waiting' || !item.status;
        const itemDate = item.appointmentDate || (item.receptionData && item.receptionData.appointmentDate);
        return isWaiting && itemDate === today;
      });
      setQueue(waitingItems);
      setLoading(false);
    } catch (err) {
      console.error('Error loading queue:', err);
      setQueue([]);
      setLoading(false);
    }
  };

  const handleSelectPatient = (patient: QueuedPatient) => {
    setSelectedPatient(patient);
    setNotes((patient as any).receptionNotes || '');

    const rd = (patient as any).receptionData || {};
    const regId = (patient as any).registrationId || patient.patientRegistrationId || rd.patientRegistrationId || 'Not Assigned';
    const name = patient.patientName || rd.patientName || '';
    const phone = (patient as any).phone || rd.phone || '';
    const email = (patient as any).email || rd.email || '';

    const patientData: PatientData = {
      patientDetails: {
        name, registrationId: regId, age: '', sex: '', profilePic: null,
        password: '', phone, email, address: '', bloodType: '', allergies: '', emergencyContact: ''
      },
      presentingComplaints: {
        complaints: [{ id: '1', complaint: '', duration: '' }],
        history: { severity: '', onset: '', aggravating: '', relieving: '', associated: '' },
        timeline: []
      },
      medicalHistory: { medical: [], surgical: [], familyHistory: '', socialHistory: { smoking: '', alcohol: '', exercise: '' } },
      drugHistory: {
        allergies: [], currentMeds: [],
        compliance: { adherenceRate: '', missedDoses: '', lastRefill: '' },
        previousMeds: ''
      },
      optometry: {
        vision: { unaided: { rightEye: '', leftEye: '' }, withGlass: { rightEye: '', leftEye: '' }, withPinhole: { rightEye: '', leftEye: '' }, bestCorrected: { rightEye: '', leftEye: '' } },
        autoRefraction: { ur: { sph: '', cyl: '', axis: '' }, dr: { sph: '', cyl: '', axis: '' } },
        finalGlasses: { rightEye: { sph: '', cyl: '', axis: '', prism: '', va: '', nv: '' }, leftEye: { sph: '', cyl: '', axis: '', prism: '', va: '', nv: '' }, add: '', mDist: '' },
        oldGlass: { rightEye: { sph: '', cyl: '', axis: '', va: '', add: '' }, leftEye: { sph: '', cyl: '', axis: '', va: '', add: '' } },
        currentGlasses: { rightEye: { sph: '', cyl: '', axis: '', va: '', add: '' }, leftEye: { sph: '', cyl: '', axis: '', va: '', add: '' } },
        additional: { gpAdvisedFor: '', gpAdvisedBy: '', useOfGlass: '', product: '' }
      }
    };

    if (onPatientSelected) onPatientSelected(patient, patientData);
  };

  const completeReception = async () => {
    if (!selectedPatient) return;

    try {
      const rd = (selectedPatient as any).receptionData || {};
      const registrationId = (selectedPatient as any).registrationId || selectedPatient.patientRegistrationId || rd.patientRegistrationId;

      if (!registrationId || registrationId === 'Not Assigned') {
        alert('Cannot complete: Patient has no registration ID');
        return;
      }

      const updated: QueuedPatient = {
        ...selectedPatient,
        status: 'reception_completed',
        completedByReceptionAt: new Date().toISOString(),
        receptionNotes: notes,
        patientName: updatedPatientData?.patientDetails.name || selectedPatient.patientName,
        phone: updatedPatientData?.patientDetails.phone || selectedPatient.phone,
        email: updatedPatientData?.patientDetails.email || selectedPatient.email,
      };

      const patientPayload = updatedPatientData ? { ...updatedPatientData, name: updated.patientName, registrationId } : {
        name: updated.patientName,
        registrationId,
        phone: updated.phone,
        email: updated.email,
        patientDetails: { name: updated.patientName, registrationId, phone: updated.phone, email: updated.email }
      };

      const pResp = await fetch(API_ENDPOINTS.PATIENT(registrationId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientPayload)
      });
      if (!pResp.ok) throw new Error('Failed to save patient data');

      const qid = (selectedPatient as any).id || selectedPatient._id || selectedPatient.appointmentId;
      const qResp = await fetch(API_ENDPOINTS.QUEUE_RECEPTION_ITEM(qid), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'done',
          action: 'reception_done',
          receptionData: { ...patientPayload, notes: updated.receptionNotes },
          completedAt: updated.completedByReceptionAt
        })
      });
      if (!qResp.ok) throw new Error('Reception update failed');

      window.dispatchEvent(new CustomEvent('receptionQueueUpdated', { detail: { registrationId } }));
      setSelectedPatient(null);
      setNotes('');
      alert('Patient check-in completed and moved to OPD queue');
    } catch (err) {
      console.error('Error completing reception:', err);
      alert('Error completing check-in');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="w-10 h-10 border-4 border-[#D4A574]/20 border-t-[#D4A574] rounded-full animate-spin mb-4"></div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#444]">Syncing Live Arrivals...</p>
      </div>
    );
  }

  // Simple Sidebar List Mode
  if (hideDetailView) {
    return (
      <div className="flex flex-col h-full overflow-hidden bg-[#0a0a0a]">
        <div className="p-6 border-b border-[#D4A574]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-[#8B8B8B] uppercase tracking-widest">Arrivals</h3>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#1a1a1a] rounded-full border border-[#222]">
              <div className="w-1 h-1 bg-green-500 rounded-full"></div>
              <span className="text-[8px] font-bold text-[#444] uppercase tracking-widest">Live</span>
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-[10px] text-[#444] uppercase font-bold tracking-widest">Active Arrivals</span>
          </div>
        </div>

        <div className="p-4 space-y-2 overflow-y-auto scrollbar-hide flex-1 pt-4">
          {filteredQueue.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center opacity-20">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#444]">No Patients Arrived</p>
            </div>
          ) : (
            filteredQueue.map((patient, idx) => {
              const isSelected = selectedPatient?._id === patient._id || (selectedPatient as any).id === (patient as any).id;

              return (
                <button
                  key={patient._id || (patient as any).id || idx}
                  onClick={() => handleSelectPatient(patient)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 group ${isSelected
                    ? 'bg-[#121212] border-[#D4A574]/40 shadow-lg shadow-[#D4A574]/5'
                    : 'bg-[#0f0f0f] border-[#D4A574] hover:border-[#222]'
                    }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${isSelected ? 'text-[#D4A574]' : 'text-[#444]'}`}>
                      Patient
                    </span>
                    <span className="text-[9px] font-mono text-[#333]">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h4 className={`text-sm font-bold truncate transition-colors ${isSelected ? 'text-white' : 'text-[#8B8B8B] group-hover:text-white'}`}>
                    {patient.patientName}
                  </h4>
                  <p className={`text-[9px] font-mono mt-0.5 ${isSelected ? 'text-[#D4A574]/50' : 'text-[#444]'}`}>
                    {patient.patientRegistrationId || 'WALK-IN'}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-1 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight leading-none mb-2">Arrival Monitoring</h1>
          <p className="text-[10px] uppercase tracking-widest text-[#6B6B6B] font-bold">Queue Processing Unit</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444] group-focus-within:text-[#D4A574] transition-colors" />
            <input
              type="text"
              placeholder="Filter names..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#0f0f0f] border border-[#D4A574] rounded-2xl pl-12 pr-4 h-12 w-64 text-sm text-white focus:border-[#D4A574]/50 focus:ring-0 transition-all outline-none"
            />
          </div>

          <div className="flex items-center gap-3 bg-[#0f0f0f] border border-[#D4A574] rounded-2xl px-6 h-12">
            <Activity className="w-4 h-4 text-[#D4A574]" />
            <span className="text-xs font-bold text-white pr-2 border-r border-[#D4A574]">{queue.length} Patients</span>
            <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Live Flow</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
        {/* Left - Arrivals List */}
        <div className="md:col-span-4 space-y-4">
          <div className="sticky top-0 space-y-4">
            {filteredQueue.length === 0 ? (
              <div className="h-[400px] flex flex-col items-center justify-center bg-[#0a0a0a] border border-dashed border-[#D4A574] rounded-[40px] opacity-40 text-center px-8">
                <UserPlus className="w-12 h-12 text-[#222] mb-4" />
                <p className="text-[#444] uppercase tracking-[0.2em] font-bold text-[10px]">No Active Arrivals</p>
              </div>
            ) : (
              filteredQueue.map((patient, idx) => (
                <button
                  key={patient._id || (patient as any).id || idx}
                  onClick={() => handleSelectPatient(patient)}
                  className={`group relative w-full text-left p-6 rounded-[32px] border transition-all duration-300 overflow-hidden ${selectedPatient?._id === patient._id || (selectedPatient as any).id === (patient as any).id
                    ? 'bg-[#121212] border-[#D4A574] shadow-2xl shadow-[#D4A574]/5'
                    : 'bg-[#0f0f0f] border-[#D4A574] hover:border-[#D4A574]'
                    }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-[#1a1a1a] rounded-xl group-hover:bg-[#222] transition-colors">
                      <Clock className="w-4 h-4 text-[#D4A574]" />
                    </div>
                    <span className="text-[10px] text-[#444] font-bold tracking-widest uppercase">Pos #{idx + 1}</span>
                  </div>

                  <div>
                    <h3 className="text-white font-bold text-lg leading-tight mb-1 group-hover:text-[#D4A574] transition-colors truncate">
                      {patient.patientName}
                    </h3>
                    <p className="text-xs font-mono text-[#444] flex items-center gap-2">
                      {patient.patientRegistrationId || (patient as any).registrationId}
                    </p>
                  </div>

                  {(selectedPatient?._id === patient._id || (selectedPatient as any).id === (patient as any).id) && (
                    <div className="absolute right-4 bottom-4 w-10 h-10 bg-[#D4A574]/10 rounded-full flex items-center justify-center">
                      <ChevronRight className="w-5 h-5 text-[#D4A574]" />
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right - Active Processing Panel */}
        <div className="md:col-span-8">
          {selectedPatient ? (
            <div className="bg-[#0f0f0f] border border-[#D4A574] rounded-[48px] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-left-4 duration-500 origin-left">
              <div className="p-10">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-14 h-14 bg-[#D4A574]/10 rounded-[20px] flex items-center justify-center text-[#D4A574]">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#D4A574] uppercase tracking-[0.3em] mb-1">Processing Entry</p>
                    <h2 className="text-3xl font-bold text-white tracking-tight">{selectedPatient.patientName}</h2>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                  <div className="bg-[#0a0a0a] border border-[#D4A574] p-6 rounded-[28px]">
                    <p className="text-[10px] font-bold text-[#444] uppercase tracking-widest mb-2">Registration</p>
                    <p className="text-sm font-mono text-white tracking-wide">{selectedPatient.patientRegistrationId || (selectedPatient as any).registrationId}</p>
                  </div>
                  <div className="bg-[#0a0a0a] border border-[#D4A574] p-6 rounded-[28px]">
                    <p className="text-[10px] font-bold text-[#444] uppercase tracking-widest mb-2">Assigned Specialist</p>
                    <p className="text-sm font-bold text-white">{(selectedPatient as any).doctorName || (selectedPatient as any).receptionData?.doctorName || 'Not Set'}</p>
                  </div>
                  <div className="bg-[#0a0a0a] border border-[#D4A574] p-6 rounded-[28px]">
                    <p className="text-[10px] font-bold text-[#444] uppercase tracking-widest mb-2">Arrived At</p>
                    <p className="text-sm font-bold text-[#D4A574]">
                      {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <ClipboardList className="w-4 h-4 text-[#D4A574]" />
                    <label className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-[0.2em]">Reception Remarks</label>
                  </div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Type clinical observations or special instructions here..."
                    className="w-full bg-[#0a0a0a] border border-[#D4A574] rounded-[32px] p-6 text-white text-base focus:border-[#D4A574]/50 focus:ring-4 focus:ring-[#D4A574]/5 transition-all outline-none resize-none shadow-inner"
                    rows={6}
                  />
                </div>

                <div className="mt-10 flex items-center justify-between gap-6">
                  <div className="flex items-center gap-4 text-[#444]">
                    <Phone className="w-4 h-4" />
                    <p className="text-xs font-mono">{(selectedPatient as any).phone || (selectedPatient as any).receptionData?.phone || 'No phone'}</p>
                  </div>
                  <Button
                    onClick={completeReception}
                    className="h-16 px-10 bg-[#0a0a0a] border border-[#D4A574] hover:bg-[#D4A574]/10 hover:scale-[1.02] active:scale-[0.98] transition-all text-[#D4A574] font-bold rounded-2xl shadow-[0_0_20px_rgba(212,165,116,0.1)] uppercase tracking-[0.2em] text-xs flex items-center gap-3"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Complete Check-in
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[600px] flex flex-col items-center justify-center bg-[#0a0a0a] border border-[#D4A574] rounded-[48px] border-dashed">
              <div className="w-16 h-16 bg-[#0f0f0f] rounded-3xl flex items-center justify-center mb-6 border border-[#D4A574]">
                <Activity className="w-6 h-6 text-[#222]" />
              </div>
              <p className="text-[#333] uppercase tracking-[0.3em] font-bold text-[11px]">Awaiting Active Selection</p>
              <p className="text-[#222] text-xs mt-3 px-12 text-center max-w-sm">Select a patient from the arrival stream to begin clinical processing and check-in confirmation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
