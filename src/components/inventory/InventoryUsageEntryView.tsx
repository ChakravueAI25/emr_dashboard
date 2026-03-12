import { useMemo, useState } from 'react';
import { inputClass, labelClass, SectionCard } from './inventoryShared';
import type { StockRow } from './inventoryTypes';

interface InventoryUsageEntryViewProps {
  stockRows: StockRow[];
  submitting: boolean;
  onSubmit: (payload: { date: string; department: string; description: string; qty_used: number; remarks: string }) => Promise<void>;
}

export function InventoryUsageEntryView({ stockRows, submitting, onSubmit }: InventoryUsageEntryViewProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [department, setDepartment] = useState('OT');
  const [description, setDescription] = useState('');
  const [qtyUsed, setQtyUsed] = useState('1');
  const [remarks, setRemarks] = useState('');

  const consumableRows = useMemo(
    () => stockRows.filter((row) => (row.item_type || 'CONSUMABLE') === 'CONSUMABLE'),
    [stockRows]
  );

  const submit = async () => {
    await onSubmit({
      date,
      department,
      description,
      qty_used: Number(qtyUsed || 0),
      remarks,
    });
    setDescription('');
    setQtyUsed('1');
    setRemarks('');
  };

  return (
    <SectionCard title="Usage Entry">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
        <div>
          <label className={labelClass}>Date</label>
          <input className={inputClass} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Department</label>
          <select className={inputClass} value={department} onChange={(event) => setDepartment(event.target.value)}>
            <option value="OT">OT</option>
            <option value="WARD">Ward</option>
            <option value="OPD">OPD</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Item Description</label>
          <input className={inputClass} list="inventory-consumables" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Consumable item" />
          <datalist id="inventory-consumables">
            {consumableRows.map((row) => (
              <option key={row.description} value={row.description} />
            ))}
          </datalist>
        </div>
        <div>
          <label className={labelClass}>Quantity Used</label>
          <input className={inputClass} type="number" min="0" step="0.01" value={qtyUsed} onChange={(event) => setQtyUsed(event.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Remarks</label>
          <input className={inputClass} value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Procedure / note" />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button onClick={() => void submit()} disabled={submitting} className="rounded-xl bg-[var(--theme-accent)] px-6 py-3 text-base font-semibold text-[var(--theme-bg)] disabled:opacity-60">
          {submitting ? 'Recording Usage...' : 'Record Consumable Usage'}
        </button>
      </div>
    </SectionCard>
  );
}