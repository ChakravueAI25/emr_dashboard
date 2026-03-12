export type FinancePeriod = 'day' | 'month' | 'year' | 'custom';

export interface FinanceSummary {
  incomeToday: number;
  expensesToday: number;
  netBalanceToday: number;
  monthlyNetBalance: number;
  totalIncome: number;
  totalExpenses: number;
}

export interface CashFlowRow {
  date: string;
  income: number;
  expenses: number;
  balance: number;
}
