import React, { useRef, useState, useEffect } from 'react';
import { Eye, Save, Trash2 } from 'lucide-react';
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
  // Generate unique key for localStorage based on patient data
  const getStorageKey = () => {
    // Try to get patient ID from the parent data structure
    // Since this is nested under ophthalmologistExamination, we need to get it from updateData context
    return 'ophthalmo_presets_global';
  };

  const storageKey = getStorageKey();

  // State for presets - load from localStorage on mount
  const [presets, setPresetsState] = useState<Record<string, Record<string, any>>>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (err) {
      console.error('Error loading presets from localStorage:', err);
      return {};
    }
  });

  // Wrapper to persist presets to localStorage when they change
  const setPresets = (newPresets: Record<string, Record<string, any>> | ((prev: Record<string, Record<string, any>>) => Record<string, Record<string, any>>)) => {
    setPresetsState((prev) => {
      const updated = typeof newPresets === 'function' ? newPresets(prev) : newPresets;
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
        console.log('Presets saved to localStorage:', updated);
      } catch (err) {
        console.error('Error saving presets to localStorage:', err);
      }
      return updated;
    });
  };

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showNameEntry, setShowNameEntry] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [allFieldsFilled, setAllFieldsFilled] = useState(false);

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

  // Check if all fields are filled
  const checkAllFieldsFilled = () => {
    // Visual Acuity (will be populated with defaults on mount)
    const vaOd = get(['visualAcuity', 'od'], '').trim();
    const vaOs = get(['visualAcuity', 'os'], '').trim();
    
    if (!vaOd || !vaOs) return false;

    for (const key of keys) {
      const odVal = get(['od', key], '').trim();
      const osVal = get(['os', key], '').trim();
      if (!odVal || !osVal) return false;
    }
    return true;
  };

  // Check fields whenever data changes
  useEffect(() => {
    const filled = checkAllFieldsFilled();
    console.log('All fields filled:', filled, 'Data:', data);
    setAllFieldsFilled(filled);
  }, [data]);

  // Initialize default visual acuity values when component mounts
  useEffect(() => {
    if (!updateData) return;
    
    const vaOd = get(['visualAcuity', 'od'], '');
    const vaOs = get(['visualAcuity', 'os'], '');
    
    // Set defaults if not present
    if (!vaOd) {
      console.log('Setting default Visual Acuity OD: 6/6');
      updateField(['visualAcuity', 'od'], '6/6');
    }
    if (!vaOs) {
      console.log('Setting default Visual Acuity OS: 6/9');
      updateField(['visualAcuity', 'os'], '6/9');
    }
  }, []); // Run only on mount

  // Show confirmation dialog when Save as Preset is clicked
  const initiatePreset = () => {
    console.log('initiatePreset called - showing confirmation');
    setShowConfirmation(true);
  };

  // User confirmed they want to save preset - show name entry dialog
  const proceedToNameEntry = () => {
    console.log('proceedToNameEntry called');
    setShowConfirmation(false);
    setShowNameEntry(true);
  };

  // Actually save the preset with the entered name
  const saveAsPreset = () => {
    console.log('saveAsPreset called, presetName:', presetName);
    if (!presetName.trim()) {
      console.log('Preset name is empty, returning');
      return;
    }
    const presetData: Record<string, any> = {
      visualAcuity: {
        od: get(['visualAcuity', 'od'], ''),
        os: get(['visualAcuity', 'os'], ''),
      },
    };
    keys.forEach((key) => {
      if (!presetData['od']) presetData['od'] = {};
      if (!presetData['os']) presetData['os'] = {};
      presetData['od'][key] = get(['od', key], '');
      presetData['os'][key] = get(['os', key], '');
    });
    console.log('Saving preset:', presetName, presetData);
    setPresets({ ...presets, [presetName]: presetData });
    setPresetName('');
    setShowNameEntry(false);
  };

  // Load preset values
  const loadPreset = (name: string) => {
    const preset = presets[name];
    if (!preset || !updateData) return;
    
    // Load visual acuity
    if (preset.visualAcuity?.od) {
      updateField(['visualAcuity', 'od'], preset.visualAcuity.od);
    }
    if (preset.visualAcuity?.os) {
      updateField(['visualAcuity', 'os'], preset.visualAcuity.os);
    }
    
    // Load examination fields
    keys.forEach((key) => {
      if (preset.od?.[key]) {
        updateField(['od', key], preset.od[key]);
      }
      if (preset.os?.[key]) {
        updateField(['os', key], preset.os[key]);
      }
    });
  };

  // Delete preset
  const deletePreset = (name: string) => {
    const newPresets = { ...presets };
    delete newPresets[name];
    setPresets(newPresets);
  };

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
                value={get(['visualAcuity', 'od'], '')}
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
                value={get(['visualAcuity', 'os'], '')}
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

      {/* Presets Section */}
      {Object.keys(presets).length > 0 && (
        <div>
          <h4 className="text-[#D4A574] mb-3 text-lg">Saved Presets</h4>
          <div className="space-y-2">
            {Object.keys(presets).map((name) => (
              <div 
                key={name}
                className="flex items-center justify-between bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-3"
              >
                <button
                  onClick={() => loadPreset(name)}
                  className="flex-1 text-left text-white hover:text-[#D4A574] transition-colors"
                >
                  {name}
                </button>
                <button
                  onClick={() => deletePreset(name)}
                  className="text-red-500 hover:text-red-400 transition-colors ml-2"
                  title="Delete preset"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save as Preset Button */}
      {allFieldsFilled && (
        <button
          onClick={() => {
            console.log('Save as Preset button clicked');
            initiatePreset();
          }}
          className="w-full bg-[#D4A574] hover:bg-[#c19564] text-black font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <Save size={18} />
          Save as Preset
        </button>
      )}
    </div>
  );

  // Preset Dialogs Component
  const PresetDialogs = () => {
    // Show Confirmation Dialog First
    if (showConfirmation) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999]" onClick={() => {
          console.log('Confirmation backdrop clicked');
          setShowConfirmation(false);
        }}>
          <div className="bg-[#0a0a0a] border border-[#D4A574] rounded-lg p-6 w-96 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white text-lg mb-4">Save Preset</h3>
            <p className="text-[#8B8B8B] text-sm mb-6">Do you want to preset the data?</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  console.log('No clicked - closing dialog');
                  setShowConfirmation(false);
                }}
                className="px-4 py-2 bg-[#1a1a1a] border border-[#8B8B8B] rounded-lg text-white hover:bg-[#222] transition-colors cursor-pointer"
              >
                No
              </button>
              <button
                onClick={() => {
                  console.log('Yes clicked - proceeding to name entry');
                  proceedToNameEntry();
                }}
                className="px-4 py-2 bg-[#D4A574] hover:bg-[#c19564] text-black font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Show Name Entry Dialog Second
    if (showNameEntry) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999]" onClick={() => {
          console.log('Name entry backdrop clicked');
          setShowNameEntry(false);
          setPresetName('');
        }}>
          <div className="bg-[#0a0a0a] border border-[#D4A574] rounded-lg p-6 w-96 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white text-lg mb-4">Enter Preset Name</h3>
            <p className="text-[#8B8B8B] text-sm mb-4">Enter a name for this preset:</p>
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="e.g., Normal Vision"
              className="w-full bg-[#1a1a1a] border border-[#D4A574] rounded-lg px-3 py-2 text-white placeholder-[#8B8B8B] mb-4 focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
              onKeyPress={(e) => e.key === 'Enter' && saveAsPreset()}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  console.log('Cancel clicked');
                  setShowNameEntry(false);
                  setPresetName('');
                }}
                className="px-4 py-2 bg-[#1a1a1a] border border-[#8B8B8B] rounded-lg text-white hover:bg-[#222] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  console.log('Save clicked, presetName:', presetName);
                  saveAsPreset();
                }}
                disabled={!presetName.trim()}
                className="px-4 py-2 bg-[#D4A574] hover:bg-[#c19564] disabled:bg-[#8B8B8B] text-black font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <ExpandableCard title="Ophthalmologist Examination" expandedContent={expandedContent}>
        {cardContent}
      </ExpandableCard>
      <PresetDialogs />
    </>
  );
}
