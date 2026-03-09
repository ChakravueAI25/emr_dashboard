import { useState, useEffect, useRef } from 'react';
import { Eye, Glasses, Plus, Trash, Zap } from 'lucide-react';
import { ExpandableCard } from './ExpandableCard';
import { EditableText, EditableTextHandle } from './EditableText';
import { CardHeader } from './CardHeader';
import { OptometryData } from './patient';
import { API_ENDPOINTS } from '../config/api';

interface OptometryCardProps {
  data: OptometryData;
  updateData: (path: (string | number)[], value: any) => void;
  isEditable: boolean;
  showVisitNav?: boolean;
  visitIndex?: number;
  totalVisits?: number;
  onPrevVisit?: () => void;
  onNextVisit?: () => void;
  isViewingPastVisit?: boolean;
}

// ---------- NumericStepper ----------
// A compact inline cell component with - and + buttons.
// Used for SPH/CYL (step=0.25, min=-10, max=10) and AXIS (step=1, min=0, max=180).
interface NumericStepperProps {
  value: string;
  onChange: (val: string) => void;
  step: number;
  min: number;
  max: number;
  isEditable: boolean;
  allowNegative?: boolean;
}

function NumericStepper({ value, onChange, step, min, max, isEditable, allowNegative = true }: NumericStepperProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '0');
  const inputRef = useRef<HTMLInputElement>(null);
  // Ref to track the latest numeric value — survives across rapid clicks
  // without waiting for React to re-render with the new prop.
  const initNum = parseFloat(value || '0');
  const latestNumRef = useRef<number>(isNaN(initNum) ? 0 : initNum);

  // Keep draft and ref in sync when external value changes (e.g. first load / parent update)
  useEffect(() => {
    if (!editing) setDraft(value || '0');
    const n = parseFloat(value || '0');
    latestNumRef.current = isNaN(n) ? 0 : n;
  }, [value, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = (num: number) => {
    const clamped = Math.max(min, Math.min(max, parseFloat(num.toFixed(2))));
    latestNumRef.current = clamped;
    // Format: if step is 0.25 use 2 decimal places, else integer
    const formatted = step < 1
      ? (clamped >= 0 && allowNegative ? `+${clamped.toFixed(2)}` : clamped.toFixed(2))
      : String(Math.round(clamped));
    // For axis never show +
    const final = step >= 1 ? String(Math.round(clamped)) : formatted;
    onChange(final);
    setDraft(final);
  };

  const decrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEditable) return;
    commit(latestNumRef.current - step);
  };

  const increment = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEditable) return;
    commit(latestNumRef.current + step);
  };

  const handleBlur = () => {
    setEditing(false);
    const n = parseFloat(draft);
    if (!isNaN(n)) {
      commit(n);
    } else {
      setDraft(value || '0');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      handleBlur();
    } else if (e.key === 'Escape') {
      setEditing(false);
      setDraft(value || '0');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow digits, one leading minus/plus, one dot
    if (/^[+\-]?\d*\.?\d*$/.test(raw)) setDraft(raw);
  };

  if (!isEditable) {
    return (
      <span className="text-white text-xs text-center block w-full truncate">
        {value || '0'}
      </span>
    );
  }

  return (
    <div className="flex items-center justify-center gap-0.5 w-full" onClick={(e) => e.stopPropagation()}>
      {/* Decrement */}
      <button
        onMouseDown={(e) => { e.preventDefault(); decrement(e); }}
        className="w-4 h-5 flex items-center justify-center text-[#D4A574] hover:text-white hover:bg-[#3a3a3a] rounded text-sm font-bold leading-none select-none flex-shrink-0 transition-colors"
        tabIndex={-1}
        title={`-${step}`}
      >−</button>

      {/* Value display / input */}
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={draft}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-12 h-5 bg-transparent border-b border-[#D4A574] text-white text-xs text-center focus:outline-none caret-[#D4A574] flex-shrink-0"
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          className="w-12 h-5 leading-5 text-white text-xs text-center cursor-pointer hover:text-[#D4A574] border border-transparent hover:border-[#D4A574]/40 rounded truncate flex-shrink-0 transition-colors"
        >
          {value || '0'}
        </span>
      )}

      {/* Increment */}
      <button
        onMouseDown={(e) => { e.preventDefault(); increment(e); }}
        className="w-4 h-5 flex items-center justify-center text-[#D4A574] hover:text-white hover:bg-[#3a3a3a] rounded text-sm font-bold leading-none select-none flex-shrink-0 transition-colors"
        tabIndex={-1}
        title={`+${step}`}
      >+</button>
    </div>
  );
}

// ---------- NumericInput ----------
// A simple fixed-width numeric-only input that never expands.
// Used for Prism, V/A, Add and other non-stepped numeric columns.
interface NumericInputProps {
  value: string;
  onChange: (val: string) => void;
  isEditable: boolean;
}

function NumericInput({ value, onChange, isEditable }: NumericInputProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value || '');
  }, [value, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleBlur = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== value) onChange(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); handleBlur(); }
    else if (e.key === 'Escape') { setEditing(false); setDraft(value || ''); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow digits, optional leading sign, optional dot
    if (/^[+\-]?\d*\.?\d*$/.test(raw)) setDraft(raw);
  };

  if (!isEditable) {
    return (
      <span className="text-white text-xs text-center block w-full truncate">
        {value || '--'}
      </span>
    );
  }

  return (
    <div className="flex items-center justify-center w-full" onClick={(e) => e.stopPropagation()}>
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={draft}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-14 h-5 bg-transparent border-b border-[#D4A574] text-white text-xs text-center focus:outline-none caret-[#D4A574]"
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          className="w-14 h-5 leading-5 text-white text-xs text-center cursor-pointer hover:text-[#D4A574] border border-transparent hover:border-[#D4A574]/40 rounded truncate transition-colors"
        >
          {value || '--'}
        </span>
      )}
    </div>
  );
}

// ---------- AlphaNumericInput ----------
// Like NumericInput but accepts letters, digits, "/" etc. for V/A fields (e.g. 6/6, N6).
interface AlphaNumericInputProps {
  value: string;
  onChange: (val: string) => void;
  isEditable: boolean;
}

function AlphaNumericInput({ value, onChange, isEditable }: AlphaNumericInputProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value || '');
  }, [value, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleBlur = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== value) onChange(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); handleBlur(); }
    else if (e.key === 'Escape') { setEditing(false); setDraft(value || ''); }
  };

  if (!isEditable) {
    return (
      <span className="text-white text-xs text-center block w-full truncate">
        {value || '--'}
      </span>
    );
  }

  return (
    <div className="flex items-center justify-center w-full" onClick={(e) => e.stopPropagation()}>
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-14 h-5 bg-transparent border-b border-[#D4A574] text-white text-xs text-center focus:outline-none caret-[#D4A574]"
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          className="w-14 h-5 leading-5 text-white text-xs text-center cursor-pointer hover:text-[#D4A574] border border-transparent hover:border-[#D4A574]/40 rounded truncate transition-colors"
        >
          {value || '--'}
        </span>
      )}
    </div>
  );
}

// ---------- Main Component ----------

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
  const keratometry = (data as any)?.keratometry ?? { 
    rightEye: { k1: {}, k2: {} }, 
    leftEye: { k1: {}, k2: {} } 
  };
  const additional = data?.additional ?? {
    gpAdvisedFor: '',
    gpAdvisedBy: '',
    useOfGlass: '',
    product: '',
  };

  const [presets, setPresets] = useState<string[]>(['6/6', '6/9', '6/12', 'N6']);
  const [newPreset, setNewPreset] = useState('');

  useEffect(() => {
    fetch(API_ENDPOINTS.PRESETS('optometry'))
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(data => {
        if (data.items && Array.isArray(data.items) && data.items.length > 0) {
          setPresets(data.items);
        }
      })
      .catch(err => {
        // Fallback to local storage
        try {
          const saved = localStorage.getItem('optometry_presets');
          if (saved) setPresets(JSON.parse(saved));
        } catch { }
      });
  }, []);

  const addPreset = () => {
    if (!newPreset) return;
    const updated = [...presets, newPreset];
    setPresets(updated);
    setNewPreset('');
    
    fetch(API_ENDPOINTS.PRESETS('optometry'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: updated })
    }).catch(e => console.error('Failed to save preset', e));
    
    // Also save to local storage for offline fallback
    localStorage.setItem('optometry_presets', JSON.stringify(updated));
  };

  const removePreset = (val: string) => {
    const updated = presets.filter(p => p !== val);
    setPresets(updated);
    
    fetch(API_ENDPOINTS.PRESETS('optometry'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: updated })
    }).catch(e => console.error('Failed to remove preset', e));

    localStorage.setItem('optometry_presets', JSON.stringify(updated));
  };

  const applySmartFill = (value: string) => {
    const visionKeys = ['unaided', 'withGlass', 'withPinhole', 'bestCorrected'];
    for (const key of visionKeys) {
      if (!((visionData as any)?.[key]?.rightEye)) { updateVision(key, 'rightEye', value); return; }
      if (!((visionData as any)?.[key]?.leftEye)) { updateVision(key, 'leftEye', value); return; }
    }
  };

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

  const updateFinalGlasses = (rowKey: string, eye: 'rightEye' | 'leftEye', field: string, value: string) => {
    updateField(['finalGlasses', 'rows', rowKey, eye, field], value);
  };

  const updateAutoRefraction = (rowKey: string, eye: 'rightEye' | 'leftEye', field: string, value: string) => {
    updateField(['autoRefraction', 'rows', rowKey, eye, field], value);
  };

  const updateCurrentGlasses = (rowKey: string, eye: 'rightEye' | 'leftEye', field: string, value: string) => {
    updateField(['currentGlasses', 'rows', rowKey, eye, field], value);
  };

  const updateKeratometry = (eye: 'rightEye' | 'leftEye', k: 'k1' | 'k2', field: 'axis' | 'mm', value: string) => {
    updateField(['keratometry', eye, k, field], value);
  };

  // Helper: get cell value from row-based storage with legacy fallback
  const getCellValue = (store: any, rowKey: string, eye: string, field: string): string => {
    const rows = store?.rows;
    const legacy = store?.[eye];
    const fromRows = rows?.[rowKey]?.[eye]?.[field];
    const fromLegacy = legacy?.[field];
    return String(fromRows ?? fromLegacy ?? '');
  };

  // Render a cell depending on the field type
  const renderCell = (
    fieldName: string,
    value: string,
    onSave: (v: string) => void
  ) => {
    if (fieldName === 'sph' || fieldName === 'cyl') {
      return (
        <NumericStepper
          value={value}
          onChange={onSave}
          step={0.25}
          min={-10}
          max={10}
          isEditable={canEdit}
          allowNegative={true}
        />
      );
    }
    if (fieldName === 'axis') {
      return (
        <NumericStepper
          value={value}
          onChange={onSave}
          step={1}
          min={0}
          max={180}
          isEditable={canEdit}
          allowNegative={false}
        />
      );
    }
    // V/A accepts alphanumeric (e.g. 6/6, N6)
    if (fieldName === 'va') {
      return (
        <AlphaNumericInput
          value={value}
          onChange={onSave}
          isEditable={canEdit}
        />
      );
    }
    // All other fields: prism, add — numeric only, no expand
    return (
      <NumericInput
        value={value}
        onChange={onSave}
        isEditable={canEdit}
      />
    );
  };

  // ---------- Card Summary (collapsed) ----------
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

  // ---------- Quick Fill Sidebar ----------
  const quickFillSidebar = (
    <div className="bg-[#1a1a1a] p-4 rounded-xl border border-[#D4A574] shadow-2xl h-fit">
      <h4 className="text-[#D4A574] text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
        <Zap className="w-4 h-4" /> Quick Fill
      </h4>
      <div className="space-y-3">
          {presets.map((preset, idx) => (
            <div key={`${preset}-${idx}`} className="flex gap-2 group">
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

      <div className="mt-4 p-3 bg-[#252525]/50 rounded-lg text-[10px] text-[#8B8B8B] leading-relaxed border border-[#D4A574]">
        <p className="flex flex-col gap-1">
          <span className="text-[#D4A574] font-bold">Smart Fill Mode:</span>
          <span>Click a value to auto-fill the next empty slot in sequence:</span>
          <span className="font-mono bg-[#111] px-1 rounded text-center block mt-1">Right → Left → Next Row</span>
        </p>
      </div>
    </div>
  );

  // ---------- Expanded Content ----------
  const expandedContent = (
    <div className="space-y-8">
      {/* Vision Section — unchanged, text values like 6/6 */}
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
                  <td className="p-3 text-white border-r border-[#D4A574] text-xs font-medium">{label}</td>
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
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-transparent">
                <th className="text-left p-2 text-[#8B8B8B] border-r border-[#D4A574] text-xs" rowSpan={2}>Vision</th>
                <th className="text-center p-2 text-[#D4A574] text-xs border-r border-[#D4A574]" colSpan={5}>Right Eye</th>
                <th className="text-center p-2 text-[#D4A574] text-xs" colSpan={5}>Left Eye</th>
              </tr>
              <tr className="bg-[#0a0a0a]">
                {['Sph', 'Cyl', 'Axis', 'Prism', 'V/A'].map((h, i) => (
                  <th key={`r-${i}`} className="text-center p-2 text-[#8B8B8B] border-r border-[#D4A574] font-normal text-xs uppercase">{h}</th>
                ))}
                {['Sph', 'Cyl', 'Axis', 'Prism', 'V/A'].map((h, i) => (
                  <th key={`l-${i}`} className="text-center p-2 text-[#8B8B8B] border-r border-[#D4A574] font-normal text-xs uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {['D.V', 'ADD'].map((rowKey, rowIdx) => (
                <tr key={rowKey} className={rowIdx % 2 === 0 ? 'bg-[#121212]' : 'bg-[#1a1a1a]'}>
                  <td className="p-2 text-white border-r border-[#D4A574] text-xs font-medium">{rowKey}</td>
                  {['rightEye', 'leftEye'].map((eye) =>
                    ['sph', 'cyl', 'axis', 'prism', 'va'].map((field) => {
                      const cellValue = getCellValue(autoRefraction, rowKey, eye, field);
                      return (
                        <td
                          key={`ar-${eye}-${rowKey}-${field}`}
                          className="p-1 text-center border-r border-[#D4A574]"
                        >
                          {renderCell(
                            field,
                            cellValue,
                            (v) => updateAutoRefraction(rowKey, eye as 'rightEye' | 'leftEye', field, v)
                          )}
                        </td>
                      );
                    })
                  )}
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
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-transparent">
                <th className="text-left p-2 text-[#8B8B8B] border-r border-[#D4A574] text-xs" rowSpan={2}>Vision</th>
                <th className="text-center p-2 text-[#D4A574] text-xs border-r border-[#D4A574]" colSpan={5}>Right Eye</th>
                <th className="text-center p-2 text-[#D4A574] text-xs" colSpan={5}>Left Eye</th>
              </tr>
              <tr className="bg-[#0a0a0a]">
                {['Sph', 'Cyl', 'Axis', 'Prism', 'V/A'].map((h, i) => (
                  <th key={`r-${i}`} className="text-center p-2 text-[#8B8B8B] border-r border-[#D4A574] font-normal text-xs uppercase">{h}</th>
                ))}
                {['Sph', 'Cyl', 'Axis', 'Prism', 'V/A'].map((h, i) => (
                  <th key={`l-${i}`} className="text-center p-2 text-[#8B8B8B] border-r border-[#D4A574] font-normal text-xs uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {['D.V', 'ADD'].map((rowKey, rowIdx) => (
                <tr key={rowKey} className={rowIdx % 2 === 0 ? 'bg-[#121212]' : 'bg-[#1a1a1a]'}>
                  <td className="p-2 text-white border-r border-[#D4A574] text-xs font-medium">{rowKey}</td>
                  {['rightEye', 'leftEye'].map((eye) =>
                    ['sph', 'cyl', 'axis', 'prism', 'va'].map((field) => {
                      const cellValue = getCellValue(finalGlasses, rowKey, eye, field);
                      return (
                        <td
                          key={`fg-${eye}-${rowKey}-${field}`}
                          className="p-1 text-center border-r border-[#D4A574]"
                        >
                          {renderCell(
                            field,
                            cellValue,
                            (v) => updateFinalGlasses(rowKey, eye as 'rightEye' | 'leftEye', field, v)
                          )}
                        </td>
                      );
                    })
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Keratometry Reading */}
      <div>
        <h4 className="text-[#D4A574] mb-3 text-lg">KERATOMETRY READING</h4>
        <div className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#0a0a0a]">
                <th className="text-left p-3 text-[#8B8B8B] border-r border-[#D4A574] text-xs"></th>
                <th className="text-center p-2 text-[#D4A574] border-r border-[#D4A574] text-xs font-normal" colSpan={2}>Right Eye</th>
                <th className="text-center p-2 text-[#D4A574] text-xs font-normal" colSpan={2}>Left Eye</th>
              </tr>
              <tr className="bg-[#0a0a0a]">
                 <th className="text-left p-3 text-[#8B8B8B] border-r border-[#D4A574] text-xs"></th>
                 <th className="text-center p-2 text-[#8B8B8B] border-r border-[#D4A574] text-xs font-normal">AXIS</th>
                 <th className="text-center p-2 text-[#8B8B8B] border-r border-[#D4A574] text-xs font-normal">mm</th>
                 <th className="text-center p-2 text-[#8B8B8B] border-r border-[#D4A574] text-xs font-normal">AXIS</th>
                 <th className="text-center p-2 text-[#8B8B8B] text-xs font-normal">mm</th>
              </tr>
            </thead>
            <tbody>
              {['K1', 'K2'].map((rowLabel, i) => {
                 const rowKey = rowLabel.toLowerCase() as 'k1' | 'k2';
                 return (
                <tr key={rowKey} className={i % 2 === 0 ? 'bg-[#121212]' : 'bg-[#1a1a1a]'}>
                  <td className="p-3 text-white border-r border-[#D4A574] text-xs font-medium">{rowLabel}</td>
                  {/* Right Eye */}
                  <td className="p-1 text-center border-r border-[#D4A574]">
                    {renderCell(
                      'axis', 
                      String((keratometry as any)?.rightEye?.[rowKey]?.axis || ''), 
                      (v) => updateKeratometry('rightEye', rowKey, 'axis', v as any)
                    )}
                  </td>
                  <td className="p-1 text-center border-r border-[#D4A574]">
                    {renderCell(
                      'mm', 
                      String((keratometry as any)?.rightEye?.[rowKey]?.mm || ''), 
                      (v) => updateKeratometry('rightEye', rowKey, 'mm', v as any)
                    )}
                  </td>
                  {/* Left Eye */}
                  <td className="p-1 text-center border-r border-[#D4A574]">
                    {renderCell(
                      'axis', 
                      String((keratometry as any)?.leftEye?.[rowKey]?.axis || ''), 
                      (v) => updateKeratometry('leftEye', rowKey, 'axis', v as any)
                    )}
                  </td>
                  <td className="p-1 text-center border-r border-[#D4A574]">
                    {renderCell(
                      'mm', 
                      String((keratometry as any)?.leftEye?.[rowKey]?.mm || ''), 
                      (v) => updateKeratometry('leftEye', rowKey, 'mm', v as any)
                    )}
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      {/* Current Glasses */}
      <div>
        <h4 className="text-[#D4A574] mb-3 text-lg">Current Glasses</h4>
        <div className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-transparent">
                <th className="text-left p-2 text-[#8B8B8B] border-r border-[#D4A574] text-xs" rowSpan={2}>Vision</th>
                <th className="text-center p-2 text-[#D4A574] text-xs border-r border-[#D4A574]" colSpan={5}>Right Eye</th>
                <th className="text-center p-2 text-[#D4A574] text-xs" colSpan={5}>Left Eye</th>
              </tr>
              <tr className="bg-[#0a0a0a]">
                {['Sph', 'Cyl', 'Axis', 'Prism', 'V/A'].map((h, i) => (
                  <th key={`r-${i}`} className="text-center p-2 text-[#8B8B8B] border-r border-[#D4A574] font-normal text-xs uppercase">{h}</th>
                ))}
                {['Sph', 'Cyl', 'Axis', 'Prism', 'V/A'].map((h, i) => (
                  <th key={`l-${i}`} className="text-center p-2 text-[#8B8B8B] border-r border-[#D4A574] font-normal text-xs uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {['D.V', 'ADD'].map((rowKey, rowIdx) => (
                <tr key={rowKey} className={rowIdx % 2 === 0 ? 'bg-[#121212]' : 'bg-[#1a1a1a]'}>
                  <td className="p-2 text-white border-r border-[#D4A574] text-xs font-medium">{rowKey}</td>
                  {['rightEye', 'leftEye'].map((eye) =>
                    ['sph', 'cyl', 'axis', 'prism', 'va'].map((field) => {
                      const cellValue = getCellValue(currentGlasses, rowKey, eye, field);
                      return (
                        <td
                          key={`cg-${eye}-${rowKey}-${field}`}
                          className="p-1 text-center border-r border-[#D4A574]"
                        >
                          {renderCell(
                            field,
                            cellValue,
                            (v) => updateCurrentGlasses(rowKey, eye as 'rightEye' | 'leftEye', field, v)
                          )}
                        </td>
                      );
                    })
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Old Glass */}
      <div>
        <h4 className="text-[#D4A574] mb-3 text-lg">OLD GLASS</h4>
        <div className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#0a0a0a]">
                <th className="text-left p-3 text-[#8B8B8B] border-r border-[#D4A574] text-xs"></th>
                {['Cyl', 'Axis', 'Sph', 'V/A', 'Add'].map((head) => (
                  <th key={head} className="text-center p-2 text-[#8B8B8B] border-r border-[#D4A574] text-xs font-normal">{head}</th>
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
                    const val = String(((oldGlass as any)?.[eye] as any)?.[field] ?? '');
                    return (
                      <td
                        key={`og-${eye}-${field}`}
                        className="p-1 text-center border-r border-[#D4A574]"
                      >
                        {renderCell(
                          field,
                          val,
                          (v) => updateField(['oldGlass', eye, field], v)
                        )}
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
    >
      {cardContent}
    </ExpandableCard>
  );
}
