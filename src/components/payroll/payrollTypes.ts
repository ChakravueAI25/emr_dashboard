export interface Employee {
  id?: string;
  employeeId: string;
  name: string;
  role: string;
  grossSalary: number;
  leaves: number;
  advance: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AddEmployeeInput {
  name: string;
  role: string;
  grossSalary: number;
  leaves: number;
  advance: number;
}

export interface PayrollBreakdown {
  basic: number;
  hra: number;
  pf: number;
  esi: number;
  pt: number;
  leaveDeduction: number;
  advance: number;
  netSalary: number;
  copf: number;
  coesi: number;
  ctc: number;
}

export interface PayrollRecord extends PayrollBreakdown {
  id?: string;
  employeeId: string;
  month: string;
  gross: number;
  createdAt?: string;
}

export interface PayrollHistoryItem {
  month: string;
  netSalary: number;
}