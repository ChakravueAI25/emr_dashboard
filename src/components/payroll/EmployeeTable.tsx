import type { Employee } from './payrollTypes';
import { calculatePayroll, formatCurrency } from './payrollUtils';

interface EmployeeTableProps {
  employees: Employee[];
  savingEmployeeIds: string[];
  isReadOnly: boolean;
  onUpdateEmployee: (employeeId: string, updates: Partial<Pick<Employee, 'grossSalary' | 'leaves'>>) => void;
  onSelectEmployee: (employee: Employee) => void;
}

export function EmployeeTable({ employees, savingEmployeeIds, isReadOnly, onUpdateEmployee, onSelectEmployee }: EmployeeTableProps) {
  if (employees.length === 0) {
    return (
      <div className="px-6 py-14 text-center text-base text-[var(--theme-text-muted)]">
        No employees added yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-[var(--theme-bg-secondary)] border-b border-[var(--theme-accent)]/10">
            <th className="px-5 py-4 text-sm uppercase tracking-wider text-[var(--theme-text-muted)] font-medium">Employee ID</th>
            <th className="px-5 py-4 text-sm uppercase tracking-wider text-[var(--theme-text-muted)] font-medium">Name</th>
            <th className="px-5 py-4 text-sm uppercase tracking-wider text-[var(--theme-text-muted)] font-medium">Role</th>
            <th className="px-5 py-4 text-sm uppercase tracking-wider text-[var(--theme-text-muted)] font-medium">Gross Salary</th>
            <th className="px-5 py-4 text-sm uppercase tracking-wider text-[var(--theme-text-muted)] font-medium">Leaves</th>
            <th className="px-5 py-4 text-sm uppercase tracking-wider text-[var(--theme-text-muted)] font-medium text-right">Net Salary</th>
            <th className="px-5 py-4 text-sm uppercase tracking-wider text-[var(--theme-text-muted)] font-medium text-right">CTC</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--theme-accent)]/10">
          {employees.map((employee) => {
            const breakdown = calculatePayroll(employee.grossSalary, employee.leaves, employee.advance);
            const isSaving = savingEmployeeIds.includes(employee.employeeId);

            return (
              <tr
                key={employee.employeeId}
                onClick={() => onSelectEmployee(employee)}
                className="cursor-pointer hover:bg-[var(--theme-bg-secondary)]/50 transition-colors"
              >
                <td className="px-5 py-4 text-base font-mono text-[var(--theme-text-muted)]">
                  <div className="flex items-center gap-2">
                    <span>{employee.employeeId}</span>
                    {isSaving ? <span className="text-xs uppercase tracking-wider text-[var(--theme-accent)]">Saving</span> : null}
                  </div>
                </td>
                <td className="px-5 py-4 text-base font-medium text-[var(--theme-text)]">{employee.name}</td>
                <td className="px-5 py-4 text-base text-[var(--theme-text-muted)]">{employee.role}</td>
                <td className="px-5 py-4 text-base">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={employee.grossSalary}
                    disabled={isReadOnly}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onUpdateEmployee(employee.employeeId, { grossSalary: Number(e.target.value) || 0 })}
                    className="h-12 w-40 rounded-lg bg-[var(--theme-bg)] border border-[var(--theme-accent)]/20 px-4 py-2 text-base text-[var(--theme-text)] outline-none focus:border-[var(--theme-accent)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </td>
                <td className="px-5 py-4 text-base">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={employee.leaves}
                    disabled={isReadOnly}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onUpdateEmployee(employee.employeeId, { leaves: Math.max(Number(e.target.value) || 0, 0) })}
                    className="h-12 w-28 rounded-lg bg-[var(--theme-bg)] border border-[var(--theme-accent)]/20 px-4 py-2 text-base text-[var(--theme-text)] outline-none focus:border-[var(--theme-accent)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </td>
                <td className="px-5 py-4 text-base text-right font-semibold text-[var(--theme-accent)]">{formatCurrency(breakdown.netSalary)}</td>
                <td className="px-5 py-4 text-base text-right font-semibold text-[var(--theme-text)]">{formatCurrency(breakdown.ctc)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}