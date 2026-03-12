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
        className="relative w-full max-w-lg rounded-2xl border border-[var(--theme-accent)]/20 bg-[var(--theme-bg-secondary)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--theme-accent)]/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[var(--theme-accent)]/20 to-[var(--theme-accent)]/5">
              <UserPlus className="w-5 h-5 text-[var(--theme-accent)]" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--theme-text)]">Add Employee</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--theme-bg-tertiary)] transition-colors">
            <X className="w-5 h-5 text-[var(--theme-text-muted)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-wider text-[var(--theme-text-muted)] mb-2">Employee Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter employee name"
              className="w-full rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-accent)]/20 px-4 py-3 text-sm text-[var(--theme-text)] outline-none focus:border-[var(--theme-accent)] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-[var(--theme-text-muted)] mb-2">Role</label>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Enter role"
              className="w-full rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-accent)]/20 px-4 py-3 text-sm text-[var(--theme-text)] outline-none focus:border-[var(--theme-accent)] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-[var(--theme-text-muted)] mb-2">Gross Salary</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={grossSalary}
              onChange={(e) => setGrossSalary(e.target.value)}
              placeholder="Enter gross salary"
              className="w-full rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-accent)]/20 px-4 py-3 text-sm text-[var(--theme-text)] outline-none focus:border-[var(--theme-accent)] transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[var(--theme-text-muted)] mb-2">Leaves</label>
              <input
                type="number"
                min="0"
                step="1"
                value={leaves}
                onChange={(e) => setLeaves(e.target.value)}
                placeholder="Enter leave days"
                className="w-full rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-accent)]/20 px-4 py-3 text-sm text-[var(--theme-text)] outline-none focus:border-[var(--theme-accent)] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-[var(--theme-text-muted)] mb-2">Advance</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={advance}
                onChange={(e) => setAdvance(e.target.value)}
                placeholder="Enter advance amount"
                className="w-full rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-accent)]/20 px-4 py-3 text-sm text-[var(--theme-text)] outline-none focus:border-[var(--theme-accent)] transition-colors"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-[var(--theme-accent)]/20 text-sm text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg-tertiary)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[var(--theme-accent)] to-[var(--theme-accent-hover)] text-[var(--theme-bg)] text-sm font-semibold hover:shadow-lg transition-all"
            >
              {saving ? 'Saving...' : 'Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}