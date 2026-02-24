import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Calendar, CheckCircle2, Clock, Send, User, Search, Activity,
  ChevronRight, ClipboardList, Phone, UserPlus, Zap, UserCircle, ExternalLink, GripVertical, X
} from 'lucide-react';
import API_ENDPOINTS from '../config/api';
import { Button } from './ui/button';
import { QueuedPatient } from './queueTypes';
import { PatientData } from './patient';

interface OperationsCenterProps {
  onPatientSelected?: (patient: any) => void;
  compact?: boolean;
  userRole?: string | null;
  onNavigateToPatient?: (patient: any) => void;
}

export function OperationsCenter({ onPatientSelected, compact, userRole, onNavigateToPatient }: OperationsCenterProps) {
  const [appointments, setAppointments] = useState<QueuedPatient[]>([]);
  const [receptionQueue, setReceptionQueue] = useState<QueuedPatient[]>([]);
  const [opdQueue, setOpdQueue] = useState<QueuedPatient[]>([]);
  const [doctorQueue, setDoctorQueue] = useState<QueuedPatient[]>([]);
  const [dischargedList, setDischargedList] = useState<QueuedPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState<'all' | 'incoming' | 'at-desk' | 'discharged'>('all');


  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  const fetchData = async () => {
    try {
      // Fetch all simultaneously
      const [apptRes, recRes, opdRes, docRes, dischargedRes] = await Promise.all([
        fetch(API_ENDPOINTS.APPOINTMENTS),
        fetch(`${API_ENDPOINTS.QUEUE_RECEPTION}?status=waiting`),
        fetch(`${API_ENDPOINTS.QUEUE_OPD}?status=waiting`),
        fetch(`${API_ENDPOINTS.QUEUE_DOCTOR}?status=waiting`),
        fetch(`${API_ENDPOINTS.QUEUE_DOCTOR}?status=done`)
      ]);

      const apptData = await apptRes.json();
      const recData = await recRes.json();
      const opdData = await opdRes.json();
      const docData = await docRes.json();
      const dchData = await dischargedRes.json();

      // Debug: log counts and sample items so we can diagnose missing queue entries
      try {
        console.debug('OperationsCenter.fetchData: fetched', {
          appointments: (apptData.appointments || []).length,
          reception: (recData.items || []).length,
          opd: (opdData.items || []).length,
          doctor: (docData.items || []).length,
          discharged: (dchData.items || []).length,
          sampleReception: (recData.items || [])[0] || null,
          sampleOpd: (opdData.items || [])[0] || null,
          sampleDoctor: (docData.items || [])[0] || null
        });
      } catch (dbgErr) {
        // ignore logging errors
      }

      const rItems = recData.items || [];
      const oItems = opdData.items || [];
      const dItems = docData.items || [];
      const dcItems = dchData.items || [];

      // Create a set of registration IDs already in the clinical flow (OPD or Doctor)
      const inClinicalFlow = new Set([
        ...oItems.map((i: any) => i.patientRegistrationId || i.registrationId),
        ...dItems.map((i: any) => i.patientRegistrationId || i.registrationId)
      ]);

      // Create a set of IDs in OPD (to filter them out from Reception)
      const inOpd = new Set(oItems.map((i: any) => i.patientRegistrationId || i.registrationId));

      // Helper function to extract appointment date from queue item - TIMEZONE AWARE
      const getAppointmentDate = (item: any): string => {
        const rawDate = item.appointmentDate || (item.receptionData && item.receptionData.appointmentDate) || '';
        if (!rawDate) return '';
        try {
          const d = new Date(rawDate);
          if (isNaN(d.getTime())) return rawDate.split('T')[0];
          // Adjust to local timezone so late-night UTC (early morning local) matches the correct local date
          const offset = d.getTimezoneOffset();
          const local = new Date(d.getTime() - (offset * 60 * 1000));
          return local.toISOString().split('T')[0];
        } catch (e) { return rawDate.split('T')[0]; }
      };

      // Filter appointments for the selected date
      const todayAppts = (apptData.appointments || []).filter((a: any) => {
        const regId = a.patientRegistrationId || a.registrationId;

        // normalize for comparison
        const normalizedApptDate = getAppointmentDate(a);

        // Show all non-cancelled appointments in Scheduled section for the selected date
        // Note: Removed 'alreadyInTodaysClinicalFlow' check to ensure patients always appear in the master list
        const isNotCancelled = a.status !== 'cancelled';

        return normalizedApptDate === selectedDate && isNotCancelled;
      });

      // Filter Reception Queue: Show all currently waiting at reception for selected date
      const filteredRec = rItems.filter((ri: any) => {
        const itemDate = getAppointmentDate(ri);
        return itemDate === selectedDate;
      });

      // Filter OPD Queue: Only show if appointment is on selected date
      // Note: We removed the check for 'inDoctor' to ensure patients show up in OPD queue even if there are stale entries in the Doctor queue.
      const filteredOpd = oItems.filter((oi: any) => {
        const itemDate = getAppointmentDate(oi);
        return itemDate === selectedDate;
      });

      // Filter Doctor Queue: Only show appointments for selected date
      const filteredDoctor = dItems.filter((di: any) => {
        const itemDate = getAppointmentDate(di);
        return itemDate === selectedDate;
      });

      // Filter Discharged List: Only show appointments for selected date
      const filteredDischarged = dcItems.filter((dci: any) => {
        const itemDate = getAppointmentDate(dci);
        return itemDate === selectedDate;
      });

      setAppointments(todayAppts);
      setReceptionQueue(filteredRec);
      setOpdQueue(filteredOpd);
      setDoctorQueue(filteredDoctor);
      setDischargedList(filteredDischarged);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching operations data:', err);
      setLoading(false);
    }
  };

  const pushToReception = async (patient: any) => {
    try {
      const pId = patient._id || patient.id;
      // Prevent duplicate push
      const checkExists = await fetch(`${API_ENDPOINTS.QUEUE_RECEPTION}?registrationId=${patient.patientRegistrationId}`);
      const checkData = await checkExists.json();
      if (checkData.items && checkData.items.some((i: any) => (i.status === 'waiting' || !i.status))) {
        alert('Patient already at reception desk.');
        return;
      }

      const payload = {
        appointmentId: pId || patient.appointmentId,
        registrationId: patient.patientRegistrationId,
        patientName: patient.patientName,
        appointmentDate: patient.appointmentDate,
        receptionData: patient
      };

      const resp = await fetch(API_ENDPOINTS.QUEUE_RECEPTION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) throw new Error('Failed to mark arrival');

      // Notify dashboard to update stats
      window.dispatchEvent(new CustomEvent('receptionQueueUpdated', {
        detail: { registrationId: patient.patientRegistrationId, action: 'arrival' }
      }));

      fetchData();
      setSelectedPatient(null);
      alert('Patient arrival marked successfully');
    } catch (err) {
      alert('Error marking arrival');
    }
  };

  const completeCheckIn = async () => {
    if (!selectedPatient) return;

    try {
      const qid = selectedPatient._id || selectedPatient.id;
      if (!qid) {
        console.error('Patient object missing ID:', selectedPatient);
        throw new Error('Queue ID missing');
      }

      // Prepare payload for backend 
      // The backend action "reception_done" handles updating patient file AND pushing to OPD
      const payload = {
        status: 'done',
        action: 'reception_done',
        receptionData: {
          notes,
          timestamp: new Date().toISOString(),
          processedBy: 'Reception Desk'
        },
        completedAt: new Date().toISOString()
      };

      const resp = await fetch(API_ENDPOINTS.QUEUE_RECEPTION_ITEM(qid), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.detail || 'Reception update failed');
      }

      // Notify other components (Dashboard counts etc)
      window.dispatchEvent(new CustomEvent('receptionQueueUpdated', {
        detail: { registrationId: selectedPatient.patientRegistrationId || selectedPatient.registrationId }
      }));

      fetchData();
      setSelectedPatient(null);
      setNotes('');
      alert('Patient successfully pushed to OPD / Doctor Dashboard');
    } catch (err: any) {
      console.error('Check-in error:', err);
      alert(`Check-in failed: ${err.message}`);
    }
  };

  const removeFromQueue = async (patient: any) => {
    if (!confirm(`Are you sure you want to remove ${patient.patientName} from the current queue? This will cancel their current session.`)) return;

    try {
      const qid = patient._id || patient.id;
      let endpoint = '';

      if (patient.level === 'Reception') endpoint = API_ENDPOINTS.QUEUE_RECEPTION_ITEM(qid);
      else if (patient.level === 'OPD') endpoint = API_ENDPOINTS.QUEUE_OPD_ITEM(qid);
      else if (patient.level === 'Doctor') endpoint = API_ENDPOINTS.QUEUE_DOCTOR_ITEM(qid);

      if (!endpoint) return;

      const resp = await fetch(endpoint, { method: 'DELETE' });
      if (!resp.ok) throw new Error('Failed to remove from queue');

      alert('Patient removed from queue successfully');
      fetchData();
      setSelectedPatient(null);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Build raw list with proper deduplication
  // Priority: Discharged > Doctor > OPD > Reception > Scheduled
  // A patient should only appear ONCE at their highest completed stage
  const buildDeduplicatedList = () => {
    const patientMap = new Map<string, any>();
    const levelPriority: Record<string, number> = {
      'Discharged': 5,
      'Doctor': 4,
      'OPD': 3,
      'Reception': 2,
      'Scheduled': 1
    };

    const addOrUpdate = (patient: any, level: string) => {
      const regId = patient.patientRegistrationId || patient.registrationId ||
        (patient.receptionData?.patientDetails?.registrationId) ||
        (patient.receptionData?.patientRegistrationId) || '';
      if (!regId) return;

      const existing = patientMap.get(regId);
      const newPriority = levelPriority[level] || 0;
      const existingPriority = existing ? (levelPriority[existing.level] || 0) : 0;

      // Only update if new level has higher priority
      if (!existing || newPriority > existingPriority) {
        patientMap.set(regId, { ...patient, level, patientRegistrationId: regId });
      }
    };

    // Add in order of lowest to highest priority (so higher priority overwrites)
    appointments.forEach(p => addOrUpdate(p, (p as any).queueStatus || 'Scheduled'));
    receptionQueue.forEach(p => addOrUpdate(p, 'Reception'));
    opdQueue.forEach(p => addOrUpdate(p, 'OPD'));
    // Filter doctorQueue to only include status='waiting' items (double-check frontend side)
    doctorQueue.filter(p => (p as any).status === 'waiting' || !(p as any).status).forEach(p => addOrUpdate(p, 'Doctor'));
    // Discharged list has status='done'
    dischargedList.filter(p => (p as any).status === 'done').forEach(p => addOrUpdate(p, 'Discharged'));

    return Array.from(patientMap.values());
  };

  const rawList = buildDeduplicatedList();

  const counts = {
    Scheduled: rawList.filter(p => p.level === 'Scheduled').length,
    Reception: rawList.filter(p => p.level === 'Reception').length,
    OPD: rawList.filter(p => p.level === 'OPD').length,
    Doctor: rawList.filter(p => p.level === 'Doctor').length
  };

  const filteredList = rawList
    .filter(p => {
      const search = searchQuery.trim().toLowerCase();
      const pName = (p.patientName || '').toLowerCase();
      const pRegId = (p.patientRegistrationId || p.registrationId || '').toLowerCase();
      const matchesSearch = pName.includes(search) || pRegId.includes(search);

      const rawDate = p.appointmentDate || (p.receptionData && p.receptionData.appointmentDate) || '';
      const itemDate = rawDate.split('T')[0].split(' ')[0].trim();
      const isToday = !itemDate || itemDate === selectedDate;

      if (viewFilter === 'incoming') return matchesSearch && p.level === 'Scheduled' && isToday;
      if (viewFilter === 'at-desk') return matchesSearch && ['Reception', 'OPD', 'Doctor'].includes(p.level) && isToday;
      if (viewFilter === 'discharged') return matchesSearch && p.level === 'Discharged' && isToday;

      return matchesSearch && isToday; // Show all patients including discharged
    })
    .sort((a, b) => {
      const levelPriority: Record<string, number> = {
        'Doctor': 0,
        'OPD': 1,
        'Reception': 2,
        'Scheduled': 3,
        'Discharged': 4
      };
      return (levelPriority[a.level] || 99) - (levelPriority[b.level] || 99);
    });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px]">
        <div className="w-10 h-10 border-4 border-[#D4A574]/20 border-t-[#D4A574] rounded-full animate-spin mb-4"></div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#444]">Syncing Operations Center...</p>
      </div>
    );
  }

  return (
    <div className="p-1 pt-4 animate-in fade-in duration-700">
      {/* Header Section - Relative at the top of content */}
      <div className="bg-[#0a0a0a] -mx-4 px-8 pb-10 mb-4 border-b border-[#D4A574] shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase whitespace-nowrap">
              Operations <span className="text-[#D4A574]">Hub</span>
            </h1>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full shrink-0">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-green-500 font-black whitespace-nowrap">Live Flow</span>
            </div>
          </div>

          <div className="grid grid-cols-[0.8fr_1.1fr_1.1fr] gap-6 w-full max-w-6xl">
            {/* Date Island - Smaller Width */}
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] text-[#D4A574] font-black uppercase tracking-[0.2em] ml-1">Review Date</p>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white z-10" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-[#1a1a1a] border-[1.5px] border-[#D4A574] rounded-xl pl-12 pr-4 h-12 w-full text-[10px] font-black uppercase tracking-widest text_white focus:border-[#D4A574] transition-all outline-none [color-scheme:dark] shadow-lg shadow-black/10"
                />
              </div>
            </div>

            {/* Search Island */}
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] text-[#D4A574] font-black uppercase tracking-[0.2em] ml-1">Search Patient</p>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D3A574] z-10" />
                <input
                  type="text"
                  placeholder="PATIENT NAME OR ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#1a1a1a] border-[1.5px] border-[#D4A574] rounded-xl pl-12 pr-4 h-12 w-full text-[10px] font-black uppercase tracking-widest text-white focus:border-[#D4A574] transition-all outline-none shadow-lg shadow-black/10"
                />
              </div>
            </div>

            {/* Sort Island */}
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] text-[#D4A574] font-black uppercase tracking-[0.2em] ml-1">Sort View</p>
              <div className="flex bg-[#1a1a1a] border-[1.5px] border-[#D4A574] rounded-xl p-1 h-12 items-center shadow-lg shadow-black/10">
                {(['all', 'incoming', 'at-desk', 'discharged'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setViewFilter(f)}
                    className={`flex-1 h-full rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewFilter === f
                      ? 'bg-[#D4A574] text-[#0a0a0a] shadow-md'
                      : 'text-[#6B6B6B] hover:text-white'
                      }`}
                  >
                    {f.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full flex-1 flex flex-col min-h-0 bg-[#050505]">
        {/* Main Worklist */}
        <div className="flex-1 flex flex-col min-h-0 container mx-auto px-4">
          <div className="w-full flex flex-col flex-1 min-h-0">
            {/* Categorised Stats Table - Reduced size */}
            <div className="grid grid-cols-4 gap-4 mt-4 mb-4 bg-[#080808] border border-[#D4A574] p-4 rounded-[24px] shadow-xl shrink-0">
              <div className="text-center border-r border-[#D4A574] py-2">
                <div className="text-3xl font-black text-blue-400 mb-1 tracking-tighter">{counts.Scheduled.toString().padStart(2, '0')}</div>
                <div className="text-[10px] text-[#555] uppercase font-black tracking-[0.25em]">Scheduled</div>
              </div>
              <div className="text-center border-r border-[#D4A574] py-2">
                <div className="text-3xl font-black text-green-400 mb-1 tracking-tighter">{counts.Reception.toString().padStart(2, '0')}</div>
                <div className="text-[10px] text-[#555] uppercase font-black tracking-[0.25em]">Reception</div>
              </div>
              <div className="text-center border-r border-[#D4A574] py-2">
                <div className="text-3xl font-black text-orange-400 mb-1 tracking-tighter">{counts.OPD.toString().padStart(2, '0')}</div>
                <div className="text-[10px] text-[#555] uppercase font-black tracking-[0.25em]">OPD Flow</div>
              </div>
              <div className="text-center py-2">
                <div className="text-3xl font-black text-red-500 mb-1 tracking-tighter">{counts.Doctor.toString().padStart(2, '0')}</div>
                <div className="text-[10px] text-[#555] uppercase font-black tracking-[0.25em]">Consulting</div>
              </div>
            </div>

            {/* Scrollable Container with Hidden Scrollbar */}
            <div className={`flex-1 min-h-0 overflow-y-auto scrollbar-hide ${compact ? "space-y-3" : (filteredList.length === 0 ? "flex flex-col items-center justify-center py-10" : "grid grid-cols-1 md:grid-cols-2 gap-6 pb-6")}`}>
              {filteredList.length === 0 ? (
                <div className="w-full flex flex-col items-center justify-center py-20 opacity-100 animate-in fade-in zoom-in duration-500">
                  <div className="w-28 h-28 bg-[#0a0a0a] rounded-full flex items-center justify-center mb-8 border border-[#D4A574] shadow-[0_0_80px_rgba(212,165,116,0.1)] relative group">
                    <div className="absolute inset-0 rounded-full border border-[#D4A574]/10 animate-pulse"></div>
                    <UserPlus className="w-12 h-12 text-[#D4A574]/60 group-hover:text-[#D4A574] transition-colors" />
                  </div>
                  <p className="text-white text-2xl font-bold tracking-tight text-center">Empty Queue</p>
                  <div className="w-12 h-0.5 bg-[#D4A574] my-6"></div>
                  <p className="text-[#6B6B6B] text-[11px] font-medium tracking-wide text-center max-w-xs leading-relaxed">System operational. No patients are currently pending in this section.</p>
                </div>
              ) : (
                filteredList.map((p, idx) => {
                  const pId = p._id || (p as any).id;
                  const isSelected = (selectedPatient?._id || selectedPatient?.id) === pId;

                  // Detailed sub-status for the stage
                  const getSubStatus = (level: string) => {
                    switch (level) {
                      case 'Scheduled': return 'Reserved';
                      case 'Reception': return 'At Front Desk';
                      case 'OPD': return 'Screening / Testing';
                      case 'Doctor': return 'Consul. in Progress';
                      case 'Discharged': return 'Consultation Done';
                      default: return 'Active';
                    }
                  };

                  return (
                    <button
                      key={pId || `idx-${idx}`}
                      onClick={async () => {
                        setSelectedPatient(p);
                        setNotes((p as any).receptionNotes || '');
                        // Normalize registrationId/name from nested receptionData so parent callbacks can navigate
                        const rd = (p as any).receptionData || {};
                        const rdPatientDetails = rd.patientDetails || {};
                        const regId = p.patientRegistrationId || p.registrationId || rd.patientRegistrationId || rdPatientDetails.registrationId || '';
                        const name = p.patientName || rdPatientDetails.name || '';

                        // AUTO-PUSH LOGIC:
                        // 1. Reception Auto-Push (Scheduled -> Reception)
                        if (userRole === 'receptionist' || userRole === 'reception') {
                          if (p.level === 'Scheduled') {
                            try {
                              const checkExists = await fetch(`${API_ENDPOINTS.QUEUE_RECEPTION}?registrationId=${regId}`);
                              const checkData = await checkExists.json();
                              const todayStr = selectedDate;
                              const alreadyQueuedToday = checkData.items && checkData.items.some((i: any) => {
                                const iDate = i.appointmentDate || (i.receptionData && i.receptionData.appointmentDate) || '';
                                return (i.status === 'waiting' || !i.status) && iDate.startsWith(todayStr);
                              });
                              if (!alreadyQueuedToday) {
                                await fetch(API_ENDPOINTS.QUEUE_RECEPTION, {
                                  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
                                    appointmentId: pId || p.appointmentId, registrationId: regId, patientName: name, appointmentDate: p.appointmentDate, receptionData: p
                                  })
                                });
                                window.dispatchEvent(new CustomEvent('receptionQueueUpdated', { detail: { registrationId: regId, action: 'arrival' } }));
                                setTimeout(fetchData, 400);
                              }
                            } catch (err) { console.warn('Auto-Reception pull failed', err); }
                          }
                        }

                        // 2. OPD Auto-Push (Reception/Scheduled -> OPD)
                        if (userRole === 'opd') {
                          if (p.level === 'Reception' || p.level === 'Scheduled') {
                            try {
                              // If at Reception, complete it to move to OPD
                              if (p.level === 'Reception') {
                                // Complete Reception (pushes to OPD)
                                await fetch(API_ENDPOINTS.QUEUE_RECEPTION_ITEM(pId), {
                                  method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
                                    status: 'done', action: 'reception_done', completedAt: new Date().toISOString(),
                                    receptionData: { notes: 'Auto-pulled by OPD', processedBy: 'OPD Staff', timestamp: new Date().toISOString() }
                                  })
                                });
                              } else {
                                // Directly add to Reception THEN complete it immediately to get to OPD
                                // For simplicity and speed in this demo, we might just assume pushing via reception API 
                                // But correctness requires the standard flow. 
                                // A safer shortcut is to just push to OPD directly if your backend supports it, 
                                // but let's stick to the flow: Scheduled -> Reception -> Done(OPD)
                                // ... implementing "Super Push" for OPD user pulling a Scheduled patient:
                                const recResp = await fetch(API_ENDPOINTS.QUEUE_RECEPTION, {
                                  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
                                    appointmentId: pId || p.appointmentId, registrationId: regId, patientName: name, appointmentDate: p.appointmentDate, receptionData: p
                                  })
                                });
                                if (recResp.ok) {
                                  // immediately mark done
                                  const json = await recResp.json();
                                  const newId = json.id || json._id; // assume backend returns created ID, if not we might need to query.
                                  if (newId) {
                                    await fetch(API_ENDPOINTS.QUEUE_RECEPTION_ITEM(newId), {
                                      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
                                        status: 'done', action: 'reception_done', completedAt: new Date().toISOString()
                                      })
                                    });
                                  } else {
                                    // Fallback if backend doesn't return ID: Refresh and let user click again or try query
                                    console.warn("Backend didn't return ID for immediate push");
                                  }
                                }
                              }
                              window.dispatchEvent(new CustomEvent('receptionQueueUpdated'));
                              window.dispatchEvent(new CustomEvent('opdQueueUpdated'));
                              setTimeout(fetchData, 600);
                            } catch (err) { console.warn('Auto-OPD pull failed', err); }
                          }
                        }

                        // 3. Doctor Auto-Push (OPD -> Doctor)
                        if (userRole === 'doctor') {
                          if (p.level === 'OPD') {
                            try {
                              await fetch(API_ENDPOINTS.QUEUE_OPD_ITEM(pId), {
                                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
                                  status: 'done', action: 'opd_done', completedAt: new Date().toISOString(),
                                  opdData: { findings: 'Auto-pulled by Doctor' }
                                })
                              });
                              window.dispatchEvent(new CustomEvent('opdQueueUpdated'));
                              setTimeout(fetchData, 600);
                            } catch (err) { console.warn('Auto-Doctor pull failed', err); }
                          }
                        }

                        // Add discharge status to the enriched object
                        const isDischargedPatient = p.level === 'Discharged';
                        const enriched = { ...p, patientRegistrationId: regId, patientName: name, isDischargedPatient };

                        // Call callbacks if available
                        if (onPatientSelected) {
                          try { onPatientSelected(enriched); } catch (e) { console.error('onPatientSelected callback failed', e); }
                        }

                        if (onNavigateToPatient) {
                          try { onNavigateToPatient(enriched); } catch (e) { console.error('onNavigateToPatient callback failed', e); }
                        } else {
                          // Fallback: If no navigation is hooked up (e.g. standalone mode), show the internal modal
                          setSelectedPatient(enriched);
                        }
                      }}
                      className={`relative w-full text-left p-4 rounded-xl transition-all duration-300 ${isSelected ? 'bg-[#121212] border border-[#D4A574] shadow-2xl shadow-[#D4A574]/10' : 'bg-transparent border border-transparent hover:bg-[#111]'
                        }`}
                    >
                      <div className="flex justify-between items-start mb-2.5">
                        <div className="flex flex-col gap-1.5 flex-1">
                          {/* Status Badge - Main Location */}
                          <div className={`w-fit px-3 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-widest border-2 inline-flex items-center gap-1.5 shadow-md ${p.level === 'Doctor' ? 'bg-red-600/40 border-red-500 text-red-50 shadow-red-500/40' :
                            p.level === 'OPD' ? 'bg-orange-600/40 border-orange-500 text-orange-50 shadow-orange-500/40' :
                              p.level === 'Reception' ? 'bg-green-600/40 border-green-500 text-green-50 shadow-green-500/40' :
                                p.level === 'Discharged' ? 'bg-slate-600/40 border-slate-500 text-slate-50 shadow-slate-500/40' :
                                  'bg-blue-600/40 border-blue-500 text-blue-50 shadow-blue-500/40'
                            }`}>
                            <span className={`w-2 h-2 rounded-full animate-pulse ${p.level === 'Doctor' ? 'bg-red-400' :
                              p.level === 'OPD' ? 'bg-orange-400' :
                                p.level === 'Reception' ? 'bg-green-400' :
                                  p.level === 'Discharged' ? 'bg-slate-400' :
                                    'bg-blue-400'
                              }`}></span>
                            ðŸ“ {p.level}
                          </div>
                          {/* Sub Status - Detailed Activity */}
                          <span className="text-[7px] text-[#D4A574] font-semibold uppercase tracking-wide ml-0.5">
                            â†’ {getSubStatus(p.level)}
                          </span>
                        </div>
                        <span className="text-[7px] text-[#555] font-mono lowercase whitespace-nowrap ml-2">
                          {p.appointmentTime || p.checkInTime || 'â± walk-in'}
                        </span>
                      </div>

                      <h3 className="text-white font-bold text-sm leading-tight mb-0.5 truncate">{p.patientName}</h3>
                      <p className="text-[9px] font-mono text-[#444]">{p.patientRegistrationId || 'ID PENDING'}</p>

                      {isSelected && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-[#D4A574]/10 rounded-full animate-in zoom-in">
                          <ChevronRight className="w-4 h-4 text-[#D4A574]" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>


        {/* Patient Details Modal (Island) */}
        {selectedPatient && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-8 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={() => setSelectedPatient(null)} />

            <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#0a0a0a] border border-[#D4A574] rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
              <div className="p-8 overflow-y-auto scrollbar-hide">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-[#1a1a1a] rounded-2xl flex items-center justify-center border-2 border-[#D4A574]/10 shadow-inner">
                      <UserCircle className="w-8 h-8 text-[#D4A574]/40" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#D4A574] uppercase tracking-[0.3em] mb-1">Active Patient Record</p>
                      <h2 className="text-3xl font-bold text-white tracking-tight">{selectedPatient.patientName}</h2>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs font-mono text-[#555] bg-[#111] px-2 py-1 rounded-md">{selectedPatient.patientRegistrationId || selectedPatient.registrationId}</span>
                        <div className="w-1 h-1 bg-[#222] rounded-full"></div>
                        <span className="text-xs text-[#555]">{selectedPatient.phone || 'No phone'}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPatient(null)}
                    className="p-3 text-[#444] hover:text-white hover:bg-[#1a1a1a] rounded-full transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-8">
                    <div className="relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Zap className="w-16 h-16 text-[#D4A574]" />
                      </div>
                      <h4 className="text-[10px] font-bold text-[#D4A574] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5" />
                        Workflow Information
                      </h4>

                      <div className="space-y-5 bg-[#080808] border border-[#D4A574] p-6 rounded-3xl">
                        <div className="flex items-center justify-between">
                          <p className="text-[#6B6B6B] text-sm">Appointment</p>
                          <span className="text-white text-sm font-bold">{selectedPatient.appointmentTime || 'Walk-in'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-[#6B6B6B] text-sm">Target Specialist</p>
                          <span className="text-white text-sm font-bold">{selectedPatient.doctorName || 'Not Set'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-[#6B6B6B] text-sm">Session Category</p>
                          <span className="text-[10px] px-3 py-1 bg-[#D4A574]/10 border border-[#D4A574]/20 rounded-full text-[#D4A574] font-bold uppercase tracking-wider">Consultation</span>
                        </div>
                      </div>
                    </div>

                    {!!(selectedPatient as any).receptionData ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                          <ClipboardList className="w-4 h-4 text-[#D4A574]" />
                          <label className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-[0.2em]">Reception Remarks</label>
                        </div>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Enter arrival observations..."
                          className="w-full bg-[#080808] border border-[#D4A574] rounded-[32px] p-6 text-white text-sm focus:border-[#D4A574]/50 transition-all outline-none resize-none h-40 shadow-inner"
                        />
                      </div>
                    ) : (
                      <div className="p-10 text-center bg-blue-500/5 border border-blue-500/10 rounded-[40px] shadow-inner">
                        <Clock className="w-8 h-8 text-blue-500/40 mx-auto mb-4" />
                        <p className="text-blue-400 text-xs font-bold uppercase tracking-[0.2em]">Upcoming Arrival</p>
                        <p className="text-[#555] text-xs mt-3 leading-relaxed max-w-[200px] mx-auto">The patient has not arrived at the desk yet.</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col justify-end gap-6">
                    {selectedPatient.level === 'Discharged' ? (
                      <div className="p-10 text-center bg-green-500/5 border border-green-500/10 rounded-[40px] shadow-inner">
                        <CheckCircle2 className="w-10 h-10 text-green-500/40 mx-auto mb-4" />
                        <p className="text-green-500 text-xs font-bold uppercase tracking-[0.2em]">Consultation Finished</p>
                        <p className="text-[#555] text-xs mt-3 leading-relaxed">This patient session has been completed and discharged by the physician.</p>
                        <Button
                          onClick={() => {
                            if (!selectedPatient) return;
                            const rd = (selectedPatient as any).receptionData || {};
                            const rdPatientDetails = rd.patientDetails || {};
                            const regId = selectedPatient.patientRegistrationId || selectedPatient.registrationId || rd.patientRegistrationId || rdPatientDetails.registrationId || '';
                            const name = selectedPatient.patientName || rdPatientDetails.name || '';
                            onPatientSelected && onPatientSelected({ ...selectedPatient, patientRegistrationId: regId, patientName: name });
                            setSelectedPatient(null);
                          }}
                          className="w-full mt-6 h-14 bg-white text-black text-xs font-bold rounded-2xl flex items-center justify-center gap-3 uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl"
                        >
                          View Records (Read-only)
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : !!(selectedPatient as any).receptionData ? (
                      <div className="space-y-4">
                        <div className="py-6 border-t border-[#D4A574]">
                          <div className="flex items-center gap-3 text-green-500 mb-2">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{selectedPatient.level === 'Reception' ? 'Waiting at Reception' : 'Ready for Documentation'}</span>
                          </div>
                          <p className="text-[#555] text-xs leading-relaxed">Checking in will open the patient's record for documentation and tracking.</p>
                        </div>
                        <div className="flex flex-col gap-3">
                          <Button
                            onClick={() => {
                              if (!selectedPatient) return;
                              const rd = (selectedPatient as any).receptionData || {};
                              const rdPatientDetails = rd.patientDetails || {};
                              const regId = selectedPatient.patientRegistrationId || selectedPatient.registrationId || rd.patientRegistrationId || rdPatientDetails.registrationId || '';
                              const name = selectedPatient.patientName || rdPatientDetails.name || '';
                              onPatientSelected && onPatientSelected({ ...selectedPatient, patientRegistrationId: regId, patientName: name });
                              setSelectedPatient(null);
                            }}
                            className="w-full h-16 bg-gradient-to-r from-[#D4A574] to-[#C89B67] text-[#0a0a0a] text-sm font-black rounded-3xl shadow-2xl shadow-[#D4A574]/20 flex items-center justify-center gap-3 uppercase tracking-[0.2em] hover:scale-[1.01] transition-all"
                          >
                            Open Documentation Hub
                            <Send className="w-5 h-5" />
                          </Button>
                          <Button
                            onClick={() => {
                              if (!selectedPatient) return;
                              const rd = (selectedPatient as any).receptionData || {};
                              const rdPatientDetails = rd.patientDetails || {};
                              const regId = selectedPatient.patientRegistrationId || selectedPatient.registrationId || rd.patientRegistrationId || rdPatientDetails.registrationId || '';
                              const name = selectedPatient.patientName || rdPatientDetails.name || '';
                              onNavigateToPatient && onNavigateToPatient({ ...selectedPatient, patientRegistrationId: regId, patientName: name });
                              setSelectedPatient(null);
                            }}
                            className="w-full h-14 bg-transparent border-2 border-[#D4A574] hover:border-[#D4A574]/30 text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest"
                          >
                            View Historical Files
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <button
                            onClick={() => {
                              removeFromQueue(selectedPatient);
                              setSelectedPatient(null);
                            }}
                            className="w-full p-5 rounded-2xl bg-red-500/5 border border-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all text-xs font-bold uppercase tracking-[0.1em]"
                          >
                            Cancel Appointment / Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={() => {
                          pushToReception(selectedPatient);
                          setSelectedPatient(null);
                        }}
                        className="w-full h-16 bg-[#0a0a0a] border-2 border-[#D4A574]/20 hover:border-[#D4A574] text-[#D4A574] text-sm font-bold rounded-3xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest shadow-xl"
                      >
                        Confirm Arrival
                        <Zap className="w-5 h-5 fill-[#D4A574]" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
