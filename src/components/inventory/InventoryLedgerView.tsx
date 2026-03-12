import { formatDate, SectionCard, tableCellClass, tableHeaderClass } from './inventoryShared';
import type { LedgerRow } from './inventoryTypes';

interface InventoryLedgerViewProps {
  rows: LedgerRow[];
}

export function InventoryLedgerView({ rows }: InventoryLedgerViewProps) {
  return (
    <SectionCard title="Stock Movement Ledger">
      <div className="overflow-x-auto rounded-xl border border-[var(--theme-accent)]/10">
        <table className="w-full min-w-[1080px] border-collapse text-sm">
          <thead>
            <tr className="bg-[var(--theme-bg)]">
              {['Date', 'Description', 'Movement', 'Quantity', 'Previous', 'New', 'Reference', 'User'].map((header) => (
                <th key={header} className={tableHeaderClass}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.reference_id || row.description}-${index}`} className="border-b border-[var(--theme-accent)]/10 last:border-0">
                <td className={tableCellClass}>{formatDate(row.date)}</td>
                <td className={tableCellClass}>{row.description}</td>
                <td className={tableCellClass}>{row.movement_type}</td>
                <td className={`${tableCellClass} ${row.quantity < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{row.quantity}</td>
                <td className={tableCellClass}>{row.previous_balance}</td>
                <td className={tableCellClass}>{row.new_balance}</td>
                <td className={tableCellClass}>{row.reference_id || '--'}</td>
                <td className={tableCellClass}>{row.user || '--'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}