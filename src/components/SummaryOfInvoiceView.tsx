import React, { useState } from 'react';
import { ArrowLeft, ChevronUp, ChevronDown, Printer, Eye, Edit2, X, FileText, Save } from 'lucide-react';

interface Props {
  onBack: () => void;
  entries?: GrnEntry[];
  onDelete?: (id: string) => void;
  currentUser?: string;
}

export interface GrnProduct {
  sno: number;
  category: string;
  productCode: string;
  product: string;
  stockType: string;
  batch: string;
  gst: number;
  discount: string;
  expiry: string;
  hsnCode: string;
  unitsPerStrip: number;
  strips: string;
  freeStrips: string;
  pricePerStrip: number;
  mrpPerStrip: number;
  salePrice: number;
  totalUnits: number;
  pricePerUnit: number;
  mrpPerUnit: number;
  total: number;
  rackNo: string;
  boxNo: string;
  remarks: string;
}

export interface GrnEntry {
  id: string;
  grnNo: string;
  invNo: string;
  branch: string;
  vendor: string;
  grnDate: string;
  invDate: string;
  invDis: number;
  invAmt: number;
  charges: string;
  roundOff: number;
  total: number;
  createdBy: string;
  products: GrnProduct[];
}

const GRN_DATA: GrnEntry[] = [];

export function SummaryOfInvoiceView({ onBack, entries = [], onDelete, currentUser }: Props) {
  const card = 'bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/15 rounded-2xl';

  const [editedCharges, setEditedCharges] = useState<Record<string, string>>({});
  const [summaryCharges, setSummaryCharges] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const displayedGrns = entries;

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const aggInvDis  = displayedGrns.reduce((s, g) => s + g.invDis, 0);
  const aggInvAmt  = displayedGrns.reduce((s, g) => s + g.invAmt, 0);
  const aggRoundOff = displayedGrns.reduce((s, g) => s + g.roundOff, 0);
  const aggTotal   = displayedGrns.reduce((s, g) => s + g.total, 0);
  const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2 });

  const thCls = 'px-3 py-3 text-left text-[11px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wide whitespace-nowrap border-b border-[var(--theme-accent)]/15';
  const subThCls = 'px-3 py-2 text-left text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wide whitespace-nowrap';
  const tdCls = 'px-3 py-3 text-sm text-[var(--theme-text-muted)] whitespace-nowrap';
  const subTdCls = 'px-3 py-2 text-xs text-[var(--theme-text-muted)] whitespace-nowrap';

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[var(--theme-bg)]">
      {/* ── Page Header ── */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-[var(--theme-accent)]/15 shrink-0">
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/20 hover:bg-[var(--theme-bg-tertiary)] transition-all"
        >
          <ArrowLeft size={18} className="text-[var(--theme-text-muted)]" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[var(--theme-text)]">Summary of Invoice</h1>
          <p className="text-xs text-[var(--theme-text-muted)] mt-0.5">Goods Received Note — purchase invoice records</p>
        </div>
        <button
          onClick={() => alert('Backend integration not done.')}
          className="flex items-center gap-2 px-5 py-2.5 bg-[var(--theme-accent)] text-[var(--theme-bg)] rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-[var(--theme-accent)]/20"
        >
          <Save size={15} /> Save
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

        {/* ── GRN Table ── */}
        <div className={card + ' overflow-hidden'}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse">
              <thead>
                <tr style={{ background: 'color-mix(in srgb, var(--theme-accent) 10%, transparent)' }}>
                  <th className={thCls}>Inv.No</th>
                  <th className={thCls}>Branch</th>
                  <th className={thCls}>Vendor</th>
                  <th className={thCls}>Date</th>
                  <th className={thCls}>Inv.Dis(%)</th>
                  <th className={thCls}>Inv.Amt</th>
                  <th className={thCls}>Charges</th>
                  <th className={thCls}>Round Off</th>
                  <th className={thCls}>Total</th>
                  <th className={thCls}>Created By</th>
                  <th className={thCls}>Action</th>
                  <th className={thCls}></th>
                </tr>
              </thead>
              <tbody>
                {/* ── Static aggregate summary row ── */}
                <tr style={{ background: 'color-mix(in srgb, var(--theme-accent) 18%, transparent)' }} className="border-b-2 border-[var(--theme-accent)]/30">
                  <td className="px-3 py-2.5 text-xs font-bold text-[var(--theme-text)] whitespace-nowrap">
                    {displayedGrns.length > 0 ? `${displayedGrns.length} Record${displayedGrns.length > 1 ? 's' : ''}` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-[var(--theme-text-muted)] whitespace-nowrap">—</td>
                  <td className="px-3 py-2.5 text-xs text-[var(--theme-text-muted)] whitespace-nowrap">—</td>
                  <td className="px-3 py-2.5 text-xs text-[var(--theme-text-muted)] whitespace-nowrap">—</td>
                  <td className="px-3 py-2.5 text-xs font-semibold text-[var(--theme-text)] text-center whitespace-nowrap">
                    {aggInvDis > 0 ? `${aggInvDis.toFixed(2)}%` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-xs font-semibold text-[var(--theme-text)] whitespace-nowrap">{fmt(aggInvAmt)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <input
                      type="text"
                      value={summaryCharges}
                      onChange={e => setSummaryCharges(e.target.value)}
                      className="w-20 bg-[var(--theme-bg)] border border-[var(--theme-accent)]/30 rounded px-2 py-1 text-xs text-[var(--theme-text)] font-semibold focus:outline-none focus:border-[var(--theme-accent)] text-right"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-3 py-2.5 text-xs font-semibold text-[var(--theme-text)] whitespace-nowrap">{fmt(aggRoundOff)}</td>
                  <td className="px-3 py-2.5 text-xs font-bold text-[var(--theme-accent)] whitespace-nowrap">{fmt(aggTotal)}</td>
                  <td className="px-3 py-2.5 text-xs font-semibold text-[var(--theme-text)] whitespace-nowrap">{currentUser || '—'}</td>
                  <td className="px-3 py-2.5"></td>
                  <td className="px-3 py-2.5"></td>
                </tr>

                {displayedGrns.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-6 py-10 text-center text-sm text-[var(--theme-text-muted)]">
                      No GRN records found.
                    </td>
                  </tr>
                )}
                {displayedGrns.map(grn => {
                  const isExpanded = expandedIds.has(grn.id);
                  return (
                    <React.Fragment key={grn.id}>
                      {/* GRN summary row */}
                      <tr className="border-b border-[var(--theme-accent)]/10 hover:bg-[var(--theme-accent)]/5 transition-colors">
                        <td className={tdCls + ' font-medium text-[var(--theme-text)]'}>{grn.invNo}</td>
                        <td className={tdCls}>{grn.branch}</td>
                        <td className={tdCls + ' font-medium text-[var(--theme-text)]'}>{grn.vendor}</td>
                        <td className={tdCls}>
                          <div className="text-xs leading-snug">
                            <div>GRN:{grn.grnDate}</div>
                            <div className="text-[var(--theme-text-muted)]/70">Inv:{grn.invDate}</div>
                          </div>
                        </td>
                        <td className={tdCls + ' text-center'}>{grn.invDis > 0 ? `${grn.invDis}%` : ''}</td>
                        <td className={tdCls + ' font-medium text-[var(--theme-text)]'}>{grn.invAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className={tdCls}>
                          <input
                            type="text"
                            value={editedCharges[grn.id] ?? grn.charges ?? ''}
                            onChange={e => setEditedCharges(prev => ({ ...prev, [grn.id]: e.target.value }))}
                            className="w-20 bg-[var(--theme-bg)] border border-[var(--theme-accent)]/25 rounded px-2 py-1 text-xs text-[var(--theme-text)] focus:outline-none focus:border-[var(--theme-accent)] text-right"
                            placeholder="0.00"
                          />
                        </td>
                        <td className={tdCls}>{grn.roundOff.toFixed(2)}</td>
                        <td className={tdCls + ' font-bold text-[var(--theme-accent)]'}>{grn.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className={tdCls}>
                          <span className="text-xs truncate max-w-[120px] block">{grn.createdBy}</span>
                        </td>
                        <td className={tdCls}>
                          <div className="flex items-center gap-1.5">
                            <button title="Print" className="w-7 h-7 flex items-center justify-center rounded-lg bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 transition-colors">
                              <Printer size={13} />
                            </button>
                            <button title="View" className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors">
                              <Eye size={13} />
                            </button>
                            <button title="Edit" className="w-7 h-7 flex items-center justify-center rounded-lg bg-teal-500/15 text-teal-400 hover:bg-teal-500/25 transition-colors">
                              <Edit2 size={13} />
                            </button>
                            <button title="Document" className="w-7 h-7 flex items-center justify-center rounded-lg bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 transition-colors">
                              <FileText size={13} />
                            </button>
                            <button title="Cancel / Delete" onClick={() => onDelete?.(grn.id)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors">
                              <X size={13} />
                            </button>
                          </div>
                        </td>
                        <td className={tdCls}>
                          <button
                            onClick={() => toggleExpand(grn.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm"
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded product sub-table */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={13} className="p-0">
                            <div className="px-5 py-4 bg-[var(--theme-bg)]/60 border-b border-[var(--theme-accent)]/10">
                              {/* Product rows section */}
                              <div className="mb-4 rounded-xl border border-[var(--theme-accent)]/15 overflow-x-auto">
                                <table className="w-full min-w-[1200px] border-collapse">
                                  <thead>
                                    <tr style={{ background: 'color-mix(in srgb, var(--theme-accent) 7%, transparent)' }}>
                                      {['S.No', 'Category', 'Product Code', 'Product', 'StockType', 'Batch', 'GST(%)', 'Discount', 'Expiry', 'HSN Code', 'Units/Strip', 'No.Strips(Qty)', 'Price/Strip', 'MRP/Strip', 'Sale Price', 'Total Units', 'Price/Unit', 'MRP/Unit', 'Total', 'Rack No', 'Box No', 'Remarks'].map(h => (
                                        <th key={h} className={subThCls + ' border-b border-[var(--theme-accent)]/10'}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {grn.products.map(p => (
                                      <tr key={p.sno} className="border-b border-[var(--theme-accent)]/8 hover:bg-[var(--theme-accent)]/4 transition-colors last:border-0">
                                        <td className={subTdCls + ' font-medium text-[var(--theme-text)]'}>{p.sno}</td>
                                        <td className={subTdCls}>{p.category}</td>
                                        <td className={subTdCls}>{p.productCode}</td>
                                        <td className={subTdCls + ' font-medium text-[var(--theme-text)] min-w-[140px]'}>{p.product}</td>
                                        <td className={subTdCls}>{p.stockType}</td>
                                        <td className={subTdCls}>{p.batch}</td>
                                        <td className={subTdCls + ' text-center'}>{p.gst.toFixed(2)}</td>
                                        <td className={subTdCls + ' text-center'}>{p.discount}</td>
                                        <td className={subTdCls}>{p.expiry}</td>
                                        <td className={subTdCls}>{p.hsnCode}</td>
                                        <td className={subTdCls + ' text-center'}>{p.unitsPerStrip}</td>
                                        <td className={subTdCls + ' text-center'}>{p.strips}</td>
                                        <td className={subTdCls + ' text-right'}>{p.pricePerStrip.toFixed(3)}</td>
                                        <td className={subTdCls + ' text-right'}>{p.mrpPerStrip.toFixed(3)}</td>
                                        <td className={subTdCls + ' text-right text-emerald-400 font-medium'}>{p.salePrice.toFixed(2)}</td>
                                        <td className={subTdCls + ' text-center'}>{p.totalUnits}</td>
                                        <td className={subTdCls + ' text-right'}>{p.pricePerUnit.toFixed(2)}</td>
                                        <td className={subTdCls + ' text-right'}>{p.mrpPerUnit.toFixed(2)}</td>
                                        <td className={subTdCls + ' text-right font-semibold text-[var(--theme-text)]'}>{p.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        <td className={subTdCls}>{p.rackNo}</td>
                                        <td className={subTdCls}>{p.boxNo}</td>
                                        <td className={subTdCls + ' max-w-[120px] truncate'}>{p.remarks || '—'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>


                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
