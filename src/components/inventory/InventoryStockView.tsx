import { useMemo, useState } from 'react';
import { formatCurrency, formatDate, inputClass, labelClass, SectionCard, tableCellClass, tableHeaderClass } from './inventoryShared';
import type { ItemHistoryResponse, StockRow } from './inventoryTypes';

interface InventoryStockViewProps {
  rows: StockRow[];
  selectedHistory: ItemHistoryResponse | null;
  historyLoading: boolean;
  processing: boolean;
  onOpenHistory: (description: string) => Promise<void>;
  onAdjustment: (payload: { description: string; quantity: number; remarks: string; date: string }) => Promise<void>;
  onExpiryRemoval: (payload: { description: string; quantity: number; date: string }) => Promise<void>;
}

export function InventoryStockView({ rows, selectedHistory, historyLoading, processing, onOpenHistory, onAdjustment, onExpiryRemoval }: InventoryStockViewProps) {
  const [selectedDescription, setSelectedDescription] = useState('');
  const [adjustmentQty, setAdjustmentQty] = useState('0');
  const [adjustmentRemarks, setAdjustmentRemarks] = useState('');
  const [adjustmentDate, setAdjustmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryQty, setExpiryQty] = useState('1');
  const [expiryDate, setExpiryDate] = useState(new Date().toISOString().split('T')[0]);

  const sortedRows = useMemo(() => [...rows].sort((a, b) => a.description.localeCompare(b.description)), [rows]);

  const submitAdjustment = async () => {
    await onAdjustment({
      description: selectedDescription,
      quantity: Number(adjustmentQty || 0),
      remarks: adjustmentRemarks,
      date: adjustmentDate,
    });
    setAdjustmentQty('0');
    setAdjustmentRemarks('');
  };

  const submitExpiryRemoval = async () => {
    await onExpiryRemoval({
      description: selectedDescription,
      quantity: Number(expiryQty || 0),
      date: expiryDate,
    });
    setExpiryQty('1');
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-7 xl:grid-cols-[1.5fr_1fr]">
        <SectionCard title="Current Stock">
          <div className="overflow-x-auto rounded-xl border border-[var(--theme-accent)]/10">
            <table className="w-full min-w-[920px] border-collapse text-base">
              <thead>
                <tr className="bg-[var(--theme-bg)]">
                  {['Description', 'Type', 'Available', 'Unit', 'MRP', 'Min Stock', 'Last Updated', 'Status'].map((header) => (
                    <th key={header} className={tableHeaderClass}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => {
                  const isLow = (row.minimum_stock_level || 0) > 0 && row.available_qty < (row.minimum_stock_level || 0);
                  return (
                    <tr key={row.description} className="border-b border-[var(--theme-accent)]/10 last:border-0">
                      <td className={tableCellClass}>
                        <button onClick={() => void onOpenHistory(row.description)} className="text-left font-medium text-[var(--theme-accent)] hover:underline">
                          {row.description}
                        </button>
                      </td>
                      <td className={tableCellClass}>{row.item_type || 'CONSUMABLE'}</td>
                      <td className={tableCellClass}>{row.available_qty}</td>
                      <td className={tableCellClass}>{row.unit}</td>
                      <td className={tableCellClass}>{formatCurrency(row.mrp || 0)}</td>
                      <td className={tableCellClass}>{row.minimum_stock_level || 0}</td>
                      <td className={tableCellClass}>{formatDate(row.last_updated)}</td>
                      <td className={tableCellClass}>
                        <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${isLow ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          {isLow ? 'LOW' : 'OK'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <div className="space-y-7">
          <SectionCard title="Manual Stock Adjustment">
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Item Description</label>
                <select className={inputClass} value={selectedDescription} onChange={(event) => setSelectedDescription(event.target.value)}>
                  <option value="">Select item</option>
                  {sortedRows.map((row) => (
                    <option key={row.description} value={row.description}>{row.description}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Adjustment Quantity</label>
                <input className={inputClass} type="number" step="0.01" value={adjustmentQty} onChange={(event) => setAdjustmentQty(event.target.value)} placeholder="Use negative to reduce" />
              </div>
              <div>
                <label className={labelClass}>Date</label>
                <input className={inputClass} type="date" value={adjustmentDate} onChange={(event) => setAdjustmentDate(event.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Remarks</label>
                <input className={inputClass} value={adjustmentRemarks} onChange={(event) => setAdjustmentRemarks(event.target.value)} placeholder="Reason for adjustment" />
              </div>
              <button onClick={() => void submitAdjustment()} disabled={processing} className="w-full rounded-xl bg-[var(--theme-accent)] px-5 py-3 text-base font-semibold text-[var(--theme-bg)] disabled:opacity-60">
                {processing ? 'Saving...' : 'Apply Adjustment'}
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Expired Item Removal">
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Item Description</label>
                <select className={inputClass} value={selectedDescription} onChange={(event) => setSelectedDescription(event.target.value)}>
                  <option value="">Select item</option>
                  {sortedRows.map((row) => (
                    <option key={row.description} value={row.description}>{row.description}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Quantity</label>
                <input className={inputClass} type="number" min="0" step="0.01" value={expiryQty} onChange={(event) => setExpiryQty(event.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Date</label>
                <input className={inputClass} type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} />
              </div>
              <button onClick={() => void submitExpiryRemoval()} disabled={processing} className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-base font-semibold text-red-400 disabled:opacity-60">
                {processing ? 'Saving...' : 'Remove Expired Stock'}
              </button>
            </div>
          </SectionCard>
        </div>
      </div>

      {(historyLoading || selectedHistory) ? (
        <SectionCard title="Item History">
          {historyLoading ? (
            <div className="text-sm text-[var(--theme-text-muted)]">Loading history...</div>
          ) : selectedHistory ? (
            <div className="space-y-7">
              <div>
                <h3 className="mb-3 text-base font-semibold text-[var(--theme-text)]">Purchase History</h3>
                <div className="space-y-2">
                  {selectedHistory.purchase_history.length === 0 ? <div className="text-base text-[var(--theme-text-muted)]">No purchase history.</div> : selectedHistory.purchase_history.map((row) => (
                    <div key={`${row.invoice_id}-${row.description}`} className="rounded-xl border border-[var(--theme-accent)]/10 px-5 py-4 text-base">
                      {row.invoice_number} | {row.vendor} | {row.qty + row.free_qty} {row.unit} | {formatDate(row.invoice_date)}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-base font-semibold text-[var(--theme-text)]">Consumable Usage</h3>
                <div className="space-y-2">
                  {selectedHistory.consumable_usage_history.length === 0 ? <div className="text-base text-[var(--theme-text-muted)]">No consumable usage records.</div> : selectedHistory.consumable_usage_history.map((row) => (
                    <div key={row.usage_id || `${row.description}-${row.date}`} className="rounded-xl border border-[var(--theme-accent)]/10 px-5 py-4 text-base">
                      {formatDate(row.date)} | {row.department} | {row.qty_used} used | {row.remarks || '--'}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-base font-semibold text-[var(--theme-text)]">Lens Usage</h3>
                <div className="space-y-2">
                  {selectedHistory.usage_history.length === 0 ? <div className="text-base text-[var(--theme-text-muted)]">No lens usage records.</div> : selectedHistory.usage_history.map((row) => (
                    <div key={row.serial_number} className="rounded-xl border border-[var(--theme-accent)]/10 px-5 py-4 text-base">
                      {row.serial_number} | {row.patient_name} | {row.doctor} | {formatDate(row.surgery_date)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </SectionCard>
      ) : null}
    </div>
  );
}