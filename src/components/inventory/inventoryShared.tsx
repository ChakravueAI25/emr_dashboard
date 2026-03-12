import type { ReactNode } from 'react';
import type { ProductRow } from './inventoryTypes';

export const inputClass = 'w-full rounded-lg border border-[var(--theme-accent)]/20 bg-[var(--theme-bg)] px-3 py-2 text-sm text-[var(--theme-text)] placeholder-[var(--theme-text-muted)] focus:border-[var(--theme-accent)] focus:outline-none';
export const labelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--theme-text-muted)]';
export const cardClass = 'rounded-2xl border border-[var(--theme-accent)]/15 bg-[var(--theme-bg-secondary)]';
export const tableHeaderClass = 'border-b border-[var(--theme-accent)]/10 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--theme-text-muted)]';
export const tableCellClass = 'px-3 py-3 align-top text-sm text-[var(--theme-text)]';

export const formatCurrency = (value: number) =>
  `Rs. ${(Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatDate = (value?: string) => {
  if (!value) {
    return '--';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
};

export const getCurrentInventoryUser = () => localStorage.getItem('current_username') || 'Admin';

export const createProductRow = (): ProductRow => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  itemType: 'CONSUMABLE',
  description: '',
  hsn: '',
  qty: '1',
  unit: 'pcs',
  amount: '',
  gst: '5',
  mrp: '',
  freeQty: '0',
  minimumStockLevel: '0',
  expiryDate: '',
  isSerialTracked: false,
  serialNumbersText: '',
});

export function SectionCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className={`${cardClass} p-5`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--theme-accent)]">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

export function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
        active
          ? 'bg-[var(--theme-accent)] text-[var(--theme-bg)]'
          : 'border border-[var(--theme-accent)]/15 bg-[var(--theme-bg-secondary)] text-[var(--theme-text)] hover:bg-[var(--theme-bg)]'
      }`}
    >
      {label}
    </button>
  );
}