import { useState } from 'react';
import {
  Printer, ChevronLeft, Plus, X, FileText, FlaskConical, Receipt,
  ClipboardList, Eye, Pill,
} from 'lucide-react';
import type { SurgicalPrefill } from './SurgicalRecordView';

// ── Shared helpers ────────────────────────────────────────────────────────────

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
  'w-full bg-[var(--theme-bg)] border border-[var(--theme-accent)]/25 rounded-xl px-3 py-2 text-sm text-[var(--theme-text)] placeholder-[var(--theme-text-muted)]/55 focus:outline-none focus:border-[var(--theme-accent)] focus:ring-1 focus:ring-[var(--theme-accent)]/25 transition-all duration-200';

const selectCls =
  'w-full bg-[var(--theme-bg)] border border-[var(--theme-accent)]/30 rounded-xl px-3 py-2 text-sm text-[var(--theme-text)] focus:outline-none focus:border-[var(--theme-accent)] transition-all duration-200 cursor-pointer';

// table cell input — underline style matching Ophthalmologist Examination
const tdInput =
  'bg-transparent text-sm text-[var(--theme-text)] outline-none w-full border-b border-[var(--theme-accent)]/25 pb-0.5 placeholder-[var(--theme-text-muted)]/70 focus:border-[var(--theme-accent)] transition-colors duration-150';

// full-row examination-style input (bordered box + right indicator)
const examInput =
  'flex-1 bg-[var(--theme-bg)] border border-[var(--theme-accent)]/25 rounded-lg px-3 py-2 text-sm text-[var(--theme-text)] placeholder-[var(--theme-text-muted)]/60 outline-none focus:border-[var(--theme-accent)] focus:ring-1 focus:ring-[var(--theme-accent)]/20 transition-all duration-200 min-w-0';

// ── Data interfaces ───────────────────────────────────────────────────────────

interface MedicineRow {
  id: string;
  medicine: string;
  qty: string;
  dosage: string;
  dur: string;
  unit: string;
  site: string;
  remarks: string;
}

interface ExamRow {
  id: string;
  examination: string;
  right: string;
  left: string;
}

interface InvestigationRow {
  id: string;
  headName: string;
  referenceValue: string;
  resultObservation: string;
}

interface VisionRow {
  label: string;           // "V/A" | "Pinhole"
  distRight: string;
  distLeft: string;
  nearRight: string;
  nearLeft: string;
}

interface VisionGroup {
  title: string;           // "Pre-OP Vision", "1st Post-OP Vision", …
  rows: VisionRow[];
}

interface GlassPrescRow {
  label: string;           // "Dist" | "Add" | "M.Dist"
  sph: string; cyl: string; axis: string; prism: string; va: string; nv: string;
}

// ── Default state factories ───────────────────────────────────────────────────

const defaultMed = (): MedicineRow => ({
  id: Date.now().toString(),
  medicine: '', qty: '', dosage: '', dur: '', unit: 'D', site: '', remarks: '',
});

const defaultExam = (name: string): ExamRow => ({
  id: name, examination: name, right: '', left: '',
});

const defaultInvestigation = (): InvestigationRow => ({
  id: Date.now().toString(), headName: '', referenceValue: '', resultObservation: '',
});

const defaultVisionGroup = (title: string): VisionGroup => ({
  title,
  rows: [
    { label: 'V/A',     distRight: '', distLeft: '', nearRight: '', nearLeft: '' },
    { label: 'Pinhole', distRight: '', distLeft: '', nearRight: '', nearLeft: '' },
  ],
});

const defaultGlassRow = (label: string): GlassPrescRow => ({
  label, sph: '', cyl: '', axis: '', prism: '', va: '', nv: '',
});

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
  prefill?: SurgicalPrefill;
}

export function DischargeSummaryView({ onBack, prefill }: Props) {
  const [activePart, setActivePart] = useState<1 | 2 | 3>(1);

  // ── Part 1 state ─────────────────────────────────────────────────────────
  const [pid, setPid] = useState(prefill?.patientId ?? '');
  const [pname, setPname] = useState(prefill?.patientName ?? '');
  const [ageSex, setAgeSex] = useState(prefill?.ageSex ?? '');
  const [ipNumber, setIpNumber] = useState(prefill?.ipdNo ?? '');
  const [admissionDate, setAdmissionDate] = useState(prefill?.admissionDate ?? '');
  const [surgeryDate, setSurgeryDate] = useState(prefill?.surgeryDate ?? '');
  const [dischargeDate, setDischargeDate] = useState(new Date().toISOString().split('T')[0]);
  const [operatedEye, setOperatedEye] = useState(prefill?.operatedEye ?? 'RE');
  const [reasonForAdmission, setReasonForAdmission] = useState('');
  const [complaints, setComplaints] = useState('');
  const [procedures, setProcedures] = useState(prefill?.operationType ?? '');
  const [diagnosis, setDiagnosis] = useState(prefill?.diagnosis ?? '');
  const [investigationsBP, setInvestigationsBP] = useState('');
  const [systemicDisease, setSystemicDisease] = useState('');
  const [medicationsAdministered, setMedicationsAdministered] = useState('');
  const [dischargeInstructions, setDischargeInstructions] = useState('');
  const [conditionAtDischarge, setConditionAtDischarge] = useState('');
  const [dischargePulse, setDischargePulse] = useState('');
  const [dischargeBP, setDischargeBP] = useState('');
  const [adviceOnDischarge, setAdviceOnDischarge] = useState('');
  const [remarks, setRemarks] = useState(prefill?.remarks ?? '');
  const [followUpDate1, setFollowUpDate1] = useState('');
  const [followUpTime1, setFollowUpTime1] = useState('12:00');
  const [followUpDate2, setFollowUpDate2] = useState('');
  const [followUpTime2, setFollowUpTime2] = useState('12:00');
  const [doctorName, setDoctorName] = useState(prefill?.surgeonName ?? 'Dr. Ajay Chakravarthy');

  // ── Part 2 state ─────────────────────────────────────────────────────────
  const [medicines, setMedicines] = useState<MedicineRow[]>([defaultMed()]);
  const addMed = () => setMedicines(p => [...p, defaultMed()]);
  const removeMed = (id: string) => setMedicines(p => p.filter(m => m.id !== id));
  const setMed = (id: string, field: keyof MedicineRow, val: string) =>
    setMedicines(p => p.map(m => m.id === id ? { ...m, [field]: val } : m));

  const [examRows, setExamRows] = useState<ExamRow[]>([
    defaultExam('Anterior Segment'),
    defaultExam('Fundus'),
    defaultExam('Anterior Segment'),
    defaultExam('Anterior Segment (Extra)'),
  ]);
  const setExam = (id: string, field: 'right' | 'left', val: string) =>
    setExamRows(p => p.map(r => r.id === id ? { ...r, [field]: val } : r));

  const [examComments, setExamComments] = useState('');
  const [restFromDate, setRestFromDate] = useState('');
  const [restToDate, setRestToDate] = useState('');

  // ── Part 3 state ─────────────────────────────────────────────────────────
  const [investigations, setInvestigations] = useState<InvestigationRow[]>([]);
  const addInvestigation = () => setInvestigations(p => [...p, defaultInvestigation()]);
  const removeInvestigation = (id: string) => setInvestigations(p => p.filter(r => r.id !== id));
  const setInv = (id: string, field: keyof InvestigationRow, val: string) =>
    setInvestigations(p => p.map(r => r.id === id ? { ...r, [field]: val } : r));

  const [campName, setCampName] = useState('');
  const [campDate, setCampDate] = useState('');
  const [campPlace, setCampPlace] = useState('');
  const [blindnessDate, setBlindnessDate] = useState('');

  const [visionGroups, setVisionGroups] = useState<VisionGroup[]>([
    defaultVisionGroup('Pre-OP Vision'),
    defaultVisionGroup('1st Post-OP Vision'),
    defaultVisionGroup('2nd Post-OP Vision'),
    defaultVisionGroup('3rd Post-OP Vision'),
  ]);
  const setVisionCell = (gIdx: number, rIdx: number, field: keyof Omit<VisionRow, 'label'>, val: string) =>
    setVisionGroups(p => p.map((g, gi) =>
      gi !== gIdx ? g : {
        ...g,
        rows: g.rows.map((r, ri) => ri !== rIdx ? r : { ...r, [field]: val }),
      }
    ));

  const [glassRight, setGlassRight] = useState<GlassPrescRow[]>([
    defaultGlassRow('Dist'), defaultGlassRow('Add'), defaultGlassRow('M.Dist'),
  ]);
  const [glassLeft, setGlassLeft] = useState<GlassPrescRow[]>([
    defaultGlassRow('Dist'), defaultGlassRow('Add'), defaultGlassRow('M.Dist'),
  ]);
  const setGlass = (
    which: 'right' | 'left', idx: number, field: keyof Omit<GlassPrescRow, 'label'>, val: string,
  ) => {
    const setter = which === 'right' ? setGlassRight : setGlassLeft;
    setter(p => p.map((r, i) => i !== idx ? r : { ...r, [field]: val }));
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const fmtDate = (d: string) => {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
  };

  const handlePrint = () => {
    // Build numbered medicine list like the reference
    const medLines = medicines
      .filter(m => m.medicine.trim())
      .map((m, i) => {
        const dosageText = [m.dosage, m.dur && m.unit ? `for ${m.dur} ${m.unit === 'D' ? 'Days' : m.unit === 'W' ? 'Weeks' : 'Months'}` : ''].filter(Boolean).join(' ');
        const siteText = m.site ? ` [${m.site}]` : '';
        return `<div style="margin-bottom:10px">
          <div style="font-weight:600">${i + 1}. (${m.medicine.toUpperCase()})${siteText}${m.qty ? ' &nbsp; Qty: ' + m.qty : ''}</div>
          ${dosageText ? `<div style="font-style:italic;padding-left:28px">${dosageText}</div>` : ''}
          ${m.remarks ? `<div style="padding-left:28px;color:#555">${m.remarks}</div>` : ''}
        </div>`;
      }).join('');

    const followupText = followUpDate1
      ? `${fmtDate(followUpDate1)} @ ${followUpTime1}${followUpDate2 ? ' &nbsp;|&nbsp; 2nd: ' + fmtDate(followUpDate2) + ' @ ' + followUpTime2 : ''}`
      : '—';

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Discharge Summary</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', serif; font-size: 13px; color: #000; background: #fff; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 18mm 16mm 12mm; }
  h2 { text-align: center; font-size: 18px; letter-spacing: 1px; margin-bottom: 10px; text-decoration: underline; }
  .info-grid { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  .info-grid td { padding: 1px 6px; font-size: 13px; vertical-align: top; }
  .info-grid td:first-child { font-weight: bold; white-space: nowrap; width: 38%; }
  .divider { border: none; border-top: 1.5px solid #000; margin: 6px 0; }
  .field-row { display: flex; margin-bottom: 5px; }
  .field-label { font-weight: bold; min-width: 195px; white-space: nowrap; }
  .field-colon { margin: 0 8px; }
  .field-value { flex: 1; }
  .section-title { font-weight: bold; font-size: 14px; margin: 12px 0 6px; text-decoration: underline; }
  .meds-list { margin-left: 8px; }
  .note-box { border-top: 1px solid #888; border-bottom: 1px solid #888; padding: 4px 0; margin: 10px 0; font-size: 12px; }
  .condition-row { display: flex; align-items: baseline; gap: 24px; margin-bottom: 5px; }
  .followup-row { display: flex; align-items: baseline; margin-bottom: 10px; }
  .sign-section { display: flex; justify-content: space-between; margin-top: 18px; align-items: flex-start; }
  .sign-left { min-width: 200px; }
  .doctor-name { font-size: 15px; font-weight: bold; margin-bottom: 28px; }
  .sign-line { border-top: 1px solid #000; width: 160px; margin-top: 4px; }
  .stamp-box { border: 1.5px solid #000; width: 130px; height: 90px; display: flex; align-items: center; justify-content: center; color: #888; font-size: 11px; text-align: center; }
  .important-note { margin-top: 12px; font-size: 12px; }
  .emergency { font-size: 13px; font-weight: bold; margin-top: 6px; }
  .received { font-size: 12px; margin-top: 6px; }
  .wish { text-align: center; font-size: 18px; font-weight: bold; margin-top: 22px; letter-spacing: 1px; }
  @media print { body { margin: 0; } .page { padding: 14mm 14mm 10mm; } }
</style>
</head>
<body>
<div class="page">
  <h2>Discharge Summary</h2>

  <table class="info-grid">
    <tr>
      <td><b>MRD Number</b> &nbsp;: &nbsp;${pid || '—'}</td>
      <td><b>Age/Sex</b> &nbsp;: &nbsp;${ageSex || '—'}</td>
      <td><b>IP Number</b> &nbsp;: &nbsp;${ipNumber || '—'}</td>
    </tr>
    <tr>
      <td colspan="2"><b>Patient Name</b> &nbsp;: &nbsp;${pname || '—'}</td>
      <td><b>Date</b> &nbsp;: &nbsp;${fmtDate(dischargeDate)}</td>
    </tr>
  </table>

  <hr class="divider">

  <table class="info-grid">
    <tr>
      <td><b>Date of Admission</b> &nbsp;: &nbsp;${fmtDate(admissionDate)}</td>
      <td><b>Date of Surgery</b> &nbsp;: &nbsp;${fmtDate(surgeryDate)}</td>
    </tr>
    <tr>
      <td><b>Date of Discharge</b> &nbsp;: &nbsp;${fmtDate(dischargeDate)}</td>
      <td></td>
    </tr>
  </table>

  <hr class="divider">

  <div class="field-row"><span class="field-label">Reason for Admission</span><span class="field-colon">:</span><span class="field-value">${reasonForAdmission || '—'}</span></div>
  <div class="field-row"><span class="field-label">Diagnosis</span><span class="field-colon">:</span><span class="field-value">${diagnosis || '—'}</span></div>
  <div class="field-row"><span class="field-label">Investigations</span><span class="field-colon">:</span><span class="field-value">${investigationsBP || '—'}</span></div>
  <div class="field-row"><span class="field-label">Systemic Disease</span><span class="field-colon">:</span><span class="field-value">${systemicDisease || '—'}</span></div>
  <div class="field-row"><span class="field-label">Medications Administered</span><span class="field-colon">:</span><span class="field-value">${medicationsAdministered || '—'}</span></div>
  <div class="field-row"><span class="field-label">Procedure Done</span><span class="field-colon">:</span><span class="field-value">${procedures || '—'}</span></div>

  <hr class="divider">

  <div class="section-title">Post Operative Medications Advised :</div>
  <div class="meds-list">
    ${medLines || '<div style="color:#555;font-style:italic">No medicines entered</div>'}
  </div>

  ${dischargeInstructions ? `<div class="note-box"><b>Note:</b> ${dischargeInstructions}</div>` : ''}

  <div class="condition-row">
    <span><b>Condition On Discharge</b> &nbsp;: &nbsp;${conditionAtDischarge || ''}</span>
    <span><b>Pulse:</b> &nbsp;${dischargePulse || ''} bpm</span>
    <span>${dischargePulse ? '%' : ''}</span>
    <span><b>BP:</b> &nbsp;${dischargeBP || '—'} mmHg</span>
  </div>

  <div class="followup-row">
    <span class="field-label"><b>Followup on</b></span>
    <span class="field-colon">:</span>
    <span>${followupText}</span>
  </div>

  <div class="sign-section">
    <div class="sign-left">
      <div class="doctor-name">${doctorName}</div>
      <div style="height:40px"></div>
      <div class="sign-line"></div>
      <div style="font-size:12px;margin-top:4px">Date &amp; Time &nbsp; ${fmtDate(dischargeDate)}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:11px;margin-bottom:6px">Verified by</div>
      <div class="stamp-box">Hospital<br>Stamp</div>
    </div>
  </div>

  <div class="important-note">
    <b>IMPORTANT NOTE:</b> Report immediately to the hospital, if the patient experiences severe pain in the operated eye / sudden blurring of vision / redness in the eye / severe headache / vomiting / drowsiness.
  </div>
  <div class="emergency">MEDICAL EMERGENCY CONTACT NUMBER : +91 9591638909</div>
  <div class="received">Received discharge summary and clearly understood post operative instructions</div>
  <div style="display:flex;justify-content:flex-end;margin-top:6px;font-size:12px">Signature of patient / attendant</div>

  <div class="wish">WISH YOU A SPEEDY RECOVERY</div>
</div>
</body>
</html>`;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(html);
    doc.close();
    iframe.onload = () => {
      iframe.contentWindow!.focus();
      iframe.contentWindow!.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    };
  };

  const handleUpdateDischarge = () => alert('Discharge updated (backend integration pending).');

  // ── Shared sub-components ────────────────────────────────────────────────

  const PartTab = ({ n, label }: { n: 1 | 2 | 3; label: string }) => (
    <button
      onClick={() => setActivePart(n)}
      className={`px-5 py-2 rounded-t-xl text-[11px] font-bold uppercase tracking-widest border border-[var(--theme-accent)]/30 transition-all whitespace-nowrap ${
        activePart === n
          ? 'bg-[var(--theme-accent)] text-white border-[var(--theme-accent)]'
          : 'bg-[var(--theme-bg-secondary)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text)]'
      }`}
    >
      {label}
    </button>
  );

  const EyeToggle = () => (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Operated Eye</span>
      {(['RE', 'LE', 'BE'] as const).map(eye => (
        <button key={eye} onClick={() => setOperatedEye(eye)}
          className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
            operatedEye === eye
              ? 'bg-[var(--theme-accent)] text-white border-[var(--theme-accent)]'
              : 'bg-[var(--theme-bg)] text-[var(--theme-text-muted)] border-[var(--theme-accent)]/30'}`}
        >{eye}</button>
      ))}
    </div>
  );

  // ── Common patient bar ────────────────────────────────────────────────────

  const PatientBar = () => (
    <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/30 rounded-2xl p-4 shadow mb-4">
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">MRD No.</span>
          <input className={`${inputCls} !w-28`} value={pid} onChange={e => setPid(e.target.value)} placeholder="Enter MRD No." />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">IP Number</span>
          <input className={`${inputCls} !w-28`} value={ipNumber} onChange={e => setIpNumber(e.target.value)} placeholder="Enter IP No." />
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Patient Name</span>
          <input className={inputCls} value={pname} onChange={e => setPname(e.target.value)} placeholder="Enter Patient Name" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Age / Sex</span>
          <input className={`${inputCls} !w-28`} value={ageSex} onChange={e => setAgeSex(e.target.value)} placeholder="Enter Age / Sex" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Admission Date</span>
          <input type="date" className={`${inputCls} !w-40`} value={admissionDate} onChange={e => setAdmissionDate(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Surgery Date</span>
          <input type="date" className={`${inputCls} !w-40`} value={surgeryDate} onChange={e => setSurgeryDate(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Discharge Date</span>
          <input type="date" className={`${inputCls} !w-40`} value={dischargeDate} onChange={e => setDischargeDate(e.target.value)} />
        </div>
        {EyeToggle()}
      </div>
    </div>
  );

  // ── PART 1 ────────────────────────────────────────────────────────────────

  const Part1 = () => (
    <div className="space-y-4">
      <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/30 rounded-2xl p-5 shadow-lg space-y-4">
        <FormField label="Reason for Admission">
          <input className={inputCls} value={reasonForAdmission} onChange={e => setReasonForAdmission(e.target.value)}
            placeholder="Enter reason for admission" />
        </FormField>
        <FormField label="Complaints">
          <input className={inputCls} value={complaints} onChange={e => setComplaints(e.target.value)}
            placeholder="Enter complaints" />
        </FormField>
        <FormField label="Diagnosis">
          <input className={inputCls} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="Enter diagnosis" />
        </FormField>
        <FormField label="Investigations (e.g. BP mmHg)">
          <input className={inputCls} value={investigationsBP} onChange={e => setInvestigationsBP(e.target.value)}
            placeholder="Enter BP or investigation values" />
        </FormField>
        <FormField label="Systemic Disease">
          <input className={inputCls} value={systemicDisease} onChange={e => setSystemicDisease(e.target.value)}
            placeholder="Enter systemic disease" />
        </FormField>
        <FormField label="Medications Administered">
          <input className={inputCls} value={medicationsAdministered} onChange={e => setMedicationsAdministered(e.target.value)}
            placeholder="Enter medications administered" />
        </FormField>
        <FormField label="Procedure Done">
          <input className={inputCls} value={procedures} onChange={e => setProcedures(e.target.value)}
            placeholder="Enter procedure done" />
        </FormField>
        <FormField label="Discharge Instructions / Notes">
          <div className="relative">
            <textarea rows={3} className={`${inputCls} resize-none placeholder-[var(--theme-text-muted)]/55`} value={dischargeInstructions}
              onChange={e => setDischargeInstructions(e.target.value)} placeholder="Enter discharge instructions / notes" />
            <button className="mt-2 px-4 py-1.5 rounded-xl bg-[var(--theme-accent)] text-white text-xs font-bold hover:opacity-90 transition-opacity inline-flex items-center gap-1">
              <ClipboardList size={12} /> Instruction Master
            </button>
          </div>
        </FormField>
        <div>
          <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-2">
            Condition On Discharge
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <input className={`${inputCls} flex-1 min-w-[160px]`} value={conditionAtDischarge} onChange={e => setConditionAtDischarge(e.target.value)}
              placeholder="Enter condition" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--theme-text-muted)] whitespace-nowrap">Pulse</span>
              <input className={`${inputCls} !w-20`} value={dischargePulse} onChange={e => setDischargePulse(e.target.value)} placeholder="Enter bpm" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--theme-text-muted)] whitespace-nowrap">BP</span>
              <input className={`${inputCls} !w-28`} value={dischargeBP} onChange={e => setDischargeBP(e.target.value)} placeholder="Enter BP" />
            </div>
          </div>
        </div>
        <FormField label="Advice On Discharge">
          <input className={inputCls} value={adviceOnDischarge} onChange={e => setAdviceOnDischarge(e.target.value)}
            placeholder="Enter advice on discharge" />
        </FormField>
        <FormField label="Remarks">
          <input className={inputCls} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Enter remarks" />
        </FormField>
      </div>

      {/* Follow-up row */}
      <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/30 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-4 h-4 text-[var(--theme-accent)]" />
          <span className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Follow-up &amp; Doctor</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            {EyeToggle()}
          </div>
          <FormField label="Follow-up Date (1st)">
            <input type="date" className={inputCls} value={followUpDate1} onChange={e => setFollowUpDate1(e.target.value)} />
          </FormField>
          <FormField label="Follow-up Time (1st)">
            <input type="time" className={inputCls} value={followUpTime1} onChange={e => setFollowUpTime1(e.target.value)} />
          </FormField>
          <FormField label="2nd Follow-up Date">
            <input type="date" className={inputCls} value={followUpDate2} onChange={e => setFollowUpDate2(e.target.value)} />
          </FormField>
          <FormField label="2nd Follow-up Time">
            <input type="time" className={inputCls} value={followUpTime2} onChange={e => setFollowUpTime2(e.target.value)} />
          </FormField>
          <FormField label="Doctor Name">
            <input className={inputCls} value={doctorName} onChange={e => setDoctorName(e.target.value)} placeholder="Enter doctor name" />
          </FormField>
        </div>
      </div>
    </div>
  );

  // ── PART 2 ────────────────────────────────────────────────────────────────

  const Part2 = () => (
    <div className="space-y-4">
      {/* Medicines Advised */}
      <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/30 rounded-2xl overflow-hidden shadow-lg">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--theme-accent)]/20">
          <div className="flex items-center gap-2">
            <Pill className="w-4 h-4 text-[var(--theme-accent)]" />
            <span className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Medicines Advised</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-lg bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/30 text-[10px] font-bold text-[var(--theme-accent)]">LLM</span>
            <span className="px-2 py-0.5 rounded-lg bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/30 text-[10px] font-bold text-[var(--theme-accent)]">HIS</span>
            <button onClick={addMed}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/30 text-[var(--theme-accent)] text-xs font-bold hover:bg-[var(--theme-accent)]/20 transition-all">
              <Plus size={12} /> Add Medicine
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[var(--theme-bg)] border-b border-[var(--theme-accent)]/20">
                {['Medicine', 'Qty', 'Dosage', 'Dur', 'Unit', 'Site', 'Remarks', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {medicines.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-6 text-center text-sm text-[var(--theme-text-muted)]">
                  No medicines — click <span className="text-[var(--theme-accent)] font-semibold">Add Medicine</span>
                </td></tr>
              )}
              {medicines.map((m, idx) => (
                <tr key={m.id} className={`border-b border-[var(--theme-accent)]/10 hover:bg-[var(--theme-accent)]/5 transition-colors ${idx % 2 === 0 ? 'bg-[var(--theme-bg-secondary)]' : 'bg-[var(--theme-bg)]'}`}>
                  <td className="px-3 py-2.5 min-w-[160px]"><input className={tdInput} value={m.medicine} onChange={e => setMed(m.id, 'medicine', e.target.value)} placeholder="--" /></td>
                  <td className="px-3 py-2.5 w-12 text-center"><input className={`${tdInput} text-center`} value={m.qty} onChange={e => setMed(m.id, 'qty', e.target.value)} placeholder="--" /></td>
                  <td className="px-3 py-2.5 w-16"><input className={tdInput} value={m.dosage} onChange={e => setMed(m.id, 'dosage', e.target.value)} placeholder="--" /></td>
                  <td className="px-3 py-2.5 w-12 text-center"><input className={`${tdInput} text-center`} value={m.dur} onChange={e => setMed(m.id, 'dur', e.target.value)} placeholder="--" /></td>
                  <td className="px-3 py-2.5 w-12">
                    <select className="bg-transparent text-xs text-[var(--theme-text)] outline-none border-b border-[var(--theme-accent)]/25 pb-0.5 cursor-pointer focus:border-[var(--theme-accent)] transition-colors" value={m.unit} onChange={e => setMed(m.id, 'unit', e.target.value)}>
                      <option>D</option><option>W</option><option>M</option>
                    </select>
                  </td>
                  <td className="px-3 py-2.5 w-14"><input className={tdInput} value={m.site} onChange={e => setMed(m.id, 'site', e.target.value)} placeholder="--" /></td>
                  <td className="px-3 py-2.5"><input className={tdInput} value={m.remarks} onChange={e => setMed(m.id, 'remarks', e.target.value)} placeholder="--" /></td>
                  <td className="px-3 py-2.5"><button onClick={() => removeMed(m.id)} className="text-[var(--theme-text-muted)] hover:text-red-400 transition-colors"><X size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Examination Detail — Ophthalmologist style */}
      <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/30 rounded-2xl overflow-hidden shadow-lg">
        <div className="px-5 py-3 border-b border-[var(--theme-accent)]/20 flex items-center gap-2">
          <Eye className="w-4 h-4 text-[var(--theme-accent)]" />
          <span className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Examination Detail</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[var(--theme-accent)]/15">
          {/* Right Eye column */}
          <div>
            <div className="px-5 py-2.5 bg-[var(--theme-accent)]/8 border-b border-[var(--theme-accent)]/20">
              <span className="text-xs font-bold text-[var(--theme-accent)] uppercase tracking-widest">OD — Right Eye</span>
            </div>
            <div className="divide-y divide-[var(--theme-accent)]/10">
              {examRows.map((r) => (
                <div key={r.id + 'R'} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--theme-accent)]/5 transition-colors">
                  <span className="w-36 text-sm text-[var(--theme-text-muted)] flex-shrink-0">{r.examination}</span>
                  <div className="flex items-center gap-1.5 flex-1">
                    <input
                      className={examInput}
                      value={r.right}
                      onChange={e => setExam(r.id, 'right', e.target.value)}
                      placeholder="--"
                    />
                    <span className="text-[var(--theme-text-muted)] text-xs font-bold select-none">--</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Left Eye column */}
          <div>
            <div className="px-5 py-2.5 bg-[var(--theme-accent)]/8 border-b border-[var(--theme-accent)]/20">
              <span className="text-xs font-bold text-[var(--theme-accent)] uppercase tracking-widest">OS — Left Eye</span>
            </div>
            <div className="divide-y divide-[var(--theme-accent)]/10">
              {examRows.map((r) => (
                <div key={r.id + 'L'} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--theme-accent)]/5 transition-colors">
                  <span className="w-36 text-sm text-[var(--theme-text-muted)] flex-shrink-0">{r.examination}</span>
                  <div className="flex items-center gap-1.5 flex-1">
                    <input
                      className={examInput}
                      value={r.left}
                      onChange={e => setExam(r.id, 'left', e.target.value)}
                      placeholder="--"
                    />
                    <span className="text-[var(--theme-text-muted)] text-xs font-bold select-none">--</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Exam Comments + Rest */}
      <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/30 rounded-2xl p-5 shadow-lg grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <FormField label="Examination Comments">
            <textarea rows={2} className={`${inputCls} resize-none`} value={examComments} onChange={e => setExamComments(e.target.value)} />
          </FormField>
        </div>
        <div className="flex flex-col gap-3">
          <FormField label="Given Rest From">
            <input type="date" className={inputCls} value={restFromDate} onChange={e => setRestFromDate(e.target.value)} />
          </FormField>
          <FormField label="Given Rest To">
            <input type="date" className={inputCls} value={restToDate} onChange={e => setRestToDate(e.target.value)} />
          </FormField>
        </div>
      </div>
    </div>
  );

  // ── PART 3 ────────────────────────────────────────────────────────────────

  const glassCols = ['Sph', 'Cyl', 'Axis', 'Prism', 'V/A', 'N.V.'];

  const GlassTable = ({ label, rows, which }: { label: string; rows: GlassPrescRow[]; which: 'right' | 'left' }) => (
    <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/30 rounded-2xl overflow-hidden shadow-lg">
      <div className="px-4 py-2 bg-[var(--theme-accent)]/10 border-b border-[var(--theme-accent)]/20">
        <span className="text-xs font-bold text-[var(--theme-accent)] uppercase tracking-widest">{label}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[var(--theme-bg)] border-b border-[var(--theme-accent)]/20">
              <th className="px-3 py-2 text-left text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest w-16"></th>
              {glassCols.map(c => (
                <th key={c} className="px-2 py-2 text-center text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.label} className={`border-b border-[var(--theme-accent)]/10 ${idx % 2 === 0 ? 'bg-[var(--theme-bg-secondary)]' : 'bg-[var(--theme-bg)]'}`}>
                <td className="px-3 py-1.5 font-bold text-[var(--theme-text)] text-xs">{r.label}</td>
                {(['sph', 'cyl', 'axis', 'prism', 'va', 'nv'] as const).map(f => (
                  <td key={f} className="px-2 py-2.5 text-center">
                    <input
                      className="bg-transparent text-xs text-[var(--theme-text)] outline-none text-center w-14 placeholder-[var(--theme-text-muted)]/60 border-b border-[var(--theme-accent)]/25 pb-0.5 focus:border-[var(--theme-accent)] transition-colors"
                      value={r[f]} onChange={e => setGlass(which, idx, f, e.target.value)}
                      placeholder="--"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const Part3 = () => (
    <div className="space-y-4">
      {/* Investigation Done */}
      <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/30 rounded-2xl overflow-hidden shadow-lg">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--theme-accent)]/20">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-[var(--theme-accent)]" />
            <span className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Investigation Done</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 rounded-xl bg-[var(--theme-accent)] text-white text-xs font-bold hover:opacity-90 transition-opacity">
              Select Lab Investigation
            </button>
            <button onClick={addInvestigation}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/30 text-[var(--theme-accent)] text-xs font-bold hover:bg-[var(--theme-accent)]/20 transition-all">
              <Plus size={12} /> Add Row
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[var(--theme-bg)] border-b border-[var(--theme-accent)]/20">
                {['Head Name', 'Reference Value', 'Result / Observation', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {investigations.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-6 text-center text-sm text-[var(--theme-text-muted)]">
                  No investigations — click <span className="text-[var(--theme-accent)] font-semibold">Add Row</span>
                </td></tr>
              )}
              {investigations.map((r, idx) => (
                <tr key={r.id} className={`border-b border-[var(--theme-accent)]/10 hover:bg-[var(--theme-accent)]/5 transition-colors ${idx % 2 === 0 ? 'bg-[var(--theme-bg-secondary)]' : 'bg-[var(--theme-bg)]'}`}>
                  <td className="px-3 py-3 min-w-[140px]"><input className={tdInput} value={r.headName} onChange={e => setInv(r.id, 'headName', e.target.value)} placeholder="--" /></td>
                  <td className="px-3 py-3 min-w-[140px]"><input className={tdInput} value={r.referenceValue} onChange={e => setInv(r.id, 'referenceValue', e.target.value)} placeholder="--" /></td>
                  <td className="px-3 py-3"><input className={tdInput} value={r.resultObservation} onChange={e => setInv(r.id, 'resultObservation', e.target.value)} placeholder="--" /></td>
                  <td className="px-3 py-3"><button onClick={() => removeInvestigation(r.id)} className="text-[var(--theme-text-muted)] hover:text-red-400 transition-colors"><X size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Camp Detail */}
      <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/30 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Camp Detail (If Any)</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FormField label="Camp Name"><input className={inputCls} value={campName} onChange={e => setCampName(e.target.value)} /></FormField>
          <FormField label="Camp Date"><input type="date" className={inputCls} value={campDate} onChange={e => setCampDate(e.target.value)} /></FormField>
          <FormField label="Camp Place"><input className={inputCls} value={campPlace} onChange={e => setCampPlace(e.target.value)} /></FormField>
          <FormField label="Blindness Date"><input type="date" className={inputCls} value={blindnessDate} onChange={e => setBlindnessDate(e.target.value)} /></FormField>
        </div>
      </div>

      {/* Vision Table */}
      <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/30 rounded-2xl overflow-hidden shadow-lg">
        <div className="px-5 py-3 border-b border-[var(--theme-accent)]/20 flex items-center gap-2">
          <Eye className="w-4 h-4 text-[var(--theme-accent)]" />
          <span className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Vision</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[var(--theme-bg)] border-b border-[var(--theme-accent)]/20">
                <th className="px-3 py-2 text-left text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest w-40">Vision</th>
                <th className="px-3 py-2 text-center text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Dist — RE</th>
                <th className="px-3 py-2 text-center text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Dist — LE</th>
                <th className="px-3 py-2 text-center text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Near — RE</th>
                <th className="px-3 py-2 text-center text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Near — LE</th>
              </tr>
            </thead>
            <tbody>
              {visionGroups.map((g, gIdx) =>
                g.rows.map((r, rIdx) => (
                  <tr key={`${gIdx}-${rIdx}`} className={`border-b border-[var(--theme-accent)]/10 ${gIdx % 2 === 0 ? 'bg-[var(--theme-bg-secondary)]' : 'bg-[var(--theme-bg)]'}`}>
                    <td className="px-3 py-1">
                      {rIdx === 0 && (
                        <span className="text-[11px] font-bold text-[var(--theme-text)]">{g.title}</span>
                      )}
                      <div className="text-[10px] text-[var(--theme-text-muted)]">{r.label}</div>
                    </td>
                    {(['distRight', 'distLeft', 'nearRight', 'nearLeft'] as const).map(f => (
                      <td key={f} className="px-2 py-2.5 text-center">
                        <input
                          className="bg-transparent text-xs text-[var(--theme-text)] outline-none text-center w-14 border-b border-[var(--theme-accent)]/25 pb-0.5 placeholder-[var(--theme-text-muted)]/60 focus:border-[var(--theme-accent)] transition-colors"
                          value={r[f]} onChange={e => setVisionCell(gIdx, rIdx, f, e.target.value)}
                          placeholder="--"
                        />
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Glass Prescriptions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {GlassTable({ label: 'Glass Prescription — Right Eye', rows: glassRight, which: 'right' })}
        {GlassTable({ label: 'Glass Prescription — Left Eye',  rows: glassLeft,  which: 'left'  })}
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] p-6">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/30 flex items-center justify-center text-[var(--theme-text-muted)] hover:text-[var(--theme-accent)] transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="w-10 h-10 rounded-2xl bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/30 flex items-center justify-center">
            <FileText className="w-5 h-5 text-[var(--theme-accent)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--theme-text)] tracking-tight">Patient Discharge Summary</h1>
            <p className="text-[var(--theme-text-muted)] text-[10px] uppercase tracking-widest font-bold">Nursing Station Manager</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleUpdateDischarge}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/30 text-[var(--theme-accent)] font-semibold text-sm hover:bg-[var(--theme-accent)]/20 transition-all"
          >
            Update Discharge
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--theme-accent)] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <Printer size={15} /> Print
          </button>
        </div>
      </div>

      {/* Patient Bar */}
      {PatientBar()}

      {/* Part tabs */}
      <div className="flex items-end gap-1 mb-0">
        {PartTab({ n: 1, label: 'Discharge Summary Part-1' })}
        {PartTab({ n: 2, label: 'Discharge Summary Part-2' })}
        {PartTab({ n: 3, label: 'Discharge Summary Part-3' })}
      </div>

      {/* Part content */}
      <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/30 border-t-0 rounded-b-2xl rounded-tr-2xl p-5 shadow-lg mb-4">
        {activePart === 1 && Part1()}
        {activePart === 2 && Part2()}
        {activePart === 3 && Part3()}
      </div>
    </div>
  );
}
