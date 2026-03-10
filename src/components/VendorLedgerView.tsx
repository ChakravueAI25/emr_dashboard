import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Search, Plus, Download, Printer, Loader2, Building2, Phone, FileText, Calendar } from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';
import { VendorPaymentModal } from './VendorPaymentModal';

interface LedgerTransaction {
  date: string;
  referenceType: string;
  invoiceNumber: string;
  debit: number;
  credit: number;
}

interface VendorLedgerViewProps {
  vendorId: string;
  vendorName?: string;
  onBack?: () => void;
  onNavigate?: (view: string) => void;
}

export function VendorLedgerView({ vendorId, vendorName, onBack, onNavigate }: VendorLedgerViewProps) {
  const [vendor, setVendor] = useState<any>(null);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInvoice, setSearchInvoice] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const fetchData = async () => {
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
  };

  useEffect(() => { fetchData(); }, [vendorId]);

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

  const withBalance = useMemo(() => {
    let bal = 0;
    return filtered.map(t => {
      bal += t.debit - t.credit;
      return { ...t, runningBalance: bal };
    });
  }, [filtered]);

  const totals = useMemo(() => ({
    debit: filtered.reduce((s, t) => s + t.debit, 0),
    credit: filtered.reduce((s, t) => s + t.credit, 0),
  }), [filtered]);

  const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const exportCSV = () => {
    const header = 'Date,Type,Invoice,Debit,Credit,Balance\n';
    const rows = withBalance.map(t =>
      `${t.date},${t.referenceType},${t.invoiceNumber},${t.debit},${t.credit},${t.runningBalance}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(vendorName || vendor?.name || 'vendor').replace(/\s+/g, '_')}_ledger.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const displayName = vendorName || vendor?.name || 'Vendor';

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] p-6 ml-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-xl border border-[var(--theme-accent)]/20 hover:bg-[var(--theme-bg-tertiary)] transition-colors">
              <ArrowLeft className="w-5 h-5 text-[var(--theme-text-muted)]" />
            </button>
          )}
          <div>
            <h1 className="text-3xl font-light tracking-tight">{displayName}</h1>
            <p className="text-[var(--theme-text-muted)] text-sm mt-0.5">Vendor Ledger</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="px-3 py-2 rounded-xl border border-[var(--theme-accent)]/30 text-sm text-[var(--theme-accent)] hover:bg-[var(--theme-accent)]/10 transition-all flex items-center gap-1.5">
            <Download className="w-4 h-4" />Export CSV
          </button>
          <button onClick={() => window.print()} className="px-3 py-2 rounded-xl border border-[var(--theme-accent)]/30 text-sm text-[var(--theme-accent)] hover:bg-[var(--theme-accent)]/10 transition-all flex items-center gap-1.5">
            <Printer className="w-4 h-4" />Print
          </button>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--theme-accent)] to-[var(--theme-accent-hover)] text-[var(--theme-bg)] text-sm font-semibold hover:shadow-lg transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />Add Payment
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[var(--theme-accent)]" /></div>
      ) : (
        <>
          {/* Vendor Info Card */}
          {vendor && (
            <div className="rounded-xl border border-[var(--theme-accent)]/20 bg-[var(--theme-bg-secondary)] p-5 mb-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { icon: Building2, label: 'Contact Person', value: vendor.contactPerson || '—' },
                  { icon: Phone, label: 'Phone', value: vendor.phone || '—' },
                  { icon: FileText, label: 'GST Number', value: vendor.gstNumber || '—' },
                  { icon: Calendar, label: 'Payment Terms', value: vendor.paymentTerms ? `${vendor.paymentTerms} days` : '—' },
                  { icon: null, label: 'Status', value: vendor.status || 'active' },
                ].map((f, i) => (
                  <div key={i}>
                    <span className="text-xs uppercase tracking-wider text-[var(--theme-text-muted)]">{f.label}</span>
                    <p className="text-sm font-medium mt-0.5">{f.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary Bar */}
          <div className="flex items-center gap-6 mb-4 px-1">
            <span className="text-sm text-[var(--theme-text-muted)]">Total Debit: <span className="font-semibold text-red-400">{fmt(totals.debit)}</span></span>
            <span className="text-sm text-[var(--theme-text-muted)]">Total Credit: <span className="font-semibold text-emerald-400">{fmt(totals.credit)}</span></span>
            <span className="text-sm text-[var(--theme-text-muted)]">Balance: <span className="font-semibold text-[var(--theme-text)]">{fmt(totals.debit - totals.credit)}</span></span>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--theme-text-muted)]" />
              <input value={searchInvoice} onChange={e => setSearchInvoice(e.target.value)} placeholder="Search by invoice..." className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-accent)]/20 text-sm text-[var(--theme-text)] outline-none focus:border-[var(--theme-accent)]" />
            </div>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-accent)]/20 text-sm text-[var(--theme-text)] outline-none focus:border-[var(--theme-accent)]" />
            <span className="text-xs text-[var(--theme-text-muted)]">to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-accent)]/20 text-sm text-[var(--theme-text)] outline-none focus:border-[var(--theme-accent)]" />
            <span className="text-xs text-[var(--theme-text-muted)]">{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Ledger Table */}
          <div className="rounded-xl border border-[var(--theme-accent)]/20 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[var(--theme-bg-secondary)] border-b border-[var(--theme-accent)]/10">
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-[var(--theme-text-muted)] font-medium">Date</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-[var(--theme-text-muted)] font-medium">Reference Type</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-[var(--theme-text-muted)] font-medium">Invoice Number</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-[var(--theme-text-muted)] font-medium text-right">Debit (₹)</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-[var(--theme-text-muted)] font-medium text-right">Credit (₹)</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-[var(--theme-text-muted)] font-medium text-right">Running Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--theme-accent)]/10">
                {withBalance.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-[var(--theme-text-muted)]">No transactions found</td></tr>
                ) : withBalance.map((t, i) => (
                  <tr key={i} className="hover:bg-[var(--theme-bg-secondary)]/50 transition-colors">
                    <td className="px-4 py-3 text-sm">{t.date ? new Date(t.date).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        t.referenceType === 'Payment' ? 'bg-emerald-500/15 text-emerald-400' :
                        t.referenceType === 'Return' ? 'bg-amber-500/15 text-amber-400' :
                        'bg-blue-500/15 text-blue-400'
                      }`}>
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
              {withBalance.length > 0 && (
                <tfoot>
                  <tr className="bg-[var(--theme-bg-secondary)] border-t border-[var(--theme-accent)]/20">
                    <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-right">Totals</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold font-mono text-red-400">{fmt(totals.debit)}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold font-mono text-emerald-400">{fmt(totals.credit)}</td>
                    <td className="px-4 py-3 text-sm text-right font-bold font-mono">{fmt(totals.debit - totals.credit)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <VendorPaymentModal
          vendor={{ _id: vendorId, name: displayName }}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => { setShowPaymentModal(false); fetchData(); }}
        />
      )}
    </div>
  );
}
