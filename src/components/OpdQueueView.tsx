import { useState, useEffect } from 'react';
import { CheckCircle2, Eye, AlertCircle, Save, RotateCcw } from 'lucide-react';
import { showAlert } from './ui/AlertModal';
import API_ENDPOINTS from '../config/api';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { QueuedPatient } from './queueTypes';
import { PatientData } from './patient';

interface OpdQueueViewProps {
  userRole?: string;
  onPatientSelected?: (patient: QueuedPatient, patientData: PatientData) => void;
  hideDetailView?: boolean;
}

export function OpdQueueView({ userRole, onPatientSelected, hideDetailView }: OpdQueueViewProps) {
  const [queue, setQueue] = useState<QueuedPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<QueuedPatient | null>(null);
  const [findings, setFindings] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOpdQueue();
    // Listen for custom events indicating backend state changed
    const handleOpdQueueUpdated = () => fetchOpdQueue();
    window.addEventListener('opdQueueUpdated', handleOpdQueueUpdated);
    return () => window.removeEventListener('opdQueueUpdated', handleOpdQueueUpdated);
  }, []);

  const fetchOpdQueue = () => {
    (async () => {
      try {
        // Fetch from dedicated OPD queue collection - only show waiting patients
        const resp = await fetch(`${API_ENDPOINTS.QUEUE_OPD}?status=waiting`);
        if (!resp.ok) throw new Error('Failed to load OPD queue');
        const json = await resp.json();
        const today = new Date().toISOString().split('T')[0];

        // Filter to only show waiting patients (not done) and today's patients
        const waitingItems = (json.items || []).filter((item: any) => {
          const isWaiting = item.status === 'waiting' || !item.status;
          const rawDate = item.appointmentDate || (item.receptionData && item.receptionData.appointmentDate);
          const itemDate = rawDate ? rawDate.split('T')[0] : '';
          return isWaiting && itemDate === today;
        });
        setQueue(waitingItems);
        setLoading(false);
      } catch (e) {
        console.error('Error loading OPD queue:', e);
        setQueue([]);
        setLoading(false);
      }
    })();
  };

  const handleSelectPatient = (patient: QueuedPatient) => {
    setSelectedPatient(patient);
    setFindings(patient.opdFindings ? JSON.stringify(patient.opdFindings, null, 2) : '');

    // Extract data from OPD queue item - receptionData has nested structure
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
    // Use THIS VISIT's data from receptionData, NOT from patient document
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
      // OPD data starts fresh (OPD will fill these)
      optometry: {
        vision: {
          unaided: { rightEye: '', leftEye: '' },
          withGlass: { rightEye: '', leftEye: '' },
          withPinhole: { rightEye: '', leftEye: '' },
          bestCorrected: { rightEye: '', leftEye: '' }
        },
        autoRefraction: {
          ur: { sph: '', cyl: '', axis: '' },
          dr: { sph: '', cyl: '', axis: '' }
        },
        finalGlasses: {
          rightEye: { sph: '', cyl: '', axis: '', prism: '', va: '', nv: '' },
          leftEye: { sph: '', cyl: '', axis: '', prism: '', va: '', nv: '' },
          add: '',
          mDist: ''
        },
        currentGlasses: {
          rightEye: { sph: '', cyl: '', axis: '', va: '', add: '' },
          leftEye: { sph: '', cyl: '', axis: '', va: '', add: '' }
        },
        oldGlass: {
          rightEye: { sph: '', cyl: '', axis: '', va: '', add: '' },
          leftEye: { sph: '', cyl: '', axis: '', va: '', add: '' }
        },
        additional: {
          gpAdvisedFor: '',
          gpAdvisedBy: '',
          useOfGlass: '',
          product: ''
        }
      },
      iop: { iopReadings: [] },
      ophthalmicInvestigations: {},
      systemicInvestigations: {
        bloodTests: [],
        lipidProfile: [],
        renalFunction: [],
        liverFunction: []
      }
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

  const completeOpdExamination = async () => {
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

      const updated: QueuedPatient = {
        ...selectedPatient,
        status: 'opd_completed',
        completedByOpdAt: new Date().toISOString(),
        opdFindings: findings ? { notes: findings } : {},
      };

      // Update OPD queue item on backend (this will update appointment and patient)
      try {
        console.log('Updating OPD queue item:', queueId);
        const resp = await fetch(API_ENDPOINTS.QUEUE_OPD_ITEM(queueId), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'done',
            action: 'opd_done',
            opdData: {
              findings: findings,
              completedAt: updated.completedByOpdAt
            }
          })
        });
        if (!resp.ok) {
          const errorText = await resp.text();
          throw new Error(`Failed to update OPD queue: ${resp.status} - ${errorText}`);
        }
        console.log('OPD queue updated');
      } catch (e) {
        console.error('Failed to update OPD queue:', e);
        showAlert('Failed to persist OPD data to server. Please retry.');
        return;
      }

      // Notify other components
      window.dispatchEvent(new CustomEvent('opdQueueUpdated', { detail: { registrationId } }));

      setSelectedPatient(null);
      setFindings('');
      showAlert('Patient moved to Doctor queue');
    } catch (err) {
      console.error('Error completing OPD:', err);
    }
  };

  // Recall patient back to reception
  const recallToReception = async () => {
    if (!selectedPatient) return;

    const reason = prompt('Enter reason for recalling patient to reception:');
    if (!reason) return;

    try {
      const queueId = (selectedPatient as any).id || selectedPatient._id;

      const resp = await fetch(API_ENDPOINTS.QUEUE_RECALL_TO_RECEPTION, {
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

      showAlert('Patient recalled to reception for corrections');
      setSelectedPatient(null);
      fetchOpdQueue();

      // Notify reception queue to refresh
      window.dispatchEvent(new CustomEvent('receptionQueueUpdated'));
    } catch (err) {
      console.error('Error recalling patient:', err);
      showAlert('Failed to recall patient. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${hideDetailView ? 'h-full' : 'h-screen'} bg-[var(--theme-bg)]`}>
        <div className="text-center">
          <Eye className="w-10 h-10 text-[var(--theme-accent)] animate-spin mx-auto mb-4 opacity-20" />
        </div>
      </div>
    );
  }

  if (hideDetailView) {
    return (
      <div className="flex flex-col h-full overflow-hidden bg-[var(--theme-bg)]">
        <div className="p-6 border-b border-[var(--theme-accent)]/20 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black text-[var(--theme-text-muted)] uppercase tracking-widest opacity-60">OPD Queue</h3>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[var(--theme-accent)]/10 rounded-full border border-[var(--theme-accent)]/20">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[8px] font-black text-[var(--theme-text)] uppercase tracking-widest">Live</span>
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-[10px] text-[var(--theme-text-muted)] uppercase font-black tracking-widest opacity-40">Active Patients</span>
          </div>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto scrollbar-hide flex-1 pt-4">
          {queue.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center opacity-40">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-muted)]">No Patients Pending</p>
            </div>
          ) : (
            queue.map((patient, idx) => {
              const isSelected = selectedPatient?._id === patient._id || (selectedPatient as any).id === (patient as any).id;

              return (
                <button
                  key={patient._id || (patient as any).id || idx}
                  onClick={() => handleSelectPatient(patient)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 group shadow-sm hover:shadow-md ${isSelected
                    ? 'bg-[var(--theme-accent)] border-[var(--theme-accent)] shadow-[var(--theme-accent)]/20'
                    : 'bg-[var(--theme-bg-secondary)] border-[var(--theme-border)] hover:border-[var(--theme-accent)]/30'
                    }`}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isSelected ? 'text-white/70' : 'text-[var(--theme-text-muted)]'}`}>
                      Patient
                    </span>
                    <span className={`text-[9px] font-mono font-bold ${isSelected ? 'text-white/50' : 'text-[var(--theme-text-muted)] opacity-60'}`}>
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h4 className={`text-sm font-bold truncate transition-colors ${isSelected ? 'text-white' : 'text-[var(--theme-text)] group-hover:text-[var(--theme-text)]'}`}>
                    {patient.patientName}
                  </h4>
                  <p className={`text-[9px] font-mono font-black mt-1 uppercase tracking-wider ${isSelected ? 'text-white/60' : 'text-[var(--theme-text-muted)] opacity-60'}`}>
                    {patient.patientRegistrationId || 'OPD-PENDING'}
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
        <h1 className="text-4xl font-light tracking-tight mb-2 text-[var(--theme-text)]">OPD <span className="font-bold text-[var(--theme-text)]">Queue</span></h1>
        <p className="text-[var(--theme-text-muted)] font-medium opacity-60">Examine patients and send to doctor</p>
        <div className="w-16 h-1 bg-gradient-to-r from-[var(--theme-accent)] to-transparent rounded-full mt-4"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Queue List */}
        <div className="lg:col-span-2">
          <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/20 rounded-xl p-6 mb-6 shadow-sm">
            <div className="text-sm text-[var(--theme-text-muted)] font-bold">
              OPD Queue: <span className="text-[var(--theme-text)] font-black">{queue.length} PATIENTS</span>
            </div>
          </div>

          {queue.length === 0 ? (
            <Card className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-border)] p-12 text-center shadow-inner">
              <Eye className="w-12 h-12 text-[var(--theme-text-muted)] mx-auto mb-4 opacity-20" />
              <p className="text-[var(--theme-text-muted)] font-bold uppercase tracking-widest opacity-40">No patients in OPD queue</p>
            </Card>
          ) : (
            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-4 scrollbar-hide">
              {queue.map((patient, idx) => {
                // Extract fields from queue item structure
                const rd = (patient as any).receptionData || {};
                const rdPatientDetails = rd.patientDetails || {};
                const regId = (patient as any).registrationId || patient.patientRegistrationId || rd.patientRegistrationId || rdPatientDetails.registrationId || '';
                const displayName = patient.patientName || rdPatientDetails.name || (patient as any).patientName || 'Unknown Patient';
                const doctorName = rd.doctorName || (patient as any).doctorName || '';
                const notes = rd.notes || (patient as any).receptionNotes || '';
                const isSelected = selectedPatient && ((selectedPatient as any).id === (patient as any).id || selectedPatient._id === patient._id);

                return (
                  <button
                    key={(patient as any).id || patient._id || idx}
                    onClick={() => handleSelectPatient(patient)}
                    className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 shadow-sm hover:shadow-md ${isSelected
                      ? 'bg-[var(--theme-bg-tertiary)] border-[var(--theme-accent)] shadow-lg shadow-[var(--theme-accent)]/5'
                      : 'bg-[var(--theme-bg-secondary)] border-[var(--theme-border)] hover:border-[var(--theme-accent)]/30'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-base text-[var(--theme-text)]">{displayName}</span>
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${isSelected ? 'bg-[var(--theme-accent)] text-white' : 'bg-[var(--theme-bg-input)] text-[var(--theme-text-muted)]'}`}>
                        #{idx + 1}
                      </span>
                    </div>
                    <div className="text-xs space-y-1.5 text-[var(--theme-text-muted)]">
                      <p className="font-mono font-bold tracking-wider">ID: <span className="text-[var(--theme-text-muted)]">{regId || 'ID PENDING'}</span></p>
                      {doctorName && <p className="font-medium text-[var(--theme-text)]">Assigned to: <span className="font-bold">{doctorName}</span></p>}
                      {notes && (
                        <p className="italic font-medium text-[var(--theme-text-muted)]">Reception: {notes}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Examination Form */}
        <div className="lg:col-span-1">
          <div className="sticky top-8 bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/20 rounded-2xl p-8 h-fit max-h-[90vh] overflow-y-auto scrollbar-hide shadow-2xl">
            {selectedPatient ? (
              <>
                <h2 className="text-lg font-black text-[var(--theme-text)] mb-8 uppercase tracking-widest border-l-4 border-[var(--theme-accent)] pl-4">Examination</h2>

                <div className="space-y-8">
                  {(() => {
                    const sp = selectedPatient as any;
                    const rd = sp.receptionData || {};
                    const rdPatientDetails = rd.patientDetails || {};
                    const displayName = sp.patientName || rdPatientDetails.name || 'Unknown Patient';
                    const displayReg = sp.patientRegistrationId || sp.registrationId || rd.patientRegistrationId || rdPatientDetails.registrationId || 'OPD-PENDING';
                    const assignedDoctor = sp.doctorName || rd.doctorName || '';
                    return (
                      <>
                        <div className="bg-[var(--theme-bg-input)] p-4 rounded-xl border border-[var(--theme-border)] shadow-sm">
                          <p className="text-[10px] text-[var(--theme-text-muted)] font-black uppercase tracking-[0.2em] mb-2 opacity-60">Patient Details</p>
                          <p className="text-[var(--theme-text)] font-bold text-lg">{displayName}</p>
                          <p className="text-xs text-[var(--theme-text-muted)] font-black font-mono mt-1 opacity-80">{displayReg}</p>
                        </div>

                        <div className="bg-[var(--theme-bg-input)] p-4 rounded-xl border border-[var(--theme-border)] shadow-sm">
                          <p className="text-[10px] text-[var(--theme-text-muted)] font-black uppercase tracking-[0.2em] mb-2 opacity-60">Assigned Incharge</p>
                          <p className="text-[var(--theme-text)] font-bold text-sm">Dr. {assignedDoctor || 'Not Assigned'}</p>
                        </div>
                      </>
                    );
                  })()}

                  {selectedPatient.receptionNotes && (
                    <div className="bg-[var(--theme-accent)]/5 border border-[var(--theme-accent)]/20 rounded-xl p-4 shadow-sm">
                      <p className="text-[10px] text-[var(--theme-text-muted)] font-black uppercase tracking-[0.2em] mb-2">Reception Notes</p>
                      <p className="text-[var(--theme-text)] text-sm font-medium italic">"{selectedPatient.receptionNotes}"</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] text-[var(--theme-text-muted)] font-black uppercase tracking-[0.2em] mb-3 opacity-60">Examination Findings</label>
                    <textarea
                      value={findings}
                      onChange={(e) => setFindings(e.target.value)}
                      placeholder="Enter examination findings, tests, prescriptions, etc..."
                      className="w-full bg-[var(--theme-bg-input)] border border-[var(--theme-border)] rounded-2xl p-4 text-[var(--theme-text)] text-sm placeholder-[var(--theme-text-muted)]/40 focus:border-[var(--theme-accent)] outline-none transition-all shadow-inner focus:shadow-md h-32"
                    />
                  </div>

                  <div className="space-y-3 pt-4">
                    <Button
                      onClick={sendToDashboard}
                      className="w-full bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] force-text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-[var(--theme-accent)]/20 active:scale-[0.98]"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Open in Dashboard
                    </Button>

                    <Button
                      onClick={recallToReception}
                      variant="outline"
                      className="w-full border-2 border-[var(--theme-accent)]/30 text-[var(--theme-text)] hover:bg-[var(--theme-accent)]/10 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                    >
                      <RotateCcw className="w-5 h-5" />
                      Recall to Reception
                    </Button>
                    <p className="text-[10px] text-[var(--theme-text-muted)] text-center mt-3 font-bold opacity-40 uppercase tracking-widest">
                      Corrections required in registration?
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 opacity-40">
                <AlertCircle className="w-16 h-16 text-[var(--theme-text-muted)] mx-auto mb-6" />
                <p className="text-[var(--theme-text-muted)] font-black uppercase tracking-widest text-sm">Select a patient</p>
                <p className="text-[10px] mt-2 font-bold">To begin clinical examination</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
