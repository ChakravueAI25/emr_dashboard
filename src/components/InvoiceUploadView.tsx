import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowLeft, Plus, RotateCcw, X, CreditCard, AlertCircle, ChevronDown, Loader2, CheckCircle2 } from 'lucide-react';
import type { GrnEntry, GrnProduct } from './SummaryOfInvoiceView';
import { API_ENDPOINTS } from '../config/api';

interface Vendor {
  id: string;
  name: string;
  phone?: string;
  gstNumber?: string;
  creditDays?: number;
}

interface Props {
  onBack: () => void;
  onNavigate?: (view: 'grn-history') => void;
  onSubmit?: (entry: GrnEntry) => void;
  createdBy?: string;
}

interface ProductRow {
  id: string;
  product: string;
  category: string;
  stockType: string;
  batch: string;
  expiry: string;
  unitsPerStrip: string;
  strips: string;
  freeStrips: string;
  taxType: string;
  gstPct: string;
  price: string;
  mrp: string;
  salePrice: string;
  hsn: string;
  rackNo: string;
  boxNo: string;
  discType: 'INR' | '%';
  disc: string;
  remarks: string;
}

export function InvoiceUploadView({ onBack, onNavigate, onSubmit, createdBy = 'Staff' }: Props) {
  const ic = 'w-full bg-[var(--theme-bg)] border border-[var(--theme-accent)]/25 rounded-lg px-2 py-1.5 text-xs text-[var(--theme-text)] placeholder-[var(--theme-text-muted)]/55 focus:outline-none focus:border-[var(--theme-accent)] focus:ring-1 focus:ring-[var(--theme-accent)]/25 transition-all duration-200';
  const lc = 'block text-[10px] font-semibold text-[var(--theme-text-muted)] mb-1 uppercase tracking-wide';
  const card = 'bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/15 rounded-2xl p-5';

  // Invoice header
  const [invoiceValue, setInvoiceValue] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);

  // Summary
  const [comments, setComments] = useState('');
  const [summaryDiscType, setSummaryDiscType] = useState<'%' | 'INR'>('%');
  const [summaryDiscPct, setSummaryDiscPct] = useState('');
  const [summaryDiscINR, setSummaryDiscINR] = useState('');
  const [charges, setCharges] = useState('');
  const [totalReceived, setTotalReceived] = useState('');

  // Vendor dropdown state
  const [vendorList, setVendorList] = useState<Vendor[]>([]);
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const vendorDropdownRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch vendors on mount
  useEffect(() => {
    fetch(API_ENDPOINTS.VENDORS.GET_ALL)
      .then(r => r.json())
      .then(data => {
        if (data.vendors) setVendorList(data.vendors);
      })
      .catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (vendorDropdownRef.current && !vendorDropdownRef.current.contains(e.target as Node)) {
        setVendorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Inline rows – each row is either 'draft' (being filled) or 'saved'
  const emptyDraft = (): ProductRow => ({
    id: Date.now().toString() + Math.random(),
    product: '', category: '', stockType: 'Purchased (Debit)', batch: '', expiry: '',
    unitsPerStrip: '', strips: '', freeStrips: '', taxType: 'GST',
    gstPct: '', price: '', mrp: '', salePrice: '', hsn: '',
    rackNo: '', boxNo: '', discType: '%', disc: '', remarks: '',
  });

  const [rows, setRows] = useState<(ProductRow & { saved: boolean })[]>([{ ...emptyDraft(), saved: false }]);
  const draftRef = useRef<HTMLDivElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Toast notification
  const [toast, setToast] = useState<{ msg: string; visible: boolean; type: 'error' | 'success' }>({ msg: '', visible: false, type: 'error' });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((msg: string, type: 'error' | 'success' = 'error') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, visible: true, type });
    toastTimer.current = setTimeout(() => setToast({ msg: '', visible: false, type: 'error' }), 4000);
    if (type === 'error') {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 30);
    }
  }, []);

  const updateRow = (id: string, field: keyof ProductRow, value: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleAdd = (id: string) => {
    setRows(prev => {
      const target = prev.find(r => r.id === id);
      if (!target || !target.product || target.product.length < 3) return prev;
      return [
        ...prev.map(r => r.id === id ? { ...r, saved: true } : r),
        { ...emptyDraft(), saved: false },
      ];
    });
    setTimeout(() => draftRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  };

  const handleReset = (id: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...emptyDraft(), id, saved: false } : r));
  };

  const removeRow = (id: string) => {
    setRows(prev => {
      const next = prev.filter(r => r.id !== id);
      return next.length === 0 ? [{ ...emptyDraft(), saved: false }] : next;
    });
  };

  const subTotal = rows.filter(r => r.saved).reduce((acc, r) =>
    acc + (parseFloat(r.price || '0') * parseFloat(r.strips || '0')), 0);
  const gstTotal = rows.filter(r => r.saved).reduce((acc, r) => {
    const base = parseFloat(r.price || '0') * parseFloat(r.strips || '0');
    const gstPct = parseFloat(r.gstPct) || 0; // '5%' → 5, '18%' → 18
    return acc + (base * gstPct / 100);
  }, 0);
  const discountAmt = summaryDiscType === '%'
    ? subTotal * (parseFloat(summaryDiscPct || '0') / 100)
    : parseFloat(summaryDiscINR || '0');
  const total = subTotal - discountAmt + gstTotal;
  const roundOff = Math.round(total) - total;
  const netValue = total + roundOff;
  const savedRows = rows.filter(r => r.saved);
  const isCreditInvoice = savedRows.length > 0 && savedRows.every(r => r.stockType === 'Purchased (Credit)');

  // small reusable input cell
  const Cell = ({ row, field, type = 'text', placeholder = '' }: {
    row: ProductRow & { saved: boolean }; field: keyof ProductRow; type?: string; placeholder?: string;
  }) => (
    <input
      type={type}
      className={ic + (row.saved ? ' opacity-70 cursor-default' : '')}
      value={String(row[field])}
      onChange={e => !row.saved && updateRow(row.id, field, e.target.value)}
      placeholder={placeholder}
      readOnly={row.saved}
    />
  );

  const SelectCell = ({ row, field, options }: {
    row: ProductRow & { saved: boolean }; field: keyof ProductRow; options: string[];
  }) => (
    <select
      className={ic + ' cursor-pointer' + (row.saved ? ' opacity-70 cursor-default' : '')}
      value={String(row[field])}
      onChange={e => !row.saved && updateRow(row.id, field, e.target.value)}
      disabled={row.saved}
    >
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[var(--theme-bg)]">

      {/* ── Page Header ── */}
      <div ref={toastRef} className="shrink-0 border-b border-[var(--theme-accent)]/15">
        <div className="flex items-center gap-4 px-6 py-4">
          <button
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/20 hover:bg-[var(--theme-bg-tertiary)] transition-all"
          >
            <ArrowLeft size={18} className="text-[var(--theme-text-muted)]" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[var(--theme-text)]">Upload Invoice</h1>
            <p className="text-xs text-[var(--theme-text-muted)] mt-0.5">Add stock via purchase invoice entry</p>
          </div>
          {/* Inline toast — beside the header title */}
          <div
            className={`flex items-start gap-2.5 px-4 py-2.5 rounded-xl border text-sm max-w-sm transition-all duration-300 ${
              toast.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-950/90 text-emerald-200'
                : 'border-red-500/40 bg-red-950/90 text-red-200'
            } ${
              toast.visible ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
            }`}
          >
            {toast.type === 'success'
              ? <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 shrink-0" />
              : <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
            }
            <span className="leading-snug flex-1 text-xs">{toast.msg}</span>
            <button onClick={() => setToast({ msg: '', visible: false, type: 'error' })} className={`${toast.type === 'success' ? 'text-emerald-400 hover:text-emerald-200' : 'text-red-400 hover:text-red-200'} ml-1 shrink-0`}>
              <X size={13} />
            </button>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

        {/* ── Section 1: Invoice Header ── */}
        <div className={card}>
          <p className="text-xs font-semibold text-[var(--theme-accent)] uppercase tracking-widest mb-4">Invoice Details</p>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className={lc}>Invoice Value <span className="text-red-400">*</span></label>
              <input className={ic} type="number" value={invoiceValue} onChange={e => setInvoiceValue(e.target.value)} placeholder="Invoice Value" />
            </div>
            <div ref={vendorDropdownRef} className="relative">
              <label className={lc}>Vendor Name <span className="text-red-400">*</span></label>
              <div className="relative">
                <input
                  className={ic + ' pr-8'}
                  value={vendorName}
                  onChange={e => { setVendorName(e.target.value); setSelectedVendorId(''); setVendorDropdownOpen(true); }}
                  onFocus={() => setVendorDropdownOpen(true)}
                  placeholder="Select or type vendor"
                />
                <button
                  type="button"
                  onClick={() => setVendorDropdownOpen(p => !p)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)]"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
              {vendorDropdownOpen && vendorList.length > 0 && (
                <div className="absolute z-50 mt-1 w-full max-h-40 overflow-y-auto bg-[var(--theme-bg)] border border-[var(--theme-accent)]/25 rounded-lg shadow-lg">
                  {vendorList
                    .filter(v => !vendorName || v.name.toLowerCase().includes(vendorName.toLowerCase()))
                    .map(v => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => { setVendorName(v.name); setSelectedVendorId(v.id); setVendorDropdownOpen(false); }}
                        className="w-full text-left px-3 py-2 text-xs text-[var(--theme-text)] hover:bg-[var(--theme-accent)]/10 transition-colors"
                      >
                        {v.name}{v.phone ? ` — ${v.phone}` : ''}
                      </button>
                    ))}
                </div>
              )}
            </div>
            <div>
              <label className={lc}>Invoice Number <span className="text-red-400">*</span></label>
              <input className={ic} value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="Invoice Number" />
            </div>
            <div>
              <label className={lc}>Invoice Date <span className="text-red-400">*</span></label>
              <input type="date" className={ic} value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
            </div>
          </div>
        </div>

        {/* ── Section 2: Product Entry ── */}
        <div className={card}>
          <p className="text-xs font-semibold text-[var(--theme-accent)] uppercase tracking-widest mb-5">Product Entry</p>

          {/* ── Saved rows table (grows vertically) ── */}
          {rows.some(r => r.saved) && (
            <div className="overflow-x-auto mb-6 rounded-xl border border-[var(--theme-accent)]/15">
              <table className="w-full min-w-[1100px] text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--theme-accent)]/20" style={{ background: 'color-mix(in srgb, var(--theme-accent) 8%, transparent)' }}>
                    {['#', 'Category', 'Product / Code', 'Stock Type', 'Batch', 'Expiry', 'Units', 'Strips', 'Free', 'GST%', 'Price', 'MRP', 'Sale Price', 'HSN', 'Rack', 'Box', 'Disc', 'Remarks', ''].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.filter(r => r.saved).map((row, idx) => (
                    <tr key={row.id} className="border-b border-[var(--theme-accent)]/8 hover:bg-[var(--theme-accent)]/5 transition-colors">
                      <td className="px-3 py-2.5 text-[var(--theme-text-muted)]">{idx + 1}</td>
                      <td className="px-3 py-2.5 text-[var(--theme-text-muted)] whitespace-nowrap">{row.category || '—'}</td>
                      <td className="px-3 py-2.5 text-[var(--theme-text)] font-medium max-w-[140px] truncate">{row.product}</td>
                      <td className="px-3 py-2.5 text-[var(--theme-text-muted)] whitespace-nowrap">{row.stockType}</td>
                      <td className="px-3 py-2.5 text-[var(--theme-text-muted)]">{row.batch}</td>
                      <td className="px-3 py-2.5 text-[var(--theme-text-muted)]">{row.expiry}</td>
                      <td className="px-3 py-2.5 text-[var(--theme-text-muted)] text-center">{row.unitsPerStrip}</td>
                      <td className="px-3 py-2.5 text-[var(--theme-text-muted)] text-center">{row.strips}</td>
                      <td className="px-3 py-2.5 text-[var(--theme-text-muted)] text-center">{row.freeStrips || '—'}</td>
                      <td className="px-3 py-2.5 text-[var(--theme-text-muted)]">{row.gstPct || '—'}</td>
                      <td className="px-3 py-2.5 text-[var(--theme-text-muted)]">{row.price}</td>
                      <td className="px-3 py-2.5 text-[var(--theme-text-muted)]">{row.mrp}</td>
                      <td className="px-3 py-2.5 text-[var(--theme-text-muted)]">{row.salePrice || '—'}</td>
                      <td className="px-3 py-2.5 text-[var(--theme-text-muted)]">{row.hsn}</td>
                      <td className="px-3 py-2.5 text-[var(--theme-text-muted)]">{row.rackNo || '—'}</td>
                      <td className="px-3 py-2.5 text-[var(--theme-text-muted)]">{row.boxNo || '—'}</td>
                      <td className="px-3 py-2.5 text-[var(--theme-text-muted)] whitespace-nowrap">
                        {row.disc ? `${row.discType === 'INR' ? '₹' : ''}${row.disc}${row.discType === '%' ? '%' : ''}` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--theme-text-muted)] max-w-[100px] truncate">{row.remarks || '—'}</td>
                      <td className="px-3 py-2.5">
                        <button onClick={() => removeRow(row.id)} className="text-red-400 hover:text-red-300 transition-colors">
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Draft entry form – breathable 2-row layout ── */}
          {rows.filter(r => !r.saved).map(row => (
            <div key={row.id} ref={draftRef} className="space-y-5">

              {/* Form Row 1: 10 fields */}
              <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr' }}>
                <div>
                  <label className={lc}>Product / Product Code <span className="text-red-400">*</span></label>
                  <input className={ic} value={row.product} onChange={e => updateRow(row.id, 'product', e.target.value)} placeholder="Product / ProductCode" />
                  {row.product.length > 0 && row.product.length < 3 && (
                    <p className="text-[10px] text-red-400 mt-1">* Min 3 Letters Required</p>
                  )}
                </div>
                <div>
                  <label className={lc}>Category <span className="text-red-400">*</span></label>
                  <select className={ic + ' cursor-pointer'} value={row.category} onChange={e => updateRow(row.id, 'category', e.target.value)}>
                    <option value="">Select</option>
                    {['Drops', 'Tablet', 'Capsules', 'Ointment', 'Injection', 'Others', 'Surgical'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lc}>Stock Type</label>
                  <select className={ic + ' cursor-pointer'} value={row.stockType} onChange={e => updateRow(row.id, 'stockType', e.target.value)}>
                    {['Purchased (Debit)', 'Purchased (Credit)'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lc}>Batch <span className="text-red-400">*</span></label>
                  <input className={ic} value={row.batch} onChange={e => updateRow(row.id, 'batch', e.target.value)} placeholder="Batch" />
                </div>
                <div>
                  <label className={lc}>Expiry <span className="text-red-400">*</span></label>
                  <input className={ic} value={row.expiry} onChange={e => updateRow(row.id, 'expiry', e.target.value)} placeholder="MM/YYYY" />
                </div>
                <div>
                  <label className={lc}>Units / Strip <span className="text-red-400">*</span></label>
                  <input className={ic} type="number" value={row.unitsPerStrip} onChange={e => updateRow(row.id, 'unitsPerStrip', e.target.value)} placeholder="Units/Strip" />
                </div>
                <div>
                  <label className={lc}>No. Of Strips (Qty) <span className="text-red-400">*</span></label>
                  <input className={ic} type="number" value={row.strips} onChange={e => updateRow(row.id, 'strips', e.target.value)} placeholder="Strips" />
                </div>
                <div>
                  <label className={lc}>Free Strips (Qty)</label>
                  <input className={ic} type="number" value={row.freeStrips} onChange={e => updateRow(row.id, 'freeStrips', e.target.value)} placeholder="Free Strips" />
                </div>
                <div>
                  <label className={lc}>Tax Type <span className="text-red-400">*</span></label>
                  <select className={ic + ' cursor-pointer'} value={row.taxType} onChange={e => updateRow(row.id, 'taxType', e.target.value)}>
                    <option>GST</option>
                  </select>
                </div>
                <div>
                  <label className={lc}>GST Total% <span className="text-red-400">*</span></label>
                  <select className={ic + ' cursor-pointer'} value={row.gstPct} onChange={e => updateRow(row.id, 'gstPct', e.target.value)}>
                    <option value="">Select</option>
                    {['5%', '18%'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              {/* Form Row 2: Price, MRP, Sale, HSN, Rack, Box, Disc, Remarks + buttons */}
              <div className="grid gap-4 items-end" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 1.6fr 2fr auto' }}>
                <div>
                  <label className={lc}>Price / Strip <span className="text-red-400">*</span></label>
                  <input className={ic} type="number" value={row.price} onChange={e => updateRow(row.id, 'price', e.target.value)} placeholder="Price" />
                </div>
                <div>
                  <label className={lc}>MRP / Strip <span className="text-red-400">*</span></label>
                  <input className={ic} type="number" value={row.mrp} onChange={e => updateRow(row.id, 'mrp', e.target.value)} placeholder="MRP" />
                </div>
                <div>
                  <label className={lc}>Sale Price</label>
                  <input className={ic} type="number" value={row.salePrice} onChange={e => updateRow(row.id, 'salePrice', e.target.value)} placeholder="Sale Price" />
                </div>
                <div>
                  <label className={lc}>HSN Code <span className="text-red-400">*</span></label>
                  <input className={ic} value={row.hsn} onChange={e => updateRow(row.id, 'hsn', e.target.value)} placeholder="HSN Code" />
                </div>
                <div>
                  <label className={lc}>Rack No</label>
                  <input className={ic} value={row.rackNo} onChange={e => updateRow(row.id, 'rackNo', e.target.value)} placeholder="Rack No" />
                </div>
                <div>
                  <label className={lc}>Box No</label>
                  <input className={ic} value={row.boxNo} onChange={e => updateRow(row.id, 'boxNo', e.target.value)} placeholder="Box No" />
                </div>
                <div>
                  <label className={lc}>Disc (In)</label>
                  <div className="flex gap-1.5 items-center">
                    <div className="flex rounded-lg border border-[var(--theme-accent)]/25 overflow-hidden shrink-0">
                      {(['INR', '%'] as const).map(val => (
                        <button
                          key={val}
                          onClick={() => updateRow(row.id, 'discType', val)}
                          className={`px-2.5 py-1.5 text-[10px] font-bold transition-all ${
                            row.discType === val
                              ? 'bg-[var(--theme-accent)] text-[var(--theme-bg)]'
                              : 'bg-[var(--theme-bg)] text-[var(--theme-text-muted)] hover:bg-[var(--theme-accent)]/10'
                          }`}
                        >{val}</button>
                      ))}
                    </div>
                    <input className={ic} type="number" value={row.disc} onChange={e => updateRow(row.id, 'disc', e.target.value)} placeholder="%" />
                  </div>
                </div>
                <div>
                  <label className={lc}>Remarks</label>
                  <input className={ic} value={row.remarks} onChange={e => updateRow(row.id, 'remarks', e.target.value)} placeholder="Enter Remarks" />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAdd(row.id)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[var(--theme-accent)] text-[var(--theme-bg)] rounded-lg text-xs font-bold hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    <Plus size={13} /> Add
                  </button>
                  <button
                    onClick={() => handleReset(row.id)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[var(--theme-bg)] border border-[var(--theme-accent)]/25 text-[var(--theme-text-muted)] rounded-lg text-xs hover:bg-[var(--theme-accent)]/10 transition-colors"
                  >
                    <RotateCcw size={13} /> Reset
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>

        {/* ── Section 3: Comments + Summary ── */}
        <div className="grid grid-cols-3 gap-4">
          {/* Comments */}
          <div className={card + ' col-span-2'}>
            <label className={lc}>Comments</label>
            <textarea
              rows={6}
              className={`${ic} resize-none placeholder-[var(--theme-text-muted)]/55 mt-1 text-sm`}
              value={comments}
              onChange={e => setComments(e.target.value)}
              placeholder="Enter Comments"
            />
          </div>

          {/* Summary Panel */}
          <div className={card + ' space-y-0 divide-y divide-[var(--theme-accent)]/10'}>
            <div className="flex justify-between items-center py-3 text-sm">
              <span className="text-[var(--theme-text-muted)] font-medium">Sub Total</span>
              <span className="text-[var(--theme-text)] font-semibold">{subTotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center py-3 text-sm">
              <span className="text-[var(--theme-text-muted)] font-medium">GST Amount</span>
              <span className="text-emerald-400 font-semibold">{gstTotal.toFixed(2)}</span>
            </div>

            {/* Discount */}
            <div className="py-3">
              <span className="text-[var(--theme-text-muted)] font-medium text-sm">Discount</span>
              <div className="flex items-center gap-2 mt-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="sdtype" checked={summaryDiscType === '%'}
                    onChange={() => setSummaryDiscType('%')}
                    className="accent-[var(--theme-accent)] w-3.5 h-3.5" />
                  <span className="text-xs text-[var(--theme-text-muted)]">%</span>
                </label>
                <input
                  className="w-20 bg-[var(--theme-bg)] border border-[var(--theme-accent)]/25 rounded-lg px-2 py-1.5 text-xs text-[var(--theme-text)] focus:outline-none focus:border-[var(--theme-accent)] transition-all disabled:opacity-40"
                  value={summaryDiscPct} onChange={e => setSummaryDiscPct(e.target.value)}
                  placeholder="%" disabled={summaryDiscType !== '%'} type="number"
                />
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="sdtype" checked={summaryDiscType === 'INR'}
                    onChange={() => setSummaryDiscType('INR')}
                    className="accent-[var(--theme-accent)] w-3.5 h-3.5" />
                  <span className="text-xs text-[var(--theme-text-muted)]">INR</span>
                </label>
                <input
                  className="w-20 bg-[var(--theme-bg)] border border-[var(--theme-accent)]/25 rounded-lg px-2 py-1.5 text-xs text-[var(--theme-text)] focus:outline-none focus:border-[var(--theme-accent)] transition-all disabled:opacity-40"
                  value={summaryDiscINR} onChange={e => setSummaryDiscINR(e.target.value)}
                  placeholder="INR" disabled={summaryDiscType !== 'INR'} type="number"
                />
              </div>
            </div>

            <div className="flex justify-between items-center py-3 text-sm">
              <span className="text-[var(--theme-text-muted)] font-medium">Total</span>
              <span className="text-[var(--theme-text)] font-semibold">{total.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center gap-3 py-3 text-sm">
              <span className="text-[var(--theme-text-muted)] font-medium shrink-0">Charges</span>
              <select
                className="flex-1 bg-[var(--theme-bg)] border border-[var(--theme-accent)]/25 rounded-lg px-2 py-1.5 text-xs text-[var(--theme-text)] focus:outline-none focus:border-[var(--theme-accent)] transition-all cursor-pointer"
                value={charges} onChange={e => setCharges(e.target.value)}
              >
                <option value="">Select</option>
                <option>Handling</option>
                <option>Shipping</option>
                <option>Other</option>
              </select>
            </div>

            <div className="flex justify-between items-center py-3 text-sm">
              <span className="text-[var(--theme-text-muted)] font-medium">Round Off</span>
              <span className="text-[var(--theme-text)] font-semibold">{roundOff.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center py-3 text-sm">
              <span className="text-[var(--theme-text-muted)] font-medium">Net Value</span>
              <span className="text-[var(--theme-accent)] font-bold text-base">{netValue.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center py-3 text-sm">
              <span className="text-[var(--theme-text-muted)] font-medium">Payment</span>
              <button className="flex items-center gap-1.5 px-4 py-1.5 bg-[var(--theme-accent)] text-[var(--theme-bg)] rounded-lg text-xs font-bold hover:opacity-90 transition-opacity">
                <CreditCard size={13} /> Pay
              </button>
            </div>

            <div className="flex justify-between items-center py-3 text-sm">
              <span className="text-[var(--theme-text-muted)] font-medium">Total Received</span>
              <input
                type="number"
                value={isCreditInvoice ? netValue.toFixed(2) : totalReceived}
                onChange={e => setTotalReceived(e.target.value)}
                placeholder="0.00"
                disabled={isCreditInvoice}
                className="w-32 bg-[var(--theme-bg)] border border-[var(--theme-accent)]/25 rounded-lg px-2 py-1.5 text-sm text-right text-[var(--theme-text)] font-semibold focus:outline-none focus:border-[var(--theme-accent)] transition-all disabled:opacity-70"
              />
            </div>
          </div>
        </div>

        {/* ── Footer Actions ── */}
        <div className="flex justify-end gap-3 pb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-6 py-2.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-xl text-sm font-semibold hover:bg-red-500/20 transition-all"
          >
            <X size={16} /> Cancel
          </button>
          <button
            onClick={() => {
              // 1. Validate mandatory invoice detail fields
              if (!invoiceValue.trim()) { showToast('Invoice Value is required.'); return; }
              if (!vendorName.trim())   { showToast('Vendor Name is required.'); return; }
              if (!invoiceNumber.trim()){ showToast('Invoice Number is required.'); return; }
              if (!invoiceDate)         { showToast('Invoice Date is required.'); return; }

              // 2. At least one saved product row
              const savedRows = rows.filter(r => r.saved);
              if (savedRows.length === 0) { showToast('Please add at least one medicine/product before saving the GRN.'); return; }

              // 3. Invoice value must equal computed net value
              const invVal = parseFloat(invoiceValue) || 0;
              if (Math.abs(invVal - netValue) > 0.01) {
                showToast(`Invoice Value (${invVal.toFixed(2)}) does not match Net Value (${netValue.toFixed(2)}). Not all medicines may have been entered.`);
                return;
              }
              const allRowsCredit = savedRows.every(r => r.stockType === 'Purchased (Credit)');
              const allRowsDebit = savedRows.every(r => r.stockType === 'Purchased (Debit)');
              const purchaseType = allRowsCredit ? 'credit' : 'debit';
              const effectivePaidAmount = purchaseType === 'credit'
                ? netValue
                : (parseFloat(totalReceived) || 0);

              const products: GrnProduct[] = savedRows.map((r, idx) => {
                const units = parseFloat(r.unitsPerStrip) || 1;
                const strips = parseFloat(r.strips) || 0;
                const price = parseFloat(r.price) || 0;
                const mrp = parseFloat(r.mrp) || 0;
                const saleP = parseFloat(r.salePrice) || 0;
                const gstNum = parseFloat(r.gstPct) || 0;
                const discNum = parseFloat(r.disc) || 0;
                const discStr = r.discType === '%' ? `(${discNum.toFixed(2)}%)` : `(₹${discNum.toFixed(2)})`;
                // Convert expiry from "MM/YYYY" to "YYYY-MM" for backend storage
                let expiryFormatted = r.expiry;
                const expiryMatch = r.expiry.match(/^(\d{2})\/(\d{4})$/);
                if (expiryMatch) {
                  expiryFormatted = `${expiryMatch[2]}-${expiryMatch[1]}`;
                }
                return {
                  sno: idx + 1,
                  category: r.category,
                  productCode: r.product,
                  product: r.product,
                  stockType: r.stockType,
                  batch: r.batch,
                  gst: gstNum,
                  discount: discStr,
                  expiry: expiryFormatted,
                  hsnCode: r.hsn,
                  unitsPerStrip: units,
                  strips: `(${strips}+${parseFloat(r.freeStrips) || 0})`,
                  freeStrips: r.freeStrips,
                  pricePerStrip: price,
                  mrpPerStrip: mrp,
                  salePrice: saleP,
                  totalUnits: units * strips,
                  pricePerUnit: units > 0 ? price / units : price,
                  mrpPerUnit: units > 0 ? mrp / units : mrp,
                  total: price * strips,
                  rackNo: r.rackNo,
                  boxNo: r.boxNo,
                  remarks: r.remarks,
                };
              });
              const today = new Date();
              const dd = String(today.getDate()).padStart(2, '0');
              const mm = String(today.getMonth() + 1).padStart(2, '0');
              const yyyy = today.getFullYear();
              const grnEntry: GrnEntry = {
                id: Date.now().toString(),
                grnNo: `GRN-${Date.now()}`,
                invNo: invoiceNumber,
                branch: 'Main Branch',
                vendor: vendorName,
                grnDate: `${dd}-${mm}-${yyyy}`,
                invDate: invoiceDate,
                invDis: parseFloat(summaryDiscPct) || 0,
                invAmt: parseFloat(invoiceValue) || netValue,
                charges: charges ? `FC: ${charges}` : 'FC: 0.00',
                roundOff,
                total: netValue,
                createdBy: createdBy,
                products,
              };

              // Build backend payload for POST /pharmacy/grn
              const grnPayload = {
                grnNo: grnEntry.grnNo,
                invoiceNumber,
                vendorId: selectedVendorId || '',
                vendorName,
                invoiceDate,
                purchaseType,
                totalAmount: netValue,
                paidAmount: effectivePaidAmount,
                createdBy,
                products: savedRows.map(r => {
                  let expiry = r.expiry;
                  const em = r.expiry.match(/^(\d{2})\/(\d{4})$/);
                  if (em) expiry = `${em[2]}-${em[1]}`;
                  return {
                    medicineName: r.product,
                    category: r.category,
                    stockType: r.stockType,
                    batch: r.batch,
                    expiry,
                    unitsPerStrip: parseInt(r.unitsPerStrip) || 1,
                    strips: parseInt(r.strips) || 0,
                    freeStrips: parseInt(r.freeStrips) || 0,
                    purchasePrice: parseFloat(r.price) || 0,
                    mrp: parseFloat(r.mrp) || 0,
                  };
                }),
              };

              setSubmitting(true);
              fetch(API_ENDPOINTS.GRN.CREATE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(grnPayload),
              })
                .then(async res => {
                  const data = await res.json();
                  if (!res.ok) {
                    throw new Error(data.detail || 'Failed to save GRN');
                  }
                  // Show green success toast, then navigate after a short delay
                  showToast(`GRN ${grnEntry.grnNo} saved successfully with ${savedRows.length} product(s)`, 'success');
                  onSubmit?.(grnEntry);
                  setTimeout(() => onNavigate?.('grn-history'), 1500);
                })
                .catch(err => {
                  showToast(err.message || 'Failed to save GRN. Please try again.', 'error');
                })
                .finally(() => setSubmitting(false));
            }}
            disabled={submitting}
            className={`flex items-center gap-2 px-7 py-2.5 bg-[var(--theme-accent)] text-[var(--theme-bg)] rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-[var(--theme-accent)]/20 ${submitting ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {submitting ? 'Saving...' : 'Add Stock'}
          </button>
        </div>

      </div>
    </div>
  );
}
