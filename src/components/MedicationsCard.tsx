import { Pill, AlertCircle, Info, Plus, X } from 'lucide-react';
import { CardHeader } from './CardHeader';
import { ExpandableCard } from './ExpandableCard';
import { EditableText } from './EditableText';
import { DrugHistory, DrugAllergy, CurrentMedication } from './patient';

interface MedicationsCardProps {
  data: DrugHistory;
  updateData: (path: (string | number)[], value: any) => void;
  isEditable: boolean;
}

export function MedicationsCard({ data, updateData, isEditable }: MedicationsCardProps) {
  const { allergies = [], currentMeds = [], compliance = { adherenceRate: '', missedDoses: '', lastRefill: '' }, previousMeds } = data;

  const updateField = (path: (string | number)[], value: any) => {
    updateData(['drugHistory', ...path], value);
  };

  const addItem = (type: 'allergies' | 'currentMeds' | 'previousMeds') => {
    if (type === 'previousMeds') {
      const prevMedsList = typeof previousMeds === 'string' ? JSON.parse(previousMeds || '[]') : (Array.isArray(previousMeds) ? previousMeds : []);
      const newItem = { id: Date.now().toString(), name: '', dosage: '', reason: '', dateDiscontinued: '' };
      updateField(['previousMeds'], JSON.stringify([...prevMedsList, newItem]));
    } else {
      const newItem =
        type === 'allergies'
          ? { id: Date.now().toString(), drug: '', reaction: '', severity: 'Mild' }
          : { id: Date.now().toString(), name: '', dosage: '', indication: '', started: '' };
      updateField([type], [...(type === 'allergies' ? allergies : currentMeds), newItem]);
    }
  };

  const removeItem = (type: 'allergies' | 'currentMeds' | 'previousMeds', id: string) => {
    if (type === 'previousMeds') {
      const prevMedsList = typeof previousMeds === 'string' ? JSON.parse(previousMeds || '[]') : (Array.isArray(previousMeds) ? previousMeds : []);
      updateField(['previousMeds'], JSON.stringify(prevMedsList.filter((item: any) => item.id !== id)));
    } else {
      const currentList = type === 'allergies' ? allergies : currentMeds;
      updateField([type], currentList.filter((item) => item.id !== id));
    }
  };

  const updateItem = (
    type: 'allergies' | 'currentMeds' | 'previousMeds',
    id: string,
    field: string,
    value: string
  ) => {
    if (type === 'previousMeds') {
      const prevMedsList = typeof previousMeds === 'string' ? JSON.parse(previousMeds || '[]') : (Array.isArray(previousMeds) ? previousMeds : []);
      const index = prevMedsList.findIndex((item: any) => item.id === id);
      if (index !== -1) {
        prevMedsList[index][field] = value;
        updateField(['previousMeds'], JSON.stringify(prevMedsList));
      }
    } else {
      const currentList = type === 'allergies' ? allergies : currentMeds;
      const index = currentList.findIndex((item) => item.id === id);
      if (index !== -1) updateField([type, index, field], value);
    }
  };

  const updateCompliance = (field: keyof typeof compliance, value: string) => {
    updateField(['compliance', field], value);
  };

  const cardContent = (
    <>
      <CardHeader icon={Pill} title="Drug History" />
      <div className="space-y-3 flex-1">
        <div className="bg-[#1a1a1a] rounded-lg p-2 border border-[#D4A574]">
          <div className="flex items-center justify-between">
            <span className="text-[#8B8B8B] text-xs">Current Medications</span>
            <span className="text-white text-sm">{currentMeds.length}</span>
          </div>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-2 border border-[#F44336]">
          <div className="flex items-center justify-between">
            <span className="text-[#8B8B8B] text-xs flex items-center gap-1">
              <AlertCircle className="w-5 h-5 text-[#F44336]" />
              Allergies
            </span>
            <span className="text-white text-sm">{allergies.length}</span>
          </div>
        </div>
      </div>
    </>
  );

  const expandedContent = (
    <div className="space-y-8">
      {/* ===================== CURRENT MEDICATIONS ===================== */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[#D4A574] flex items-center gap-2 text-lg font-medium">
            <Pill className="w-5 h-5" />
            Current Medications
          </h4>
          {isEditable && (
            <button
              onClick={() => addItem('currentMeds')}
              className="flex items-center gap-1 text-[#D4A574] hover:text-[#C9955E] text-xs transition-colors"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          )}
        </div>

        <div className="space-y-3">
          {currentMeds.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#1a1a1a] border-b border-[#D4A574]">
                    <th className="px-4 py-2 text-left text-[#D4A574] font-medium text-xs">Medication Name</th>
                    <th className="px-4 py-2 text-left text-[#D4A574] font-medium text-xs">Dosage</th>
                    <th className="px-4 py-2 text-left text-[#D4A574] font-medium text-xs">Indication</th>
                    <th className="px-4 py-2 text-left text-[#D4A574] font-medium text-xs">Started</th>
                    <th className="px-4 py-2 text-center text-[#D4A574] font-medium text-xs w-12">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentMeds.map((med) => (
                    <tr key={med.id} className="border-b border-[#D4A574] hover:bg-[#0a0a0a] transition-colors">
                      <td className="px-4 py-3">
                        {isEditable ? (
                          <input
                            type="text"
                            value={med.name}
                            onChange={(e) => updateItem('currentMeds', med.id, 'name', e.target.value)}
                            placeholder="Enter name"
                            className="w-full bg-[#0a0a0a] border border-[#D4A574] text-white text-sm px-2 py-1 rounded focus:outline-none focus:border-[#D4A574] transition-colors"
                          />
                        ) : (
                          <span className="text-white font-medium">{med.name || '-'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditable ? (
                          <input
                            type="text"
                            value={med.dosage}
                            onChange={(e) => updateItem('currentMeds', med.id, 'dosage', e.target.value)}
                            placeholder="e.g., 500mg"
                            className="w-full bg-[#0a0a0a] border border-[#D4A574] text-white text-sm px-2 py-1 rounded focus:outline-none focus:border-[#D4A574] transition-colors"
                          />
                        ) : (
                          <span className="text-[#ccc] text-sm">{med.dosage || '-'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditable ? (
                          <input
                            type="text"
                            value={med.indication}
                            onChange={(e) => updateItem('currentMeds', med.id, 'indication', e.target.value)}
                            placeholder="e.g., Diabetes"
                            className="w-full bg-[#0a0a0a] border border-[#D4A574] text-white text-sm px-2 py-1 rounded focus:outline-none focus:border-[#D4A574] transition-colors"
                          />
                        ) : (
                          <span className="text-[#ccc] text-sm">{med.indication || '-'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditable ? (
                          <input
                            type="text"
                            value={med.started}
                            onChange={(e) => updateItem('currentMeds', med.id, 'started', e.target.value)}
                            placeholder="Jan 2025"
                            className="w-full bg-[#0a0a0a] border border-[#D4A574] text-white text-sm px-2 py-1 rounded focus:outline-none focus:border-[#D4A574] transition-colors"
                          />
                        ) : (
                          <span className="text-[#ccc] text-sm">{med.started || '-'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isEditable && (
                          <button
                            onClick={() => removeItem('currentMeds', med.id)}
                            className="p-1 text-[#8B8B8B] hover:text-[#F44336] transition-colors inline-flex"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4 text-[#8B8B8B] text-sm">No current medications</div>
          )}
        </div>
      </section>

      {/* ===================== ALLERGIES ===================== */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[#F44336] flex items-center gap-2 text-lg font-medium">
            <AlertCircle className="w-5 h-5" />
            Allergies
          </h4>
          {isEditable && (
            <button
              onClick={() => addItem('allergies')}
              className="flex items-center gap-1 text-[#F44336] hover:text-[#e53935] text-xs transition-colors"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          )}
        </div>

        <div className="space-y-3">
          {allergies.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#1a1a1a] border-b border-[#F44336]">
                    <th className="px-4 py-2 text-left text-[#F44336] font-medium text-xs">Drug / Allergen</th>
                    <th className="px-4 py-2 text-left text-[#F44336] font-medium text-xs">Reaction</th>
                    <th className="px-4 py-2 text-left text-[#F44336] font-medium text-xs">Severity</th>
                    <th className="px-4 py-2 text-center text-[#F44336] font-medium text-xs w-12">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {allergies.map((allergy) => (
                    <tr key={allergy.id} className="border-b border-[#F44336] border-opacity-30 hover:bg-[#0a0a0a] transition-colors">
                      <td className="px-4 py-3">
                        {isEditable ? (
                          <input
                            type="text"
                            value={allergy.drug}
                            onChange={(e) => updateItem('allergies', allergy.id, 'drug', e.target.value)}
                            placeholder="e.g., Penicillin"
                            className="w-full bg-[#0a0a0a] border border-[#F44336] border-opacity-60 text-white text-sm px-2 py-1 rounded focus:outline-none focus:border-[#F44336] transition-colors"
                          />
                        ) : (
                          <span className="text-white font-medium">{allergy.drug || '-'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditable ? (
                          <input
                            type="text"
                            value={allergy.reaction}
                            onChange={(e) => updateItem('allergies', allergy.id, 'reaction', e.target.value)}
                            placeholder="e.g., Rash, hives"
                            className="w-full bg-[#0a0a0a] border border-[#F44336] border-opacity-60 text-white text-sm px-2 py-1 rounded focus:outline-none focus:border-[#D4A574] transition-colors"
                          />
                        ) : (
                          <span className="text-[#ccc] text-sm">{allergy.reaction || '-'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditable ? (
                          <select
                            value={allergy.severity}
                            onChange={(e) => updateItem('allergies', allergy.id, 'severity', e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-[#F44336] border-opacity-60 text-white text-sm px-2 py-1 rounded focus:outline-none focus:border-[#F44336] transition-colors cursor-pointer"
                          >
                            <option value="Mild">Mild</option>
                            <option value="Moderate">Moderate</option>
                            <option value="Severe">Severe</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${allergy.severity === 'Severe'
                                ? 'bg-[#F44336] bg-opacity-20 text-[#F44336]'
                                : allergy.severity === 'Moderate'
                                  ? 'bg-[#FF9800] bg-opacity-20 text-[#FF9800]'
                                  : 'bg-[#4CAF50] bg-opacity-20 text-[#4CAF50]'
                              }`}
                          >
                            {allergy.severity}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isEditable && (
                          <button
                            onClick={() => removeItem('allergies', allergy.id)}
                            className="p-1 text-[#8B8B8B] hover:text-[#F44336] transition-colors inline-flex"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4 text-[#8B8B8B] text-sm">No known allergies</div>
          )}
        </div>
      </section>

      {/* ===================== MEDICATION COMPLIANCE ===================== */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-[#D4A574]" />
          <h4 className="text-[#D4A574] text-lg font-medium">Medication Compliance</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#1a1a1a] border-b border-[#D4A574]">
                <th className="px-4 py-2 text-left text-[#D4A574] font-medium text-xs">Metric</th>
                <th className="px-4 py-2 text-left text-[#D4A574] font-medium text-xs">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#D4A574] hover:bg-[#0a0a0a] transition-colors">
                <td className="px-4 py-3 text-[#8B8B8B]">Adherence Rate</td>
                <td className="px-4 py-3">
                  {isEditable ? (
                    <input
                      type="text"
                      value={compliance.adherenceRate}
                      onChange={(e) => updateCompliance('adherenceRate', e.target.value)}
                      placeholder="e.g., 95%"
                      className="w-full bg-[#0a0a0a] border border-[#D4A574] text-white text-sm px-2 py-1 rounded focus:outline-none focus:border-[#D4A574] transition-colors"
                    />
                  ) : (
                    <span className="text-white">{compliance.adherenceRate || '-'}</span>
                  )}
                </td>
              </tr>
              <tr className="border-b border-[#D4A574] hover:bg-[#0a0a0a] transition-colors">
                <td className="px-4 py-3 text-[#8B8B8B]">Missed Doses (Last 30 days)</td>
                <td className="px-4 py-3">
                  {isEditable ? (
                    <input
                      type="text"
                      value={compliance.missedDoses}
                      onChange={(e) => updateCompliance('missedDoses', e.target.value)}
                      placeholder="e.g., 2"
                      className="w-full bg-[#0a0a0a] border border-[#D4A574] text-white text-sm px-2 py-1 rounded focus:outline-none focus:border-[#D4A574] transition-colors"
                    />
                  ) : (
                    <span className="text-white">{compliance.missedDoses || '-'}</span>
                  )}
                </td>
              </tr>
              <tr className="border-b border-[#D4A574] hover:bg-[#0a0a0a] transition-colors">
                <td className="px-4 py-3 text-[#8B8B8B]">Last Refill</td>
                <td className="px-4 py-3">
                  {isEditable ? (
                    <input
                      type="text"
                      value={compliance.lastRefill}
                      onChange={(e) => updateCompliance('lastRefill', e.target.value)}
                      placeholder="e.g., 12 Oct 2025"
                      className="w-full bg-[#0a0a0a] border border-[#D4A574] text-white text-sm px-2 py-1 rounded focus:outline-none focus:border-[#D4A574] transition-colors"
                    />
                  ) : (
                    <span className="text-white">{compliance.lastRefill || '-'}</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ===================== PREVIOUS MEDICATIONS ===================== */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[#D4A574] flex items-center gap-2 text-lg font-medium">
            Previous Medications (Discontinued)
          </h4>
          {isEditable && (
            <button
              onClick={() => addItem('previousMeds')}
              className="flex items-center gap-1 text-[#D4A574] hover:text-[#C9955E] text-xs transition-colors"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          )}
        </div>

        <div className="space-y-3">
          {(() => {
            const prevMedsList = typeof previousMeds === 'string' ? JSON.parse(previousMeds || '[]') : (Array.isArray(previousMeds) ? previousMeds : []);
            return prevMedsList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#1a1a1a] border-b border-[#D4A574]">
                      <th className="px-4 py-2 text-left text-[#D4A574] font-medium text-xs">Drug Name</th>
                      <th className="px-4 py-2 text-left text-[#D4A574] font-medium text-xs">Dosage</th>
                      <th className="px-4 py-2 text-left text-[#D4A574] font-medium text-xs">Reason Discontinued</th>
                      <th className="px-4 py-2 text-left text-[#D4A574] font-medium text-xs">When Discontinued</th>
                      <th className="px-4 py-2 text-center text-[#D4A574] font-medium text-xs w-12">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prevMedsList.map((med: any) => (
                      <tr key={med.id} className="border-b border-[#D4A574] hover:bg-[#0a0a0a] transition-colors">
                        <td className="px-4 py-3">
                          {isEditable ? (
                            <input
                              type="text"
                              value={med.name}
                              onChange={(e) => updateItem('previousMeds', med.id, 'name', e.target.value)}
                              placeholder="Enter name"
                              className="w-full bg-[#0a0a0a] border border-[#D4A574] text-white text-sm px-2 py-1 rounded focus:outline-none focus:border-[#D4A574] transition-colors"
                            />
                          ) : (
                            <span className="text-white font-medium">{med.name || '-'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditable ? (
                            <input
                              type="text"
                              value={med.dosage}
                              onChange={(e) => updateItem('previousMeds', med.id, 'dosage', e.target.value)}
                              placeholder="e.g., 500mg"
                              className="w-full bg-[#0a0a0a] border border-[#D4A574] text-white text-sm px-2 py-1 rounded focus:outline-none focus:border-[#D4A574] transition-colors"
                            />
                          ) : (
                            <span className="text-[#ccc] text-sm">{med.dosage || '-'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditable ? (
                            <input
                              type="text"
                              value={med.reason}
                              onChange={(e) => updateItem('previousMeds', med.id, 'reason', e.target.value)}
                              placeholder="e.g., Side effects"
                              className="w-full bg-[#0a0a0a] border border-[#D4A574] text-white text-sm px-2 py-1 rounded focus:outline-none focus:border-[#D4A574] transition-colors"
                            />
                          ) : (
                            <span className="text-[#ccc] text-sm">{med.reason || '-'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditable ? (
                            <input
                              type="text"
                              value={med.dateDiscontinued}
                              onChange={(e) => updateItem('previousMeds', med.id, 'dateDiscontinued', e.target.value)}
                              placeholder="e.g., Jan 2025"
                              className="w-full bg-[#0a0a0a] border border-[#D4A574] text-white text-sm px-2 py-1 rounded focus:outline-none focus:border-[#D4A574] transition-colors"
                            />
                          ) : (
                            <span className="text-[#ccc] text-sm">{med.dateDiscontinued || '-'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isEditable && (
                            <button
                              onClick={() => removeItem('previousMeds', med.id)}
                              className="p-1 text-[#8B8B8B] hover:text-[#F44336] transition-colors inline-flex"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-4 text-[#8B8B8B] text-sm">No discontinued medications</div>
            );
          })()}
        </div>
      </section>
    </div>
  );

  return (
    <ExpandableCard title="Drug History" expandedContent={expandedContent}>
      {cardContent}
    </ExpandableCard>
  );
}
