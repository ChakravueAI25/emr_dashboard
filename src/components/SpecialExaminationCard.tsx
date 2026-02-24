// SpecialExaminationCard.tsx
import React, { useMemo, useRef } from 'react';
import { ScanEye, Microscope, Trash2, Plus, Check, X } from 'lucide-react';
import { ExpandableCard } from './ExpandableCard';
import { EditableText, EditableTextHandle } from './EditableText';
import { CardHeader } from './CardHeader';

/**
 * SpecialExaminationCard
 *
 * Editable fields:
 * - indirectOphthalmoscopy.od / os
 * - gonioscopy.od / os
 * - slitLamp.{od|os}.{cornea, ac, lens, vitreous}
 * - pachymetry.od / os
 * - specularMicroscopy.od / os
 * - otherExams: table with add / edit / delete / toggle performed
 *
 * This component expects:
 *  - data: the `specialExamination` object from patient data (may be undefined)
 *  - updateData: function(path: (string|number)[], value: any) => void
 *  - isEditable: boolean (determines if editing is allowed)
 *
 * IMPORTANT: when calling updateData we prefix with ['specialExamination', ...path]
 * so the parent update function can set the right subtree in the main patient object.
 */

type ExamRow = {
  id?: string | number;
  name: string;
  findings: string;
  performed?: boolean;
};

interface SpecialExaminationCardProps {
  data?: any;
  updateData?: (path: (string | number)[], value: any) => void;
  isEditable?: boolean;
}

export function SpecialExaminationCard({
  data,
  updateData,
  isEditable = false,
}: SpecialExaminationCardProps) {
  const fieldRefs = useRef<{ [key: string]: EditableTextHandle | null }>({});

  // Safe getter with path traversal
  const get = (keys: string[], def: any = undefined) => {
    try {
      let cur: any = data || {};
      for (const k of keys) {
        if (cur == null) return def;
        cur = cur[k];
      }
      return cur === undefined ? def : cur;
    } catch {
      return def;
    }
  };

  // Generic wrapper to call parent's updateData with prefix 'specialExamination'
  const updateField = (path: (string | number)[], value: any) => {
    if (!updateData) return;
    updateData(['specialExamination', ...path], value);
  };

  // Provide safe defaults when a subtree is missing
  const indirectOphthalmoscopy: { od: string; os: string } = get(
    ['indirectOphthalmoscopy'],
    { od: 'Retina attached, no holes/tears, normal periphery', os: 'Retina attached, no holes/tears, normal periphery' }
  );

  const gonioscopy: { od: string; os: string } = get(
    ['gonioscopy'],
    { od: 'Open angle, Grade 4, No PAS, Pigmentation minimal', os: 'Open angle, Grade 4, No PAS, Pigmentation minimal' }
  );

  const slitLamp: any = get(
    ['slitLamp'],
    {
      od: { cornea: 'Clear, no deposits', ac: 'Deep, no cells/flare', lens: 'Clear', vitreous: 'Clear, no floaters' },
      os: { cornea: 'Clear, no deposits', ac: 'Deep, no cells/flare', lens: 'Early nuclear sclerosis', vitreous: 'Clear, few floaters' },
    }
  );

  const pachymetry: { od: string; os: string } = get(
    ['pachymetry'],
    { od: '545 Î¼m', os: '548 Î¼m' }
  );

  const specularMicroscopy: { od: string; os: string } = get(
    ['specularMicroscopy'],
    { od: 'ECD: 2500 cells/mmÂ², Normal morphology', os: 'ECD: 2480 cells/mmÂ², Normal morphology' }
  );

  const otherExams: ExamRow[] = get(
    ['otherExams'],
    [
      { id: 1, name: 'A-Scan Biometry', findings: 'Axial length OD: 23.5mm, OS: 23.8mm', performed: true },
      { id: 2, name: 'Keratometry', findings: 'OD: 42.5/43.0 @ 90Â°, OS: 42.8/43.2 @ 95Â°', performed: true },
    ]
  );

  // Generate a stable next id for new rows (simple numeric id fallback)
  const nextOtherExamId = useMemo(() => {
    if (!Array.isArray(otherExams) || otherExams.length === 0) return 1;
    const ids = otherExams.map((r) => (typeof r.id === 'number' ? r.id : NaN)).filter((n) => !isNaN(n));
    const max = ids.length ? Math.max(...ids) : 0;
    return max + 1;
  }, [otherExams]);

  // --- Table helpers for otherExams --- //
  const handleAddOtherExam = (anchorName?: string) => {
    const newRow: ExamRow = {
      id: nextOtherExamId,
      name: anchorName || 'New Exam',
      findings: '',
      performed: false,
    };
    const updated = Array.isArray(otherExams) ? [...otherExams, newRow] : [newRow];
    updateField(['otherExams'], updated);
  };

  const handleDeleteOtherExam = (index: number) => {
    if (!Array.isArray(otherExams)) return;
    const updated = otherExams.slice();
    updated.splice(index, 1);
    updateField(['otherExams'], updated);
  };

  const handleUpdateOtherExam = (index: number, changes: Partial<ExamRow>) => {
    const updated = Array.isArray(otherExams) ? otherExams.slice() : [];
    updated[index] = { ...updated[index], ...changes };
    updateField(['otherExams'], updated);
  };

  const handleTogglePerformed = (index: number) => {
    const row = otherExams[index];
    handleUpdateOtherExam(index, { performed: !row?.performed });
  };

  // Utility: used by EditableText to prevent edit when isEditable false
  const editableProp = isEditable;

  // Card content for collapsed state
  const cardContent = (
    <>
      <CardHeader icon={ScanEye} title="Special Examinations" />

      {/* Three small summary boxes */}
      <div className="space-y-2 flex-1">
        <div className="bg-[#1a1a1a] rounded-lg p-2 border border-[#D4A574]">
          <div className="flex items-center justify-between">
            <span className="text-[#8B8B8B] text-xs">Indirect Ophthalmoscopy</span>
            <span className="text-[#4CAF50] text-xs">Done</span>
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-lg p-2 border border-[#D4A574]">
          <div className="flex items-center justify-between">
            <span className="text-[#8B8B8B] text-xs">Gonioscopy</span>
            <span className="text-[#4CAF50] text-xs">Done</span>
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-lg p-2 border border-[#D4A574]">
          <div className="flex items-center justify-between">
            <span className="text-[#8B8B8B] text-xs">Slit Lamp</span>
            <span className="text-white text-xs">Examined</span>
          </div>
        </div>
      </div>
    </>
  );

  // Expanded content for full editing / display
  const expandedContent = (
    <div className="space-y-6">
      {/* Indirect Ophthalmoscopy */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ScanEye className="w-4 h-4 text-[#D4A574]" />
          <h4 className="text-[#D4A574] text-lg">Indirect Ophthalmoscopy</h4>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div
            className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-3 cursor-pointer hover:border-[#D4A574] transition-colors"
            onClick={() => fieldRefs.current['indirect-od']?.startEditing()}
          >
            <div className="mb-2">
              <span className="text-[#8B8B8B] text-xs">OD (Right Eye)</span>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <EditableText
                ref={(el) => { fieldRefs.current['indirect-od'] = el; }}
                value={indirectOphthalmoscopy.od}
                onSave={(val) => updateField(['indirectOphthalmoscopy', 'od'], val)}
                className="text-white text-sm"
                placeholder="Enter OD findings"
                isEditable={editableProp}
              />
            </div>
          </div>

          <div
            className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-3 cursor-pointer hover:border-[#D4A574] transition-colors"
            onClick={() => fieldRefs.current['indirect-os']?.startEditing()}
          >
            <div className="mb-2">
              <span className="text-[#8B8B8B] text-xs">OS (Left Eye)</span>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <EditableText
                ref={(el) => { fieldRefs.current['indirect-os'] = el; }}
                value={indirectOphthalmoscopy.os}
                onSave={(val) => updateField(['indirectOphthalmoscopy', 'os'], val)}
                className="text-white text-sm"
                placeholder="Enter OS findings"
                isEditable={editableProp}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Gonioscopy */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Microscope className="w-4 h-4 text-[#D4A574]" />
          <h4 className="text-[#D4A574] text-lg">Gonioscopy (Angle Assessment)</h4>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div
            className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-3 cursor-pointer hover:border-[#D4A574] transition-colors"
            onClick={() => fieldRefs.current['gonioscopy-od']?.startEditing()}
          >
            <div className="mb-2">
              <span className="text-[#8B8B8B] text-xs">OD (Right Eye)</span>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <EditableText
                ref={(el) => { fieldRefs.current['gonioscopy-od'] = el; }}
                value={gonioscopy.od}
                onSave={(val) => updateField(['gonioscopy', 'od'], val)}
                className="text-white text-sm"
                placeholder="Enter OD gonioscopy"
                isEditable={editableProp}
              />
            </div>
          </div>

          <div
            className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-3 cursor-pointer hover:border-[#D4A574] transition-colors"
            onClick={() => fieldRefs.current['gonioscopy-os']?.startEditing()}
          >
            <div className="mb-2">
              <span className="text-[#8B8B8B] text-xs">OS (Left Eye)</span>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <EditableText
                ref={(el) => { fieldRefs.current['gonioscopy-os'] = el; }}
                value={gonioscopy.os}
                onSave={(val) => updateField(['gonioscopy', 'os'], val)}
                className="text-white text-sm"
                placeholder="Enter OS gonioscopy"
                isEditable={editableProp}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Slit Lamp */}
      <div>
        <h4 className="text-[#D4A574] text-lg mb-3">Slit Lamp Biomicroscopy</h4>

        <div className="grid grid-cols-2 gap-4">
          {/* OD */}
          <div className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-4">
            <h5 className="text-[#D4A574] text-lg mb-3">OD (Right Eye)</h5>
            <div className="space-y-4">
              <div>
                <div className="text-[#8B8B8B] text-xs mb-1">Cornea</div>
                <div
                  className="cursor-pointer hover:bg-[#2a2a2a] transition-colors p-1 rounded"
                  onClick={() => fieldRefs.current['slitLamp-od-cornea']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['slitLamp-od-cornea'] = el; }}
                    value={slitLamp.od?.cornea || ''}
                    onSave={(val) => updateField(['slitLamp', 'od', 'cornea'], val)}
                    className="text-white text-sm"
                    placeholder="Cornea findings"
                    isEditable={editableProp}
                  />
                </div>
              </div>

              <div>
                <div className="text-[#8B8B8B] text-xs mb-1">Anterior Chamber</div>
                <div
                  className="cursor-pointer hover:bg-[#2a2a2a] transition-colors p-1 rounded"
                  onClick={() => fieldRefs.current['slitLamp-od-ac']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['slitLamp-od-ac'] = el; }}
                    value={slitLamp.od?.ac || ''}
                    onSave={(val) => updateField(['slitLamp', 'od', 'ac'], val)}
                    className="text-white text-sm"
                    placeholder="Anterior chamber findings"
                    isEditable={editableProp}
                  />
                </div>
              </div>

              <div>
                <div className="text-[#8B8B8B] text-xs mb-1">Lens</div>
                <div
                  className="cursor-pointer hover:bg-[#2a2a2a] transition-colors p-1 rounded"
                  onClick={() => fieldRefs.current['slitLamp-od-lens']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['slitLamp-od-lens'] = el; }}
                    value={slitLamp.od?.lens || ''}
                    onSave={(val) => updateField(['slitLamp', 'od', 'lens'], val)}
                    className="text-white text-sm"
                    placeholder="Lens findings"
                    isEditable={editableProp}
                  />
                </div>
              </div>

              <div>
                <div className="text-[#8B8B8B] text-xs mb-1">Vitreous</div>
                <div
                  className="cursor-pointer hover:bg-[#2a2a2a] transition-colors p-1 rounded"
                  onClick={() => fieldRefs.current['slitLamp-od-vitreous']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['slitLamp-od-vitreous'] = el; }}
                    value={slitLamp.od?.vitreous || ''}
                    onSave={(val) => updateField(['slitLamp', 'od', 'vitreous'], val)}
                    className="text-white text-sm"
                    placeholder="Vitreous findings"
                    isEditable={editableProp}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* OS */}
          <div className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-4">
            <h5 className="text-[#D4A574] text-lg mb-3">OS (Left Eye)</h5>
            <div className="space-y-4">
              <div>
                <div className="text-[#8B8B8B] text-xs mb-1">Cornea</div>
                <div
                  className="cursor-pointer hover:bg-[#2a2a2a] transition-colors p-1 rounded"
                  onClick={() => fieldRefs.current['slitLamp-os-cornea']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['slitLamp-os-cornea'] = el; }}
                    value={slitLamp.os?.cornea || ''}
                    onSave={(val) => updateField(['slitLamp', 'os', 'cornea'], val)}
                    className="text-white text-sm"
                    placeholder="Cornea findings"
                    isEditable={editableProp}
                  />
                </div>
              </div>

              <div>
                <div className="text-[#8B8B8B] text-xs mb-1">Anterior Chamber</div>
                <div
                  className="cursor-pointer hover:bg-[#2a2a2a] transition-colors p-1 rounded"
                  onClick={() => fieldRefs.current['slitLamp-os-ac']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['slitLamp-os-ac'] = el; }}
                    value={slitLamp.os?.ac || ''}
                    onSave={(val) => updateField(['slitLamp', 'os', 'ac'], val)}
                    className="text-white text-sm"
                    placeholder="Anterior chamber findings"
                    isEditable={editableProp}
                  />
                </div>
              </div>

              <div>
                <div className="text-[#8B8B8B] text-xs mb-1">Lens</div>
                <div
                  className="cursor-pointer hover:bg-[#2a2a2a] transition-colors p-1 rounded"
                  onClick={() => fieldRefs.current['slitLamp-os-lens']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['slitLamp-os-lens'] = el; }}
                    value={slitLamp.os?.lens || ''}
                    onSave={(val) => updateField(['slitLamp', 'os', 'lens'], val)}
                    className="text-white text-sm"
                    placeholder="Lens findings"
                    isEditable={editableProp}
                  />
                </div>
              </div>

              <div>
                <div className="text-[#8B8B8B] text-xs mb-1">Vitreous</div>
                <div
                  className="cursor-pointer hover:bg-[#2a2a2a] transition-colors p-1 rounded"
                  onClick={() => fieldRefs.current['slitLamp-os-vitreous']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['slitLamp-os-vitreous'] = el; }}
                    value={slitLamp.os?.vitreous || ''}
                    onSave={(val) => updateField(['slitLamp', 'os', 'vitreous'], val)}
                    className="text-white text-sm"
                    placeholder="Vitreous findings"
                    isEditable={editableProp}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pachymetry */}
      <div>
        <h4 className="text-[#D4A574] text-lg mb-3">Pachymetry (Corneal Thickness)</h4>

        <div className="grid grid-cols-2 gap-4">
          <div
            className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-3 cursor-pointer hover:border-[#D4A574] transition-colors"
            onClick={() => fieldRefs.current['pachymetry-od']?.startEditing()}
          >
            <div className="flex items-center justify-between">
              <span className="text-[#8B8B8B] text-xs">OD (Right Eye)</span>
              <div onClick={(e) => e.stopPropagation()}>
                <EditableText
                  ref={(el) => { fieldRefs.current['pachymetry-od'] = el; }}
                  value={pachymetry.od}
                  onSave={(val) => updateField(['pachymetry', 'od'], val)}
                  className="text-white text-sm text-right"
                  placeholder="e.g., 545 Î¼m"
                  isEditable={editableProp}
                />
              </div>
            </div>
          </div>

          <div
            className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-3 cursor-pointer hover:border-[#D4A574] transition-colors"
            onClick={() => fieldRefs.current['pachymetry-os']?.startEditing()}
          >
            <div className="flex items-center justify-between">
              <span className="text-[#8B8B8B] text-xs">OS (Left Eye)</span>
              <div onClick={(e) => e.stopPropagation()}>
                <EditableText
                  ref={(el) => { fieldRefs.current['pachymetry-os'] = el; }}
                  value={pachymetry.os}
                  onSave={(val) => updateField(['pachymetry', 'os'], val)}
                  className="text-white text-sm text-right"
                  placeholder="e.g., 548 Î¼m"
                  isEditable={editableProp}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Specular Microscopy */}
      <div>
        <h4 className="text-[#D4A574] text-lg mb-3">Specular Microscopy (Endothelial Cell Count)</h4>

        <div className="grid grid-cols-2 gap-4">
          <div
            className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-3 cursor-pointer hover:border-[#D4A574] transition-colors"
            onClick={() => fieldRefs.current['specular-od']?.startEditing()}
          >
            <div className="mb-2">
              <span className="text-[#8B8B8B] text-xs">OD (Right Eye)</span>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <EditableText
                ref={(el) => { fieldRefs.current['specular-od'] = el; }}
                value={specularMicroscopy.od}
                onSave={(val) => updateField(['specularMicroscopy', 'od'], val)}
                className="text-white text-sm"
                placeholder="e.g., ECD: 2500 cells/mmÂ², Normal morphology"
                isEditable={editableProp}
              />
            </div>
          </div>

          <div
            className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-3 cursor-pointer hover:border-[#D4A574] transition-colors"
            onClick={() => fieldRefs.current['specular-os']?.startEditing()}
          >
            <div className="mb-2">
              <span className="text-[#8B8B8B] text-xs">OS (Left Eye)</span>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <EditableText
                ref={(el) => { fieldRefs.current['specular-os'] = el; }}
                value={specularMicroscopy.os}
                onSave={(val) => updateField(['specularMicroscopy', 'os'], val)}
                className="text-white text-sm"
                placeholder="e.g., ECD: 2480 cells/mmÂ², Normal morphology"
                isEditable={editableProp}
              />
            </div>
          </div>
        </div>

        <p className="text-[#8B8B8B] text-sm mt-2">
          Tip: you can type extra descriptors like <span className="text-white">ECD: 2600</span> or <span className="text-white">Polymegathism</span>.
        </p>
      </div>

      {/* Other Special Examinations - table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[#D4A574] text-lg">Other Special Examinations</h4>
          <div className="flex items-center gap-2">
            {isEditable && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddOtherExam();
                }}
                className="flex items-center gap-2 text-xs px-3 py-1 rounded bg-[#D4A574] text-black hover:bg-[#b38b60] transition-colors"
                title="Add new special examination"
              >
                <Plus className="w-5 h-5" /> Add Exam
              </button>
            )}
          </div>
        </div>

        <div className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#D4A574] bg-opacity-20 border-b border-[#D4A574] border-opacity-30">
                <th className="text-left p-3 text-[#D4A574] border-r border-[#D4A574] font-medium w-1/3 text-xs">Examination</th>
                <th className="text-left p-3 text-[#D4A574] border-r border-[#D4A574] font-medium w-1/3 text-xs">Findings</th>
                <th className="text-center p-3 text-[#D4A574] font-medium w-[15%] text-xs">Status</th>
                <th className="text-center p-3 text-[#D4A574] font-medium w-[15%] text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(otherExams) && otherExams.length > 0 ? (
                otherExams.map((exam: any, index: number) => (
                  <tr key={exam?.id ?? index} className="border-b border-[#D4A574] last:border-0 hover:bg-[#2a2a2a] transition-colors">
                    <td
                      className="p-3 text-white border-r border-[#D4A574] cursor-pointer hover:bg-[#333] transition-colors"
                      onClick={() => fieldRefs.current[`other-exam-${index}-name`]?.startEditing()}
                    >
                      <EditableText
                        ref={(el) => { fieldRefs.current[`other-exam-${index}-name`] = el; }}
                        value={exam?.name || ''}
                        onSave={(val) => handleUpdateOtherExam(index, { name: val })}
                        isEditable={editableProp}
                        className="text-white text-sm"
                        placeholder="Exam name"
                      />
                    </td>

                    <td
                      className="p-3 border-r border-[#D4A574] cursor-pointer hover:bg-[#333] transition-colors"
                      onClick={() => fieldRefs.current[`other-exam-${index}-findings`]?.startEditing()}
                    >
                      <EditableText
                        ref={(el) => { fieldRefs.current[`other-exam-${index}-findings`] = el; }}
                        value={exam?.findings || ''}
                        onSave={(val) => handleUpdateOtherExam(index, { findings: val })}
                        isEditable={editableProp}
                        className="text-white text-sm"
                        placeholder="Findings"
                      />
                    </td>

                    <td className="p-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isEditable) return;
                          handleTogglePerformed(index);
                        }}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded text-xs transition-colors ${exam?.performed ? 'bg-[#4CAF50] bg-opacity-20 text-[#4CAF50] hover:bg-opacity-30' : 'bg-[#D4A574] bg-opacity-10 text-[#8B8B8B] hover:bg-opacity-20'}`}
                        title={exam?.performed ? 'Mark as pending' : 'Mark as done'}
                      >
                        {exam?.performed ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                        <span>{exam?.performed ? 'Done' : 'Pending'}</span>
                      </button>
                    </td>

                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {isEditable && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteOtherExam(index);
                              }}
                              title="Delete"
                              className="p-2 rounded hover:bg-red-600 hover:bg-opacity-20 text-[#FF6B6B] transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-[#8B8B8B] text-sm">
                    No extra examinations recorded.
                    {isEditable && (
                      <div className="mt-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddOtherExam();
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded bg-[#D4A574] text-black text-xs hover:bg-[#b38b60] transition-colors"
                        >
                          <Plus className="w-5 h-5" /> Add first exam
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Abbreviations */}
      <div className="bg-[#0a0a0a] border border-[#D4A574] rounded-lg p-4">
        <h5 className="text-[#8B8B8B] text-xs mb-2">Abbreviations</h5>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <p className="text-white">• PAS: Peripheral Anterior Synechiae</p>
          <p className="text-white">• ECD: Endothelial Cell Density</p>
          <p className="text-white">• AC: Anterior Chamber</p>
          <p className="text-white">• C/D: Cup to Disc Ratio</p>
        </div>
      </div>
    </div>
  );

  // Render final ExpandableCard
  return (
    <ExpandableCard title="Special Examination" expandedContent={expandedContent}>
      {cardContent}
    </ExpandableCard>
  );
}

export default SpecialExaminationCard;
