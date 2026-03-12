import type { PayrollBreakdown } from './payrollTypes';

const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function normalizePayrollAmount(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculatePayroll(gross: number, leaves: number, advance: number): PayrollBreakdown {
  const normalizedGross = Math.max(Number(gross) || 0, 0);
  const normalizedLeaves = Math.max(Number(leaves) || 0, 0);
  const normalizedAdvance = Math.max(Number(advance) || 0, 0);

  const basic = normalizedGross * 0.7;
  const hra = normalizedGross * 0.3;
  const pf = normalizedGross * 0.12;
  const esi = normalizedGross * 0.0075;
  const pt = normalizedGross > 20000 ? 200 : normalizedGross > 15000 ? 150 : 0;
  const perDay = normalizedGross / 30;
  const leaveDeduction = normalizedLeaves * perDay;
  const netSalary = normalizedGross - pf - esi - pt - leaveDeduction - normalizedAdvance;
  const copf = basic * 0.13;
  const coesi = normalizedGross * 0.0325;
  const ctc = normalizedGross + copf + coesi;

  return {
    basic: roundCurrency(basic),
    hra: roundCurrency(hra),
    pf: roundCurrency(pf),
    esi: roundCurrency(esi),
    pt: roundCurrency(pt),
    leaveDeduction: roundCurrency(leaveDeduction),
    advance: roundCurrency(normalizedAdvance),
    netSalary: roundCurrency(netSalary),
    copf: roundCurrency(copf),
    coesi: roundCurrency(coesi),
    ctc: roundCurrency(ctc),
  };
}

export function formatCurrency(amount: unknown) {
  const normalizedAmount = normalizePayrollAmount(amount);
  const formattedNumber = normalizedAmount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `₹${formattedNumber}`;
}

export function getCurrentPayrollMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function formatPayrollMonth(month: string) {
  const [year, monthValue] = month.split('-');
  const date = new Date(Number(year), Number(monthValue) - 1, 1);
  return new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function getPayrollMonthOptions(count: number = 6) {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    return date.toISOString().slice(0, 7);
  });
}

export function deriveLeavesFromPayrollRecord(gross: number, leaveDeduction: number) {
  if (!gross) {
    return 0;
  }

  const perDay = gross / 30;
  if (!perDay) {
    return 0;
  }

  return Math.round(((leaveDeduction / perDay) + Number.EPSILON) * 100) / 100;
}