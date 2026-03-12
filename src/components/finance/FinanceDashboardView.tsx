import { useEffect, useMemo, useState } from 'react';
import { Landmark } from 'lucide-react';
import API_ENDPOINTS from '../../config/api';
import type { CashFlowRow, FinancePeriod, FinanceSummary } from './financeTypes';

const emptySummary: FinanceSummary = {
  incomeToday: 0,
  expensesToday: 0,
  netBalanceToday: 0,
  monthlyNetBalance: 0,
  totalIncome: 0,
  totalExpenses: 0,
};

function formatCurrency(value: number) {
  return `Rs. ${(Number(value) || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function buildQueryParams(args: {
  period: FinancePeriod;
  selectedDay: string;
  selectedMonth: string;
  selectedYear: string;
  fromDate: string;
  toDate: string;
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

  return params;
}

export function FinanceDashboardView() {
  const now = useMemo(() => new Date(), []);
  const defaultDay = now.toISOString().slice(0, 10);
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [summary, setSummary] = useState<FinanceSummary>(emptySummary);
  const [rows, setRows] = useState<CashFlowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<FinancePeriod>('month');
  const [selectedDay, setSelectedDay] = useState(defaultDay);
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [fromDate, setFromDate] = useState(defaultDay);
  const [toDate, setToDate] = useState(defaultDay);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = buildQueryParams({ period, selectedDay, selectedMonth, selectedYear, fromDate, toDate });

      const [summaryRes, cashFlowRes] = await Promise.all([
        fetch(`${API_ENDPOINTS.FINANCE.SUMMARY}?${params.toString()}`),
        fetch(`${API_ENDPOINTS.FINANCE.CASH_FLOW}?${params.toString()}`),
      ]);

      const summaryData = await summaryRes.json();
      const cashFlowData = await cashFlowRes.json();

      if (!summaryRes.ok) throw new Error(summaryData.detail || 'Unable to fetch finance summary');
      if (!cashFlowRes.ok) throw new Error(cashFlowData.detail || 'Unable to fetch cash flow');

      setSummary({ ...emptySummary, ...summaryData });
      setRows(Array.isArray(cashFlowData.rows) ? cashFlowData.rows : []);
    } catch (fetchError) {
      setSummary(emptySummary);
      setRows([]);
      setError(fetchError instanceof Error ? fetchError.message : 'Unable to load finance dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [period, selectedDay, selectedMonth, selectedYear, fromDate, toDate]);

  const cards = [
    { label: 'Income Today', value: summary.incomeToday },
    { label: 'Expenses Today', value: summary.expensesToday },
    { label: 'Net Balance Today', value: summary.netBalanceToday },
    { label: 'Monthly Net Balance', value: summary.monthlyNetBalance },
  ];

  return (
    <div className="ml-16 min-h-screen w-full bg-[var(--theme-bg)] p-8 xl:p-10 text-[var(--theme-text)]">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-light tracking-tight">Finance</h1>
          <p className="mt-2 text-base text-[var(--theme-text-muted)]">Daily cash flow view combining billing income and operational expenses.</p>
        </div>
        <button
          onClick={() => void fetchData()}
          className="rounded-xl border border-[var(--theme-accent)]/20 px-5 py-3 text-base font-medium text-[var(--theme-text)] hover:bg-[var(--theme-bg-secondary)]"
        >
          Refresh Finance
        </button>
      </div>

      {error ? (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-base text-red-400">{error}</div>
      ) : null}

      <div className="mb-6 rounded-2xl border border-[var(--theme-accent)]/15 bg-[var(--theme-bg-secondary)] p-6 xl:p-7">
        <div className="mb-4 flex items-center gap-2">
          <Landmark className="h-5 w-5 text-[var(--theme-accent)]" />
          <h2 className="text-lg font-semibold text-[var(--theme-text)]">Date Filters</h2>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-[var(--theme-text-muted)]">Filter Type</label>
            <select className="w-full min-h-12 rounded-xl border border-[var(--theme-accent)]/20 bg-[var(--theme-bg)] px-4 py-3 text-base" value={period} onChange={(event) => setPeriod(event.target.value as FinancePeriod)}>
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
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-[var(--theme-accent)]/15 bg-[var(--theme-bg-secondary)] p-6">
            <div className="mb-3 text-sm uppercase tracking-wider text-[var(--theme-text-muted)]">{card.label}</div>
            <div className={`text-3xl font-semibold ${card.label.includes('Expenses') ? 'text-red-400' : card.label.includes('Net') ? (card.value >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-[var(--theme-text)]'}`}>
              {formatCurrency(card.value)}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[var(--theme-accent)]/15 bg-[var(--theme-bg-secondary)] p-6 xl:p-7">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--theme-text)]">Cash Flow</h2>
          <div className="text-sm text-[var(--theme-text-muted)]">{rows.length} days</div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[var(--theme-accent)]/10">
          <table className="w-full min-w-[760px] border-collapse text-base">
            <thead>
              <tr className="bg-[var(--theme-bg)]">
                <th className="border-b border-[var(--theme-accent)]/10 px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--theme-text-muted)]">Date</th>
                <th className="border-b border-[var(--theme-accent)]/10 px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--theme-text-muted)]">Income</th>
                <th className="border-b border-[var(--theme-accent)]/10 px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--theme-text-muted)]">Expenses</th>
                <th className="border-b border-[var(--theme-accent)]/10 px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--theme-text-muted)]">Balance</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-base text-[var(--theme-text-muted)]">Loading cash flow...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-base text-[var(--theme-text-muted)]">No cash flow data available for selected filter.</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.date} className="border-b border-[var(--theme-accent)]/10 last:border-0">
                    <td className="px-4 py-4 align-top text-base text-[var(--theme-text)]">{row.date}</td>
                    <td className="px-4 py-4 align-top text-base font-semibold text-emerald-400">{formatCurrency(row.income)}</td>
                    <td className="px-4 py-4 align-top text-base font-semibold text-red-400">{formatCurrency(row.expenses)}</td>
                    <td className={`px-4 py-4 align-top text-base font-semibold ${row.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(row.balance)}</td>
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
