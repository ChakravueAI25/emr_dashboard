import { useEffect, useState } from 'react';
import { Boxes, Eye, Link2, PackagePlus, ReceiptText } from 'lucide-react';
import { API_ENDPOINTS } from '../../config/api';
import { InventoryDashboardView } from './InventoryDashboardView';
import { InventoryInvoiceView } from './InventoryInvoiceView';
import { InventoryLedgerView } from './InventoryLedgerView';
import { InventoryReportsView } from './InventoryReportsView';
import { InventoryStockView } from './InventoryStockView';
import { InventoryUsageEntryView } from './InventoryUsageEntryView';
import { LensSerialTrackingView } from './LensSerialTrackingView';
import { TabButton, getCurrentInventoryUser } from './inventoryShared';
import type {
  InventoryAnalytics,
  ItemHistoryResponse,
  LedgerRow,
  LensSerialRow,
  LensUsageReportResponse,
  PurchaseReportResponse,
  StockRow,
  UsageReportResponse,
  VendorOption,
} from './inventoryTypes';

type InventoryTab = 'dashboard' | 'invoices' | 'stock' | 'usage' | 'serials' | 'ledger' | 'reports';

const emptyAnalytics: InventoryAnalytics = {
  totalInventoryValue: 0,
  totalPurchaseToday: 0,
  totalPurchaseThisMonth: 0,
  totalPurchaseThisYear: 0,
  totalInventoryItems: 0,
  lowStockItems: 0,
  expiringItems: 0,
  lowStockList: [],
  expiringSoonItems: [],
};

const emptyUsageReport: UsageReportResponse = { rows: [], records: [] };
const emptyPurchaseReport: PurchaseReportResponse = { totalInvoices: 0, totalPurchaseValue: 0, records: [] };
const emptyLensUsageReport: LensUsageReportResponse = { totalUsed: 0, records: [] };

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || 'Request failed');
  }
  return data as T;
}

export function InventoryManagementView() {
  const [activeTab, setActiveTab] = useState<InventoryTab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  const [submittingUsage, setSubmittingUsage] = useState(false);
  const [submittingLensUsage, setSubmittingLensUsage] = useState(false);
  const [processingStock, setProcessingStock] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [analytics, setAnalytics] = useState<InventoryAnalytics>(emptyAnalytics);
  const [stockRows, setStockRows] = useState<StockRow[]>([]);
  const [lensSerialRows, setLensSerialRows] = useState<LensSerialRow[]>([]);
  const [ledgerRows, setLedgerRows] = useState<LedgerRow[]>([]);
  const [vendorOptions, setVendorOptions] = useState<VendorOption[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<ItemHistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [dailyUsage, setDailyUsage] = useState<UsageReportResponse>(emptyUsageReport);
  const [monthlyUsage, setMonthlyUsage] = useState<UsageReportResponse>(emptyUsageReport);
  const [yearlyUsage, setYearlyUsage] = useState<UsageReportResponse>(emptyUsageReport);
  const [purchaseReport, setPurchaseReport] = useState<PurchaseReportResponse>(emptyPurchaseReport);
  const [lensUsageReport, setLensUsageReport] = useState<LensUsageReportResponse>(emptyLensUsageReport);

  useEffect(() => {
    void refreshAll();
  }, []);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(() => setMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [message]);

  const loadBaseData = async () => {
    const [analyticsData, stockData, serialData, ledgerData, vendorsData] = await Promise.all([
      requestJson<{ status: string } & InventoryAnalytics>(API_ENDPOINTS.INVENTORY_MANAGEMENT.ANALYTICS),
      requestJson<{ items: StockRow[] }>(API_ENDPOINTS.INVENTORY_MANAGEMENT.STOCK),
      requestJson<{ items: LensSerialRow[] }>(API_ENDPOINTS.INVENTORY_MANAGEMENT.LENS_SERIALS),
      requestJson<{ items: LedgerRow[] }>(API_ENDPOINTS.INVENTORY_MANAGEMENT.LEDGER),
      requestJson<{ vendors: VendorOption[] }>(API_ENDPOINTS.VENDORS.GET_ALL),
    ]);

    setAnalytics({
      totalInventoryValue: analyticsData.totalInventoryValue || 0,
      totalPurchaseToday: analyticsData.totalPurchaseToday || 0,
      totalPurchaseThisMonth: analyticsData.totalPurchaseThisMonth || 0,
      totalPurchaseThisYear: analyticsData.totalPurchaseThisYear || 0,
      totalInventoryItems: analyticsData.totalInventoryItems || 0,
      lowStockItems: analyticsData.lowStockItems || 0,
      expiringItems: analyticsData.expiringItems || 0,
      lowStockList: analyticsData.lowStockList || [],
      expiringSoonItems: analyticsData.expiringSoonItems || [],
    });
    setStockRows(stockData.items || []);
    setLensSerialRows(serialData.items || []);
    setLedgerRows(ledgerData.items || []);
    setVendorOptions(vendorsData.vendors || []);
  };

  const loadReports = async () => {
    const [daily, monthly, yearly, purchases, lensUsage] = await Promise.all([
      requestJson<UsageReportResponse>(API_ENDPOINTS.INVENTORY_MANAGEMENT.REPORTS_USAGE('daily')),
      requestJson<UsageReportResponse>(API_ENDPOINTS.INVENTORY_MANAGEMENT.REPORTS_USAGE('monthly')),
      requestJson<UsageReportResponse>(API_ENDPOINTS.INVENTORY_MANAGEMENT.REPORTS_USAGE('yearly')),
      requestJson<PurchaseReportResponse>(API_ENDPOINTS.INVENTORY_MANAGEMENT.REPORTS_PURCHASES),
      requestJson<LensUsageReportResponse>(API_ENDPOINTS.INVENTORY_MANAGEMENT.REPORTS_LENS_USAGE),
    ]);

    setDailyUsage({ rows: daily.rows || [], records: daily.records || [] });
    setMonthlyUsage({ rows: monthly.rows || [], records: monthly.records || [] });
    setYearlyUsage({ rows: yearly.rows || [], records: yearly.records || [] });
    setPurchaseReport({ totalInvoices: purchases.totalInvoices || 0, totalPurchaseValue: purchases.totalPurchaseValue || 0, records: purchases.records || [] });
    setLensUsageReport({ totalUsed: lensUsage.totalUsed || 0, records: lensUsage.records || [] });
  };

  const refreshAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadBaseData(), loadReports()]);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Unable to load inventory data.' });
    } finally {
      setLoading(false);
    }
  };

  const currentUser = getCurrentInventoryUser();

  const submitInvoice = async (payload: { vendor: string; invoice_number: string; invoice_value: number; invoice_date: string; items: Array<Record<string, unknown>> }) => {
    setSubmittingInvoice(true);
    try {
      const data = await requestJson<{ invoice?: { invoice_id?: string } }>(API_ENDPOINTS.INVENTORY_MANAGEMENT.INVOICES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, user: currentUser }),
      });
      setMessage({ type: 'success', text: `Inventory invoice ${data.invoice?.invoice_id || ''} saved successfully.` });
      await refreshAll();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save inventory invoice.' });
    } finally {
      setSubmittingInvoice(false);
    }
  };

  const submitConsumableUsage = async (payload: { date: string; department: string; description: string; qty_used: number; remarks: string }) => {
    setSubmittingUsage(true);
    try {
      await requestJson(API_ENDPOINTS.INVENTORY_MANAGEMENT.USAGE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, user: currentUser }),
      });
      setMessage({ type: 'success', text: 'Consumable usage recorded successfully.' });
      await refreshAll();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to record consumable usage.' });
    } finally {
      setSubmittingUsage(false);
    }
  };

  const submitLensUsage = async (payload: { serial_number: string; patient_id: string; patient_name: string; doctor: string; surgery_date: string; eye: 'OD' | 'OS' }) => {
    setSubmittingLensUsage(true);
    try {
      await requestJson(API_ENDPOINTS.INVENTORY_MANAGEMENT.LENS_USAGE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, user: currentUser }),
      });
      setMessage({ type: 'success', text: 'Lens usage linked to surgery successfully.' });
      await refreshAll();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to record lens usage.' });
    } finally {
      setSubmittingLensUsage(false);
    }
  };

  const submitAdjustment = async (payload: { description: string; quantity: number; remarks: string; date: string }) => {
    setProcessingStock(true);
    try {
      await requestJson(API_ENDPOINTS.INVENTORY_MANAGEMENT.ADJUSTMENTS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, user: currentUser }),
      });
      setMessage({ type: 'success', text: 'Stock adjustment applied successfully.' });
      await refreshAll();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to apply stock adjustment.' });
    } finally {
      setProcessingStock(false);
    }
  };

  const submitExpiryRemoval = async (payload: { description: string; quantity: number; date: string }) => {
    setProcessingStock(true);
    try {
      await requestJson(API_ENDPOINTS.INVENTORY_MANAGEMENT.EXPIRY_REMOVAL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, user: currentUser }),
      });
      setMessage({ type: 'success', text: 'Expired stock removed successfully.' });
      await refreshAll();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to remove expired stock.' });
    } finally {
      setProcessingStock(false);
    }
  };

  const openHistory = async (description: string) => {
    setHistoryLoading(true);
    setSelectedHistory(null);
    try {
      const data = await requestJson<ItemHistoryResponse>(API_ENDPOINTS.INVENTORY_MANAGEMENT.STOCK_HISTORY(description));
      setSelectedHistory(data);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to load item history.' });
    } finally {
      setHistoryLoading(false);
    }
  };

  const tabs: Array<{ key: InventoryTab; label: string; icon: typeof Boxes }> = [
    { key: 'dashboard', label: 'Dashboard', icon: Boxes },
    { key: 'invoices', label: 'Invoices', icon: PackagePlus },
    { key: 'stock', label: 'Stock', icon: Boxes },
    { key: 'usage', label: 'Usage Entry', icon: ReceiptText },
    { key: 'serials', label: 'Lens Serials', icon: Link2 },
    { key: 'ledger', label: 'Ledger', icon: Eye },
    { key: 'reports', label: 'Reports', icon: ReceiptText },
  ];

  return (
    <div className="ml-16 min-h-screen bg-[var(--theme-bg)] p-6 text-[var(--theme-text)]">
      {message ? (
        <div className={`fixed right-6 top-6 z-[70] rounded-xl border px-4 py-3 text-sm shadow-lg ${message.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>
          {message.text}
        </div>
      ) : null}

      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light tracking-tight">Inventory Management</h1>
          <p className="mt-1 text-sm text-[var(--theme-text-muted)]">Manage purchases, stock balances, consumable usage, lens serials, expiry risk, and movement reports.</p>
        </div>
        <button onClick={() => void refreshAll()} className="rounded-xl border border-[var(--theme-accent)]/20 px-4 py-2.5 text-sm text-[var(--theme-text)] hover:bg-[var(--theme-bg-secondary)]">
          Refresh Inventory
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        {tabs.map(({ key, label, icon: Icon }) => (
          <div key={key} className="inline-flex items-center gap-2">
            <Icon className="h-4 w-4 text-[var(--theme-accent)]" />
            <TabButton active={activeTab === key} label={label} onClick={() => setActiveTab(key)} />
          </div>
        ))}
      </div>

      {activeTab === 'dashboard' ? <InventoryDashboardView analytics={analytics} onRefresh={() => void refreshAll()} loading={loading} /> : null}
      {activeTab === 'invoices' ? <InventoryInvoiceView vendors={vendorOptions} submitting={submittingInvoice} onSubmit={submitInvoice} /> : null}
      {activeTab === 'stock' ? <InventoryStockView rows={stockRows} selectedHistory={selectedHistory} historyLoading={historyLoading} processing={processingStock} onOpenHistory={openHistory} onAdjustment={submitAdjustment} onExpiryRemoval={submitExpiryRemoval} /> : null}
      {activeTab === 'usage' ? <InventoryUsageEntryView stockRows={stockRows} submitting={submittingUsage} onSubmit={submitConsumableUsage} /> : null}
      {activeTab === 'serials' ? <LensSerialTrackingView rows={lensSerialRows} submitting={submittingLensUsage} onSubmit={submitLensUsage} /> : null}
      {activeTab === 'ledger' ? <InventoryLedgerView rows={ledgerRows} /> : null}
      {activeTab === 'reports' ? <InventoryReportsView dailyUsage={dailyUsage} monthlyUsage={monthlyUsage} yearlyUsage={yearlyUsage} purchases={purchaseReport} lensUsage={lensUsageReport} /> : null}
    </div>
  );
}