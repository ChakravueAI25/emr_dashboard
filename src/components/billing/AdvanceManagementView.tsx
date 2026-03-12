import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Printer, RefreshCw, Wallet } from 'lucide-react';
import API_ENDPOINTS from '../../config/api';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

type AdvanceStatus = 'ACTIVE' | 'USED' | 'REFUNDED';

interface AdvanceRecord {
  advance_id: string;
  registration_id: string;
  patient_name: string;
  amount: number;
  payment_method: string;
  date: string;
  status: AdvanceStatus;
  linked_invoice_id: string | null;
  created_by: string;
  remarks?: string;
  created_at: string;
}

interface AdvanceManagementViewProps {
  onBack?: () => void;
}

function formatCurrency(value: number) {
  return `Rs. ${(Number(value) || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function buildReceiptHtml(record: AdvanceRecord) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Advance Receipt ${record.advance_id}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          .shell { max-width: 720px; margin: 0 auto; border: 2px solid #d4a574; border-radius: 12px; overflow: hidden; }
          .header { padding: 20px 24px; background: #111827; color: #f9fafb; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 6px 0 0; color: #d1d5db; }
          .body { padding: 24px; }
          .receipt-id { font-size: 22px; font-weight: 700; color: #b45309; margin-bottom: 20px; }
          .row { display: flex; justify-content: space-between; gap: 16px; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .label { font-weight: 700; color: #6b7280; }
          .value { text-align: right; }
          .amount { font-size: 28px; font-weight: 800; color: #065f46; margin: 24px 0; }
          .footer { padding: 16px 24px; background: #f9fafb; color: #6b7280; font-size: 12px; }
          @media print { body { padding: 0; } .shell { border: none; } }
        </style>
      </head>
      <body>
        <div class="shell">
          <div class="header">
            <h1>SPARK Eye Care Hospital</h1>
            <p>Advance Payment Receipt</p>
          </div>
          <div class="body">
            <div class="receipt-id">${record.advance_id}</div>
            <div class="amount">${formatCurrency(record.amount)}</div>
            <div class="row"><div class="label">Patient Name</div><div class="value">${record.patient_name}</div></div>
            <div class="row"><div class="label">Registration ID</div><div class="value">${record.registration_id}</div></div>
            <div class="row"><div class="label">Date</div><div class="value">${record.date}</div></div>
            <div class="row"><div class="label">Payment Method</div><div class="value">${record.payment_method}</div></div>
            <div class="row"><div class="label">Collected By</div><div class="value">${record.created_by || 'System'}</div></div>
            <div class="row"><div class="label">Status</div><div class="value">${record.status}</div></div>
            ${record.linked_invoice_id ? `<div class="row"><div class="label">Linked Invoice</div><div class="value">${record.linked_invoice_id}</div></div>` : ''}
            ${record.remarks ? `<div class="row"><div class="label">Remarks</div><div class="value">${record.remarks}</div></div>` : ''}
          </div>
          <div class="footer">Computer generated advance receipt.</div>
        </div>
      </body>
    </html>
  `;
}

function printReceipt(record: AdvanceRecord) {
  const existingFrame = document.getElementById('__advance_receipt_frame__');
  if (existingFrame) existingFrame.remove();

  const iframe = document.createElement('iframe');
  iframe.id = '__advance_receipt_frame__';
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:0;';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(buildReceiptHtml(record));
  doc.close();

  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 1000);
  };
}

export function AdvanceManagementView({ onBack }: AdvanceManagementViewProps) {
  const [records, setRecords] = useState<AdvanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AdvanceStatus>('ALL');
  const [selectedRecord, setSelectedRecord] = useState<AdvanceRecord | null>(null);
  const [applyInvoiceId, setApplyInvoiceId] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [working, setWorking] = useState(false);

  const fetchAdvances = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      const response = await fetch(`${API_ENDPOINTS.BILLING_ADVANCES.LIST_ALL}?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to fetch advances');
      setRecords(Array.isArray(data.records) ? data.records : []);
    } catch (error) {
      console.error('Failed to fetch advances:', error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAdvances();
  }, [statusFilter]);

  useEffect(() => {
    const handleAdvanceUpdate = () => {
      void fetchAdvances();
    };
    window.addEventListener('advanceUpdated', handleAdvanceUpdate);
    return () => window.removeEventListener('advanceUpdated', handleAdvanceUpdate);
  }, [statusFilter]);

  const filteredRecords = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return records;
    return records.filter((record) => {
      const patientName = String(record.patient_name || '').toLowerCase();
      const registrationId = String(record.registration_id || '').toLowerCase();
      const advanceId = String(record.advance_id || '').toLowerCase();
      return patientName.includes(query) || registrationId.includes(query) || advanceId.includes(query);
    });
  }, [records, searchTerm]);

  const activeTotal = filteredRecords
    .filter((record) => record.status === 'ACTIVE')
    .reduce((sum, record) => sum + Number(record.amount || 0), 0);

  const handleApplyAdvance = async () => {
    if (!selectedRecord || !applyInvoiceId.trim()) return;
    try {
      setWorking(true);
      const response = await fetch(API_ENDPOINTS.BILLING_ADVANCES.USE(selectedRecord.advance_id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linked_invoice_id: applyInvoiceId.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to apply advance');
      setShowApplyModal(false);
      setApplyInvoiceId('');
      setSelectedRecord(null);
      window.dispatchEvent(new CustomEvent('advanceUpdated'));
      await fetchAdvances();
    } catch (error) {
      console.error('Failed to apply advance:', error);
      alert(error instanceof Error ? error.message : 'Failed to apply advance');
    } finally {
      setWorking(false);
    }
  };

  const handleRefundAdvance = async (record: AdvanceRecord) => {
    const reason = window.prompt(`Refund reason for ${record.advance_id}:`, 'Advance cancelled');
    if (reason === null) return;

    try {
      setWorking(true);
      const response = await fetch(API_ENDPOINTS.BILLING_ADVANCES.REFUND(record.advance_id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to refund advance');
      window.dispatchEvent(new CustomEvent('advanceUpdated'));
      await fetchAdvances();
    } catch (error) {
      console.error('Failed to refund advance:', error);
      alert(error instanceof Error ? error.message : 'Failed to refund advance');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 ml-16">
      <div className="flex items-center justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button variant="outline" className="border-[#D4A574] text-[#D4A574] hover:bg-[#1a1a1a]" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-light tracking-tight">Advance Management</h1>
          </div>
          <p className="text-[#8B8B8B] text-sm">Track active, used, and refunded advance receipts.</p>
        </div>
        <Button onClick={() => void fetchAdvances()} className="bg-[#D4A574] text-[#0a0a0a] hover:bg-[#C9955E] font-bold">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <Card className="bg-[#0f0f0f] border-[#D4A574] p-5">
          <div className="text-xs uppercase tracking-wider text-[#8B8B8B]">Visible Records</div>
          <div className="text-3xl font-semibold mt-2">{filteredRecords.length}</div>
        </Card>
        <Card className="bg-[#0f0f0f] border-[#D4A574] p-5">
          <div className="text-xs uppercase tracking-wider text-[#8B8B8B]">Active Advance Total</div>
          <div className="text-3xl font-semibold mt-2 text-emerald-400">{formatCurrency(activeTotal)}</div>
        </Card>
        <Card className="bg-[#0f0f0f] border-[#D4A574] p-5">
          <div className="text-xs uppercase tracking-wider text-[#8B8B8B]">Patients With Active Advance</div>
          <div className="text-3xl font-semibold mt-2 text-[#D4A574]">{new Set(filteredRecords.filter((record) => record.status === 'ACTIVE').map((record) => record.registration_id)).size}</div>
        </Card>
      </div>

      <div className="bg-[#0f0f0f] border border-[#D4A574] rounded-xl p-4 mb-6 flex flex-wrap items-center gap-4">
        <Input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search by patient, registration ID, or advance ID"
          className="min-w-[280px] flex-1 bg-[#0a0a0a] border-[#D4A574]"
        />
        <select
          className="bg-[#0a0a0a] border border-[#D4A574] rounded-lg px-3 py-2 text-sm text-[#8B8B8B] outline-none"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as 'ALL' | AdvanceStatus)}
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="USED">USED</option>
          <option value="REFUNDED">REFUNDED</option>
        </select>
      </div>

      <div className="bg-[#0f0f0f] border border-[#D4A574] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#151515] border-b border-[#D4A574]">
                <th className="p-4 text-xs font-semibold text-[#8B8B8B] uppercase tracking-wider">Advance ID</th>
                <th className="p-4 text-xs font-semibold text-[#8B8B8B] uppercase tracking-wider">Patient</th>
                <th className="p-4 text-xs font-semibold text-[#8B8B8B] uppercase tracking-wider">Amount</th>
                <th className="p-4 text-xs font-semibold text-[#8B8B8B] uppercase tracking-wider">Date</th>
                <th className="p-4 text-xs font-semibold text-[#8B8B8B] uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-semibold text-[#8B8B8B] uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4A574]/20">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-[#8B8B8B]">Loading advances...</td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-[#8B8B8B]">No advance records found.</td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.advance_id} className="hover:bg-[#151515] transition-colors">
                    <td className="p-4">
                      <div className="font-mono text-sm text-[#D4A574]">{record.advance_id}</div>
                      {record.linked_invoice_id ? <div className="text-[11px] text-[#8B8B8B]">Invoice: {record.linked_invoice_id}</div> : null}
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-semibold">{record.patient_name}</div>
                      <div className="text-xs text-[#8B8B8B]">{record.registration_id}</div>
                    </td>
                    <td className="p-4 text-sm font-semibold text-emerald-400">{formatCurrency(record.amount)}</td>
                    <td className="p-4 text-sm text-[#8B8B8B]">{record.date}</td>
                    <td className="p-4">
                      <span className={`text-[11px] px-2 py-1 rounded border font-bold ${record.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : record.status === 'USED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-[#D4A574] text-[#D4A574] hover:bg-[#1a1a1a]"
                          onClick={() => {
                            setSelectedRecord(record);
                            setShowReceiptModal(true);
                          }}
                        >
                          View Receipt
                        </Button>
                        {record.status === 'ACTIVE' ? (
                          <>
                            <Button
                              size="sm"
                              className="bg-[#D4A574] text-[#0a0a0a] hover:bg-[#C9955E]"
                              onClick={() => {
                                setSelectedRecord(record);
                                setApplyInvoiceId('');
                                setShowApplyModal(true);
                              }}
                              disabled={working}
                            >
                              Apply
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500/40 text-red-400 hover:bg-red-500/10"
                              onClick={() => void handleRefundAdvance(record)}
                              disabled={working}
                            >
                              Refund
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showApplyModal && selectedRecord ? (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#D4A574] bg-[#0f0f0f] p-6">
            <h3 className="text-xl font-semibold mb-4">Apply Advance</h3>
            <p className="text-sm text-[#8B8B8B] mb-4">Link {selectedRecord.advance_id} to a finalized invoice.</p>
            <Input
              value={applyInvoiceId}
              onChange={(event) => setApplyInvoiceId(event.target.value)}
              placeholder="Enter invoice ID"
              className="bg-[#0a0a0a] border-[#D4A574] mb-4"
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" className="border-[#D4A574] text-[#D4A574] hover:bg-[#1a1a1a]" onClick={() => setShowApplyModal(false)}>
                Cancel
              </Button>
              <Button className="bg-[#D4A574] text-[#0a0a0a] hover:bg-[#C9955E]" onClick={() => void handleApplyAdvance()} disabled={working || !applyInvoiceId.trim()}>
                Apply Advance
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {showReceiptModal && selectedRecord ? (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#D4A574] bg-[#0f0f0f] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Advance Receipt</h3>
              <Button className="bg-[#D4A574] text-[#0a0a0a] hover:bg-[#C9955E]" onClick={() => printReceipt(selectedRecord)}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
            <div className="rounded-xl border border-[#D4A574]/20 bg-[#111] p-5 space-y-3">
              <div className="flex items-center gap-3 text-[#D4A574]"><Wallet className="w-5 h-5" /><span className="font-semibold">{selectedRecord.advance_id}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#8B8B8B]">Patient</span><span>{selectedRecord.patient_name}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#8B8B8B]">Registration ID</span><span>{selectedRecord.registration_id}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#8B8B8B]">Amount</span><span className="text-emerald-400 font-semibold">{formatCurrency(selectedRecord.amount)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#8B8B8B]">Date</span><span>{selectedRecord.date}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#8B8B8B]">Payment Method</span><span>{selectedRecord.payment_method}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#8B8B8B]">Collected By</span><span>{selectedRecord.created_by}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#8B8B8B]">Status</span><span>{selectedRecord.status}</span></div>
              {selectedRecord.linked_invoice_id ? <div className="flex justify-between text-sm"><span className="text-[#8B8B8B]">Linked Invoice</span><span>{selectedRecord.linked_invoice_id}</span></div> : null}
            </div>
            <div className="flex justify-end mt-5">
              <Button variant="outline" className="border-[#D4A574] text-[#D4A574] hover:bg-[#1a1a1a]" onClick={() => setShowReceiptModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}