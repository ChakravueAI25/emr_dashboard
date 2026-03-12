import { useEffect, useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import type { AddEmployeeInput } from './payrollTypes';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEmployee: (input: AddEmployeeInput) => Promise<boolean>;
}

export function AddEmployeeModal({ isOpen, onClose, onAddEmployee }: AddEmployeeModalProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [grossSalary, setGrossSalary] = useState('');
  const [leaves, setLeaves] = useState('0');
  const [advance, setAdvance] = useState('0');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setRole('');
      setGrossSalary('');
      setLeaves('0');
      setAdvance('0');
      setSaving(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedSalary = Number(grossSalary);
    const parsedLeaves = Math.max(Number(leaves) || 0, 0);
    const parsedAdvance = Math.max(Number(advance) || 0, 0);
    if (!name.trim() || !role.trim() || Number.isNaN(parsedSalary) || parsedSalary <= 0) {
      return;
    }

    setSaving(true);
    const success = await onAddEmployee({
      name: name.trim(),
      role: role.trim(),
      grossSalary: parsedSalary,
      leaves: parsedLeaves,
      advance: parsedAdvance,
    });
    setSaving(false);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-[var(--theme-accent)]/20 bg-[var(--theme-bg-secondary)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--theme-accent)]/10 px-7 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-[var(--theme-accent)]/20 to-[var(--theme-accent)]/5 p-2.5">
              <UserPlus className="h-6 w-6 text-[var(--theme-accent)]" />
            </div>
            <h2 className="text-2xl font-semibold text-[var(--theme-text)]">Add Employee</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--theme-bg-tertiary)] transition-colors">
            <X className="w-5 h-5 text-[var(--theme-text-muted)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-7">
          <div>
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-[var(--theme-text-muted)]">Employee Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter employee name"
              className="w-full rounded-xl border border-[var(--theme-accent)]/20 bg-[var(--theme-bg)] px-4 py-3.5 text-base text-[var(--theme-text)] outline-none transition-colors focus:border-[var(--theme-accent)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-[var(--theme-text-muted)]">Role</label>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Enter role"
              className="w-full rounded-xl border border-[var(--theme-accent)]/20 bg-[var(--theme-bg)] px-4 py-3.5 text-base text-[var(--theme-text)] outline-none transition-colors focus:border-[var(--theme-accent)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-[var(--theme-text-muted)]">Gross Salary</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={grossSalary}
              onChange={(e) => setGrossSalary(e.target.value)}
              placeholder="Enter gross salary"
              className="w-full rounded-xl border border-[var(--theme-accent)]/20 bg-[var(--theme-bg)] px-4 py-3.5 text-base text-[var(--theme-text)] outline-none transition-colors focus:border-[var(--theme-accent)]"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-[var(--theme-text-muted)]">Leaves</label>
              <input
                type="number"
                min="0"
                step="1"
                value={leaves}
                onChange={(e) => setLeaves(e.target.value)}
                placeholder="Enter leave days"
                className="w-full rounded-xl border border-[var(--theme-accent)]/20 bg-[var(--theme-bg)] px-4 py-3.5 text-base text-[var(--theme-text)] outline-none transition-colors focus:border-[var(--theme-accent)]"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-[var(--theme-text-muted)]">Advance</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={advance}
                onChange={(e) => setAdvance(e.target.value)}
                placeholder="Enter advance amount"
                className="w-full rounded-xl border border-[var(--theme-accent)]/20 bg-[var(--theme-bg)] px-4 py-3.5 text-base text-[var(--theme-text)] outline-none transition-colors focus:border-[var(--theme-accent)]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-[var(--theme-accent)]/20 px-5 py-3 text-base text-[var(--theme-text-muted)] transition-colors hover:bg-[var(--theme-bg-tertiary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-[var(--theme-accent)] to-[var(--theme-accent-hover)] px-6 py-3 text-base font-semibold text-[var(--theme-bg)] transition-all hover:shadow-lg"
            >
              {saving ? 'Saving...' : 'Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}