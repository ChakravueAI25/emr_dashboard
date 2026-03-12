import { useEffect, useMemo, useState } from 'react';
import { PlusCircle, ReceiptText } from 'lucide-react';
import API_ENDPOINTS from '../../config/api';
import type { ExpensePeriod, ExpenseRecord, ExpenseSummary } from './expensesTypes';

interface ExpenseManagementViewProps {
  userRole?: string;
  currentUsername?: string;
}

const CATEGORY_OPTIONS = [
  'Courier',
  'Parcel',
  'Office Supplies',
  'Cleaning',
  'Machine Repair',
  'Technician Payment',
  'Travel',
  'Miscellaneous',
] as const;

const PAYMENT_MODES = ['Cash', 'UPI', 'Card', 'Bank Transfer'] as const;

const emptySummary: ExpenseSummary = {
  todayExpenses: 0,
  thisMonthExpenses: 0,
  thisYearExpenses: 0,
  totalExpenses: 0,
  cashExpenses: 0,
  upiExpenses: 0,
  cardExpenses: 0,
  bankTransferExpenses: 0,
  recordCount: 0,
};

function formatCurrency(value: number) {
  return `Rs. ${(Number(value) || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function buildQueryParams(args: {
  period: ExpensePeriod;
  selectedDay: string;
  selectedMonth: string;
  selectedYear: string;
  fromDate: string;
  toDate: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}) {
  const params = new URLSearchParams();
  params.set('period', args.period);

  if (args.period === 'day' && args.selectedDay) params.set('day', args.selectedDay);
  if (args.period === 'month' && args.selectedMonth) params.set('month', args.selectedMonth);
  if (args.period === 'year' && args.selectedYear) params.set('year', args.selectedYear);
  if (args.period === 'custom') {
    if (args.fromDate) params.set('from_date', args.fromDate);
    if (args.toDate) params.set('to_date', args.toDate);
  }

  if (args.sortBy) params.set('sort_by', args.sortBy);
  if (args.sortDir) params.set('sort_dir', args.sortDir);

  return params;
}

export function ExpenseManagementView({ userRole, currentUsername }: ExpenseManagementViewProps) {
  const today = useMemo(() => new Date(), []);
  const defaultDay = today.toISOString().slice(0, 10);
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const [summary, setSummary] = useState<ExpenseSummary>(emptySummary);
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [period, setPeriod] = useState<ExpensePeriod>('month');
  const [selectedDay, setSelectedDay] = useState(defaultDay);
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedYear, setSelectedYear] = useState(String(today.getFullYear()));
  const [fromDate, setFromDate] = useState(defaultDay);
  const [toDate, setToDate] = useState(defaultDay);
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'paid_by' | 'category' | 'payment_mode'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [date, setDate] = useState(defaultDay);
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [paidTo, setPaidTo] = useState('');
  const [category, setCategory] = useState<string>(CATEGORY_OPTIONS[0]);
  const [paymentMode, setPaymentMode] = useState<string>(PAYMENT_MODES[0]);
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (!paidBy) {
      const roleLabel = (userRole || '').trim();
      setPaidBy(roleLabel ? roleLabel.toUpperCase() : 'ADMIN');
    }
  }, [paidBy, userRole]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = buildQueryParams({
        period,
        selectedDay,
        selectedMonth,
        selectedYear,
        fromDate,
        toDate,
        sortBy,
        sortDir,
      });

      const [summaryRes, listRes] = await Promise.all([
        fetch(`${API_ENDPOINTS.EXPENSES.SUMMARY}?${params.toString()}`),
        fetch(`${API_ENDPOINTS.EXPENSES.LIST}?${params.toString()}`),
      ]);

      const summaryData = await summaryRes.json();
      const listData = await listRes.json();

      if (!summaryRes.ok) throw new Error(summaryData.detail || 'Failed to load expense summary');
      if (!listRes.ok) throw new Error(listData.detail || 'Failed to load expense records');

      setSummary({ ...emptySummary, ...summaryData });
      setRecords(Array.isArray(listData.records) ? listData.records : []);
    } catch (error) {
      setToast({ type: 'error', text: error instanceof Error ? error.message : 'Unable to load expenses' });
      setSummary(emptySummary);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [period, selectedDay, selectedMonth, selectedYear, fromDate, toDate, sortBy, sortDir]);

  const handleCreateExpense = async () => {
    const parsedAmount = Number(amount);
    if (!date || !paidBy.trim() || !paidTo.trim() || !category || !paymentMode || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setToast({ type: 'error', text: 'Please fill all required fields with valid values.' });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(API_ENDPOINTS.EXPENSES.CREATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          amount: parsedAmount,
          paid_by: paidBy,
          paid_to: paidTo,
          category,
          payment_mode: paymentMode,
          remarks,
          created_by: currentUsername || userRole || 'System',
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to create expense');

      setAmount('');
      setPaidTo('');
      setRemarks('');
      setToast({ type: 'success', text: 'Expense recorded successfully.' });
      await fetchData();
    } catch (error) {
      setToast({ type: 'error', text: error instanceof Error ? error.message : 'Unable to save expense' });
    } finally {
      setSaving(false);
    }
  };

  const handleSort = (field: 'date' | 'amount' | 'paid_by' | 'category' | 'payment_mode') => {
    if (sortBy === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const metricCards = [
    { label: 'Today Expenses', value: summary.todayExpenses },
    { label: 'This Month Expenses', value: summary.thisMonthExpenses },
    { label: 'This Year Expenses', value: summary.thisYearExpenses },
    { label: 'Total Expenses', value: summary.totalExpenses },
  ];

  const paymentModeCards = [
    { label: 'Cash Expenses', value: summary.cashExpenses },
    { label: 'UPI Expenses', value: summary.upiExpenses },
    { label: 'Card Expenses', value: summary.cardExpenses },
    { label: 'Bank Transfer Expenses', value: summary.bankTransferExpenses },
  ];

  return (
    <div className="ml-16 min-h-screen w-full bg-[var(--theme-bg)] p-8 xl:p-10 text-[var(--theme-text)]">
      {toast ? (
        <div className={`fixed right-6 top-6 z-[80] rounded-xl border px-5 py-4 text-base shadow-lg ${toast.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>
          {toast.text}
        </div>
      ) : null}

      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-light tracking-tight">Expenses</h1>
          <p className="mt-2 text-base text-[var(--theme-text-muted)]">Track operational spending with live analytics and payment mode breakdown.</p>
        </div>
        <button
          onClick={() => void fetchData()}
          className="rounded-xl border border-[var(--theme-accent)]/20 px-5 py-3 text-base font-medium text-[var(--theme-text)] hover:bg-[var(--theme-bg-secondary)]"
        >
          Refresh Expenses
        </button>
      </div>

      <div className="mb-7 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-[var(--theme-accent)]/15 bg-[var(--theme-bg-secondary)] p-6">
            <div className="mb-3 text-sm uppercase tracking-wider text-[var(--theme-text-muted)]">{card.label}</div>
            <div className="text-3xl font-semibold text-[var(--theme-text)]">{formatCurrency(card.value)}</div>
          </div>
        ))}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {paymentModeCards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-[var(--theme-accent)]/15 bg-[var(--theme-bg-secondary)] p-6">
            <div className="mb-3 text-sm uppercase tracking-wider text-[var(--theme-text-muted)]">{card.label}</div>
            <div className="text-2xl font-semibold text-[var(--theme-text)]">{formatCurrency(card.value)}</div>
          </div>
        ))}
      </div>

      <div className="mb-8 rounded-2xl border border-[var(--theme-accent)]/15 bg-[var(--theme-bg-secondary)] p-6 xl:p-7">
        <div className="mb-5 flex items-center gap-2">
          <PlusCircle className="h-5 w-5 text-[var(--theme-accent)]" />
          <h2 className="text-lg font-semibold text-[var(--theme-text)]">Expense Entry</h2>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-[var(--theme-text-muted)]">Date</label>
            <input className="w-full min-h-12 rounded-xl border border-[var(--theme-accent)]/20 bg-[var(--theme-bg)] px-4 py-3 text-base" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-[var(--theme-text-muted)]">Amount</label>
            <input className="w-full min-h-12 rounded-xl border border-[var(--theme-accent)]/20 bg-[var(--theme-bg)] px-4 py-3 text-base" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-[var(--theme-text-muted)]">Paid By</label>
            <input className="w-full min-h-12 rounded-xl border border-[var(--theme-accent)]/20 bg-[var(--theme-bg)] px-4 py-3 text-base" value={paidBy} onChange={(event) => setPaidBy(event.target.value)} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-[var(--theme-text-muted)]">Paid To</label>
            <input className="w-full min-h-12 rounded-xl border border-[var(--theme-accent)]/20 bg-[var(--theme-bg)] px-4 py-3 text-base" value={paidTo} onChange={(event) => setPaidTo(event.target.value)} placeholder="Vendor / Person" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-[var(--theme-text-muted)]">Category</label>
            <select className="w-full min-h-12 rounded-xl border border-[var(--theme-accent)]/20 bg-[var(--theme-bg)] px-4 py-3 text-base" value={category} onChange={(event) => setCategory(event.target.value)}>
              {CATEGORY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-[var(--theme-text-muted)]">Payment Mode</label>
            <select className="w-full min-h-12 rounded-xl border border-[var(--theme-accent)]/20 bg-[var(--theme-bg)] px-4 py-3 text-base" value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)}>
              {PAYMENT_MODES.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-[var(--theme-text-muted)]">Remarks</label>
            <input className="w-full min-h-12 rounded-xl border border-[var(--theme-accent)]/20 bg-[var(--theme-bg)] px-4 py-3 text-base" value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Short note" />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={() => void handleCreateExpense()} disabled={saving} className="rounded-xl bg-[var(--theme-accent)] px-6 py-3 text-base font-semibold text-[var(--theme-bg)] disabled:opacity-60">
            {saving ? 'Saving Expense...' : 'Add Expense'}
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-[var(--theme-accent)]/15 bg-[var(--theme-bg-secondary)] p-6 xl:p-7">
        <div className="mb-4 flex items-center gap-2">
          <ReceiptText className="h-5 w-5 text-[var(--theme-accent)]" />
          <h2 className="text-lg font-semibold text-[var(--theme-text)]">Filters</h2>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-6">
          <div>
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-[var(--theme-text-muted)]">Filter Type</label>
            <select className="w-full min-h-12 rounded-xl border border-[var(--theme-accent)]/20 bg-[var(--theme-bg)] px-4 py-3 text-base" value={period} onChange={(event) => setPeriod(event.target.value as ExpensePeriod)}>
              <option value="day">Day</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {period === 'day' ? (
            <div>
              <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-[var(--theme-text-muted)]">Day</label>
              <input className="w-full min-h-12 rounded-xl border border-[var(--theme-accent)]/20 bg-[var(--theme-bg)] px-4 py-3 text-base" type="date" value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)} />
            </div>
          ) : null}

          {period === 'month' ? (
            <div>
              <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-[var(--theme-text-muted)]">Month</label>
              <input className="w-full min-h-12 rounded-xl border border-[var(--theme-accent)]/20 bg-[var(--theme-bg)] px-4 py-3 text-base" type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
            </div>
          ) : null}

          {period === 'year' ? (
            <div>
              <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-[var(--theme-text-muted)]">Year</label>
              <input className="w-full min-h-12 rounded-xl border border-[var(--theme-accent)]/20 bg-[var(--theme-bg)] px-4 py-3 text-base" type="number" min="2000" max="2100" value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} />
            </div>
          ) : null}

          {period === 'custom' ? (
            <>
              <div>
                <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-[var(--theme-text-muted)]">From</label>
                <input className="w-full min-h-12 rounded-xl border border-[var(--theme-accent)]/20 bg-[var(--theme-bg)] px-4 py-3 text-base" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-[var(--theme-text-muted)]">To</label>
                <input className="w-full min-h-12 rounded-xl border border-[var(--theme-accent)]/20 bg-[var(--theme-bg)] px-4 py-3 text-base" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
              </div>
            </>
          ) : null}

          <div>
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-[var(--theme-text-muted)]">Sort By</label>
            <select className="w-full min-h-12 rounded-xl border border-[var(--theme-accent)]/20 bg-[var(--theme-bg)] px-4 py-3 text-base" value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}>
              <option value="date">Date</option>
              <option value="amount">Amount</option>
              <option value="paid_by">Paid By</option>
              <option value="category">Category</option>
              <option value="payment_mode">Payment Mode</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-[var(--theme-text-muted)]">Order</label>
            <select className="w-full min-h-12 rounded-xl border border-[var(--theme-accent)]/20 bg-[var(--theme-bg)] px-4 py-3 text-base" value={sortDir} onChange={(event) => setSortDir(event.target.value as 'asc' | 'desc')}>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--theme-accent)]/15 bg-[var(--theme-bg-secondary)] p-6 xl:p-7">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--theme-text)]">Expense Records</h2>
          <div className="text-sm text-[var(--theme-text-muted)]">{summary.recordCount} records</div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-[var(--theme-accent)]/10">
          <table className="w-full min-w-[1080px] border-collapse text-base">
            <thead>
              <tr className="bg-[var(--theme-bg)]">
                <th className="border-b border-[var(--theme-accent)]/10 px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--theme-text-muted)] cursor-pointer" onClick={() => handleSort('date')}>Date</th>
                <th className="border-b border-[var(--theme-accent)]/10 px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--theme-text-muted)] cursor-pointer" onClick={() => handleSort('amount')}>Amount</th>
                <th className="border-b border-[var(--theme-accent)]/10 px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--theme-text-muted)] cursor-pointer" onClick={() => handleSort('paid_by')}>Paid By</th>
                <th className="border-b border-[var(--theme-accent)]/10 px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--theme-text-muted)]">Paid To</th>
                <th className="border-b border-[var(--theme-accent)]/10 px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--theme-text-muted)] cursor-pointer" onClick={() => handleSort('category')}>Category</th>
                <th className="border-b border-[var(--theme-accent)]/10 px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--theme-text-muted)] cursor-pointer" onClick={() => handleSort('payment_mode')}>Payment Mode</th>
                <th className="border-b border-[var(--theme-accent)]/10 px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--theme-text-muted)]">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-base text-[var(--theme-text-muted)]">Loading expenses...</td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-base text-[var(--theme-text-muted)]">No expense records found for selected filters.</td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.expense_id} className="border-b border-[var(--theme-accent)]/10 last:border-0">
                    <td className="px-4 py-4 align-top text-base text-[var(--theme-text)]">{record.date}</td>
                    <td className="px-4 py-4 align-top text-base font-semibold text-[var(--theme-text)]">{formatCurrency(record.amount)}</td>
                    <td className="px-4 py-4 align-top text-base text-[var(--theme-text)]">{record.paid_by}</td>
                    <td className="px-4 py-4 align-top text-base text-[var(--theme-text)]">{record.paid_to}</td>
                    <td className="px-4 py-4 align-top text-base text-[var(--theme-text)]">{record.category}</td>
                    <td className="px-4 py-4 align-top text-base text-[var(--theme-text)]">{record.payment_mode}</td>
                    <td className="px-4 py-4 align-top text-base text-[var(--theme-text-muted)]">{record.remarks || '--'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
