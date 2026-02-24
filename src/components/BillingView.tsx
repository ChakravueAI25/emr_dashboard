import { useState, useEffect } from 'react';
import { IndianRupee, CreditCard, FileText, CheckCircle, Clock, AlertCircle, Plus, X, Eye } from 'lucide-react';
import API_ENDPOINTS from '../config/api';
import { EditableText } from './EditableText';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface Invoice {
  id: string;
  date: string;
  service: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  insuranceCovered: number;
  patientResponsibility: number;
}

interface Payment {
  id: string;
  date: string;
  amount: number;
  method: string;
  invoiceId: string;
}

interface InsuranceInfo {
  provider: string;
  policyNumber: string;
  groupNumber: string;
  coverageType: string;
  copay: string;
  deductible: string;
  deductibleMet: number | string;
  outOfPocketMax: string;
  outOfPocketMet: number | string;
  effectiveDate: string;
  expirationDate: string;
  coverageVerified?: boolean;
  lastVerified?: string;
}

interface BillingViewProps {
  registrationId?: string;
}

export function BillingView({ registrationId }: BillingViewProps) {
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    service: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    insuranceCoverage: '80',
    status: 'pending' as 'paid' | 'pending' | 'overdue'
  });

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [billingData, setBillingData] = useState({
    totalOutstanding: 0,
    totalPaid: 0,
    pendingClaims: 0,
    deductibleMet: 0
  });

  const [insuranceInfo, setInsuranceInfo] = useState<InsuranceInfo>({
    provider: '',
    policyNumber: '',
    groupNumber: '',
    coverageType: '',
    copay: '',
    deductible: '',
    deductibleMet: 0,
    outOfPocketMax: '',
    outOfPocketMet: 0,
    effectiveDate: '',
    expirationDate: ''
  });

  const [loading, setLoading] = useState(false);

  // Helper to safely convert values to strings
  const safeString = (val: any): string => {
    if (val === null || val === undefined) return '';
    return String(val);
  };

  useEffect(() => {
    if (registrationId) {
      fetchBillingData(registrationId);
    }
  }, [registrationId]);

  const fetchBillingData = async (regId: string) => {
    setLoading(true);
    try {
      const [summaryRes, insuranceRes, invoicesRes, paymentsRes, claimsRes] = await Promise.all([
        fetch(API_ENDPOINTS.BILLING_SUMMARY(regId)),
        fetch(API_ENDPOINTS.BILLING_INSURANCE(regId)),
        fetch(API_ENDPOINTS.BILLING_INVOICES(regId)),
        fetch(API_ENDPOINTS.BILLING_PAYMENTS(regId)),
        fetch(API_ENDPOINTS.BILLING_CLAIMS(regId))
      ]);

      const summary = await summaryRes.json();
      const insurance = await insuranceRes.json();
      const invList = await invoicesRes.json();
      const payList = await paymentsRes.json();
      const claimList = await claimsRes.json();

      setBillingData(summary);
      setInsuranceInfo(insurance || {});
      setInvoices(invList || []);
      setPayments(payList || []);
      setClaims(claimList || []);
    } catch (err) {
      console.error('Failed to fetch billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!registrationId || !newInvoice.service || !newInvoice.amount) return;

    try {
      const amount = parseFloat(newInvoice.amount);
      const coverage = (amount * parseInt(newInvoice.insuranceCoverage)) / 100;
      const responsibility = amount - coverage;

      const response = await fetch(API_ENDPOINTS.BILLING_INVOICES(registrationId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: newInvoice.service,
          date: newInvoice.date,
          amount,
          insuranceCovered: coverage,
          patientResponsibility: responsibility,
          status: newInvoice.status
        })
      });

      if (response.ok) {
        setIsNewInvoiceOpen(false);
        setNewInvoice({ service: '', date: new Date().toISOString().split('T')[0], amount: '', insuranceCoverage: '80', status: 'pending' });
        fetchBillingData(registrationId);
      }
    } catch (err) {
      console.error('Failed to create invoice:', err);
    }
  };

  const updateInsuranceInfo = async (field: keyof InsuranceInfo, value: string) => {
    if (!registrationId) return;

    const updated = { ...insuranceInfo, [field]: value };
    setInsuranceInfo(updated as InsuranceInfo);

    try {
      await fetch(API_ENDPOINTS.BILLING_INSURANCE(registrationId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch (err) {
      console.error('Failed to update insurance:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-[#4CAF50]" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-[#FFA726]" />;
      case 'overdue':
        return <AlertCircle className="w-4 h-4 text-[#EF4444]" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-[#4CAF50] bg-opacity-30 text-[#4CAF50]';
      case 'pending':
        return 'bg-[#FFA726] bg-opacity-30 text-[#FFA726]';
      case 'overdue':
        return 'bg-[#EF4444] bg-opacity-30 text-[#EF4444]';
      default:
        return '';
    }
  };

  if (loading) {
    return <div className="text-white text-center p-6">Loading billing data...</div>;
  }

  // Show empty state if no patient is selected
  if (!registrationId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-center">
          <IndianRupee className="w-16 h-16 text-[#D4A574] mx-auto mb-4" />
          <h2 className="text-white text-2xl mb-2">No Patient Selected</h2>
          <p className="text-[#8B8B8B]">Select a patient to view billing and insurance information</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto p-12 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-4xl font-light text-[var(--theme-text)] tracking-tight">
            Billing & <span className="font-bold text-[var(--theme-accent)]">Insurance</span>
          </h1>
          <p className="text-[var(--theme-text-muted)] text-sm font-medium uppercase tracking-[0.2em] opacity-60">
            Financial Management & Claim Status
          </p>
        </div>
        <button
          onClick={() => setIsNewInvoiceOpen(true)}
          className="flex items-center gap-3 px-6 py-3 bg-[#D4A574] text-[#0a0a0a] rounded-xl hover:bg-[#C9955E] transition-all shadow-lg shadow-[#D4A574]/30 hover:shadow-[#D4A574]/50 active:scale-95 group"
        >
          <div className="p-1 px-1.5 bg-black/10 rounded-lg group-hover:bg-black/20 transition-colors">
            <Plus className="w-5 h-5 text-[#0a0a0a]" />
          </div>
          <span className="font-bold text-[#0a0a0a] uppercase tracking-wider text-xs">Create New Invoice</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-[#121212] border border-[#D4A574] rounded-lg p-4 shadow-lg shadow-[#D4A574]/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[#D4A574] bg-opacity-20 flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-[#D4A574]" />
            </div>
            <div>
              <p className="text-[#8B8B8B] text-xs">Total Outstanding</p>
              <p className="text-white text-xl">₹{billingData.totalOutstanding.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <p className="text-[#8B8B8B] text-xs">Patient responsibility</p>
        </div>

        <div className="bg-[#121212] border border-[#D4A574] rounded-lg p-4 shadow-lg shadow-[#D4A574]/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[#4CAF50] bg-opacity-20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-[#4CAF50]" />
            </div>
            <div>
              <p className="text-[#8B8B8B] text-xs">Total Paid</p>
              <p className="text-white text-xl">₹{billingData.totalPaid.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <p className="text-[#8B8B8B] text-xs">Year to date</p>
        </div>

        <div className="bg-[#121212] border border-[#D4A574] rounded-lg p-4 shadow-lg shadow-[#D4A574]/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[#D4A574] bg-opacity-20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#D4A574]" />
            </div>
            <div>
              <p className="text-[#8B8B8B] text-xs">Pending Claims</p>
              <p className="text-white text-xl">{billingData.pendingClaims}</p>
            </div>
          </div>
          <p className="text-[#8B8B8B] text-xs">Awaiting insurance</p>
        </div>

        <div className="bg-[#121212] border border-[#D4A574] rounded-lg p-4 shadow-lg shadow-[#D4A574]/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[#D4A574] bg-opacity-20 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-[#D4A574]" />
            </div>
            <div>
              <p className="text-[#8B8B8B] text-xs">Deductible Met</p>
              <p className="text-white text-xl">₹{typeof billingData.deductibleMet === 'number' ? billingData.deductibleMet.toLocaleString('en-IN') : billingData.deductibleMet}</p>
            </div>
          </div>
          <p className="text-[#8B8B8B] text-xs">of {insuranceInfo.deductible}</p>
        </div>
      </div>

      {/* Insurance Information */}
      <div className="bg-[#121212] border border-[#D4A574] rounded-lg p-6 shadow-lg shadow-[#D4A574]/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#D4A574]" />
            <h3 className="text-white">Insurance Information</h3>
          </div>
          {insuranceInfo.coverageVerified && (
            <span className="flex items-center gap-1 text-xs text-[#4CAF50] bg-[#4CAF50] bg-opacity-20 px-2 py-1 rounded">
              <CheckCircle className="w-3 h-3" />
              Coverage Verified
              <span className="text-[#8B8B8B]">{insuranceInfo.lastVerified}</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-[#B8B8B8] text-sm block mb-1.5">Insurance Provider</label>
              <div onClick={(e) => e.stopPropagation()}>
                <EditableText
                  value={safeString(insuranceInfo.provider)}
                  onSave={(val) => updateInsuranceInfo('provider', val)}
                  className="text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[#B8B8B8] text-sm block mb-1.5">Policy Number</label>
              <div onClick={(e) => e.stopPropagation()}>
                <EditableText
                  value={safeString(insuranceInfo.policyNumber)}
                  onSave={(val) => updateInsuranceInfo('policyNumber', val)}
                  className="text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[#B8B8B8] text-sm block mb-1.5">Group Number</label>
              <div onClick={(e) => e.stopPropagation()}>
                <EditableText
                  value={safeString(insuranceInfo.groupNumber)}
                  onSave={(val) => updateInsuranceInfo('groupNumber', val)}
                  className="text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[#B8B8B8] text-sm block mb-1.5">Coverage Type</label>
              <div onClick={(e) => e.stopPropagation()}>
                <EditableText
                  value={safeString(insuranceInfo.coverageType)}
                  onSave={(val) => updateInsuranceInfo('coverageType', val)}
                  className="text-white"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[#B8B8B8] text-sm block mb-1.5">Copay</label>
              <div onClick={(e) => e.stopPropagation()}>
                <EditableText
                  value={safeString(insuranceInfo.copay)}
                  onSave={(val) => updateInsuranceInfo('copay', val)}
                  className="text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[#B8B8B8] text-sm block mb-1.5">Deductible</label>
              <div onClick={(e) => e.stopPropagation()}>
                <EditableText
                  value={safeString(insuranceInfo.deductible)}
                  onSave={(val) => updateInsuranceInfo('deductible', val)}
                  className="text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[#B8B8B8] text-sm block mb-1.5">Deductible Met</label>
              <div onClick={(e) => e.stopPropagation()}>
                <EditableText
                  value={String(insuranceInfo.deductibleMet || '')}
                  onSave={(val) => updateInsuranceInfo('deductibleMet', val)}
                  className="text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[#B8B8B8] text-sm block mb-1.5">Out-of-Pocket Max</label>
              <div onClick={(e) => e.stopPropagation()}>
                <EditableText
                  value={safeString(insuranceInfo.outOfPocketMax)}
                  onSave={(val) => updateInsuranceInfo('outOfPocketMax', val)}
                  className="text-white"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[#B8B8B8] text-sm block mb-1.5">Out-of-Pocket Met</label>
              <div onClick={(e) => e.stopPropagation()}>
                <EditableText
                  value={String(insuranceInfo.outOfPocketMet || '')}
                  onSave={(val) => updateInsuranceInfo('outOfPocketMet', val)}
                  className="text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[#B8B8B8] text-sm block mb-1.5">Effective Date</label>
              <div onClick={(e) => e.stopPropagation()}>
                <EditableText
                  value={safeString(insuranceInfo.effectiveDate)}
                  onSave={(val) => updateInsuranceInfo('effectiveDate', val)}
                  className="text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[#B8B8B8] text-sm block mb-1.5">Expiration Date</label>
              <div onClick={(e) => e.stopPropagation()}>
                <EditableText
                  value={safeString(insuranceInfo.expirationDate)}
                  onSave={(val) => updateInsuranceInfo('expirationDate', val)}
                  className="text-white"
                />
              </div>
            </div>

            <div className="bg-[#0a0a0a] border border-[#D4A574] rounded-lg p-3 mt-2">
              <p className="text-[#4CAF50] text-xs mb-1">âœ“ Coverage Verified</p>
              <p className="text-[#8B8B8B] text-xs">Last verified: 10/01/2025</p>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices and Payment History */}
      <div className="grid grid-cols-2 gap-6">
        {/* Invoices */}
        <div className="bg-[#121212] border border-[#D4A574] rounded-lg p-6 shadow-lg shadow-[#D4A574]/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#D4A574]" />
              <h3 className="text-white">Invoices</h3>
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-[#D4A574] bg-opacity-20 text-[#D4A574] rounded-lg hover:bg-opacity-30 transition-colors text-xs" onClick={() => setIsNewInvoiceOpen(true)}>
              <Plus className="w-4 h-4" />
              New Invoice
            </button>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-4 hover:border-[#D4A574] transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(invoice.status)}
                      <span className="text-white text-xs">{invoice.id}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(invoice.status)}`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-[#8B8B8B] text-xs">{invoice.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white">₹{invoice.amount.toLocaleString('en-IN')}</p>
                  </div>
                </div>

                <p className="text-white text-xs mb-2">{invoice.service}</p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-[#8B8B8B]">Insurance</p>
                    <p className="text-[#4CAF50]">₹{invoice.insuranceCovered.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-[#8B8B8B]">You Pay</p>
                    <p className="text-[#D4A574]">₹{invoice.patientResponsibility.toLocaleString('en-IN')}</p>
                  </div>
                </div>

                {invoice.status !== 'paid' && (
                  <button className="w-full mt-3 px-3 py-1.5 bg-[#D4A574] text-[#0a0a0a] rounded-lg hover:bg-[#C9955E] transition-colors text-xs font-semibold">
                    Pay Now
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Payment History */}
        <div className="bg-[#121212] border border-[#D4A574] rounded-lg p-6 shadow-lg shadow-[#D4A574]/10">
          <div className="flex items-center gap-2 mb-4">
            <IndianRupee className="w-5 h-5 text-[#D4A574]" />
            <h3 className="text-white">Payment History</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#D4A574] bg-opacity-20">
                  <th className="text-left p-3 text-[#0a0a0a] border-r border-[#D4A574] font-semibold">Date</th>
                  <th className="text-left p-3 text-[#0a0a0a] border-r border-[#D4A574] font-semibold">Invoice</th>
                  <th className="text-left p-3 text-[#0a0a0a] border-r border-[#D4A574] font-semibold">Method</th>
                  <th className="text-right p-3 text-[#0a0a0a] font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment, index) => (
                  <tr
                    key={payment.id}
                    className={index % 2 === 0 ? 'bg-[#1a1a1a]' : 'bg-[#0a0a0a]'}
                  >
                    <td className="p-3 text-white border-r border-[#D4A574]">{payment.date}</td>
                    <td className="p-3 text-white border-r border-[#D4A574]">{payment.invoiceId}</td>
                    <td className="p-3 text-white border-r border-[#D4A574]">{payment.method}</td>
                    <td className="p-3 text-right text-[#4CAF50]">₹{payment.amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Payment Method on File */}
          <div className="mt-6 bg-[#0a0a0a] border border-[#D4A574] rounded-lg p-4">
            <h4 className="text-[#8B8B8B] text-xs mb-3">Payment Method on File</h4>
            <div className="flex items-center gap-3">
              <div className="w-12 h-8 bg-[#D4A574] bg-opacity-20 rounded flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-[#D4A574]" />
              </div>
              <div>
                <p className="text-white text-xs">Visa •••• 4532</p>
                <p className="text-[#8B8B8B] text-xs">Expires 12/2026</p>
              </div>
              <button className="ml-auto text-[#D4A574] text-xs hover:underline">
                Update
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button className="px-3 py-2 bg-[#D4A574] text-[#0a0a0a] rounded-lg hover:bg-[#C9955E] transition-colors text-xs font-semibold">
              Make Payment
            </button>
            <button className="px-3 py-2 bg-[#D4A574] text-[#0a0a0a] rounded-lg hover:bg-[#C9955E] transition-colors text-xs font-semibold">
              Payment Plan
            </button>
          </div>
        </div>
      </div>

      {/* Claim Status */}
      <div className="bg-[#121212] border border-[#D4A574] rounded-lg p-6 shadow-lg shadow-[#D4A574]/10">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-[#D4A574]" />
          <h3 className="text-white">Insurance Claim Status</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#D4A574] bg-opacity-20">
                <th className="text-left p-3 text-[#0a0a0a] border-r border-[#D4A574] font-semibold">Claim ID</th>
                <th className="text-left p-3 text-[#0a0a0a] border-r border-[#D4A574] font-semibold">Date Filed</th>
                <th className="text-left p-3 text-[#0a0a0a] border-r border-[#D4A574] font-semibold">Service</th>
                <th className="text-center p-3 text-[#0a0a0a] border-r border-[#D4A574] font-semibold">Billed</th>
                <th className="text-center p-3 text-[#0a0a0a] border-r border-[#D4A574] font-semibold">Approved</th>
                <th className="text-center p-3 text-[#0a0a0a] font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-[#1a1a1a]">
                <td className="p-3 text-white border-r border-[#D4A574]">CLM-2025-089</td>
                <td className="p-3 text-white border-r border-[#D4A574]">09/21/2025</td>
                <td className="p-3 text-white border-r border-[#D4A574]">Visual Field Test</td>
                <td className="p-3 text-center text-white border-r border-[#D4A574]">₹3,000</td>
                <td className="p-3 text-center text-white border-r border-[#D4A574]">₹2,400</td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 rounded bg-[#FFA726] bg-opacity-30 text-[#FFA726]">
                    Processing
                  </span>
                </td>
              </tr>
              <tr className="bg-[#0a0a0a]">
                <td className="p-3 text-white border-r border-[#D4A574]">CLM-2025-087</td>
                <td className="p-3 text-white border-r border-[#D4A574]">09/21/2025</td>
                <td className="p-3 text-white border-r border-[#D4A574]">OCT Scan - Bilateral</td>
                <td className="p-3 text-center text-white border-r border-[#D4A574]">₹7,500</td>
                <td className="p-3 text-center text-white border-r border-[#D4A574]">₹6,000</td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 rounded bg-[#4CAF50] bg-opacity-30 text-[#4CAF50]">
                    Approved
                  </span>
                </td>
              </tr>
              <tr className="bg-[#1a1a1a]">
                <td className="p-3 text-white border-r border-[#D4A574]">CLM-2025-072</td>
                <td className="p-3 text-white border-r border-[#D4A574]">10/16/2025</td>
                <td className="p-3 text-white border-r border-[#D4A574]">Comprehensive Eye Exam</td>
                <td className="p-3 text-center text-white border-r border-[#D4A574]">₹4,200</td>
                <td className="p-3 text-center text-white border-r border-[#D4A574]">₹3,360</td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 rounded bg-[#4CAF50] bg-opacity-30 text-[#4CAF50]">
                    Paid
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* New Invoice Dialog */}
      <Dialog open={isNewInvoiceOpen} onOpenChange={setIsNewInvoiceOpen}>
        <DialogContent className="bg-[#121212] border border-[#D4A574] rounded-lg p-6 shadow-lg shadow-[#D4A574]/10">
          <DialogHeader>
            <DialogTitle className="text-white">New Invoice</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-[#8B8B8B] text-xs block mb-1">Service</Label>
              <Input
                type="text"
                value={newInvoice.service}
                onChange={(e) => setNewInvoice(prev => ({ ...prev, service: e.target.value }))}
                className="text-white text-xs bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-2"
              />
            </div>

            <div>
              <Label className="text-[#8B8B8B] text-xs block mb-1">Date</Label>
              <Input
                type="date"
                value={newInvoice.date}
                onChange={(e) => setNewInvoice(prev => ({ ...prev, date: e.target.value }))}
                className="text-white text-xs bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-2"
              />
            </div>

            <div>
              <Label className="text-[#8B8B8B] text-xs block mb-1">Amount</Label>
              <Input
                type="number"
                value={newInvoice.amount}
                onChange={(e) => setNewInvoice(prev => ({ ...prev, amount: e.target.value }))}
                className="text-white text-xs bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-2"
              />
            </div>

            <div>
              <Label className="text-[#8B8B8B] text-xs block mb-1">Insurance Coverage (%)</Label>
              <Input
                type="number"
                value={newInvoice.insuranceCoverage}
                onChange={(e) => setNewInvoice(prev => ({ ...prev, insuranceCoverage: e.target.value }))}
                className="text-white text-xs bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-2"
              />
            </div>

            <div>
              <Label className="text-[#8B8B8B] text-xs block mb-1">Status</Label>
              <Select
                value={newInvoice.status}
                onValueChange={(value: string) => setNewInvoice(prev => ({ ...prev, status: value as 'paid' | 'pending' | 'overdue' }))}
                className="text-white text-xs bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-2"
              >
                <SelectTrigger className="text-white text-xs bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-2">
                  <SelectValue className="text-white text-xs bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-2">
                    {newInvoice.status.charAt(0).toUpperCase() + newInvoice.status.slice(1)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-2">
                  <SelectItem value="paid" className="text-white text-xs bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-2">
                    Paid
                  </SelectItem>
                  <SelectItem value="pending" className="text-white text-xs bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-2">
                    Pending
                  </SelectItem>
                  <SelectItem value="overdue" className="text-white text-xs bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-2">
                    Overdue
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              className="px-3 py-2 bg-[#D4A574] bg-opacity-20 text-[#D4A574] rounded-lg hover:bg-opacity-30 transition-colors text-xs"
              onClick={() => setIsNewInvoiceOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="px-3 py-2 bg-[#D4A574] bg-opacity-20 text-[#D4A574] rounded-lg hover:bg-opacity-30 transition-colors text-xs"
              onClick={() => {
                // Add new invoice logic here
                setIsNewInvoiceOpen(false);
              }}
            >
              Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}