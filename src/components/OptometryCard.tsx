import { useState, useEffect, useRef } from 'react';
import { Eye, Glasses, Plus, Trash, Zap } from 'lucide-react';
import { ExpandableCard } from './ExpandableCard';
import { EditableText, EditableTextHandle } from './EditableText';
import { CardHeader } from './CardHeader';
import { OptometryData } from './patient';

interface OptometryCardProps {
  data: OptometryData;
  updateData: (path: (string | number)[], value: any) => void;
  isEditable: boolean;
  // Navigation props (Deprecated - moved to Global Header)
  showVisitNav?: boolean;
  visitIndex?: number;
  totalVisits?: number;
  onPrevVisit?: () => void;
  onNextVisit?: () => void;
  isViewingPastVisit?: boolean;
}

export function OptometryCard({
  data,
  updateData,
  isEditable
}: OptometryCardProps) {
  const fieldRefs = useRef<{ [key: string]: EditableTextHandle | null }>({});

  const visionData = data?.vision ?? {};
  const autoRefraction = data?.autoRefraction ?? {};
  const finalGlasses = data?.finalGlasses ?? { rightEye: {}, leftEye: {} };
  const currentGlasses = data?.currentGlasses ?? { rightEye: {}, leftEye: {} };
  const oldGlass = data?.oldGlass ?? { rightEye: {}, leftEye: {} };
  const additional = data?.additional ?? {
    gpAdvisedFor: '',
    gpAdvisedBy: '',
    useOfGlass: '',
    product: '',
  };

  // Custom Presets State
  const [presets, setPresets] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('optometry_presets');
      return saved ? JSON.parse(saved) : ['6/6', '6/9', '6/12', 'N6'];
    } catch {
      return ['6/6', '6/9', '6/12', 'N6'];
    }
  });
  const [newPreset, setNewPreset] = useState('');

  const addPreset = () => {
    if (!newPreset) return;
    const updated = [...presets, newPreset];
    setPresets(updated);
    localStorage.setItem('optometry_presets', JSON.stringify(updated));
    setNewPreset('');
  };

  const removePreset = (val: string) => {
    const updated = presets.filter(p => p !== val);
    setPresets(updated);
    localStorage.setItem('optometry_presets', JSON.stringify(updated));
  };

  // Smart Fill Logic
  const applySmartFill = (value: string) => {
    // 1. Check Vision Table (Unaided -> With Glass -> Pinhole -> Best)
    const visionKeys = ['unaided', 'withGlass', 'withPinhole', 'bestCorrected'];

    // First pass: Find the first empty slot in the sequence
    for (const key of visionKeys) {
      if (!((visionData as any)?.[key]?.rightEye)) {
        updateVision(key, 'rightEye', value);
        return;
      }
      if (!((visionData as any)?.[key]?.leftEye)) {
        updateVision(key, 'leftEye', value);
        return;
      }
    }

    // If all Vision slots are full, move to AutoRefraction D.V Sph
    // (This can be extended further based on doctor feedback)
    // For now, we cycle or just update the last empty logical place?
    // User requirement: "moved to next row". The above loop handles rows.
    // If table full, maybe start overwriting or do nothing.
  };

  // Define the expected vision rows - always show these even if empty
  const visionRows = [
    { key: 'unaided', label: 'Unaided' },
    { key: 'withGlass', label: 'With Glass' },
    { key: 'withPinhole', label: 'With Pinhole' },
    { key: 'bestCorrected', label: 'Best Corrected' },
  ];

  const updateField = (path: (string | number)[], value: any) => {
    updateData(['optometry', ...path], value);
  };

  const canEdit = Boolean(isEditable || updateData);

  const updateVision = (key: string, eye: 'rightEye' | 'leftEye', value: string) => {
    updateField(['vision', key, eye], value);
  };

  // Safer updater for finalGlasses using per-row storage. Previously multiple
  // rows used the same properties which caused edits to reflect across a column.
  // We'll store values under finalGlasses.rows[rowKey][eye][field] so each cell
  // is independent. To remain backward-compatible, when rows aren't present we
  // map legacy structure into rows on first write.
  const updateFinalGlasses = (rowKey: string, eye: 'rightEye' | 'leftEye', field: string, value: string) => {
    try {
      const legacy = (data?.finalGlasses || { rightEye: {}, leftEye: {}, add: '', mDist: '' }) as any;

      // Build current rows either from existing rows or from legacy structure
      const currentRows = (legacy.rows) ? { ...legacy.rows } : {
        'D.V': {
          rightEye: { ...(legacy.rightEye || {}) },
          leftEye: { ...(legacy.leftEye || {}) }
        },
        Add: {
          rightEye: { va: legacy.add ?? '' },
          leftEye: { va: legacy.add ?? '' }
        },
        'M Dist': {
          rightEye: { va: legacy.mDist ?? '' },
          leftEye: { va: legacy.mDist ?? '' }
        }
      } as any;

      const updatedRows: any = { ...currentRows };

      // Ensure the row exists and is a fresh copy to avoid mutation
      updatedRows[rowKey] = updatedRows[rowKey]
        ? { ...updatedRows[rowKey] }
        : { rightEye: {}, leftEye: {} };

      updatedRows[rowKey][eye] = { ...(updatedRows[rowKey][eye] || {}), [field]: value };

      const updated = { ...legacy, rows: updatedRows };
      updateField(['finalGlasses'], updated);
    } catch (e) {
      console.error('Failed to update finalGlasses', e);
    }
  };

  const updateAutoRefraction = (rowKey: string, eye: 'rightEye' | 'leftEye', field: string, value: string) => {
    try {
      const legacy = (data?.autoRefraction || { rightEye: {}, leftEye: {} }) as any;

      // Build current rows
      const currentRows = (legacy.rows) ? { ...legacy.rows } : {
        'D.V': {
          rightEye: { ...(legacy.rightEye || {}) },
          leftEye: { ...(legacy.leftEye || {}) }
        },
        'ADD': { rightEye: {}, leftEye: {} }
      } as any;

      const updatedRows: any = { ...currentRows };

      // Ensure the row exists and is a fresh copy
      updatedRows[rowKey] = updatedRows[rowKey]
        ? { ...updatedRows[rowKey] }
        : { rightEye: {}, leftEye: {} };

      updatedRows[rowKey][eye] = { ...(updatedRows[rowKey][eye] || {}), [field]: value };

      const updated = { ...legacy, rows: updatedRows };
      updateField(['autoRefraction'], updated);
    } catch (e) {
      console.error('Failed to update autoRefraction', e);
    }
  };

  const updateCurrentGlasses = (rowKey: string, eye: 'rightEye' | 'leftEye', field: string, value: string) => {
    try {
      const legacy = (data?.currentGlasses || { rightEye: {}, leftEye: {} }) as any;

      const currentRows = (legacy.rows) ? { ...legacy.rows } : {
        'D.V': {
          rightEye: { ...(legacy.rightEye || {}) },
          leftEye: { ...(legacy.leftEye || {}) }
        },
        'N.V': { rightEye: {}, leftEye: {} },
        'ADD': { rightEye: {}, leftEye: {} },
        'M Dist': { rightEye: {}, leftEye: {} }
      } as any;

      const updatedRows: any = { ...currentRows };

      // Ensure the row exists and is a fresh copy
      updatedRows[rowKey] = updatedRows[rowKey]
        ? { ...updatedRows[rowKey] }
        : { rightEye: {}, leftEye: {} };

      updatedRows[rowKey][eye] = { ...(updatedRows[rowKey][eye] || {}), [field]: value };

      const updated = { ...legacy, rows: updatedRows };
      updateField(['currentGlasses'], updated);
    } catch (e) {
      console.error('Failed to update currentGlasses', e);
    }
  };

  const cardContent = (
    <>
      <CardHeader icon={Eye} title="Optometry" />

      <div className="space-y-2 flex-1">
        <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#D4A574]">
          <div className="flex items-center justify-between">
            <span className="text-[#8B8B8B] text-xs">Vision (Unaided)</span>
            <div className="flex items-center gap-2">
              <EditableText
                value={visionData?.unaided?.rightEye ?? ''}
                onSave={(val) => updateVision('unaided', 'rightEye', val)}
                className="text-white text-sm font-medium text-center"
                isEditable={isEditable}
                evalField={`vision.unaided.rightEye`}
              />
              <span className="text-[#8B8B8B] text-sm">|</span>
              <EditableText
                value={visionData?.unaided?.leftEye ?? ''}
                onSave={(val) => updateVision('unaided', 'leftEye', val)}
                className="text-white text-sm font-medium text-center"
                isEditable={isEditable}
                evalField={`vision.unaided.leftEye`}
              />
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#D4A574]">
          <div className="flex items-center justify-between">
            <span className="text-[#8B8B8B] text-xs">Final Glasses</span>
            <div className="flex items-center gap-2">
              <Glasses className="w-4 h-4 text-[#D4A574]" />
              {
                // Prefer per-row storage when available; fall back to legacy shape
              }
              {(() => {
                const legacy: any = finalGlasses || {};
                const rows: any = legacy.rows ?? undefined;
                const rightVal = (rows && rows['D.V'] && rows['D.V'].rightEye && rows['D.V'].rightEye.sph) ?? (legacy.rightEye && legacy.rightEye.sph) ?? '';
                return (
                  <EditableText
                    value={String(rightVal)}
                    onSave={(val) => updateFinalGlasses('D.V', 'rightEye', 'sph', val)}
                    className="text-white text-sm font-medium text-center"
                    isEditable={isEditable}
                  />
                );
              })()}
              <span className="text-[#8B8B8B] text-sm">/</span>
              {(() => {
                const legacy: any = finalGlasses || {};
                const rows: any = legacy.rows ?? undefined;
                const leftVal = (rows && rows['D.V'] && rows['D.V'].leftEye && rows['D.V'].leftEye.sph) ?? (legacy.leftEye && legacy.leftEye.sph) ?? '';
                return (
                  <EditableText
                    value={String(leftVal)}
                    onSave={(val) => updateFinalGlasses('D.V', 'leftEye', 'sph', val)}
                    className="text-white text-sm font-medium text-center"
                    isEditable={isEditable}
                  />
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const quickFillSidebar = (
    <div className="bg-[#1a1a1a] p-4 rounded-xl border border-[#D4A574] shadow-2xl h-fit">
      <h4 className="text-[#D4A574] text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
        <Zap className="w-4 h-4" /> Quick Fill
      </h4>
      <div className="space-y-3">
        {presets.map((preset) => (
          <div key={preset} className="flex gap-2 group">
            <button
              onClick={() => applySmartFill(preset)}
              className="flex-1 bg-[#252525] hover:bg-[#333] active:bg-[#D4A574] active:text-black text-white text-sm py-3 rounded-lg transition-all text-center font-bold shadow-lg border border-transparent hover:border-[#444]"
            >
              {preset}
            </button>
            <button
              onClick={() => removePreset(preset)}
              className="px-2 text-[#444] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              title="Remove preset"
            >
              <Trash size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-[#D4A574] flex gap-2">
        <input
          type="text"
          value={newPreset}
          onChange={(e) => setNewPreset(e.target.value)}
          placeholder="Value..."
          className="flex-1 bg-[#0a0a0a] text-white text-sm px-3 py-2 rounded-lg border border-[#D4A574] focus:border-[#D4A574] outline-none transition-colors"
          onKeyDown={(e) => e.key === 'Enter' && addPreset()}
        />
        <button
          onClick={addPreset}
          className="p-2 bg-[#D4A574] text-black rounded-lg hover:bg-[#c49564] transition-colors"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Help Text */}
      <div className="mt-4 p-3 bg-[#252525]/50 rounded-lg text-[10px] text-[#8B8B8B] leading-relaxed border border-[#D4A574]">
        <p className="flex flex-col gap-1">
          <span className="text-[#D4A574] font-bold">Smart Fill Mode:</span>
          <span>Click a value to auto-fill the next empty slot in sequence:</span>
          <span className="font-mono bg-[#111] px-1 rounded text-center block mt-1">Right â†’ Left â†’ Next Row</span>
        </p>
      </div>
    </div>
  );

  const expandedContent = (
    <div className="space-y-8">
      {/* Vision Section */}
      <div>
        <h4 className="text-[#D4A574] mb-3 text-lg">Vision</h4>
        <div className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg overflow-hidden">
          <table className="w-full text-sm table-auto border-collapse">
            <thead>
              <tr className="bg-[#0a0a0a]">
                <th className="text-left p-3 text-[#8B8B8B] border-r border-[#D4A574] text-xs">Vision</th>
                <th className="text-center p-3 text-[#8B8B8B] border-r border-[#D4A574] text-xs">Right Eye</th>
                <th className="text-center p-3 text-[#8B8B8B] text-xs">Left Eye</th>
              </tr>
            </thead>
            <tbody>
              {visionRows.map(({ key, label }, i) => (
                <tr key={key} className={i % 2 === 0 ? 'bg-[#121212]' : 'bg-[#1a1a1a]'}>
                  <td className="p-3 text-white border-r border-[#D4A574] text-xs font-medium">
                    {label}
                  </td>
                  {['rightEye', 'leftEye'].map((eye) => {
                    const refKey = `vision-${key}-${eye}`;
                    return (
                      <td
                        key={refKey}
                        className="p-3 text-center border-r border-[#D4A574] cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                        onClick={() => fieldRefs.current[refKey]?.startEditing()}
                      >
                        <EditableText
                          ref={(el) => { fieldRefs.current[refKey] = el; }}
                          value={(visionData as any)?.[key]?.[eye] ?? ''}
                          onSave={(val) => updateVision(key, eye as 'rightEye' | 'leftEye', val)}
                          className="text-white text-center w-full text-sm"
                          isEditable={isEditable}
                          evalField={`vision.${key}.${eye}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Auto Refraction */}
      <div>
        <h4 className="text-[#D4A574] mb-3 text-lg">Auto Refraction</h4>
        <div className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg overflow-hidden">
          <table className="w-full text-sm table-auto border-collapse">
            <thead>
              <tr className="bg-transparent">
                <th className="text-left p-2 text-[#8B8B8B] border-r border-[#D4A574] text-xs" rowSpan={2}>Vision</th>
                <th className="text-center p-3 text-[#D4A574] text-xs" colSpan={5}>Right Eye</th>
                <th className="text-center p-3 text-[#D4A574] text-xs" colSpan={5}>Left Eye</th>
              </tr>
              <tr className="bg-[#0a0a0a]">
                {['Sph', 'Cyl', 'Axis', 'Prism', 'V/A'].map((h, i) => (
                  <th key={`r-${i}`} className="text-center p-3 text-[#8B8B8B] border-r border-[#D4A574] font-normal text-xs uppercase">{h}</th>
                ))}
                {['Sph', 'Cyl', 'Axis', 'Prism', 'V/A'].map((h, i) => (
                  <th key={`l-${i}`} className="text-center p-3 text-[#8B8B8B] border-r border-[#D4A574] font-normal text-xs uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {['D.V', 'ADD'].map((rowKey, rowIdx) => (
                <tr key={rowKey} className={rowIdx % 2 === 0 ? 'bg-[#121212]' : 'bg-[#1a1a1a]'}>
                  <td className="p-3 text-white border-r border-[#D4A574] text-xs font-medium">{rowKey}</td>
                  {['rightEye', 'leftEye'].map((eye) => {
                    return ['sph', 'cyl', 'axis', 'prism', 'va'].map((field) => {
                      const legacy: any = autoRefraction || {};
                      const rows: any = (legacy.rows) ? legacy.rows : undefined;
                      const legacyFallback = (legacy[eye as any] && legacy[eye as any][field]) || '';
                      const cellValue = (rows && rows[rowKey] && rows[rowKey][eye] && rows[rowKey][eye][field]) ?? legacyFallback ?? '';

                      const refKey = `autorefraction-${eye}-${rowKey}-${field}`;

                      return (
                        <td
                          key={refKey}
                          className="p-3 text-center border-r border-[#D4A574] cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                          onClick={() => fieldRefs.current[refKey]?.startEditing()}
                        >
                          <EditableText
                            ref={(el) => { fieldRefs.current[refKey] = el; }}
                            value={String(cellValue)}
                            onSave={(val) => updateAutoRefraction(rowKey, eye as 'rightEye' | 'leftEye', field, val)}
                            className="text-white text-center w-full text-sm"
                            isEditable={canEdit}
                            evalField={`autoRefraction.${rowKey}.${eye}.${field}`}
                            placeholder="--"
                          />
                        </td>
                      );
                    });
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Final Glasses */}
      <div>
        <h4 className="text-[#D4A574] mb-3 text-lg">Final Glasses</h4>
        <div className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg overflow-hidden">
          <table className="w-full text-sm table-auto border-collapse">
            <thead>
              <tr className="bg-transparent">
                <th className="text-left p-2 text-[#8B8B8B] border-r border-[#D4A574] text-xs" rowSpan={2}>Vision</th>
                <th className="text-center p-3 text-[#D4A574] text-xs" colSpan={5}>Right Eye</th>
                <th className="text-center p-3 text-[#D4A574] text-xs" colSpan={5}>Left Eye</th>
              </tr>
              <tr className="bg-[#0a0a0a]">
                {['Sph', 'cyl', 'axis', 'Prism', 'V/A'].map((h, i) => (
                  <th key={`r-${i}`} className="text-center p-3 text-[#8B8B8B] border-r border-[#D4A574] font-normal text-xs uppercase">{h}</th>
                ))}
                {['Sph', 'cyl', 'axis', 'Prism', 'V/A'].map((h, i) => (
                  <th key={`l-${i}`} className="text-center p-3 text-[#8B8B8B] border-r border-[#D4A574] font-normal text-xs uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {['D.V', 'ADD'].map((rowKey, rowIdx) => (
                <tr key={rowKey} className={rowIdx % 2 === 0 ? 'bg-[#121212]' : 'bg-[#1a1a1a]'}>
                  <td className="p-3 text-white border-r border-[#D4A574] text-xs font-medium">{rowKey}</td>
                  {['rightEye', 'leftEye'].map((eye) => {
                    return ['sph', 'cyl', 'axis', 'prism', 'va'].map((field) => {
                      const legacy: any = finalGlasses || {};
                      const rows: any = (legacy.rows) ? legacy.rows : undefined;
                      const legacyFallback = (legacy[eye as any] && legacy[eye as any][field]) || '';
                      const cellValue = (rows && rows[rowKey] && rows[rowKey][eye] && rows[rowKey][eye][field]) ?? legacyFallback ?? '';

                      const refKey = `finalglasses-${eye}-${rowKey}-${field}`;

                      return (
                        <td
                          key={refKey}
                          className="p-3 text-center border-r border-[#D4A574] cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                          onClick={() => fieldRefs.current[refKey]?.startEditing()}
                        >
                          <EditableText
                            ref={(el) => { fieldRefs.current[refKey] = el; }}
                            value={String(cellValue)}
                            onSave={(val) => updateFinalGlasses(rowKey, eye as 'rightEye' | 'leftEye', field, val)}
                            className="text-white text-center w-full text-sm"
                            isEditable={canEdit}
                            evalField={`finalGlasses.${rowKey}.${eye}.${field}`}
                            placeholder="--"
                          />
                        </td>
                      );
                    });
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Current Glasses */}
      <div>
        <h4 className="text-[#D4A574] mb-3 text-lg">Current Glasses</h4>
        <div className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg overflow-hidden">
          <table className="w-full text-sm table-auto border-collapse">
            <thead>
              <tr className="bg-transparent">
                <th className="text-left p-2 text-[#8B8B8B] border-r border-[#D4A574] text-xs" rowSpan={2}>Vision</th>
                <th className="text-center p-3 text-[#D4A574] text-xs" colSpan={5}>Right Eye</th>
                <th className="text-center p-3 text-[#D4A574] text-xs" colSpan={5}>Left Eye</th>
              </tr>
              <tr className="bg-[#0a0a0a]">
                {['Sph', 'Cyl', 'Axis', 'Prism', 'V/A'].map((h, i) => (
                  <th key={`r-${i}`} className="text-center p-3 text-[#8B8B8B] border-r border-[#D4A574] font-normal text-xs">{h}</th>
                ))}
                {['Sph', 'Cyl', 'Axis', 'Prism', 'V/A'].map((h, i) => (
                  <th key={`l-${i}`} className="text-center p-3 text-[#8B8B8B] border-r border-[#D4A574] font-normal text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {['D.V', 'ADD'].map((rowKey, rowIdx) => (
                <tr key={rowKey} className={rowIdx % 2 === 0 ? 'bg-[#121212]' : 'bg-[#1a1a1a]'}>
                  <td className="p-3 text-white border-r border-[#D4A574] text-xs font-medium">{rowKey}</td>
                  {['rightEye', 'leftEye'].map((eye) => {
                    return ['sph', 'cyl', 'axis', 'prism', 'va'].map((field) => {
                      const legacy: any = currentGlasses || {};
                      const rows: any = (legacy.rows) ? legacy.rows : undefined;
                      const legacyFallback = (legacy[eye as any] && legacy[eye as any][field]) || '';
                      const cellValue = (rows && rows[rowKey] && rows[rowKey][eye] && rows[rowKey][eye][field]) ?? legacyFallback ?? '';

                      const refKey = `currentglasses-${eye}-${rowKey}-${field}`;

                      return (
                        <td
                          key={refKey}
                          className="p-3 text-center border-r border-[#D4A574] cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                          onClick={() => fieldRefs.current[refKey]?.startEditing()}
                        >
                          <EditableText
                            ref={(el) => { fieldRefs.current[refKey] = el; }}
                            value={String(cellValue)}
                            onSave={(val) => updateCurrentGlasses(rowKey, eye as 'rightEye' | 'leftEye', field, val)}
                            className="text-white text-center w-full text-sm"
                            isEditable={canEdit}
                            evalField={`currentGlasses.${rowKey}.${eye}.${field}`}
                            placeholder="--"
                          />
                        </td>
                      );
                    });
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* OLD GLASS */}
      <div>
        <h4 className="text-[#D4A574] mb-3 text-lg">OLD GLASS</h4>
        <div className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg overflow-hidden">
          <table className="w-full text-sm table-auto border-collapse">
            <thead>
              <tr className="bg-[#0a0a0a]">
                <th className="text-left p-3 text-[#8B8B8B] border-r border-[#D4A574] text-xs"></th>
                {['Cyl', 'Axis', 'Sph', 'V/A', 'Add'].map((head) => (
                  <th key={head} className="text-center p-3 text-[#8B8B8B] border-r border-[#D4A574] min-w-[5rem] w-20 whitespace-nowrap text-xs">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {['rightEye', 'leftEye'].map((eye, i) => (
                <tr key={eye} className={i % 2 === 0 ? 'bg-[#121212]' : 'bg-[#1a1a1a]'}>
                  <td className="p-3 text-white border-r border-[#D4A574] capitalize text-xs font-medium">
                    {eye === 'rightEye' ? 'Right Eye' : 'Left Eye'}
                  </td>
                  {['cyl', 'axis', 'sph', 'va', 'add'].map((field) => {
                    const refKey = `oldglass-${eye}-${field}`;
                    return (
                      <td
                        key={refKey}
                        className="p-3 text-center border-r border-[#D4A574] min-w-[5rem] w-20 whitespace-nowrap cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                        onClick={() => fieldRefs.current[refKey]?.startEditing()}
                      >
                        <EditableText
                          ref={(el) => { fieldRefs.current[refKey] = el; }}
                          value={String(((oldGlass as any)?.[eye] as any)?.[field] ?? '')}
                          onSave={(val) => updateField(['oldGlass', eye, field], val)}
                          className="text-white text-center w-full text-sm"
                          isEditable={canEdit}
                          evalField={`oldGlass.${eye}.${field}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <ExpandableCard
      title="Optometry"
      expandedContent={expandedContent}
      sideActionPanel={quickFillSidebar}
    // Pass unused navigation props if any, or just ignore since removed from interface
    >
      {cardContent}
    </ExpandableCard>
  );
}
