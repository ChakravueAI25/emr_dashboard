import { useRef } from 'react';
import { Activity, AlertTriangle, Scissors, Plus, X } from 'lucide-react';
import { CardHeader } from './CardHeader';
import { ExpandableCard } from './ExpandableCard';
import { EditableText, EditableTextHandle } from './EditableText';
import { MedicalHistory, MedicalHistoryItem, SurgicalHistoryItem } from './patient';

interface AppointmentsCardProps {
  data: MedicalHistory;
  updateData: (path: (string | number)[], value: any) => void;
  isEditable: boolean;
}

const MEDICAL_CONDITIONS = ['Diabetes', 'HTN', 'CAD', 'RNL', 'Others'];
const SURGICAL_PROCEDURES = ['Cataract', 'Glaucoma', 'Retinal', 'Corneal', 'Refractive', 'Strabismus', 'Others'];

export function AppointmentsCard({ data, updateData, isEditable }: AppointmentsCardProps) {
  const { medical, surgical, familyHistory, socialHistory } = data;

  const familyRef = useRef<EditableTextHandle>(null);
  const smokingRef = useRef<EditableTextHandle>(null);
  const alcoholRef = useRef<EditableTextHandle>(null);
  const exerciseRef = useRef<EditableTextHandle>(null);

  const updateField = (path: (string | number)[], value: any) => {
    updateData(['medicalHistory', ...path], value);
  };

  const addItem = (type: 'medical' | 'surgical') => {
    const newItem = type === 'medical'
      ? { id: Date.now().toString(), condition: '', year: '', status: 'Active' }
      : { id: Date.now().toString(), procedure: '', year: '', type: 'Elective' };
    updateField([type], [...(type === 'medical' ? medical : surgical), newItem]);
  };

  const removeItem = (type: 'medical' | 'surgical', id: string) => {
    const currentList = type === 'medical' ? medical : surgical;
    if (currentList.length > 0) {
      updateField([type], currentList.filter(item => item.id !== id));
    }
  };

  const updateItem = (type: 'medical' | 'surgical', id: string, field: keyof MedicalHistoryItem | keyof SurgicalHistoryItem, value: string) => {
    const currentList = type === 'medical' ? medical : surgical;
    const index = currentList.findIndex(item => item.id === id);
    if (index !== -1) {
      updateField([type, index, field], value);
    }
  };

  const updateSocialHistory = (field: keyof typeof socialHistory, value: string) => {
    updateField(['socialHistory', field], value);
  };

  const updateFamilyHistory = (value: string) => {
    updateField(['familyHistory'], value);
  };

  const cardContent = (
    <>
      <CardHeader icon={Activity} title="Medical & Surgical History" />
      <div className="space-y-2 flex-1">
        <div className="bg-[#1a1a1a] rounded-lg p-2 border border-[#D4A574]">
          <div className="flex items-center justify-between">
            <span className="text-[#8B8B8B] text-xs">Medical</span>
            <span className="text-white text-sm">{medical.length} conditions</span>
          </div>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-2 border border-[#D4A574]">
          <div className="flex items-center justify-between">
            <span className="text-[#8B8B8B] text-xs">Surgical</span>
            <span className="text-white text-sm">{surgical.length} procedures</span>
          </div>
        </div>
      </div>
    </>
  );

  const expandedContent = (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[#D4A574] flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5" />
            Medical History
          </h4>
          {isEditable && (
            <button onClick={() => addItem('medical')} className="flex items-center gap-1 text-[#D4A574] hover:text-[#C9955E] text-xs transition-colors">
              <Plus className="w-4 h-4" /> Add
            </button>
          )}
        </div>
        <div className="space-y-3">
          {medical.map((item) => (
            <div key={item.id} className="bg-[#1a1a1a] rounded-lg p-4 border border-[#D4A574] overflow-hidden">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="w-8 h-8 rounded-lg bg-[#0a0a0a] border border-[#D4A574] flex items-center justify-center flex-shrink-0">
                    <Activity className="w-4 h-4 text-[#D4A574]" />
                  </div>
                  <span className="text-[#4CAF50] text-sm flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#4CAF50]"></div>
                    <EditableText
                      value={item.status}
                      onSave={(v) => updateItem('medical', item.id, 'status', v)}
                      isEditable={isEditable}
                      className="text-[#4CAF50] text-sm"
                    />
                  </span>
                  {isEditable && (
                    <button onClick={() => removeItem('medical', item.id)} className="p-1 text-[#8B8B8B] hover:text-[#F44336] transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                {isEditable ? (
                  <div className="mb-3">
                    <div className="relative">
                      <select
                        value={MEDICAL_CONDITIONS.includes(item.condition) ? item.condition : 'Others'}
                        onChange={(e) => updateItem('medical', item.id, 'condition', e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#0a0a0a] border border-[#D4A574] text-white text-sm rounded appearance-none pr-8 focus:outline-none focus:border-[#D4A574] transition-colors cursor-pointer"
                      >
                        {MEDICAL_CONDITIONS.map((cond) => (
                          <option key={cond} value={cond}>
                            {cond}
                          </option>
                        ))}
                      </select>
                      <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B8B8B] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </div>
                    {(item.condition === 'Others' || !MEDICAL_CONDITIONS.includes(item.condition)) && (
                      <input
                        type="text"
                        value={!MEDICAL_CONDITIONS.includes(item.condition) ? item.condition : ''}
                        onChange={(e) => updateItem('medical', item.id, 'condition', e.target.value)}
                        placeholder="Enter custom condition"
                        className="w-full mt-2 px-3 py-1.5 bg-[#0a0a0a] border border-[#D4A574] text-white text-sm rounded focus:outline-none focus:border-[#D4A574] transition-colors"
                      />
                    )}
                  </div>
                ) : (
                  <div className="text-white mb-2 text-sm">{item.condition}</div>
                )}
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-[#8B8B8B] text-xs">Duration:</span>
                  {isEditable ? (
                    <input
                      type="text"
                      value={item.year}
                      onChange={(e) => updateItem('medical', item.id, 'year', e.target.value)}
                      placeholder="Enter duration"
                      className="px-2 py-1 bg-[#0a0a0a] border border-[#D4A574] text-white text-sm rounded focus:outline-none focus:border-[#D4A574] transition-colors"
                    />
                  ) : (
                    <span className="text-white text-sm">{item.year || '-'}</span>
                  )}
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[#D4A574] flex items-center gap-2 text-lg">
            <Scissors className="w-5 h-5" />
            Surgical History
          </h4>
          {isEditable && (
            <button onClick={() => addItem('surgical')} className="flex items-center gap-1 text-[#D4A574] hover:text-[#C9955E] text-xs transition-colors">
              <Plus className="w-4 h-4" /> Add
            </button>
          )}
        </div>
        <div className="space-y-3">
          {surgical.map((item) => (
            <div key={item.id} className="bg-[#1a1a1a] rounded-lg p-4 border border-[#D4A574] overflow-hidden">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#0a0a0a] border border-[#D4A574] flex items-center justify-center">
                    <Scissors className="w-4 h-4 text-[#D4A574]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {isEditable ? (
                      <div className="mb-3">
                        <div className="relative">
                          <select
                            value={SURGICAL_PROCEDURES.includes(item.procedure) ? item.procedure : 'Others'}
                            onChange={(e) => updateItem('surgical', item.id, 'procedure', e.target.value)}
                            className="w-full px-3 py-1.5 bg-[#0a0a0a] border border-[#D4A574] text-white text-sm rounded appearance-none pr-8 focus:outline-none focus:border-[#D4A574] transition-colors cursor-pointer"
                          >
                            {SURGICAL_PROCEDURES.map((proc) => (
                              <option key={proc} value={proc}>
                                {proc}
                              </option>
                            ))}
                          </select>
                          <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B8B8B] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                        </div>
                        {(item.procedure === 'Others' || !SURGICAL_PROCEDURES.includes(item.procedure)) && (
                          <input
                            type="text"
                            value={!SURGICAL_PROCEDURES.includes(item.procedure) ? item.procedure : ''}
                            onChange={(e) => updateItem('surgical', item.id, 'procedure', e.target.value)}
                            placeholder="Enter custom procedure"
                            className="w-full mt-2 px-3 py-1.5 bg-[#0a0a0a] border border-[#D4A574] text-white text-sm rounded focus:outline-none focus:border-[#D4A574] transition-colors"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="text-white mb-2 text-xl">{item.procedure}</div>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-[#8B8B8B] text-xs">Year:</span>
                      {isEditable ? (
                        <input
                          type="text"
                          value={item.year}
                          onChange={(e) => updateItem('surgical', item.id, 'year', e.target.value)}
                          placeholder="Enter year"
                          className="px-2 py-1 bg-[#0a0a0a] border border-[#D4A574] text-white text-sm rounded focus:outline-none focus:border-[#D4A574] transition-colors"
                        />
                      ) : (
                        <span className="text-white text-sm">{item.year || '-'}</span>
                      )}
                    </label>
                  </div>
                </div>
                {isEditable && (
                  <div className="flex-shrink-0">
                    <button onClick={() => removeItem('surgical', item.id)} className="p-1 text-[#8B8B8B] hover:text-[#F44336] transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#FFA726] min-h-[56px]">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-[#FFA726] mt-0.5" />
          <div className="flex-1">
            <p
              className="text-[#FFA726] mb-1 text-sm cursor-pointer hover:underline"
              onClick={() => familyRef.current?.startEditing()}
            >Family History</p>
            <EditableText
              ref={(el) => { familyRef.current = el; }}
              value={familyHistory}
              onSave={updateFamilyHistory}
              isEditable={isEditable}
              className="text-[#8B8B8B] text-sm text-left truncate"
            />
          </div>
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-[#D4A574] rounded-lg p-4">
        <p className="text-[#8B8B8B] text-lg mb-2">Social History</p>
        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between">
            <span
              className="text-[#8B8B8B] cursor-pointer hover:text-[#D4A574]"
              onClick={() => smokingRef.current?.startEditing()}
            >Smoking</span>
            <EditableText
              ref={(el) => { smokingRef.current = el; }}
              value={socialHistory.smoking}
              onSave={(v) => updateSocialHistory('smoking', v)}
              isEditable={isEditable}
              className="text-white text-right text-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <span
              className="text-[#8B8B8B] cursor-pointer hover:text-[#D4A574]"
              onClick={() => alcoholRef.current?.startEditing()}
            >Alcohol</span>
            <EditableText
              ref={(el) => { alcoholRef.current = el; }}
              value={socialHistory.alcohol}
              onSave={(v) => updateSocialHistory('alcohol', v)}
              isEditable={isEditable}
              className="text-white text-right text-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <span
              className="text-[#8B8B8B] cursor-pointer hover:text-[#D4A574]"
              onClick={() => exerciseRef.current?.startEditing()}
            >Exercise</span>
            <EditableText
              ref={(el) => { exerciseRef.current = el; }}
              value={socialHistory.exercise}
              onSave={(v) => updateSocialHistory('exercise', v)}
              isEditable={isEditable}
              className="text-white text-right text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ExpandableCard title="Medical & Surgical History" expandedContent={expandedContent}>
      {cardContent}
    </ExpandableCard>
  );
}