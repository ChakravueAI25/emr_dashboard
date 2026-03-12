export type ExpensePeriod = 'day' | 'month' | 'year' | 'custom';

export interface ExpenseRecord {
  expense_id: string;
  date: string;
  amount: number;
  paid_by: string;
  paid_to: string;
  category: string;
  payment_mode: string;
  remarks: string;
  created_by: string;
  created_at: string;
}

export interface ExpenseSummary {
  todayExpenses: number;
  thisMonthExpenses: number;
  thisYearExpenses: number;
  totalExpenses: number;
  cashExpenses: number;
  upiExpenses: number;
  cardExpenses: number;
  bankTransferExpenses: number;
  recordCount: number;
}
