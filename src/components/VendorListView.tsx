import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Search, Plus, Edit2, Eye, CreditCard, Loader2, Building2, Phone, X, Check } from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';
import { VendorPaymentModal } from './VendorPaymentModal';

interface Vendor {
  _id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  paymentTerms?: number;
  status?: string;
  outstandingBalance?: number;
  createdAt?: string;
}

interface VendorListViewProps {
  onBack?: () => void;
  onNavigate?: (view: string, context?: any) => void;
}

export function VendorListView({ onBack, onNavigate }: VendorListViewProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [paymentVendor, setPaymentVendor] = useState<{ _id: string; name: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.VENDORS.GET_ALL);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setVendors(data.vendors || []);
    } catch { setVendors([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchVendors(); }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const filtered = useMemo(() => {
    if (!search) return vendors;
    const q = search.toLowerCase();
    return vendors.filter(v =>
      v.name.toLowerCase().includes(q) ||
      (v.contactPerson || '').toLowerCase().includes(q) ||
      (v.phone || '').includes(q) ||
      (v.gstNumber || '').toLowerCase().includes(q)
    );
  }, [vendors, search]);

  const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] p-6 ml-16">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[60] px-4 py-3 rounded-xl border text-sm font-medium shadow-lg transition-all ${
          toast.type === 'success' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-red-500/15 border-red-500/30 text-red-400'
        }`}>{toast.message}</div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-xl border border-[var(--theme-accent)]/20 hover:bg-[var(--theme-bg-tertiary)] transition-colors">
              <ArrowLeft className="w-5 h-5 text-[var(--theme-text-muted)]" />
            </button>
          )}
          <div>
            <h1 className="text-3xl font-light tracking-tight">Vendor Master</h1>
            <p className="text-[var(--theme-text-muted)] text-sm mt-0.5">Manage vendors & suppliers</p>
          </div>
        </div>
        <button
          onClick={() => { setEditVendor(null); setShowAddForm(true); }}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--theme-accent)] to-[var(--theme-accent-hover)] text-[var(--theme-bg)] text-sm font-semibold hover:shadow-lg transition-all flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />Add Vendor
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--theme-text-muted)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search vendors by name, contact, phone, GST..."
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
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-[var(--theme-text-muted)] font-medium">Vendor Name</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-[var(--theme-text-muted)] font-medium">Contact Person</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-[var(--theme-text-muted)] font-medium">Phone</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-[var(--theme-text-muted)] font-medium">GST Number</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-[var(--theme-text-muted)] font-medium">Payment Terms</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-[var(--theme-text-muted)] font-medium text-right">Outstanding</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-[var(--theme-text-muted)] font-medium">Status</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-[var(--theme-text-muted)] font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--theme-accent)]/10">
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-[var(--theme-text-muted)]">No vendors found</td></tr>
                ) : filtered.map(v => (
                  <tr key={v._id} className="hover:bg-[var(--theme-bg-secondary)]/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">{v.name}</td>
                    <td className="px-4 py-3 text-sm text-[var(--theme-text-muted)]">{v.contactPerson || '—'}</td>
                    <td className="px-4 py-3 text-sm text-[var(--theme-text-muted)]">{v.phone || '—'}</td>
                    <td className="px-4 py-3 text-sm font-mono text-[var(--theme-text-muted)]">{v.gstNumber || '—'}</td>
                    <td className="px-4 py-3 text-sm text-[var(--theme-text-muted)]">{v.paymentTerms ? `${v.paymentTerms} days` : '—'}</td>
                    <td className="px-4 py-3 text-sm text-right font-mono font-semibold">
                      {v.outstandingBalance != null ? fmt(v.outstandingBalance) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        v.status === 'inactive' ? 'bg-gray-500/15 text-gray-400 border border-gray-500/30' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {v.status === 'inactive' ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onNavigate?.('vendor-ledger', { vendorId: v._id, vendorName: v.name })}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--theme-accent)]/30 text-[var(--theme-accent)] hover:bg-[var(--theme-accent)]/10 transition-all"
                          title="View Ledger"
                        >
                          <Eye className="w-3 h-3 inline mr-1" />Ledger
                        </button>
                        <button
                          onClick={() => { setEditVendor(v); setShowAddForm(true); }}
                          className="p-1.5 rounded-lg border border-[var(--theme-accent)]/20 hover:bg-[var(--theme-bg-tertiary)] transition-colors"
                          title="Edit Vendor"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-[var(--theme-text-muted)]" />
                        </button>
                        <button
                          onClick={() => setPaymentVendor({ _id: v._id, name: v.name })}
                          className="p-1.5 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/10 transition-colors"
                          title="Add Payment"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Vendor Modal */}
      {showAddForm && (
        <VendorFormModal
          vendor={editVendor}
          onClose={() => { setShowAddForm(false); setEditVendor(null); }}
          onSuccess={(msg) => {
            setShowAddForm(false);
            setEditVendor(null);
            setToast({ message: msg, type: 'success' });
            fetchVendors();
          }}
        />
      )}

      {/* Payment Modal */}
      {paymentVendor && (
        <VendorPaymentModal
          vendor={paymentVendor}
          onClose={() => setPaymentVendor(null)}
          onSuccess={() => { setPaymentVendor(null); fetchVendors(); }}
        />
      )}
    </div>
  );
}

/* ===================================
   Vendor Add/Edit Form Modal
   =================================== */

interface VendorFormModalProps {
  vendor?: Vendor | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

function VendorFormModal({ vendor, onClose, onSuccess }: VendorFormModalProps) {
  const isEdit = !!vendor;
  const [form, setForm] = useState({
    name: vendor?.name || '',
    contactPerson: vendor?.contactPerson || '',
    phone: vendor?.phone || '',
    email: vendor?.email || '',
    address: vendor?.address || '',
    gstNumber: vendor?.gstNumber || '',
    paymentTerms: vendor?.paymentTerms?.toString() || '',
  });
  const [saving, setSaving] = useState(false);

  const update = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const body = {
        ...form,
        paymentTerms: form.paymentTerms ? parseInt(form.paymentTerms, 10) : undefined,
      };
      const url = isEdit ? API_ENDPOINTS.VENDORS.UPDATE(vendor!._id) : API_ENDPOINTS.VENDORS.CREATE;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed');
      onSuccess(isEdit ? 'Vendor updated successfully' : 'Vendor created successfully');
    } catch {
      setSaving(false);
    }
  };

  const fields: { key: string; label: string; type?: string; required?: boolean; placeholder?: string }[] = [
    { key: 'name', label: 'Vendor Name', required: true, placeholder: 'e.g. Alcon Laboratories' },
    { key: 'contactPerson', label: 'Contact Person', placeholder: 'e.g. John Doe' },
    { key: 'phone', label: 'Phone', type: 'tel', placeholder: 'e.g. +91-9876543210' },
    { key: 'email', label: 'Email', type: 'email', placeholder: 'e.g. vendor@example.com' },
    { key: 'address', label: 'Address', placeholder: 'Full address' },
    { key: 'gstNumber', label: 'GST Number', placeholder: 'e.g. 22AAAAA0000A1Z5' },
    { key: 'paymentTerms', label: 'Payment Terms (days)', type: 'number', placeholder: 'e.g. 30' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--theme-accent)]/20 bg-[var(--theme-bg-secondary)] shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--theme-accent)]/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[var(--theme-accent)]/20 to-[var(--theme-accent)]/5">
              <Building2 className="w-5 h-5 text-[var(--theme-accent)]" />
            </div>
            <h2 className="text-lg font-semibold">{isEdit ? 'Edit Vendor' : 'Add New Vendor'}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--theme-bg-tertiary)] transition-colors">
            <X className="w-5 h-5 text-[var(--theme-text-muted)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4  max-h-[70vh] overflow-y-auto">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-xs uppercase tracking-wider text-[var(--theme-text-muted)] mb-1.5">{f.label} {f.required && <span className="text-red-400">*</span>}</label>
              <input
                type={f.type || 'text'}
                value={(form as any)[f.key]}
                onChange={e => update(f.key, e.target.value)}
                placeholder={f.placeholder}
                required={f.required}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-accent)]/20 text-sm text-[var(--theme-text)] outline-none focus:border-[var(--theme-accent)] transition-colors placeholder:text-[var(--theme-text-muted)]/50"
              />
            </div>
          ))}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-[var(--theme-accent)]/30 text-sm hover:bg-[var(--theme-bg-tertiary)] transition-colors">Cancel</button>
            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[var(--theme-accent)] to-[var(--theme-accent-hover)] text-[var(--theme-bg)] text-sm font-semibold disabled:opacity-50 hover:shadow-lg transition-all flex items-center gap-1.5"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
