import React, { useRef } from 'react';
import { Eye } from 'lucide-react';
import { ExpandableCard } from './ExpandableCard';
import { EditableText, EditableTextHandle } from './EditableText';
import { CardHeader } from './CardHeader';

interface EyeExaminationData {
  ocularMovements: string;
  adnexa: string;
  lids: string;
  conjunctiva: string;
  cornea: string;
  ac: string;
  iris: string;
  pupil: string;
  lens: string;
  antVitreous: string;
  fundus: string;
}

interface OphthalmologistExaminationCardProps {
  data?: any;
  updateData?: (path: (string | number)[], value: any) => void;
  isEditable?: boolean;
}

export function OphthalmologistExaminationCard({
  data,
  updateData,
  isEditable = true,
}: OphthalmologistExaminationCardProps) {
  // `data` is the ophthalmologistExamination sub-object. get() reads
  // relative keys from that object. updateField will propagate updates
  // to the parent `activePatientData` by prefixing the root key.
  const get = (keys: string[], def = '') => {
    try {
      let cur: any = data || {};
      for (const k of keys) {
        if (cur == null) return def;
        cur = cur[k];
      }
      return cur == null ? def : cur;
    } catch {
      return def;
    }
  };

  const updateField = (path: (string | number)[], value: any) => {
    if (!updateData) return;
    // Ensure we write into the top-level `ophthalmologistExamination` slot
    updateData(['ophthalmologistExamination', ...path], value);
  };

  const rowRefs = useRef<Record<string, EditableTextHandle | null>>({});

  const keys: (keyof EyeExaminationData)[] = [
    'ocularMovements',
    'adnexa',
    'lids',
    'conjunctiva',
    'cornea',
    'ac',
    'iris',
    'pupil',
    'lens',
    'antVitreous',
    'fundus',
  ];

  const cardContent = (
    <>
      <CardHeader icon={Eye} title="Ophthalmologist Exam" />
      <div className="space-y-2 flex-1">
        {/* Visual Acuity Summary */}
        <div className="bg-[#1a1a1a] rounded-lg p-2 border border-[#D4A574]">
          <div className="flex items-center justify-between">
            <span className="text-[#8B8B8B] text-xs">Visual Acuity</span>
            <div className="flex items-center gap-2">
              <EditableText
                value={get(['visualAcuity', 'od'], '6/6')}
                onSave={(val) =>
                  updateField(['visualAcuity', 'od'], val)
                }
                className="text-white text-sm text-center"
                isEditable={isEditable}
              />
              <span className="text-[#8B8B8B] text-sm">|</span>
              <EditableText
                value={get(['visualAcuity', 'os'], '6/9')}
                onSave={(val) =>
                  updateField(['visualAcuity', 'os'], val)
                }
                className="text-white text-sm text-center"
                isEditable={isEditable}
              />
            </div>
          </div>
        </div>

        {/* Lens OD */}
        <div className="bg-[#1a1a1a] rounded-lg p-2 border border-[#D4A574]">
          <div className="flex items-center justify-between">
            <span className="text-[#8B8B8B] text-xs">Lens OD</span>
            <EditableText
              value={get(['od', 'lens'], '')}
              onSave={(val) => updateField(['od', 'lens'], val)}
              className="text-white text-sm"
              isEditable={isEditable}
            />
          </div>
        </div>

        {/* Lens OS */}
        <div className="bg-[#1a1a1a] rounded-lg p-2 border border-[#D4A574]">
          <div className="flex items-center justify-between">
            <span className="text-[#8B8B8B] text-xs">Lens OS</span>
            <EditableText
              value={get(['os', 'lens'], '')}
              onSave={(val) => updateField(['os', 'lens'], val)}
              className="text-white text-sm"
              isEditable={isEditable}
            />
          </div>
        </div>
      </div>
    </>
  );

  const expandedContent = (
    <div className="space-y-6">
      {/* Visual Acuity */}
      <div>
        <h4 className="text-[#D4A574] mb-3 text-lg">Visual Acuity</h4>
        <div className="grid grid-cols-2 gap-6">
          {/* OD */}
          <div
            className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-4 flex items-center justify-between cursor-pointer hover:bg-[#222]"
            onClick={() => rowRefs.current['va-od']?.startEditing()}
          >
            <span className="text-[#8B8B8B] text-xs">OD (Right Eye)</span>
            <div className="w-24" onClick={(e) => e.stopPropagation()}>
              <EditableText
                ref={(el) => { rowRefs.current['va-od'] = el; }}
                value={get(['visualAcuity', 'od'], '6/6')}
                onSave={(val) =>
                  updateField(['visualAcuity', 'od'], val)
                }
                className="text-white text-sm !justify-end !text-right"
                isEditable={isEditable}
              />
            </div>
          </div>

          {/* OS */}
          <div
            className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-4 flex items-center justify-between cursor-pointer hover:bg-[#222]"
            onClick={() => rowRefs.current['va-os']?.startEditing()}
          >
            <span className="text-[#8B8B8B] text-xs">OS (Left Eye)</span>
            <div className="w-24" onClick={(e) => e.stopPropagation()}>
              <EditableText
                ref={(el) => { rowRefs.current['va-os'] = el; }}
                value={get(['visualAcuity', 'os'], '6/9')}
                onSave={(val) =>
                  updateField(['visualAcuity', 'os'], val)
                }
                className="text-white text-sm !justify-end !text-right"
                isEditable={isEditable}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Eye Examination */}
      <div>
        <h4 className="text-[#D4A574] mb-3 text-lg">Eye Examination</h4>
        <div className="grid grid-cols-2 gap-6">
          {/* OD (Right Eye) */}
          <div className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-5 space-y-1">
            <h5 className="text-[#D4A574] text-lg mb-4 border-b border-[#D4A574] pb-2">OD (Right Eye)</h5>
            {keys.map((key) => (
              <div
                key={String(key)}
                className="flex items-center justify-between py-2 border-b border-[#D4A574] border-opacity-50 last:border-0 cursor-pointer hover:bg-[#222]"
                onClick={() => rowRefs.current[`od-${key}`]?.startEditing()}
              >
                <span className="text-[#8B8B8B] text-xs capitalize">
                  {String(key).replace(/([A-Z])/g, ' $1')}
                </span>
                <div className="flex-1 max-w-[200px]" onClick={(e) => e.stopPropagation()}>
                  <EditableText
                    ref={(el) => { rowRefs.current[`od-${key}`] = el; }}
                    value={get(['od', String(key)], '')}
                    onSave={(val) =>
                      updateField(['od', String(key)], val)
                    }
                    className="text-white text-sm !justify-end !text-right"
                    isEditable={isEditable}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* OS (Left Eye) */}
          <div className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-5 space-y-1">
            <h5 className="text-[#D4A574] text-lg mb-4 border-b border-[#D4A574] pb-2">OS (Left Eye)</h5>
            {keys.map((key) => (
              <div
                key={String(key)}
                className="flex items-center justify-between py-2 border-b border-[#D4A574] border-opacity-50 last:border-0 cursor-pointer hover:bg-[#222]"
                onClick={() => rowRefs.current[`os-${key}`]?.startEditing()}
              >
                <span className="text-[#8B8B8B] text-xs capitalize">
                  {String(key).replace(/([A-Z])/g, ' $1')}
                </span>
                <div className="flex-1 max-w-[200px]" onClick={(e) => e.stopPropagation()}>
                  <EditableText
                    ref={(el) => { rowRefs.current[`os-${key}`] = el; }}
                    value={get(['os', String(key)], '')}
                    onSave={(val) =>
                      updateField(['os', String(key)], val)
                    }
                    className="text-white text-sm !justify-end !text-right"
                    isEditable={isEditable}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Abbreviations */}
      <div className="bg-[#0a0a0a] border border-[#D4A574] rounded-lg p-4">
        <h5 className="text-[#8B8B8B] text-sm mb-2">Abbreviations</h5>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <p className="text-white">• C/D: Cup to Disc Ratio</p>
          <p className="text-white">• AC: Anterior Chamber</p>
          <p className="text-white">• RAPD: Relative Afferent Pupillary Defect</p>
          <p className="text-white">• OD: Right Eye (Oculus Dexter)</p>
          <p className="text-white">• OS: Left Eye (Oculus Sinister)</p>
        </div>
      </div>
    </div>
  );

  return (
    <ExpandableCard title="Ophthalmologist Examination" expandedContent={expandedContent}>
      {cardContent}
    </ExpandableCard>
  );
}
