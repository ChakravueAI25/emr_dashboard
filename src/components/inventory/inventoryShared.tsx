import type { ReactNode } from 'react';
import type { ProductRow } from './inventoryTypes';

export const inputClass = 'w-full min-h-12 rounded-xl border border-[var(--theme-accent)]/20 bg-[var(--theme-bg)] px-4 py-3 text-base text-[var(--theme-text)] placeholder-[var(--theme-text-muted)] focus:border-[var(--theme-accent)] focus:outline-none';
export const labelClass = 'mb-2 block text-sm font-semibold uppercase tracking-wide text-[var(--theme-text-muted)]';
export const cardClass = 'rounded-2xl border border-[var(--theme-accent)]/15 bg-[var(--theme-bg-secondary)]';
export const tableHeaderClass = 'border-b border-[var(--theme-accent)]/10 px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--theme-text-muted)]';
export const tableCellClass = 'px-4 py-4 align-top text-base text-[var(--theme-text)]';

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
    <div className={`${cardClass} p-6 xl:p-7`}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold uppercase tracking-[0.2em] text-[var(--theme-accent)]">{title}</h2>
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
      className={`rounded-xl px-5 py-3 text-base font-medium transition ${
        active
          ? 'bg-[var(--theme-accent)] text-[var(--theme-bg)]'
          : 'border border-[var(--theme-accent)]/15 bg-[var(--theme-bg-secondary)] text-[var(--theme-text)] hover:bg-[var(--theme-bg)]'
      }`}
    >
      {label}
    </button>
  );
}