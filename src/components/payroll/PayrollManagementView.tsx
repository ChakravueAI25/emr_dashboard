import { useEffect, useMemo, useRef, useState } from 'react';
import { BadgeIndianRupee, Plus, Users } from 'lucide-react';
import { API_ENDPOINTS } from '../../config/api';
import { AddEmployeeModal } from './AddEmployeeModal';
import { EmployeeBreakdownModal } from './EmployeeBreakdownModal';
import { EmployeeTable } from './EmployeeTable';
import type { AddEmployeeInput, Employee, PayrollRecord } from './payrollTypes';
import { calculatePayroll, deriveLeavesFromPayrollRecord, formatCurrency, formatPayrollMonth, getCurrentPayrollMonth, getPayrollMonthOptions } from './payrollUtils';

export function PayrollManagementView() {
  const currentPayrollMonth = getCurrentPayrollMonth();
  const monthOptions = useMemo(() => getPayrollMonthOptions(6), []);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [monthlyRecords, setMonthlyRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(currentPayrollMonth);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [savingAdvance, setSavingAdvance] = useState(false);
  const [savingEmployeeIds, setSavingEmployeeIds] = useState<string[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const debounceTimers = useRef<Record<string, number>>({});

  const isReadOnlyMonth = selectedMonth !== currentPayrollMonth;
  const hasSavedPayrollRecords = monthlyRecords.length > 0;

  const displayedEmployees = useMemo(() => {
    const payrollRecordMap = new Map(monthlyRecords.map((record) => [record.employeeId, record]));

    if (isReadOnlyMonth && hasSavedPayrollRecords) {
      return monthlyRecords.map((record) => {
        const employeeMeta = employees.find((employee) => employee.employeeId === record.employeeId);
        return {
          employeeId: record.employeeId,
          name: employeeMeta?.name || record.employeeId,
          role: employeeMeta?.role || 'Employee',
          grossSalary: record.gross,
          leaves: deriveLeavesFromPayrollRecord(record.gross, record.leaveDeduction),
          advance: record.advance,
          createdAt: record.createdAt,
        } as Employee;
      });
    }

    return employees.map((employee) => {
      const record = payrollRecordMap.get(employee.employeeId);
      if (!record) {
        return employee;
      }

      return {
        ...employee,
        grossSalary: record.gross,
        leaves: deriveLeavesFromPayrollRecord(record.gross, record.leaveDeduction),
        advance: record.advance,
      };
    });
  }, [employees, hasSavedPayrollRecords, isReadOnlyMonth, monthlyRecords]);

  const selectedEmployee = useMemo(
    () => displayedEmployees.find((employee) => employee.employeeId === selectedEmployeeId) ?? null,
    [displayedEmployees, selectedEmployeeId]
  );

  const fetchEmployees = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.PAYROLL.EMPLOYEES);
      if (!response.ok) {
        throw new Error('Failed to fetch payroll employees');
      }

      const data = await response.json();
      setEmployees(data.employees || []);
    } catch {
      setEmployees([]);
      setToast({ type: 'error', message: 'Unable to load payroll employees.' });
    }
  };

  const fetchMonthlyPayrollRecords = async (month: string) => {
    try {
      const response = await fetch(API_ENDPOINTS.PAYROLL.LIST(month));
      if (!response.ok) {
        throw new Error('Failed to fetch monthly payroll records');
      }

      const data = await response.json();
      setMonthlyRecords(data.records || []);
    } catch {
      setMonthlyRecords([]);
      setToast({ type: 'error', message: 'Unable to load payroll records for the selected month.' });
    }
  };

  const fetchPayrollRecord = async (employeeId: string, month: string) => {
    setLoadingRecord(true);
    try {
      const response = await fetch(API_ENDPOINTS.PAYROLL.RECORD(employeeId, month));
      if (!response.ok) {
        throw new Error('Failed to fetch payroll record');
      }

      const data = await response.json();
      setSelectedRecord(data.record || null);
    } catch {
      setSelectedRecord(null);
      setToast({ type: 'error', message: 'Unable to load payroll breakdown.' });
    } finally {
      setLoadingRecord(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;

    const loadEmployees = async () => {
      setLoading(true);
      await fetchEmployees();
      if (!isCancelled) {
        setLoading(false);
      }
    };

    loadEmployees();
    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const loadMonthlyPayrollData = async () => {
      setLoading(true);
      await fetchMonthlyPayrollRecords(selectedMonth);
      if (!isCancelled) {
        setLoading(false);
      }
    };

    loadMonthlyPayrollData();
    return () => {
      isCancelled = true;
    };
  }, [selectedMonth]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    if (!selectedEmployeeId) {
      return;
    }

    if (isReadOnlyMonth && !hasSavedPayrollRecords) {
      setSelectedRecord(null);
      return;
    }

    fetchPayrollRecord(selectedEmployeeId, selectedMonth);
  }, [hasSavedPayrollRecords, isReadOnlyMonth, selectedEmployeeId, selectedMonth]);

  useEffect(() => () => {
    Object.values(debounceTimers.current).forEach((timer) => window.clearTimeout(timer));
  }, []);

  const runPayroll = async (employeeId: string, month: string) => {
    const response = await fetch(API_ENDPOINTS.PAYROLL.RUN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, month }),
    });

    if (!response.ok) {
      throw new Error('Failed to persist payroll record');
    }

    const data = await response.json();
    return data.record as PayrollRecord;
  };

  const persistEmployeeUpdate = async (
    employeeId: string,
    updates: Partial<Pick<Employee, 'grossSalary' | 'leaves' | 'advance'>>
  ) => {
    setSavingEmployeeIds((current) => (current.includes(employeeId) ? current : [...current, employeeId]));
    try {
      const patchResponse = await fetch(API_ENDPOINTS.PAYROLL.EMPLOYEE(employeeId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!patchResponse.ok) {
        throw new Error('Failed to update employee');
      }

      const patchData = await patchResponse.json();
      const payrollRecord = await runPayroll(employeeId, selectedMonth);

      setEmployees((current) =>
        current.map((employee) =>
          employee.employeeId === employeeId ? { ...employee, ...patchData.employee } : employee
        )
      );
      setMonthlyRecords((current) => {
        const existing = current.some((record) => record.employeeId === employeeId);
        if (existing) {
          return current.map((record) => (record.employeeId === employeeId ? payrollRecord : record));
        }
        return [...current, payrollRecord].sort((left, right) => left.employeeId.localeCompare(right.employeeId));
      });

      if (selectedEmployeeId === employeeId) {
        setSelectedRecord(payrollRecord);
      }
    } catch {
      setToast({ type: 'error', message: 'Failed to save payroll changes.' });
      await fetchEmployees();
    } finally {
      setSavingEmployeeIds((current) => current.filter((currentId) => currentId !== employeeId));
    }
  };

  const payrollSummary = useMemo(() => {
    const totalEmployees = displayedEmployees.length;
    const totalGrossSalary = displayedEmployees.reduce((sum, employee) => sum + employee.grossSalary, 0);
    const totalNetSalary = displayedEmployees.reduce((sum, employee) => sum + calculatePayroll(employee.grossSalary, employee.leaves, employee.advance).netSalary, 0);
    const totalCtc = displayedEmployees.reduce((sum, employee) => sum + calculatePayroll(employee.grossSalary, employee.leaves, employee.advance).ctc, 0);
    return {
      totalEmployees,
      totalGrossSalary,
      totalNetSalary,
      totalCtc,
    };
  }, [displayedEmployees]);

  const handleAddEmployee = async (input: AddEmployeeInput) => {
    try {
      const response = await fetch(API_ENDPOINTS.PAYROLL.EMPLOYEES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error('Failed to create employee');
      }

      const data = await response.json();
      setEmployees((current) => [...current, data.employee as Employee]);
      if (selectedMonth === currentPayrollMonth && data.payroll) {
        setMonthlyRecords((current) => [...current, data.payroll as PayrollRecord].sort((left, right) => left.employeeId.localeCompare(right.employeeId)));
      }
      setToast({ type: 'success', message: 'Employee added to payroll.' });
      return true;
    } catch {
      setToast({ type: 'error', message: 'Unable to create employee.' });
      return false;
    }
  };

  const handleUpdateEmployee = (employeeId: string, updates: Partial<Pick<Employee, 'grossSalary' | 'leaves'>>) => {
    if (isReadOnlyMonth) {
      return;
    }

    setEmployees((current) =>
      current.map((employee) => (employee.employeeId === employeeId ? { ...employee, ...updates } : employee))
    );

    if (debounceTimers.current[employeeId]) {
      window.clearTimeout(debounceTimers.current[employeeId]);
    }

    debounceTimers.current[employeeId] = window.setTimeout(() => {
      persistEmployeeUpdate(employeeId, updates);
    }, 400);
  };

  const handleOpenBreakdown = (employee: Employee) => {
    setSelectedEmployeeId(employee.employeeId);
    setSelectedRecord(null);
  };

  const handleSaveAdvance = async (advance: number) => {
    if (!selectedEmployee) {
      return;
    }

    setSavingAdvance(true);
    setEmployees((current) =>
      current.map((employee) =>
        employee.employeeId === selectedEmployee.employeeId ? { ...employee, advance } : employee
      )
    );

    await persistEmployeeUpdate(selectedEmployee.employeeId, { advance });
    setSavingAdvance(false);
  };

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] p-6 ml-16">
      {toast ? (
        <div className={`fixed top-6 right-6 z-[60] px-4 py-3 rounded-xl border text-sm font-medium shadow-lg ${toast.type === 'success' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-red-500/15 border-red-500/30 text-red-400'}`}>
          {toast.message}
        </div>
      ) : null}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-light tracking-tight">Payroll Management</h1>
          <p className="text-[var(--theme-text-muted)] text-sm mt-0.5">Manage employees, gross salary, leaves, advances, and monthly payroll records</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 rounded-xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/20 px-4 py-2.5 text-sm text-[var(--theme-text-muted)]">
            <span>Month</span>
            <select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="bg-transparent text-[var(--theme-text)] outline-none"
            >
              {monthOptions.map((month) => (
                <option key={month} value={month} className="bg-[var(--theme-bg-secondary)] text-[var(--theme-text)]">
                  {formatPayrollMonth(month)}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--theme-accent)] to-[var(--theme-accent-hover)] text-[var(--theme-bg)] text-sm font-semibold hover:shadow-lg transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />Add Employee
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border border-[var(--theme-accent)]/20 bg-[var(--theme-bg-secondary)] p-4">
          <div className="flex items-center gap-2 text-[var(--theme-text-muted)] text-xs uppercase tracking-wider mb-2">
            <Users className="w-4 h-4 text-[var(--theme-accent)]" />Employees
          </div>
          <div className="text-2xl font-semibold text-[var(--theme-text)]">{payrollSummary.totalEmployees}</div>
        </div>
        <div className="rounded-xl border border-[var(--theme-accent)]/20 bg-[var(--theme-bg-secondary)] p-4">
          <div className="flex items-center gap-2 text-[var(--theme-text-muted)] text-xs uppercase tracking-wider mb-2">
            <BadgeIndianRupee className="w-4 h-4 text-[var(--theme-accent)]" />Gross Payroll
          </div>
          <div className="text-xl font-semibold text-[var(--theme-text)]">{formatCurrency(payrollSummary.totalGrossSalary)}</div>
        </div>
        <div className="rounded-xl border border-[var(--theme-accent)]/20 bg-[var(--theme-bg-secondary)] p-4">
          <div className="flex items-center gap-2 text-[var(--theme-text-muted)] text-xs uppercase tracking-wider mb-2">
            <BadgeIndianRupee className="w-4 h-4 text-[var(--theme-accent)]" />Net Payroll
          </div>
          <div className="text-xl font-semibold text-[var(--theme-accent)]">{formatCurrency(payrollSummary.totalNetSalary)}</div>
        </div>
        <div className="rounded-xl border border-[var(--theme-accent)]/20 bg-[var(--theme-bg-secondary)] p-4">
          <div className="flex items-center gap-2 text-[var(--theme-text-muted)] text-xs uppercase tracking-wider mb-2">
            <Users className="w-4 h-4 text-[var(--theme-accent)]" />Total CTC
          </div>
          <div className="text-xl font-semibold text-[var(--theme-text)]">{formatCurrency(payrollSummary.totalCtc)}</div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--theme-accent)]/20 overflow-hidden bg-[var(--theme-bg)] shadow-sm">
        <div className="px-4 py-3 border-b border-[var(--theme-accent)]/10 bg-[var(--theme-bg-secondary)] flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--theme-text)]">Employee Payroll Table</h2>
            <p className="text-xs text-[var(--theme-text-muted)] mt-0.5">Gross salary, leaves, and advance flow into automatic salary and CTC calculations. Click a row for the full breakdown.</p>
          </div>
          <div className="text-xs text-[var(--theme-text-muted)]">{isReadOnlyMonth ? 'Historical months are read-only' : 'Manual leave entry persists automatically'}</div>
        </div>
        {selectedMonth !== currentPayrollMonth && !hasSavedPayrollRecords ? (
          <div className="px-4 py-3 border-b border-[var(--theme-accent)]/10 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-300">
            Payroll not generated for this month. Showing live employee payroll.
          </div>
        ) : null}
        {loading ? (
          <div className="px-4 py-12 text-center text-sm text-[var(--theme-text-muted)]">Loading payroll employees...</div>
        ) : (
          <EmployeeTable
            employees={displayedEmployees}
            savingEmployeeIds={savingEmployeeIds}
            isReadOnly={isReadOnlyMonth}
            onUpdateEmployee={handleUpdateEmployee}
            onSelectEmployee={handleOpenBreakdown}
          />
        )}
      </div>

      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddEmployee={handleAddEmployee}
      />

      <EmployeeBreakdownModal
        isOpen={selectedEmployee !== null}
        employee={selectedEmployee}
        month={selectedMonth}
        payrollRecord={selectedRecord}
        loading={loadingRecord}
        savingAdvance={savingAdvance}
        isReadOnly={isReadOnlyMonth}
        onClose={() => {
          setSelectedEmployeeId(null);
          setSelectedRecord(null);
        }}
        onSaveAdvance={handleSaveAdvance}
      />
    </div>
  );
}