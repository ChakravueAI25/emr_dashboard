import { AlertTriangle, Boxes, IndianRupee, ReceiptText } from 'lucide-react';
import type { InventoryAnalytics } from './inventoryTypes';
import { SectionCard, formatCurrency, formatDate } from './inventoryShared';

interface InventoryDashboardViewProps {
  analytics: InventoryAnalytics;
  onRefresh: () => void;
  loading: boolean;
}

export function InventoryDashboardView({ analytics, onRefresh, loading }: InventoryDashboardViewProps) {
  const cards = [
    { label: 'Total Inventory Value', value: formatCurrency(analytics.totalInventoryValue), icon: IndianRupee },
    { label: 'Purchase Today', value: formatCurrency(analytics.totalPurchaseToday), icon: ReceiptText },
    { label: 'Purchase This Month', value: formatCurrency(analytics.totalPurchaseThisMonth), icon: ReceiptText },
    { label: 'Purchase This Year', value: formatCurrency(analytics.totalPurchaseThisYear), icon: ReceiptText },
    { label: 'Low Stock Items', value: `${analytics.lowStockItems}`, icon: AlertTriangle },
    { label: 'Expiring Items', value: `${analytics.expiringItems}`, icon: Boxes },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-[var(--theme-accent)]/15 bg-[var(--theme-bg-secondary)] p-4">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--theme-text-muted)]">
              <Icon className="h-4 w-4 text-[var(--theme-accent)]" />
              {label}
            </div>
            <div className="text-2xl font-semibold text-[var(--theme-text)]">{loading ? 'Loading...' : value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard title="Low Stock Alerts" action={<button onClick={onRefresh} className="text-xs text-[var(--theme-text-muted)]">Refresh</button>}>
          <div className="space-y-3">
            {analytics.lowStockList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--theme-accent)]/20 px-4 py-5 text-sm text-[var(--theme-text-muted)]">No low stock items right now.</div>
            ) : (
              analytics.lowStockList.map((row) => (
                <div key={row.description} className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                  <div className="font-medium text-[var(--theme-text)]">{row.description}</div>
                  <div className="mt-1 text-sm text-[var(--theme-text-muted)]">
                    Available: {row.available_qty} {row.unit} | Min level: {row.minimum_stock_level || 0}
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="Expiring Soon Items">
          <div className="space-y-3">
            {analytics.expiringSoonItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--theme-accent)]/20 px-4 py-5 text-sm text-[var(--theme-text-muted)]">No items expiring within 60 days.</div>
            ) : (
              analytics.expiringSoonItems.map((row) => (
                <div key={`${row.description}-${row.expiry_date}`} className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                  <div className="font-medium text-[var(--theme-text)]">{row.description}</div>
                  <div className="mt-1 text-sm text-[var(--theme-text-muted)]">
                    Expiry: {formatDate(row.expiry_date)} | Stock: {row.available_qty} {row.unit}
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}