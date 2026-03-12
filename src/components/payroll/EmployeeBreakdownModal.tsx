import { useEffect, useMemo, useState } from 'react';
import { Download, History, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { API_ENDPOINTS } from '../../config/api';
import type { Employee, PayrollRecord } from './payrollTypes';
import { calculatePayroll, formatCurrency, formatPayrollMonth } from './payrollUtils';

interface EmployeeBreakdownModalProps {
  isOpen: boolean;
  employee: Employee | null;
  month: string;
  payrollRecord: PayrollRecord | null;
  loading: boolean;
  savingAdvance: boolean;
  isReadOnly: boolean;
  onClose: () => void;
  onSaveAdvance: (advance: number) => Promise<void>;
}

export function EmployeeBreakdownModal({
  isOpen,
  employee,
  month,
  payrollRecord,
  loading,
  savingAdvance,
  isReadOnly,
  onClose,
  onSaveAdvance,
}: EmployeeBreakdownModalProps) {
  const [advanceInput, setAdvanceInput] = useState('0');
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [payrollHistory, setPayrollHistory] = useState<PayrollRecord[]>([]);
  const [downloadingPayslip, setDownloadingPayslip] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !employee) {
      setAdvanceInput('0');
      setShowHistory(false);
      setPayrollHistory([]);
      setDownloadError(null);
      return;
    }
    setAdvanceInput(String(employee.advance ?? 0));
  }, [employee, isOpen]);

  useEffect(() => {
    if (!showHistory || !employee) {
      return;
    }

    let isCancelled = false;

    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const response = await fetch(API_ENDPOINTS.PAYROLL.HISTORY(employee.employeeId));
        if (!response.ok) {
          throw new Error('Failed to fetch payroll history');
        }

        const data = await response.json();
        if (!isCancelled) {
          setPayrollHistory(data.records || []);
        }
      } catch {
        if (!isCancelled) {
          setPayrollHistory([]);
        }
      } finally {
        if (!isCancelled) {
          setHistoryLoading(false);
        }
      }
    };

    loadHistory();
    return () => {
      isCancelled = true;
    };
  }, [employee, showHistory]);

  const fallbackBreakdown = useMemo(() => {
    if (!employee) {
      return null;
    }
    return calculatePayroll(employee.grossSalary, employee.leaves, employee.advance);
  }, [employee]);

  const effectiveRecord = payrollRecord ?? (employee && fallbackBreakdown
    ? {
        employeeId: employee.employeeId,
        month,
        gross: employee.grossSalary,
        advance: employee.advance,
        createdAt: undefined,
        ...fallbackBreakdown,
      }
    : null);

  if (!isOpen || !employee || !effectiveRecord) {
    return null;
  }

  const earningsRows = [
    ['Gross Salary', formatCurrency(effectiveRecord.gross)],
    ['Basic (70%)', formatCurrency(effectiveRecord.basic)],
    ['HRA (30%)', formatCurrency(effectiveRecord.hra)],
  ];

  const deductionRows = [
    ['PF', formatCurrency(effectiveRecord.pf)],
    ['ESI', formatCurrency(effectiveRecord.esi)],
    ['PT', formatCurrency(effectiveRecord.pt)],
    ['Leave Deduction', formatCurrency(effectiveRecord.leaveDeduction)],
  ];

  const handleSaveAdvance = async () => {
    await onSaveAdvance(Math.max(Number(advanceInput) || 0, 0));
  };

  const formatPayslipCurrency = (value: number) => formatCurrency(value).replace('₹', 'Rs. ');

  const handleDownloadPayslip = async () => {
    setDownloadError(null);
    setDownloadingPayslip(true);

    const payslipRows = {
      gross: formatPayslipCurrency(effectiveRecord.gross),
      basic: formatPayslipCurrency(effectiveRecord.basic),
      hra: formatPayslipCurrency(effectiveRecord.hra),
      pf: formatPayslipCurrency(effectiveRecord.pf),
      esi: formatPayslipCurrency(effectiveRecord.esi),
      pt: formatPayslipCurrency(effectiveRecord.pt),
      leaveDeduction: formatPayslipCurrency(effectiveRecord.leaveDeduction),
      advance: formatPayslipCurrency(effectiveRecord.advance),
      netSalary: formatPayslipCurrency(effectiveRecord.netSalary),
      copf: formatPayslipCurrency(effectiveRecord.copf),
      coesi: formatPayslipCurrency(effectiveRecord.coesi),
      ctc: formatPayslipCurrency(effectiveRecord.ctc),
    };

    try {
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 40;
      const labelX = margin;
      const valueX = pageWidth - margin;
      let cursorY = 52;

      const drawSectionTitle = (title: string) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        pdf.text(title, margin, cursorY);
        cursorY += 18;
      };

      const drawRow = (label: string, value: string, bold = false) => {
        pdf.setFont('helvetica', bold ? 'bold' : 'normal');
        pdf.setFontSize(11);
        pdf.text(label, labelX, cursorY);
        pdf.text(value, valueX, cursorY, { align: 'right' });
        cursorY += 16;
      };

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.text('Chakra Hospital', margin, cursorY);
      cursorY += 24;

      pdf.setFontSize(16);
      pdf.text('Payslip', margin, cursorY);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.text(`Employee: ${employee.name}`, valueX, 52, { align: 'right' });
      pdf.text(`Employee ID: ${employee.employeeId}`, valueX, 68, { align: 'right' });
      pdf.text(`Month: ${formatPayrollMonth(month)}`, valueX, 84, { align: 'right' });

      cursorY += 14;
      pdf.setDrawColor(229, 231, 235);
      pdf.line(margin, cursorY, valueX, cursorY);
      cursorY += 24;

      drawSectionTitle('Earnings');
      drawRow('Gross Salary', payslipRows.gross);
      drawRow('Basic (70%)', payslipRows.basic);
      drawRow('HRA (30%)', payslipRows.hra);
      cursorY += 10;

      drawSectionTitle('Employee Deductions');
      drawRow('PF (12%)', payslipRows.pf);
      drawRow('ESI (0.75%)', payslipRows.esi);
      drawRow('PT', payslipRows.pt);
      drawRow('Leave Deduction', payslipRows.leaveDeduction);
      drawRow('Advance', payslipRows.advance);
      cursorY += 10;

      drawSectionTitle('Net Salary');
      drawRow('Net Salary', payslipRows.netSalary, true);
      cursorY += 10;

      drawSectionTitle('Employer Contributions');
      drawRow('COPF (13% of Basic)', payslipRows.copf);
      drawRow('COESI (3.25% of Gross)', payslipRows.coesi);
      drawRow('CTC', payslipRows.ctc, true);

      const pdfBlob = pdf.output('blob');
      const downloadUrl = window.URL.createObjectURL(pdfBlob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = `${employee.employeeId}_${month}_payslip.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000);
    } catch {
      setDownloadError('Payslip download failed. Please try again.');
    } finally {
      setDownloadingPayslip(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-[var(--theme-accent)]/20 bg-[var(--theme-bg-secondary)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-5 border-b border-[var(--theme-accent)]/10">
          <div>
            <h2 className="text-xl font-semibold text-[var(--theme-text)]">Salary Breakdown</h2>
            <p className="text-sm text-[var(--theme-text-muted)] mt-1">{employee.name} · {employee.employeeId} · {formatPayrollMonth(month)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPayslip}
              disabled={downloadingPayslip}
              className="px-3 py-2 rounded-lg border border-[var(--theme-accent)]/20 text-sm text-[var(--theme-text)] hover:bg-[var(--theme-bg-tertiary)] transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />{downloadingPayslip ? 'Generating...' : 'Download Payslip'}
            </button>
            <button
              onClick={() => setShowHistory((current) => !current)}
              className="px-3 py-2 rounded-lg border border-[var(--theme-accent)]/20 text-sm text-[var(--theme-text)] hover:bg-[var(--theme-bg-tertiary)] transition-colors flex items-center gap-2"
            >
              <History className="w-4 h-4" />View History
            </button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--theme-bg-tertiary)] transition-colors">
              <X className="w-5 h-5 text-[var(--theme-text-muted)]" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {downloadError ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {downloadError}
            </div>
          ) : null}
          {showHistory ? (
            <div className="rounded-xl border border-[var(--theme-accent)]/10 bg-[var(--theme-bg)] p-4">
              <h3 className="text-sm font-semibold text-[var(--theme-text)] mb-3">Payroll History</h3>
              {historyLoading ? (
                <div className="text-sm text-[var(--theme-text-muted)]">Loading payroll history...</div>
              ) : payrollHistory.length === 0 ? (
                <div className="text-sm text-[var(--theme-text-muted)]">No previous payroll records found.</div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_auto] gap-4 text-xs uppercase tracking-wider text-[var(--theme-text-muted)] border-b border-[var(--theme-accent)]/10 pb-2">
                    <span>Month</span>
                    <span>Net Salary</span>
                  </div>
                  {payrollHistory.map((record) => (
                    <div key={`${record.employeeId}-${record.month}`} className="grid grid-cols-[1fr_auto] gap-4 text-sm">
                      <span className="text-[var(--theme-text)]">{formatPayrollMonth(record.month)}</span>
                      <span className="font-medium text-[var(--theme-text)]">{formatCurrency(record.netSalary)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-[var(--theme-accent)]/10 bg-[var(--theme-bg)] p-4">
              <h3 className="text-sm font-semibold text-[var(--theme-text)] mb-3">Earnings</h3>
              <div className="space-y-2">
                {earningsRows.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--theme-text-muted)]">{label}</span>
                    <span className="font-medium text-[var(--theme-text)]">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--theme-accent)]/10 bg-[var(--theme-bg)] p-4">
              <h3 className="text-sm font-semibold text-[var(--theme-text)] mb-3">Employee Deductions</h3>
              <div className="space-y-2">
                {deductionRows.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--theme-text-muted)]">{label}</span>
                    <span className="font-medium text-[var(--theme-text)]">{value}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-4 pt-2 border-t border-[var(--theme-accent)]/10">
                  <span className="text-sm text-[var(--theme-text-muted)]">Advance</span>
                  {isReadOnly ? (
                    <span className="font-medium text-[var(--theme-text)]">{formatCurrency(effectiveRecord.advance)}</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={advanceInput}
                        onChange={(event) => setAdvanceInput(event.target.value)}
                        className="w-32 rounded-lg bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/20 px-3 py-2 text-sm text-[var(--theme-text)] outline-none focus:border-[var(--theme-accent)] transition-colors"
                      />
                      <button
                        onClick={handleSaveAdvance}
                        disabled={savingAdvance}
                        className="px-3 py-2 rounded-lg bg-[var(--theme-accent)] text-[var(--theme-bg)] text-sm font-medium disabled:opacity-60"
                      >
                        {savingAdvance ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-[var(--theme-accent)]/10 text-base font-semibold">
                  <span className="text-[var(--theme-text)]">Net Salary</span>
                  <span className="text-[var(--theme-accent)]">{formatCurrency(effectiveRecord.netSalary)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--theme-accent)]/10 bg-[var(--theme-bg)] p-4 md:col-span-2">
              <h3 className="text-sm font-semibold text-[var(--theme-text)] mb-3">Employer Contributions</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--theme-text-muted)]">COPF</span>
                  <span className="font-medium text-[var(--theme-text)]">{formatCurrency(effectiveRecord.copf)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--theme-text-muted)]">COESI</span>
                  <span className="font-medium text-[var(--theme-text)]">{formatCurrency(effectiveRecord.coesi)}</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-[var(--theme-accent)]/10 text-base font-semibold">
                  <span className="text-[var(--theme-text)]">CTC</span>
                  <span className="text-[var(--theme-text)]">{formatCurrency(effectiveRecord.ctc)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--theme-accent)]/10 bg-[var(--theme-bg)] p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--theme-text-muted)]">Month</span>
              <span className="font-medium text-[var(--theme-text)]">{formatPayrollMonth(month)}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-[var(--theme-text-muted)]">Leaves Entered</span>
              <span className="font-medium text-[var(--theme-text)]">{employee.leaves}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-[var(--theme-text-muted)]">Record Status</span>
              <span className="font-medium text-[var(--theme-text)]">{loading ? 'Refreshing...' : payrollRecord ? 'Persisted' : 'Preview'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}