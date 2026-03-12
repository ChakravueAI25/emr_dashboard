import { useMemo, useState } from 'react';
import { formatDate, inputClass, labelClass, SectionCard, tableCellClass, tableHeaderClass } from './inventoryShared';
import type { LensSerialRow } from './inventoryTypes';

interface LensSerialTrackingViewProps {
  rows: LensSerialRow[];
  submitting: boolean;
  onSubmit: (payload: { serial_number: string; patient_id: string; patient_name: string; doctor: string; surgery_date: string; eye: 'OD' | 'OS' }) => Promise<void>;
}

export function LensSerialTrackingView({ rows, submitting, onSubmit }: LensSerialTrackingViewProps) {
  const [serialNumber, setSerialNumber] = useState('');
  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [doctor, setDoctor] = useState('');
  const [surgeryDate, setSurgeryDate] = useState(new Date().toISOString().split('T')[0]);
  const [eye, setEye] = useState<'OD' | 'OS'>('OD');

  const availableRows = useMemo(() => rows.filter((row) => row.status === 'IN_STOCK'), [rows]);

  const submit = async () => {
    await onSubmit({
      serial_number: serialNumber,
      patient_id: patientId,
      patient_name: patientName,
      doctor,
      surgery_date: surgeryDate,
      eye,
    });
    setSerialNumber('');
    setPatientId('');
    setPatientName('');
    setDoctor('');
    setSurgeryDate(new Date().toISOString().split('T')[0]);
    setEye('OD');
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Link Lens To Surgery">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <div>
            <label className={labelClass}>Serial Number</label>
            <select className={inputClass} value={serialNumber} onChange={(event) => setSerialNumber(event.target.value)}>
              <option value="">Select serial</option>
              {availableRows.map((row) => (
                <option key={row.serial_number} value={row.serial_number}>{row.serial_number} | {row.lens_model}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Patient ID</label>
            <input className={inputClass} value={patientId} onChange={(event) => setPatientId(event.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Patient Name</label>
            <input className={inputClass} value={patientName} onChange={(event) => setPatientName(event.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Doctor</label>
            <input className={inputClass} value={doctor} onChange={(event) => setDoctor(event.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Surgery Date</label>
            <input className={inputClass} type="date" value={surgeryDate} onChange={(event) => setSurgeryDate(event.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Eye</label>
            <select className={inputClass} value={eye} onChange={(event) => setEye(event.target.value as 'OD' | 'OS')}>
              <option value="OD">OD</option>
              <option value="OS">OS</option>
            </select>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <button onClick={() => void submit()} disabled={submitting} className="rounded-xl bg-[var(--theme-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--theme-bg)] disabled:opacity-60">
            {submitting ? 'Linking Lens...' : 'Record Lens Usage'}
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Lens Serial Tracking">
        <div className="overflow-x-auto rounded-xl border border-[var(--theme-accent)]/10">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="bg-[var(--theme-bg)]">
                {['Serial Number', 'Lens Model', 'Status', 'Patient', 'Doctor', 'Eye', 'Surgery Date', 'Expiry'].map((header) => (
                  <th key={header} className={tableHeaderClass}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.serial_number} className="border-b border-[var(--theme-accent)]/10 last:border-0">
                  <td className={tableCellClass}>{row.serial_number}</td>
                  <td className={tableCellClass}>{row.lens_model}</td>
                  <td className={tableCellClass}>
                    <span className={`rounded-full px-2.5 py-1 text-xs ${row.status === 'USED' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className={tableCellClass}>{row.patient_name || '--'}</td>
                  <td className={tableCellClass}>{row.doctor || '--'}</td>
                  <td className={tableCellClass}>{row.eye || '--'}</td>
                  <td className={tableCellClass}>{formatDate(row.surgery_date)}</td>
                  <td className={tableCellClass}>{formatDate(row.expiry_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}