import { useRef } from 'react';
import { Stethoscope } from 'lucide-react';
import { ExpandableCard } from './ExpandableCard';
import { EditableText, EditableTextHandle } from './EditableText';
import { CardHeader } from './CardHeader';
import { SystemicInvestigationsData } from './patient';

interface SystemicInvestigationsCardProps {
  data?: SystemicInvestigationsData;
  updateData?: (path: (string | number)[], value: any) => void;
  isEditable?: boolean;
}

const defaultVitals = {
  bp: { value: '120/80', unit: 'mmHg', notes: '' },
  rp: { value: '', unit: '', notes: '' },
  rbs: { value: '', unit: 'mg/dL', notes: '' },
  pulse: { value: '72', unit: 'bpm', notes: '' }
};

const defaultOtherTests = [
  { name: 'Chest X-Ray', date: '', findings: '', status: 'Pending' },
  { name: 'ECG', date: '', findings: '', status: 'Pending' }
];

export function SystemicInvestigationsCard({ data, updateData, isEditable = false }: SystemicInvestigationsCardProps) {
  const fieldRefs = useRef<{ [key: string]: EditableTextHandle | null }>({});
  const vitals = data?.vitals || defaultVitals;
  const otherTests = data?.otherTests || defaultOtherTests;

  const setField = (path: (string | number)[], value: any) => {
    if (!updateData) return;
    updateData(['systemicInvestigations', ...path], value);
  };

  const updateOtherTest = (index: number, field: 'name' | 'date' | 'findings' | 'status', value: string) => {
    try {
      const current = data?.otherTests || defaultOtherTests;
      const updated = current.map((t, i) => i === index ? ({ ...t, [field]: value }) : t);
      setField(['otherTests'], updated);
    } catch (e) {
      console.error('Failed to update other test', e);
    }
  };

  const cardContent = (
    <>
      <CardHeader icon={Stethoscope} title="Systemic Investigations" />
      <div className="space-y-2 flex-1">
        <div className="bg-[#1a1a1a] rounded-lg p-2 border border-[#D4A574]">
          <div className="flex items-center justify-between">
            <span className="text-[#8B8B8B] text-xs">BP</span>
            <span className="text-white text-sm">{vitals?.bp?.value || 'N/A'}</span>
          </div>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-2 border border-[#D4A574]">
          <div className="flex items-center justify-between">
            <span className="text-[#8B8B8B] text-xs">Pulse</span>
            <span className="text-white text-sm">{vitals?.pulse?.value || 'N/A'}</span>
          </div>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-2 border border-[#D4A574]">
          <div className="flex items-center justify-between">
            <span className="text-[#8B8B8B] text-xs">RBS</span>
            <span className="text-white text-sm">{vitals?.rbs?.value || 'N/A'}</span>
          </div>
        </div>
      </div>
    </>
  );

  const expandedContent = (
    <div className="space-y-6">
      <div>
        <h4 className="text-[#D4A574] text-lg mb-3">Vital Signs</h4>
        <div className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="text-[#8B8B8B] text-xs mb-2 block">BP (mmHg)</label>
              <div
                className="cursor-pointer hover:bg-[#2a2a2a] transition-colors p-1 rounded"
                onClick={() => fieldRefs.current['vitals-bp-value']?.startEditing()}
              >
                <EditableText
                  ref={(el) => { fieldRefs.current['vitals-bp-value'] = el; }}
                  value={(vitals?.bp?.value as string) || ''}
                  onSave={(val) => setField(['vitals', 'bp', 'value'], val)}
                  className="text-white text-sm !justify-start !text-left"
                  isEditable={isEditable}
                  placeholder="120/80"
                />
              </div>
            </div>
            <div>
              <label className="text-[#8B8B8B] text-xs mb-2 block">RP</label>
              <div
                className="cursor-pointer hover:bg-[#2a2a2a] transition-colors p-1 rounded"
                onClick={() => fieldRefs.current['vitals-rp-value']?.startEditing()}
              >
                <EditableText
                  ref={(el) => { fieldRefs.current['vitals-rp-value'] = el; }}
                  value={(vitals?.rp?.value as string) || ''}
                  onSave={(val) => setField(['vitals', 'rp', 'value'], val)}
                  className="text-white text-sm !justify-start !text-left"
                  isEditable={isEditable}
                  placeholder="--"
                />
              </div>
            </div>
            <div>
              <label className="text-[#8B8B8B] text-xs mb-2 block">RBS (mg/dL)</label>
              <div
                className="cursor-pointer hover:bg-[#2a2a2a] transition-colors p-1 rounded"
                onClick={() => fieldRefs.current['vitals-rbs-value']?.startEditing()}
              >
                <EditableText
                  ref={(el) => { fieldRefs.current['vitals-rbs-value'] = el; }}
                  value={(vitals?.rbs?.value as string) || ''}
                  onSave={(val) => setField(['vitals', 'rbs', 'value'], val)}
                  className="text-white text-sm !justify-start !text-left"
                  isEditable={isEditable}
                  placeholder="--"
                />
              </div>
            </div>
            <div>
              <label className="text-[#8B8B8B] text-xs mb-2 block">Pulse (bpm)</label>
              <div
                className="cursor-pointer hover:bg-[#2a2a2a] transition-colors p-1 rounded"
                onClick={() => fieldRefs.current['vitals-pulse-value']?.startEditing()}
              >
                <EditableText
                  ref={(el) => { fieldRefs.current['vitals-pulse-value'] = el; }}
                  value={(vitals?.pulse?.value as string) || ''}
                  onSave={(val) => setField(['vitals', 'pulse', 'value'], val)}
                  className="text-white text-sm !justify-start !text-left"
                  isEditable={isEditable}
                  placeholder="72"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#D4A574]">
            <label className="text-[#8B8B8B] text-xs mb-2 block">Notes</label>
            <div
              className="cursor-pointer hover:bg-[#2a2a2a] transition-colors p-1 rounded"
              onClick={() => fieldRefs.current['vitals-bp-notes']?.startEditing()}
            >
              <EditableText
                ref={(el) => { fieldRefs.current['vitals-bp-notes'] = el; }}
                value={(vitals?.bp?.notes as string) || ''}
                onSave={(val) => setField(['vitals', 'bp', 'notes'], val)}
                className="text-white text-sm !justify-start !text-left"
                isEditable={isEditable}
                placeholder="Additional observations..."
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-[#D4A574] text-lg mb-3">Other Investigations</h4>
        <div className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#D4A574] bg-opacity-20">
                <th className="text-left p-3 text-[#8B8B8B] border-r border-[#D4A574] text-xs uppercase tracking-wider">Investigation</th>
                <th className="text-center p-3 text-[#8B8B8B] border-r border-[#D4A574] text-xs uppercase tracking-wider">Date</th>
                <th className="text-center p-3 text-[#8B8B8B] border-r border-[#D4A574] text-xs uppercase tracking-wider">Findings</th>
                <th className="text-center p-3 text-[#8B8B8B] text-xs uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {otherTests.map((test, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-[#121212]' : 'bg-[#1a1a1a]'}>
                  <td
                    className="p-3 text-white border-r border-[#D4A574] cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                    onClick={() => fieldRefs.current[`other-test-${index}-name`]?.startEditing()}
                  >
                    <EditableText
                      ref={(el) => { fieldRefs.current[`other-test-${index}-name`] = el; }}
                      value={test.name}
                      onSave={(val) => updateOtherTest(index, 'name', val)}
                      className="text-white text-sm !justify-start !text-left"
                      isEditable={isEditable}
                    />
                  </td>
                  <td
                    className="p-3 text-center border-r border-[#D4A574] cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                    onClick={() => fieldRefs.current[`other-test-${index}-date`]?.startEditing()}
                  >
                    <EditableText
                      ref={(el) => { fieldRefs.current[`other-test-${index}-date`] = el; }}
                      value={test.date}
                      onSave={(val) => updateOtherTest(index, 'date', val)}
                      className="text-white text-sm !justify-center !text-center"
                      isEditable={isEditable}
                    />
                  </td>
                  <td
                    className="p-3 text-center border-r border-[#D4A574] cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                    onClick={() => fieldRefs.current[`other-test-${index}-findings`]?.startEditing()}
                  >
                    <EditableText
                      ref={(el) => { fieldRefs.current[`other-test-${index}-findings`] = el; }}
                      value={test.findings}
                      onSave={(val) => updateOtherTest(index, 'findings', val)}
                      className="text-white text-sm !justify-center !text-center"
                      isEditable={isEditable}
                    />
                  </td>
                  <td className="p-3 text-center">
                    <span className="px-3 py-1 rounded bg-[#4CAF50] bg-opacity-30 text-[#4CAF50] text-xs">
                      {test.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <ExpandableCard title="Systemic Investigations" expandedContent={expandedContent}>
      {cardContent}
    </ExpandableCard>
  );
}
