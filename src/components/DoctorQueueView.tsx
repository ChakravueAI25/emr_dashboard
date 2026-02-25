import { useState, useEffect } from 'react';
import { CheckCircle2, Stethoscope, AlertCircle, Save, RotateCcw } from 'lucide-react';
import { showAlert } from './ui/AlertModal';
import API_ENDPOINTS from '../config/api';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { QueuedPatient } from './queueTypes';
import { PatientData } from './patient';

interface DoctorQueueViewProps {
  userRole?: string;
  onPatientSelected?: (patient: QueuedPatient, patientData: PatientData) => void;
  hideDetailView?: boolean;
}

export function DoctorQueueView({ userRole, onPatientSelected, hideDetailView }: DoctorQueueViewProps) {
  const [queue, setQueue] = useState<QueuedPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<QueuedPatient | null>(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDoctorQueue();
    window.addEventListener('doctorQueueUpdated', fetchDoctorQueue);
    return () => window.removeEventListener('doctorQueueUpdated', fetchDoctorQueue);
  }, []);

  const fetchDoctorQueue = () => {
    (async () => {
      try {
        // Fetch from dedicated doctor queue collection - only show waiting patients
        const resp = await fetch(`${API_ENDPOINTS.QUEUE_DOCTOR}?status=waiting`);
        if (!resp.ok) throw new Error('Failed to load doctor queue');
        const json = await resp.json();
        const today = new Date().toISOString().split('T')[0];

        // Filter to only show waiting patients (not done/discharged) and today's patients
        const waitingItems = (json.items || []).filter((item: any) => {
          const isWaiting = item.status === 'waiting' || !item.status;
          const itemDate = item.appointmentDate || (item.receptionData && item.receptionData.appointmentDate);
          return isWaiting && itemDate === today;
        });
        setQueue(waitingItems);
        setLoading(false);
      } catch (e) {
        console.error('Error loading doctor queue:', e);
        setQueue([]);
        setLoading(false);
      }
    })();
  };

  const handleSelectPatient = (patient: QueuedPatient) => {
    setSelectedPatient(patient);
    setDiagnosis('');
    setPrescription('');

    // Extract data from doctor queue item - data is nested in opdData and receptionData
    const od = (patient as any).opdData || {};
    const rd = (patient as any).receptionData || {};

    // receptionData has nested structure: receptionData.patientDetails, receptionData.presentingComplaints, etc.
    const rdPatientDetails = rd.patientDetails || {};
    const rdPresentingComplaints = rd.presentingComplaints || {};
    const rdMedicalHistory = rd.medicalHistory || {};
    const rdDrugHistory = rd.drugHistory || {};

    const regId = (patient as any).registrationId || patient.patientRegistrationId || rdPatientDetails.registrationId || '';
    const name = patient.patientName || rdPatientDetails.name || '';
    const phone = rdPatientDetails.phone || (patient as any).phone || '';
    const email = rdPatientDetails.email || (patient as any).email || '';

    // Convert QueuedPatient to PatientData format for dashboard
    // Use THIS VISIT's data from receptionData and opdData, NOT from patient document
    const patientData: PatientData = {
      patientDetails: {
        name: name,
        registrationId: regId,
        age: rdPatientDetails.age || '',
        sex: rdPatientDetails.sex || '',
        profilePic: null,
        password: '',
        phone: phone,
        email: email,
        address: rdPatientDetails.address || '',
        bloodType: rdPatientDetails.bloodType || '',
        allergies: rdPatientDetails.allergies || '',
        emergencyContact: rdPatientDetails.emergencyContact || ''
      },
      // Use THIS VISIT's clinical data from receptionData
      presentingComplaints: rdPresentingComplaints.complaints ? rdPresentingComplaints : {
        complaints: [],
        history: { severity: '', onset: '', aggravating: '', relieving: '', associated: '' },
        timeline: []
      },
      medicalHistory: rdMedicalHistory.medical ? rdMedicalHistory : {
        medical: [],
        surgical: [],
        familyHistory: '',
        socialHistory: { smoking: '', alcohol: '', exercise: '' }
      },
      drugHistory: rdDrugHistory.allergies ? rdDrugHistory : {
        allergies: [],
        currentMeds: [],
        compliance: { adherenceRate: '', missedDoses: '', lastRefill: '' },
        previousMeds: ''
      },
      // OPD data from THIS VISIT's opdData
      optometry: od.optometry || {},
      iop: od.iop || {},
      ophthalmicInvestigations: od.ophthalmicInvestigations || {},
      systemicInvestigations: od.systemicInvestigations || {}
    };

    // Call parent callback to update dashboard
    if (onPatientSelected) {
      onPatientSelected(patient, patientData);
    }
  };

  const sendToDashboard = () => {
    if (!selectedPatient) return;
    handleSelectPatient(selectedPatient);
  };

  const completeConsultation = async () => {
    if (!selectedPatient) return;

    try {
      // Get correct registration ID from queue item
      const rd = (selectedPatient as any).receptionData || {};
      const registrationId = (selectedPatient as any).registrationId || selectedPatient.patientRegistrationId || rd.patientRegistrationId;
      const queueId = (selectedPatient as any).id || selectedPatient._id;

      if (!registrationId) {
        showAlert('Cannot complete: Patient has no registration ID');
        return;
      }

      const doctorData = {
        diagnosis,
        prescription,
        completedAt: new Date().toISOString()
      };

      // Update doctor queue item on backend (this will update appointment and patient)
      try {
        console.log('Updating doctor queue item:', queueId);
        const resp = await fetch(API_ENDPOINTS.QUEUE_DOCTOR_ITEM(queueId), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'done',
            action: 'doctor_done',
            doctorData: doctorData
          })
        });
        if (!resp.ok) {
          const errorText = await resp.text();
          throw new Error(`Failed to update doctor queue: ${resp.status} - ${errorText}`);
        }
        console.log('Doctor queue updated, patient discharged');
      } catch (e) {
        console.error('Failed to update doctor queue:', e);
        showAlert('Failed to persist doctor data to server. Please retry.');
        return;
      }

      // Notify other components to refresh
      window.dispatchEvent(new CustomEvent('doctorQueueUpdated', { detail: { registrationId } }));

      setSelectedPatient(null);
      setDiagnosis('');
      setPrescription('');
      showAlert('Patient discharged successfully');
    } catch (err) {
      console.error('Error completing consultation:', err);
    }
  };

  // Recall patient back to OPD
  const recallToOpd = async () => {
    if (!selectedPatient) return;

    const reason = prompt('Enter reason for recalling patient to OPD:');
    if (!reason) return;

    try {
      const queueId = (selectedPatient as any).id || selectedPatient._id;

      const resp = await fetch(API_ENDPOINTS.QUEUE_RECALL_TO_OPD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queueId: queueId,
          reason: reason
        })
      });

      if (!resp.ok) {
        throw new Error('Failed to recall patient');
      }

      showAlert('Patient recalled to OPD for corrections');
      setSelectedPatient(null);
      fetchDoctorQueue();

      // Notify OPD queue to refresh
      window.dispatchEvent(new CustomEvent('opdQueueUpdated'));
    } catch (err) {
      console.error('Error recalling patient:', err);
      showAlert('Failed to recall patient. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${hideDetailView ? 'h-full' : 'h-screen'} bg-[var(--theme-bg)]`}>
        <div className="text-center">
          <Stethoscope className="w-10 h-10 text-[var(--theme-accent)] animate-spin mx-auto mb-4 opacity-20" />
        </div>
      </div>
    );
  }

  if (hideDetailView) {
    return (
      <div className="flex flex-col h-full overflow-hidden bg-[var(--theme-bg)]">
        <div className="p-6 border-b border-[var(--theme-accent)]/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Clinic Queue</h3>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[var(--theme-bg-secondary)] rounded-full border border-[var(--theme-border)]">
              <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
              <span className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Active</span>
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-xs text-[var(--theme-text-muted)] uppercase font-bold tracking-widest">Active Patients</span>
          </div>
        </div>

        <div className="p-4 space-y-2 overflow-y-auto scrollbar-hide flex-1 pt-4">
          {queue.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center opacity-20">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--theme-text-muted)]">No Patients Pending</p>
            </div>
          ) : (
            queue.map((patient, idx) => {
              const isSelected = selectedPatient?._id === patient._id || (selectedPatient as any).id === (patient as any).id;

              return (
                <button
                  key={patient._id || (patient as any).id || idx}
                  onClick={() => handleSelectPatient(patient)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 group ${isSelected
                    ? 'bg-[var(--theme-bg-secondary)] border-[var(--theme-accent)]/60 shadow-lg shadow-[var(--theme-accent)]/5'
                    : 'bg-[var(--theme-bg-input)] border-[var(--theme-border)] hover:border-[var(--theme-accent)]/40'
                    }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-xs font-bold uppercase tracking-widest ${isSelected ? 'text-[var(--theme-text)]' : 'text-[var(--theme-text-muted)]'}`}>
                      Patient
                    </span>
                    <span className="text-xs font-mono text-[var(--theme-text-muted)] opacity-60">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h4 className={`text-lg font-bold truncate transition-colors ${isSelected ? 'text-[var(--theme-text)]' : 'text-[var(--theme-text-muted)] group-hover:text-[var(--theme-text)]'}`}>
                    {patient.patientName}
                  </h4>
                  <p className={`text-xs font-mono mt-0.5 ${isSelected ? 'text-[var(--theme-text-muted)]' : 'text-[var(--theme-text-muted)] opacity-60'}`}>
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
    <div className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] p-8 ml-16">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-light tracking-tight mb-2">Doctor Consultations</h1>
        <p className="text-xs text-[var(--theme-text-muted)]">Patient consultations and discharge</p>
        <div className="w-16 h-1 bg-gradient-to-r from-[var(--theme-accent)] to-transparent rounded-full"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Queue List */}
        <div className="lg:col-span-2">
          <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/30 rounded-xl p-6 mb-6 shadow-sm">
            <div className="text-xs text-[var(--theme-text-muted)] font-bold uppercase tracking-widest">
              Consultation Queue: <span className="text-[var(--theme-text)] font-black ml-2 px-2 py-0.5 bg-[var(--theme-accent)]/10 rounded">{queue.length} patients</span>
            </div>
          </div>

          {queue.length === 0 ? (
            <Card className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-border)] p-12 text-center shadow-inner">
              <Stethoscope className="w-12 h-12 text-[var(--theme-text-muted)] mx-auto mb-4 opacity-20" />
              <p className="text-xs text-[var(--theme-text-muted)] font-bold uppercase tracking-widest">No patients in consultation queue</p>
            </Card>
          ) : (
            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-4 scrollbar-hide">
              {queue.map((patient, idx) => {
                // Extract fields from queue item structure
                const rd = (patient as any).receptionData || {};
                const od = (patient as any).opdData || {};
                const regId = (patient as any).registrationId || patient.patientRegistrationId || rd.patientRegistrationId || '';
                const doctorName = rd.doctorName || (patient as any).doctorName || '';
                const phone = rd.phone || (patient as any).phone || '';

                const isSelected = (selectedPatient && ((selectedPatient as any).id === (patient as any).id || selectedPatient._id === patient._id));

                return (
                  <button
                    key={(patient as any).id || patient._id || idx}
                    onClick={() => handleSelectPatient(patient)}
                    className={`w-full text-left p-5 rounded-xl border transition-all shadow-sm ${isSelected
                      ? 'bg-[var(--theme-bg-tertiary)] border-[var(--theme-accent)] shadow-lg shadow-[var(--theme-accent)]/5'
                      : 'bg-[var(--theme-bg-secondary)] border-[var(--theme-border)] hover:border-[var(--theme-accent)]/30'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-bold text-[var(--theme-text)]">{patient.patientName}</span>
                      <span className={`text-xs px-2 py-1 rounded font-black ${isSelected ? 'bg-[var(--theme-accent)] text-white' : 'bg-[var(--theme-bg-input)] text-[var(--theme-text-muted)]'}`}>
                        #{idx + 1}
                      </span>
                    </div>
                    <div className="text-xs space-y-1.5 font-medium text-[var(--theme-text-muted)]">
                      <p className="flex items-center gap-2">ID: <span className="font-mono font-bold text-[var(--theme-text-muted)]">{regId}</span></p>
                      {doctorName && <p className="text-[var(--theme-text)]">Doctor: {doctorName}</p>}
                      {phone && <p>Phone: {phone}</p>}
                      {od.findings && <p className="text-purple-500 italic">OPD: {od.findings}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Consultation Form */}
        <div className="lg:col-span-1">
          <div className="sticky top-8 bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/30 rounded-2xl p-8 h-fit max-h-[90vh] overflow-y-auto shadow-xl">
            {selectedPatient ? (() => {
              const rd = (selectedPatient as any).receptionData || {};
              const od = (selectedPatient as any).opdData || {};
              const regId = (selectedPatient as any).registrationId || selectedPatient.patientRegistrationId || rd.patientRegistrationId || '';
              const doctorName = rd.doctorName || (selectedPatient as any).doctorName || '';
              const appointmentDate = rd.appointmentDate || (selectedPatient as any).appointmentDate || '';
              const appointmentTime = rd.appointmentTime || (selectedPatient as any).appointmentTime || '';

              return (
                <>
                  <h2 className="text-xl font-bold text-[var(--theme-text)] mb-6 border-b border-[var(--theme-border)] pb-2">Consultation</h2>

                  <div className="space-y-6">
                    <div className="bg-[var(--theme-bg-input)] p-4 rounded-xl border border-[var(--theme-border)]">
                      <p className="text-[10px] text-[var(--theme-text-muted)] font-black uppercase tracking-[0.2em] mb-2 opacity-60">Patient Details</p>
                      <p className="text-xl text-[var(--theme-text)] font-black tracking-tight">{selectedPatient.patientName}</p>
                      <p className="text-xs text-[var(--theme-text-muted)] font-mono font-bold mt-1.5">{regId}</p>
                    </div>

                    {doctorName && (
                      <div className="px-1">
                        <p className="text-[10px] text-[var(--theme-text-muted)] font-black uppercase tracking-[0.2em] mb-1.5 opacity-60">Assigned Doctor</p>
                        <p className="text-[var(--theme-text)] text-sm font-bold">{doctorName}</p>
                      </div>
                    )}

                    {(appointmentDate || appointmentTime) && (
                      <div className="px-1">
                        <p className="text-[10px] text-[var(--theme-text-muted)] font-black uppercase tracking-[0.2em] mb-1.5 opacity-60">Appointment</p>
                        <p className="text-[var(--theme-text)] text-sm font-bold">{appointmentDate} {appointmentTime && `at ${appointmentTime}`}</p>
                      </div>
                    )}

                    {od.findings && (
                      <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 shadow-inner">
                        <p className="text-[10px] text-purple-600 font-black uppercase tracking-[0.2em] mb-2">OPD Findings</p>
                        <p className="text-[var(--theme-text)] text-xs leading-relaxed font-medium whitespace-pre-wrap">{od.findings}</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] text-[var(--theme-text-muted)] font-black uppercase tracking-[0.2em] mb-2 opacity-60">Diagnosis</label>
                      <textarea
                        value={diagnosis}
                        onChange={(e) => setDiagnosis(e.target.value)}
                        placeholder="Enter clinical diagnosis..."
                        className="w-full bg-[var(--theme-bg-input)] border border-[var(--theme-border)] rounded-xl p-4 text-[var(--theme-text)] text-sm placeholder-[var(--theme-text-muted)]/40 focus:border-[var(--theme-accent)] outline-none transition-all shadow-inner font-medium"
                        rows={4}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-[var(--theme-text-muted)] font-black uppercase tracking-[0.2em] mb-2 opacity-60">Prescription</label>
                      <textarea
                        value={prescription}
                        onChange={(e) => setPrescription(e.target.value)}
                        placeholder="Enter prescription and treatment plan..."
                        className="w-full bg-[var(--theme-bg-input)] border border-[var(--theme-border)] rounded-xl p-4 text-[var(--theme-text)] text-sm placeholder-[var(--theme-text-muted)]/40 focus:border-[var(--theme-accent)] outline-none transition-all shadow-inner font-medium"
                        rows={4}
                      />
                    </div>

                    <div className="pt-2 space-y-3">
                      <Button
                        onClick={sendToDashboard}
                        className="w-full bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] force-text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-3 transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        Open in Dashboard
                      </Button>

                      <Button
                        onClick={recallToOpd}
                        variant="outline"
                        className="w-full border-[var(--theme-accent)] text-[var(--theme-text)] hover:bg-[var(--theme-accent)]/5 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3"
                      >
                        <RotateCcw className="w-5 h-5" />
                        Recall to OPD
                      </Button>
                      <p className="text-[10px] text-[var(--theme-text-muted)] text-center font-bold uppercase tracking-widest opacity-40">
                        Use if OPD data needs correction
                      </p>
                    </div>
                  </div>
                </>
              );
            })() : (
              <div className="text-center py-12 px-4">
                <div className="w-16 h-16 bg-[var(--theme-accent)]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-8 h-8 text-[var(--theme-accent)] opacity-40" />
                </div>
                <p className="text-[var(--theme-text-muted)] text-sm font-bold uppercase tracking-widest leading-relaxed">Select a patient to begin consultation</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
