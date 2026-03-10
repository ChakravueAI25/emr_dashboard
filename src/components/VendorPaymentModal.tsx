import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle, CreditCard, Banknote, Smartphone } from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';

interface Invoice {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  date?: string;
}

interface VendorPaymentModalProps {
  vendor: { _id: string; name: string } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function VendorPaymentModal({ vendor, onClose, onSuccess }: VendorPaymentModalProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'bank_transfer' | 'upi'>('cash');
  const [transactionRef, setTransactionRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingInvoices, setFetchingInvoices] = useState(true);
  const [toast, setToast] = useState<{ msg: string; visible: boolean; type: 'success' | 'error' }>({ msg: '', visible: false, type: 'error' });

  useEffect(() => {
    if (!vendor) return;
    (async () => {
      setFetchingInvoices(true);
      try {
        const res = await fetch(API_ENDPOINTS.VENDORS.OUTSTANDING_INVOICES);
        if (!res.ok) throw new Error('Failed to fetch invoices');
        const data = await res.json();
        const vendorInvoices = (data.invoices || []).filter((inv: any) => inv.vendorId === vendor._id);
        setInvoices(vendorInvoices);
      } catch { setInvoices([]); }
      finally { setFetchingInvoices(false); }
    })();
  }, [vendor]);

  const showToast = (msg: string, type: 'success' | 'error' = 'error') => {
    setToast({ msg, visible: true, type });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  };

  const handleSubmit = async () => {
    if (!selectedInvoice) return showToast('Select an invoice');
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) return showToast('Enter a valid amount');

    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.VENDORS.PAY_INVOICE(selectedInvoice), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parsedAmount,
          paymentMode: paymentMode,
          transactionRef: transactionRef || undefined,
          vendorId: vendor?._id,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Payment failed');
      }
      showToast('Payment recorded successfully!', 'success');
      setTimeout(() => { onSuccess(); onClose(); }, 1200);
    } catch (e: any) {
      showToast(e.message || 'Payment failed');
    } finally { setLoading(false); }
  };

  if (!vendor) return null;

  const paymentModes = [
    { value: 'cash' as const, label: 'Cash', icon: Banknote },
    { value: 'bank_transfer' as const, label: 'Bank Transfer', icon: CreditCard },
    { value: 'upi' as const, label: 'UPI', icon: Smartphone },
  ];

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/30 rounded-2xl shadow-2xl p-6 mx-4">
        {/* Toast */}
        {toast.visible && (
          <div className={`absolute top-4 left-4 right-4 z-10 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-300 ${toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[var(--theme-text)]">Record Payment</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-muted)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Vendor Name */}
        <div className="mb-4">
          <label className="block text-xs uppercase tracking-wider text-[var(--theme-text-muted)] mb-1.5">Vendor</label>
          <div className="px-3 py-2.5 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-accent)]/20 text-[var(--theme-text)] text-sm opacity-70">{vendor.name}</div>
        </div>

        {/* Invoice Selection */}
        <div className="mb-4">
          <label className="block text-xs uppercase tracking-wider text-[var(--theme-text-muted)] mb-1.5">Invoice</label>
          {fetchingInvoices ? (
            <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--theme-text-muted)]"><Loader2 className="w-4 h-4 animate-spin" /> Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="px-3 py-2.5 text-sm text-[var(--theme-text-muted)]">No outstanding invoices</div>
          ) : (
            <select
              value={selectedInvoice}
              onChange={e => setSelectedInvoice(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-accent)]/20 text-[var(--theme-text)] text-sm outline-none focus:border-[var(--theme-accent)]"
            >
              <option value="">Select invoice...</option>
              {invoices.map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} — Balance: ₹{(inv.balance ?? (inv.totalAmount - (inv.paidAmount || 0))).toLocaleString('en-IN')}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Amount */}
        <div className="mb-4">
          <label className="block text-xs uppercase tracking-wider text-[var(--theme-text-muted)] mb-1.5">Payment Amount (₹)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2.5 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-accent)]/20 text-[var(--theme-text)] text-sm outline-none focus:border-[var(--theme-accent)]"
          />
        </div>

        {/* Payment Mode */}
        <div className="mb-4">
          <label className="block text-xs uppercase tracking-wider text-[var(--theme-text-muted)] mb-1.5">Payment Mode</label>
          <div className="grid grid-cols-3 gap-2">
            {paymentModes.map(mode => (
              <button
                key={mode.value}
                onClick={() => setPaymentMode(mode.value)}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${paymentMode === mode.value
                  ? 'bg-[var(--theme-accent)]/15 border-[var(--theme-accent)] text-[var(--theme-accent)]'
                  : 'border-[var(--theme-accent)]/20 text-[var(--theme-text-muted)] hover:border-[var(--theme-accent)]/40'
                }`}
              >
                <mode.icon className="w-4 h-4" />
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction Ref */}
        {paymentMode !== 'cash' && (
          <div className="mb-6">
            <label className="block text-xs uppercase tracking-wider text-[var(--theme-text-muted)] mb-1.5">Transaction Reference</label>
            <input
              value={transactionRef}
              onChange={e => setTransactionRef(e.target.value)}
              placeholder="UTR / Cheque No."
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-accent)]/20 text-[var(--theme-text)] text-sm outline-none focus:border-[var(--theme-accent)]"
            />
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || !selectedInvoice || !amount}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[var(--theme-accent)] to-[var(--theme-accent-hover)] text-[var(--theme-bg)] font-semibold text-sm disabled:opacity-40 hover:shadow-lg hover:shadow-[var(--theme-accent)]/20 transition-all flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : 'Record Payment'}
        </button>
      </div>
    </div>
  );
}
