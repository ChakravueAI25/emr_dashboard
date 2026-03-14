import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Search, TrendingUp, TrendingDown, DollarSign, Users, ShoppingCart, CreditCard, Eye, Plus, ChevronLeft, ChevronRight, ArrowUpDown, Loader2 } from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';
import { VendorPaymentModal } from './VendorPaymentModal';

type SortField = 'name' | 'totalPurchase' | 'totalPaid' | 'balance' | 'lastPurchaseDate';
type SortDir = 'asc' | 'desc';

interface VendorLedgerEntry {
  vendorId: string;
  vendorName: string;
  totalPurchase: number;
  totalPaid: number;
  balance: number;
  lastPurchaseDate?: string;
}

interface PharmacyFinanceDashboardViewProps {
  onBack?: () => void;
  onNavigate?: (view: string) => void;
}

export function PharmacyFinanceDashboardView({ onBack, onNavigate }: PharmacyFinanceDashboardViewProps) {
  const [ledger, setLedger] = useState<VendorLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('balance');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [paymentVendor, setPaymentVendor] = useState<{ _id: string; name: string } | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const perPage = 10;

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.VENDORS.LEDGER);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setLedger(data.ledger || []);
    } catch { setLedger([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLedger(); }, []);

  // Derived stats
  const stats = useMemo(() => {
    const totalPurchases = ledger.reduce((s, v) => s + v.totalPurchase, 0);
    const totalPayments = ledger.reduce((s, v) => s + v.totalPaid, 0);
    const totalOutstanding = ledger.reduce((s, v) => s + v.balance, 0);
    return { totalPurchases, totalPayments, totalOutstanding, totalVendors: ledger.length };
  }, [ledger]);

  // Sort & filter
  const filtered = useMemo(() => {
    let arr = [...ledger];
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(v => v.vendorName.toLowerCase().includes(q));
    }
    arr.sort((a, b) => {
      const key = sortField === 'name' ? 'vendorName' : sortField;
      const aVal = (a as any)[key] ?? '';
      const bVal = (b as any)[key] ?? '';
      if (typeof aVal === 'number' && typeof bVal === 'number') return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      return sortDir === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });
    return arr;
  }, [ledger, search, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageData = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
    setPage(1);
  };

  const getStatusBadge = (v: VendorLedgerEntry) => {
    if (v.balance <= 0) return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Paid</span>;
    if (v.totalPaid > 0) return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">Partial</span>;
    return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30">Outstanding</span>;
  };

  const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  // If a vendor is selected for the ledger sub-view, delegate to VendorLedgerView
  if (selectedVendorId) {
    const vendor = ledger.find(v => v.vendorId === selectedVendorId);
    return (
      <VendorLedgerViewInline
        vendorId={selectedVendorId}
        vendorName={vendor?.vendorName || ''}
        onBack={() => setSelectedVendorId(null)}
        onAddPayment={() => setPaymentVendor({ _id: selectedVendorId, name: vendor?.vendorName || '' })}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] p-6 ml-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-xl border border-[var(--theme-accent)]/20 hover:bg-[var(--theme-bg-tertiary)] transition-colors">
              <ArrowLeft className="w-5 h-5 text-[var(--theme-text-muted)]" />
            </button>
          )}
          <div>
            <h1 className="text-3xl font-light tracking-tight">Pharmacy Finance</h1>
            <p className="text-[var(--theme-text-muted)] text-sm mt-0.5">Vendor payables & purchase tracking</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate?.('vendor-list')}
            className="px-4 py-2 rounded-xl border border-[var(--theme-accent)]/30 text-[var(--theme-accent)] text-sm font-medium hover:bg-[var(--theme-accent)]/10 transition-all"
          >
            <Users className="w-4 h-4 inline mr-1.5" />Vendor Master
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Purchases', value: fmt(stats.totalPurchases), icon: ShoppingCart, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
          { label: 'Total Payments', value: fmt(stats.totalPayments), icon: CreditCard, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          { label: 'Outstanding Dues', value: fmt(stats.totalOutstanding), icon: DollarSign, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
          { label: 'Total Vendors', value: String(stats.totalVendors), icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
        ].map((card, i) => (
          <div key={i} className={`rounded-xl border ${card.border} ${card.bg} p-5 transition-all hover:shadow-md`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wider text-[var(--theme-text-muted)] font-medium">{card.label}</span>
              <div className={`p-2 rounded-lg bg-[var(--theme-bg)] ${card.color}`}><card.icon className="w-4 h-4" /></div>
            </div>
            <p className="text-2xl font-semibold">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--theme-text-muted)]" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search vendors..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/20 text-sm text-[var(--theme-text)] outline-none focus:border-[var(--theme-accent)] transition-colors"
          />
        </div>
        <span className="text-xs text-[var(--theme-text-muted)]">{filtered.length} vendor{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[var(--theme-accent)]" /></div>
      ) : (
        <div className="rounded-xl border border-[var(--theme-accent)]/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[var(--theme-bg-secondary)] border-b border-[var(--theme-accent)]/10">
                  {([
                    { key: 'name' as SortField, label: 'Vendor Name' },
                    { key: 'totalPurchase' as SortField, label: 'Total Purchase (Debit)' },
                    { key: 'totalPaid' as SortField, label: 'Total Paid (Credit)' },
                    { key: 'balance' as SortField, label: 'Outstanding Balance' },
                    { key: 'lastPurchaseDate' as SortField, label: 'Last Purchase' },
                  ]).map(col => (
                    <th key={col.key} onClick={() => toggleSort(col.key)} className="px-4 py-3 text-xs uppercase tracking-wider text-[var(--theme-text-muted)] font-medium cursor-pointer select-none hover:text-[var(--theme-accent)] transition-colors">
                      <span className="inline-flex items-center gap-1">{col.label} <ArrowUpDown className="w-3 h-3 opacity-40" /></span>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-[var(--theme-text-muted)] font-medium">Status</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-[var(--theme-text-muted)] font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--theme-accent)]/10">
                {pageData.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-[var(--theme-text-muted)]">No vendors found</td></tr>
                ) : pageData.map((v, index) => (
                  <tr key={`${v.vendorId}-${index}`} className="hover:bg-[var(--theme-bg-secondary)]/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">{v.vendorName}</td>
                    <td className="px-4 py-3 text-sm text-red-400 font-mono">{fmt(v.totalPurchase)}</td>
                    <td className="px-4 py-3 text-sm text-emerald-400 font-mono">{fmt(v.totalPaid)}</td>
                    <td className="px-4 py-3 text-sm font-semibold font-mono">{fmt(v.balance)}</td>
                    <td className="px-4 py-3 text-sm text-[var(--theme-text-muted)]">{v.lastPurchaseDate ? new Date(v.lastPurchaseDate).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="px-4 py-3">{getStatusBadge(v)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedVendorId(v.vendorId)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--theme-accent)]/30 text-[var(--theme-accent)] hover:bg-[var(--theme-accent)]/10 transition-all"
                        >
                          <Eye className="w-3 h-3 inline mr-1" />Ledger
                        </button>
                        {v.balance > 0 && (
                          <button
                            onClick={() => setPaymentVendor({ _id: v.vendorId, name: v.vendorName })}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] hover:bg-[var(--theme-accent)]/25 transition-all"
                          >
                            <Plus className="w-3 h-3 inline mr-1" />Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--theme-accent)]/10 bg-[var(--theme-bg-secondary)]">
              <span className="text-xs text-[var(--theme-text-muted)]">Page {page} of {totalPages}</span>
              <div className="flex items-center gap-1">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg border border-[var(--theme-accent)]/20 disabled:opacity-30 hover:bg-[var(--theme-bg-tertiary)] transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg border border-[var(--theme-accent)]/20 disabled:opacity-30 hover:bg-[var(--theme-bg-tertiary)] transition-colors"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {paymentVendor && (
        <VendorPaymentModal
          vendor={paymentVendor}
          onClose={() => setPaymentVendor(null)}
          onSuccess={fetchLedger}
        />
      )}
    </div>
  );
}


/* ==========================================
   Inline Vendor Ledger Sub-View
   ========================================== */

interface VendorLedgerViewInlineProps {
  vendorId: string;
  vendorName: string;
  onBack: () => void;
  onAddPayment: () => void;
}

interface LedgerTransaction {
  date: string;
  referenceType: string;
  invoiceNumber: string;
  debit: number;
  credit: number;
}

function VendorLedgerViewInline({ vendorId, vendorName, onBack, onAddPayment }: VendorLedgerViewInlineProps) {
  const [vendor, setVendor] = useState<any>(null);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInvoice, setSearchInvoice] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [vendorRes, ledgerRes] = await Promise.all([
          fetch(API_ENDPOINTS.VENDORS.GET_ONE(vendorId)),
          fetch(API_ENDPOINTS.VENDORS.LEDGER),
        ]);
        if (vendorRes.ok) {
          const vd = await vendorRes.json();
          setVendor(vd.vendor || vd);
        }
        if (ledgerRes.ok) {
          const ld = await ledgerRes.json();
          const entry = (ld.ledger || []).find((e: any) => e.vendorId === vendorId);
          setTransactions(entry?.transactions || []);
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [vendorId]);

  const filtered = useMemo(() => {
    let txns = [...transactions];
    if (searchInvoice) {
      const q = searchInvoice.toLowerCase();
      txns = txns.filter(t => (t.invoiceNumber || '').toLowerCase().includes(q));
    }
    if (dateFrom) txns = txns.filter(t => t.date >= dateFrom);
    if (dateTo) txns = txns.filter(t => t.date <= dateTo);
    return txns;
  }, [transactions, searchInvoice, dateFrom, dateTo]);

  // Running balance
  const withBalance = useMemo(() => {
    let bal = 0;
    return filtered.map(t => {
      bal += t.debit - t.credit;
      return { ...t, runningBalance: bal };
    });
  }, [filtered]);

  const exportCSV = () => {
    const header = 'Date,Type,Invoice,Debit,Credit,Balance\n';
    const rows = withBalance.map(t =>
      `${t.date},${t.referenceType},${t.invoiceNumber},${t.debit},${t.credit},${t.runningBalance}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${vendorName.replace(/\s+/g, '_')}_ledger.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();
  const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] p-6 ml-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-xl border border-[var(--theme-accent)]/20 hover:bg-[var(--theme-bg-tertiary)] transition-colors">
            <ArrowLeft className="w-5 h-5 text-[var(--theme-text-muted)]" />
          </button>
          <div>
            <h1 className="text-3xl font-light tracking-tight">{vendorName}</h1>
            <p className="text-[var(--theme-text-muted)] text-sm mt-0.5">Vendor Ledger</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="px-3 py-2 rounded-xl border border-[var(--theme-accent)]/30 text-sm text-[var(--theme-accent)] hover:bg-[var(--theme-accent)]/10 transition-all">Export CSV</button>
          <button onClick={handlePrint} className="px-3 py-2 rounded-xl border border-[var(--theme-accent)]/30 text-sm text-[var(--theme-accent)] hover:bg-[var(--theme-accent)]/10 transition-all">Print</button>
          <button onClick={onAddPayment} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--theme-accent)] to-[var(--theme-accent-hover)] text-[var(--theme-bg)] text-sm font-semibold hover:shadow-lg transition-all">
            <Plus className="w-4 h-4 inline mr-1" />Add Payment
          </button>
        </div>
      </div>

      {/* Vendor Info Card */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[var(--theme-accent)]" /></div>
      ) : (
        <>
          {vendor && (
            <div className="rounded-xl border border-[var(--theme-accent)]/20 bg-[var(--theme-bg-secondary)] p-5 mb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Contact Person', value: vendor.contactPerson || '—' },
                { label: 'Phone', value: vendor.phone || '—' },
                { label: 'GST Number', value: vendor.gstNumber || '—' },
                { label: 'Payment Terms', value: vendor.paymentTerms ? `${vendor.paymentTerms} days` : '—' },
                { label: 'Status', value: vendor.status || 'active' },
              ].map((f, i) => (
                <div key={i}>
                  <span className="text-xs uppercase tracking-wider text-[var(--theme-text-muted)]">{f.label}</span>
                  <p className="text-sm font-medium mt-0.5">{f.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--theme-text-muted)]" />
              <input value={searchInvoice} onChange={e => setSearchInvoice(e.target.value)} placeholder="Search invoice..." className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-accent)]/20 text-sm outline-none focus:border-[var(--theme-accent)]" />
            </div>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-accent)]/20 text-sm outline-none focus:border-[var(--theme-accent)] text-[var(--theme-text)]" />
            <span className="text-xs text-[var(--theme-text-muted)]">to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-accent)]/20 text-sm outline-none focus:border-[var(--theme-accent)] text-[var(--theme-text)]" />
          </div>

          {/* Ledger Table */}
          <div className="rounded-xl border border-[var(--theme-accent)]/20 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[var(--theme-bg-secondary)] border-b border-[var(--theme-accent)]/10">
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-[var(--theme-text-muted)] font-medium">Date</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-[var(--theme-text-muted)] font-medium">Type</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-[var(--theme-text-muted)] font-medium">Invoice No.</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-[var(--theme-text-muted)] font-medium text-right">Debit (₹)</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-[var(--theme-text-muted)] font-medium text-right">Credit (₹)</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-[var(--theme-text-muted)] font-medium text-right">Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--theme-accent)]/10">
                {withBalance.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-[var(--theme-text-muted)]">No transactions found</td></tr>
                ) : withBalance.map((t, i) => (
                  <tr key={i} className="hover:bg-[var(--theme-bg-secondary)]/50 transition-colors">
                    <td className="px-4 py-3 text-sm">{t.date ? new Date(t.date).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.referenceType === 'Payment' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/15 text-blue-400'}`}>
                        {t.referenceType || 'Purchase'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">{t.invoiceNumber || '—'}</td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-red-400">{t.debit > 0 ? fmt(t.debit) : '—'}</td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-emerald-400">{t.credit > 0 ? fmt(t.credit) : '—'}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold font-mono">{fmt(t.runningBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
