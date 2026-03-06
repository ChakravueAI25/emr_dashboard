import { useState, useCallback } from 'react';
import { Plus, X, ClipboardList, Stethoscope, User, Calendar, Clock, Hash, FileText, Loader2, Download } from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';

interface SurgeryDetail {
  id: string;
  surgeryDate: string;
  site: string;
  isIol: boolean;
  caseType: string;
  operationType: string;
  surgeonName: string;
  theatreName: string;
  anaesthesis: string;
  surgeryStatus: string;
  diagnosis: string;
}

interface DiagnosisEntry {
  id: string;
  name: string;
  site: string;
  surgeon: string;
}

interface SurgicalRecordData {
  patientId: string;
  patientName: string;
  ipdNo: string;
  bookingNo: string;
  ageSex: string;
  operatedEye: string;
  otId: string;
  branch: string;
  admissionDate: string;
  surgeryDate: string;
  surgeryTime: string;
  manualOtNo: string;
  status: string;
  surgeonName: string;
  operationType: string;
  coSurgeon: string;
  anaesthetist: string;
  anesthType: string;
  anesthQty: string;
  durationMin: string;
  theaterName: string;
  caseType: string;
  iolSurgery: boolean;
  xylocainSensitivity: boolean;
  xylocainQty: string;
  complication: string;
  remarks: string;
  isPostponed: boolean;
  postponedReason: string;
  regType: string;
  registerName: string;
  assistantSister: string;
  assistantDoctor: string;
  diagnoses: DiagnosisEntry[];
  surgeryProcedureName: string;
  surgeryDetails: SurgeryDetail[];
}

const defaultData: SurgicalRecordData = {
  patientId: '',
  patientName: '',
  ipdNo: '',
  bookingNo: '',
  ageSex: '',
  operatedEye: 'RE',
  otId: '',
  branch: 'SEC',
  admissionDate: '',
  surgeryDate: new Date().toISOString().split('T')[0],
  surgeryTime: '11:30',
  manualOtNo: '',
  status: 'Done',
  surgeonName: 'Dr. Ajay Chakravarthy',
  operationType: '',
  coSurgeon: '',
  anaesthetist: 'Dr. Ajay Chakravarthy',
  anesthType: 'Topical',
  anesthQty: '',
  durationMin: '',
  theaterName: 'OT-1',
  caseType: 'Walkin',
  iolSurgery: false,
  xylocainSensitivity: false,
  xylocainQty: '',
  complication: 'NIL',
  remarks: '',
  isPostponed: false,
  postponedReason: '',
  regType: '',
  registerName: '',
  assistantSister: '',
  assistantDoctor: '',
  diagnoses: [{ id: '1', name: '', site: 'RE', surgeon: '' }],
  surgeryProcedureName: '',
  surgeryDetails: [],
};

// â”€â”€ Reusable field components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full bg-[var(--theme-bg)] border border-[var(--theme-accent)]/30 rounded-xl px-3 py-2 text-sm text-[var(--theme-text)] placeholder-[var(--theme-text-muted)] focus:outline-none focus:border-[var(--theme-accent)] focus:ring-1 focus:ring-[var(--theme-accent)]/30 transition-all duration-200';

const selectCls =
  'w-full bg-[var(--theme-bg)] border border-[var(--theme-accent)]/30 rounded-xl px-3 py-2 text-sm text-[var(--theme-text)] focus:outline-none focus:border-[var(--theme-accent)] transition-all duration-200 cursor-pointer';

export interface SurgicalPrefill {
  patientId: string;
  patientName: string;
  ageSex: string;
  ipdNo: string;
  admissionDate: string;
  surgeryDate: string;
  operatedEye: string;
  surgeonName: string;
  operationType: string;
  diagnosis: string;
  complication: string;
  remarks: string;
}

interface SurgicalRecordViewProps {
  onNavigate?: (view: string) => void;
  onDischargeSummary?: (prefill: SurgicalPrefill) => void;
}

export function SurgicalRecordView({ onNavigate, onDischargeSummary }: SurgicalRecordViewProps = {}) {
  const [data, setData] = useState<SurgicalRecordData>(defaultData);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [existingRecords, setExistingRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Load existing surgical records for a patient
  const loadSurgicalRecords = useCallback(async (patientId: string) => {
    if (!patientId.trim()) return;
    setLoadingRecords(true);
    try {
      // Fetch patient details and surgical records in parallel
      const [patientRes, recordsRes] = await Promise.all([
        fetch(API_ENDPOINTS.PATIENT(patientId)),
        fetch(API_ENDPOINTS.SURGICAL_RECORDS(patientId)),
      ]);

      if (patientRes.ok) {
        const patient = await patientRes.json();
        const details = patient.patientDetails || {};
        const demo = patient.demographics || {};
        const contact = patient.contactInfo || {};

        const name = details.name || patient.name || '';
        const age = details.age || demo.age || '';
        const sex = details.sex || demo.sex || details.gender || demo.gender || '';
        const ageSex = age && sex ? `${age} / ${sex}` : (age || sex || '');
        const phone = details.phone || contact.phone || '';
        const email = details.email || contact.email || '';

        setData(prev => ({
          ...prev,
          patientName: name,
          ageSex,
          ipdNo: details.ipdNo || patient.ipdNo || prev.ipdNo,
          bookingNo: details.bookingNo || patient.bookingNo || prev.bookingNo,
        }));
      }

      if (recordsRes.ok) {
        const json = await recordsRes.json();
        setExistingRecords(json.surgicalRecords || []);
      }
    } catch (err) {
      console.error('Failed to load patient / surgical records:', err);
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  // Save surgical record to backend
  const saveSurgicalRecord = async () => {
    if (!data.patientId.trim()) {
      setSaveMsg({ type: 'error', text: 'Patient ID is required to save.' });
      setTimeout(() => setSaveMsg(null), 3000);
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    try {
      const { patientId, ...recordData } = data;
      const res = await fetch(API_ENDPOINTS.SURGICAL_RECORDS(patientId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recordData),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setSaveMsg({ type: 'success', text: `Surgical record saved (ID: ${json.recordId})` });
      // Reload records
      loadSurgicalRecords(patientId);
    } catch (err: any) {
      setSaveMsg({ type: 'error', text: `Failed to save: ${err.message}` });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 4000);
    }
  };

  const setStr = (field: keyof SurgicalRecordData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setData(prev => ({ ...prev, [field]: e.target.value }));

  const setBool = (field: keyof SurgicalRecordData) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setData(prev => ({ ...prev, [field]: e.target.checked }));

  // Diagnoses
  const addDiagnosis = () =>
    setData(prev => ({
      ...prev,
      diagnoses: [...prev.diagnoses, { id: Date.now().toString(), name: '', site: 'RE', surgeon: '' }],
    }));
  const removeDiagnosis = (id: string) =>
    setData(prev => ({ ...prev, diagnoses: prev.diagnoses.filter(d => d.id !== id) }));
  const setDiag = (id: string, field: keyof DiagnosisEntry, value: string) =>
    setData(prev => ({
      ...prev,
      diagnoses: prev.diagnoses.map(d => d.id === id ? { ...d, [field]: value } : d),
    }));

  // Surgery details
  const addSurgeryDetail = () =>
    setData(prev => ({
      ...prev,
      surgeryDetails: [
        ...prev.surgeryDetails,
        {
          id: Date.now().toString(),
          surgeryDate: prev.surgeryDate,
          site: prev.operatedEye,
          isIol: prev.iolSurgery,
          caseType: prev.caseType,
          operationType: prev.operationType,
          surgeonName: prev.surgeonName,
          theatreName: prev.theaterName,
          anaesthesis: prev.anesthType,
          surgeryStatus: prev.status,
          diagnosis: prev.diagnoses.map(d => d.name).filter(Boolean).join(', '),
        },
      ],
    }));
  const removeSurgeryDetail = (id: string) =>
    setData(prev => ({ ...prev, surgeryDetails: prev.surgeryDetails.filter(s => s.id !== id) }));
  const setSurgDet = (id: string, field: keyof SurgeryDetail, value: any) =>
    setData(prev => ({
      ...prev,
      surgeryDetails: prev.surgeryDetails.map(s => s.id === id ? { ...s, [field]: value } : s),
    }));

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] p-6">

      {/* â”€â”€ Page Header â”€â”€ */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/30 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-[var(--theme-accent)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--theme-text)] tracking-tight">Surgical Record</h1>
            <p className="text-[var(--theme-text-muted)] text-[10px] uppercase tracking-widest font-bold">OT Record Entry</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (onDischargeSummary) {
                onDischargeSummary({
                  patientId: data.patientId,
                  patientName: data.patientName,
                  ageSex: data.ageSex,
                  ipdNo: data.ipdNo,
                  admissionDate: data.admissionDate,
                  surgeryDate: data.surgeryDate,
                  operatedEye: data.operatedEye,
                  surgeonName: data.surgeonName,
                  operationType: data.surgeryProcedureName || data.operationType,
                  diagnosis: data.diagnoses.map(d => d.name).filter(Boolean).join(', '),
                  complication: data.complication,
                  remarks: data.remarks,
                });
              } else if (onNavigate) {
                onNavigate('discharge-summary');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/30 text-[var(--theme-accent)] font-semibold text-sm hover:bg-[var(--theme-accent)]/20 transition-all"
          >
            <FileText size={15} /> Discharge Summary
          </button>
          <button
            onClick={saveSurgicalRecord}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-semibold text-sm hover:bg-emerald-500/20 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : null}
            {saving ? 'Saving...' : 'Update Surgical Record'}
          </button>
        </div>
      </div>

      {/* Save feedback */}
      {saveMsg && (
        <div className={`max-w-5xl mx-auto mb-2 px-4 py-2 rounded-xl text-sm font-semibold ${
          saveMsg.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {saveMsg.text}
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-4">

        {/* â”€â”€ Patient Info Card â”€â”€ */}
        <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/30 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-[var(--theme-accent)]" />
            <span className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Patient Information</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <FormField label="Patient ID">
              <div className="flex gap-2">
                <input className={inputCls} value={data.patientId} onChange={setStr('patientId')} placeholder="Enter Patient ID" />
                <button
                  onClick={() => loadSurgicalRecords(data.patientId)}
                  disabled={!data.patientId.trim() || loadingRecords}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/30 text-[var(--theme-accent)] text-xs font-bold hover:bg-[var(--theme-accent)]/20 transition-all disabled:opacity-40 whitespace-nowrap"
                >
                  {loadingRecords ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  Load
                </button>
              </div>
            </FormField>
            <div className="lg:col-span-2">
              <FormField label="Patient Name">
                <input className={inputCls} value={data.patientName} onChange={setStr('patientName')} placeholder="Enter Patient Name" />
              </FormField>
            </div>
            <FormField label="IPD No">
              <input className={inputCls} value={data.ipdNo} onChange={setStr('ipdNo')} placeholder="Enter IPD No." />
            </FormField>
            <FormField label="Booking No">
              <input className={inputCls} value={data.bookingNo} onChange={setStr('bookingNo')} />
            </FormField>
            <FormField label="Age / Sex">
              <input className={inputCls} value={data.ageSex} onChange={setStr('ageSex')} placeholder="Enter Age / Sex" />
            </FormField>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Operated Eye</span>
            {(['RE', 'LE', 'BE'] as const).map(eye => (
              <button
                key={eye}
                onClick={() => setData(prev => ({ ...prev, operatedEye: eye }))}
                className={`px-4 py-1.5 rounded-xl text-sm font-bold border transition-all ${data.operatedEye === eye
                  ? 'bg-[var(--theme-accent)] text-white border-[var(--theme-accent)]'
                  : 'bg-[var(--theme-bg)] text-[var(--theme-text-muted)] border-[var(--theme-accent)]/30 hover:border-[var(--theme-accent)]'}`}
              >
                {eye}
              </button>
            ))}
          </div>
        </div>

        {/* â”€â”€ OT Details + OT Log Book â”€â”€ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Left: OT Details */}
          <div className="lg:col-span-2 bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/30 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--theme-accent)]" />
              <span className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">OT Details</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <FormField label="OT ID">
                <input className={inputCls} value={data.otId} onChange={setStr('otId')} placeholder="Enter OT ID" />
              </FormField>
              <FormField label="Branch">
                <input className={inputCls} value={data.branch} onChange={setStr('branch')} placeholder="Enter Branch" />
              </FormField>
              <FormField label="Admission Date">
                <input type="date" className={inputCls} value={data.admissionDate} onChange={setStr('admissionDate')} />
              </FormField>
              <FormField label="Surgery Date">
                <input type="date" className={inputCls} value={data.surgeryDate} onChange={setStr('surgeryDate')} />
              </FormField>
              <FormField label="Surgery Time">
                <input type="time" className={inputCls} value={data.surgeryTime} onChange={setStr('surgeryTime')} />
              </FormField>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <FormField label="Manual OT No.">
                <input className={inputCls} value={data.manualOtNo} onChange={setStr('manualOtNo')} />
              </FormField>
              <FormField label="Status">
                <select className={selectCls} value={data.status} onChange={setStr('status')}>
                  <option>Done</option><option>Pending</option><option>Cancelled</option>
                </select>
              </FormField>
              <FormField label="Surgeon Name">
                <input className={inputCls} value={data.surgeonName} onChange={setStr('surgeonName')} />
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField label="Operation Type">
                <input className={inputCls} value={data.operationType} onChange={setStr('operationType')} placeholder="Enter Operation Type" />
              </FormField>
              <FormField label="Co-Surgeon">
                <input className={inputCls} value={data.coSurgeon} onChange={setStr('coSurgeon')} />
              </FormField>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <FormField label="Anaesthetist">
                <input className={inputCls} value={data.anaesthetist} onChange={setStr('anaesthetist')} />
              </FormField>
              <FormField label="Anesth. Type">
                <input className={inputCls} value={data.anesthType} onChange={setStr('anesthType')} placeholder="Enter type" />
              </FormField>
              <FormField label="Anesth. Qty">
                <input className={inputCls} value={data.anesthQty} onChange={setStr('anesthQty')} />
              </FormField>
              <FormField label="Duration (Min.)">
                <input className={inputCls} value={data.durationMin} onChange={setStr('durationMin')} placeholder="Enter duration" />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Theater Name">
                <input className={inputCls} value={data.theaterName} onChange={setStr('theaterName')} placeholder="Enter theater name" />
              </FormField>
              <FormField label="Case Type">
                <select className={selectCls} value={data.caseType} onChange={setStr('caseType')}>
                  <option>Walkin</option><option>IP</option><option>Camp</option>
                </select>
              </FormField>
            </div>

            {/* Checkboxes */}
            <div className="flex flex-wrap gap-5 pt-1">
              {[
                { field: 'iolSurgery' as const, label: 'IOL Surgery', color: 'var(--theme-accent)' },
                { field: 'xylocainSensitivity' as const, label: 'Xylocain Sensitivity', color: 'var(--theme-accent)' },
                { field: 'isPostponed' as const, label: 'Is Postponed', color: '#f97316' },
              ].map(({ field, label, color }) => (
                <label key={field} className="flex items-center gap-2 cursor-pointer group">
                  <div
                    className="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: data[field] ? color : 'var(--theme-bg)',
                      borderColor: data[field] ? color : 'color-mix(in srgb, var(--theme-accent) 40%, transparent)',
                    }}
                    onClick={() => setData(prev => ({ ...prev, [field]: !prev[field] }))}
                  >
                    {data[field] && <span className="text-white text-[10px] font-bold leading-none">âœ“</span>}
                  </div>
                  <span className="text-sm font-semibold text-[var(--theme-text)]">{label}</span>
                </label>
              ))}
              {data.xylocainSensitivity && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Qty</span>
                  <input className={`${inputCls} !w-20`} value={data.xylocainQty} onChange={setStr('xylocainQty')} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField label="Complication">
                <input className={inputCls} value={data.complication} onChange={setStr('complication')} placeholder="Enter complication or NIL" />
              </FormField>
              <FormField label="Remarks">
                <input className={inputCls} value={data.remarks} onChange={setStr('remarks')} />
              </FormField>
            </div>

            {data.isPostponed && (
              <FormField label="Postponed Reason">
                <textarea rows={3} className={`${inputCls} resize-none`} value={data.postponedReason} onChange={setStr('postponedReason')} />
              </FormField>
            )}
          </div>

          {/* Right: OT Log Book */}
          <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/30 rounded-2xl overflow-hidden shadow-lg flex flex-col">
            <div className="px-4 py-3 bg-[var(--theme-accent)] flex items-center gap-2">
              <Hash className="w-4 h-4 text-white" />
              <span className="text-xs font-bold text-white uppercase tracking-widest">OT Log Book &amp; Notes</span>
            </div>
            <div className="p-4 space-y-4 flex-1">
              <FormField label="Reg Type">
                <input className={inputCls} value={data.regType} onChange={setStr('regType')} />
              </FormField>
              <FormField label="Register Name">
                <input className={inputCls} value={data.registerName} onChange={setStr('registerName')} placeholder="Enter register name" />
              </FormField>
              <FormField label="Assistant Sister">
                <input className={inputCls} value={data.assistantSister} onChange={setStr('assistantSister')} />
              </FormField>
              <FormField label="Assistant Doctor">
                <input className={inputCls} value={data.assistantDoctor} onChange={setStr('assistantDoctor')} />
              </FormField>

              {/* Diagnosis list */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Diagnosis</label>
                  <button onClick={addDiagnosis} className="flex items-center gap-1 text-[10px] font-bold text-[var(--theme-accent)] hover:opacity-80 transition-opacity">
                    <Plus size={11} /> Add
                  </button>
                </div>
                <div className="grid grid-cols-[1fr_44px_60px_20px] text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest px-1 mb-1">
                  <span>Name</span><span className="text-center">Site</span><span>Surgeon</span><span />
                </div>
                <div className="space-y-1">
                  {data.diagnoses.map(d => (
                    <div key={d.id} className="grid grid-cols-[1fr_44px_60px_20px] items-center gap-1 bg-[var(--theme-bg)] border border-[var(--theme-accent)]/20 rounded-lg px-2 py-1">
                      <input className="bg-transparent text-sm text-[var(--theme-text)] outline-none placeholder-[var(--theme-text-muted)] w-full" value={d.name} onChange={e => setDiag(d.id, 'name', e.target.value)} placeholder="Enter diagnosis" />
                      <select className="bg-transparent text-xs text-[var(--theme-text)] outline-none w-full text-center" value={d.site} onChange={e => setDiag(d.id, 'site', e.target.value)}>
                        <option>RE</option><option>LE</option><option>BE</option>
                      </select>
                      <input className="bg-transparent text-xs text-[var(--theme-text)] outline-none placeholder-[var(--theme-text-muted)] w-full" value={d.surgeon} onChange={e => setDiag(d.id, 'surgeon', e.target.value)} placeholder="Enter surgeon name" />
                      <button onClick={() => removeDiagnosis(d.id)} className="text-[var(--theme-text-muted)] hover:text-red-400 transition-colors"><X size={12} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* â”€â”€ Surgery Procedure Name â”€â”€ */}
        <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/30 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Stethoscope className="w-4 h-4 text-[var(--theme-accent)]" />
            <span className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Surgery (Procedure) Name</span>
          </div>
          <input className={`${inputCls} text-base font-semibold`} value={data.surgeryProcedureName} onChange={setStr('surgeryProcedureName')} placeholder="Enter procedure name" />
        </div>

        {/* â”€â”€ Surgery Detail Table â”€â”€ */}
        <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/30 rounded-2xl overflow-hidden shadow-lg">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--theme-accent)]/20">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--theme-accent)]" />
              <span className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Surgery Detail Log</span>
            </div>
            <button onClick={addSurgeryDetail} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/30 text-[var(--theme-accent)] text-xs font-bold hover:bg-[var(--theme-accent)]/20 transition-all">
              <Plus size={12} /> Add Row
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[var(--theme-bg)] border-b border-[var(--theme-accent)]/20">
                  {['Surgery Date', 'Site', 'ISIOL', 'Case Type', 'Operation Type', 'Surgeon Name', 'Theatre', 'Anaesthesis', 'Status', 'Diagnosis', ''].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.surgeryDetails.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-5 py-8 text-center text-sm text-[var(--theme-text-muted)]">
                      No records yet â€” click <span className="text-[var(--theme-accent)] font-semibold">Add Row</span> to insert
                    </td>
                  </tr>
                )}
                {data.surgeryDetails.map((s, idx) => (
                  <tr key={s.id} className={`border-b border-[var(--theme-accent)]/10 ${idx % 2 === 0 ? 'bg-[var(--theme-bg-secondary)]' : 'bg-[var(--theme-bg)]'}`}>
                    <td className="px-2 py-1.5"><input type="date" className="bg-transparent text-[var(--theme-text)] outline-none text-xs w-[110px]" value={s.surgeryDate} onChange={e => setSurgDet(s.id, 'surgeryDate', e.target.value)} /></td>
                    <td className="px-2 py-1.5"><select className="bg-transparent text-[var(--theme-text)] outline-none text-xs" value={s.site} onChange={e => setSurgDet(s.id, 'site', e.target.value)}><option>RE</option><option>LE</option><option>BE</option></select></td>
                    <td className="px-2 py-1.5 text-center">
                      <div className={`w-4 h-4 mx-auto rounded border-2 flex items-center justify-center cursor-pointer transition-all ${s.isIol ? 'bg-[var(--theme-accent)] border-[var(--theme-accent)]' : 'border-[var(--theme-accent)]/40'}`} onClick={() => setSurgDet(s.id, 'isIol', !s.isIol)}>
                        {s.isIol && <span className="text-white text-[8px] font-bold leading-none">âœ“</span>}
                      </div>
                    </td>
                    <td className="px-2 py-1.5"><input className="bg-transparent text-[var(--theme-text)] outline-none text-xs w-16" value={s.caseType} onChange={e => setSurgDet(s.id, 'caseType', e.target.value)} /></td>
                    <td className="px-2 py-1.5"><input className="bg-transparent text-[var(--theme-text)] outline-none text-xs w-24" value={s.operationType} onChange={e => setSurgDet(s.id, 'operationType', e.target.value)} /></td>
                    <td className="px-2 py-1.5"><input className="bg-transparent text-[var(--theme-text)] outline-none text-xs w-24" value={s.surgeonName} onChange={e => setSurgDet(s.id, 'surgeonName', e.target.value)} /></td>
                    <td className="px-2 py-1.5"><input className="bg-transparent text-[var(--theme-text)] outline-none text-xs w-14" value={s.theatreName} onChange={e => setSurgDet(s.id, 'theatreName', e.target.value)} /></td>
                    <td className="px-2 py-1.5"><input className="bg-transparent text-[var(--theme-text)] outline-none text-xs w-16" value={s.anaesthesis} onChange={e => setSurgDet(s.id, 'anaesthesis', e.target.value)} /></td>
                    <td className="px-2 py-1.5"><input className="bg-transparent text-[var(--theme-text)] outline-none text-xs w-16" value={s.surgeryStatus} onChange={e => setSurgDet(s.id, 'surgeryStatus', e.target.value)} /></td>
                    <td className="px-2 py-1.5"><input className="bg-transparent text-[var(--theme-text)] outline-none text-xs w-20" value={s.diagnosis} onChange={e => setSurgDet(s.id, 'diagnosis', e.target.value)} /></td>
                    <td className="px-2 py-1.5"><button onClick={() => removeSurgeryDetail(s.id)} className="text-[var(--theme-text-muted)] hover:text-red-400 transition-colors"><X size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Previously Saved Surgical Records ── */}
        {existingRecords.length > 0 && (
          <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/30 rounded-2xl overflow-hidden shadow-lg">
            <div className="px-5 py-3 border-b border-[var(--theme-accent)]/20 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[var(--theme-accent)]" />
              <span className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">
                Previous Surgical Records ({existingRecords.length})
              </span>
            </div>
            <div className="divide-y divide-[var(--theme-accent)]/10">
              {existingRecords.map((rec, idx) => (
                <div
                  key={rec.recordId || idx}
                  className="px-5 py-3 hover:bg-[var(--theme-accent)]/5 cursor-pointer transition-colors"
                  onClick={() => {
                    setData(prev => ({
                      ...prev,
                      ...rec,
                      patientId: prev.patientId,
                      diagnoses: rec.diagnoses?.length ? rec.diagnoses : defaultData.diagnoses,
                      surgeryDetails: rec.surgeryDetails || [],
                    }));
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-[var(--theme-accent)] tabular-nums">#{idx + 1}</span>
                      <span className="text-sm font-semibold text-[var(--theme-text)]">
                        {rec.surgeryProcedureName || rec.operationType || 'Untitled Procedure'}
                      </span>
                      <span className="text-xs text-[var(--theme-text-muted)]">{rec.operatedEye}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--theme-text-muted)]">
                      <span>{rec.surgeryDate}</span>
                      <span>{rec.surgeonName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        rec.status === 'Done' ? 'bg-emerald-500/10 text-emerald-400' :
                        rec.status === 'Cancelled' ? 'bg-red-500/10 text-red-400' :
                        'bg-amber-500/10 text-amber-400'
                      }`}>
                        {rec.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
