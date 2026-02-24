import { useState, useEffect, useRef } from 'react';
import { Pill, Plus, X, Calendar } from 'lucide-react';
import { ExpandableCard } from './ExpandableCard';
import { EditableText, EditableTextHandle } from './EditableText';
import { CardHeader } from './CardHeader';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  instructions: string;
}

interface MedicationPrescribedCardProps {
  data?: any;
  updateData?: (path: (string | number)[], value: any) => void;
  isEditable?: boolean;
  doctorName?: string;
}

export function MedicationPrescribedCard({
  data,
  updateData,
  isEditable = false,
  doctorName = 'Unknown Doctor',
}: MedicationPrescribedCardProps) {
  const medications: Medication[] =
    (data && data.items) || [
      {
        name: 'Timolol 0.5% Eye Drops',
        dosage: '1 drop',
        frequency: 'Twice daily',
        duration: '1 month',
        route: 'Both Eyes',
        instructions: 'Morning and evening',
      },
      {
        name: 'Latanoprost 0.005% Eye Drops',
        dosage: '1 drop',
        frequency: 'Once daily',
        duration: '1 month',
        route: 'Both Eyes',
        instructions: 'At bedtime',
      },
      {
        name: 'Carboxymethylcellulose 0.5%',
        dosage: '1-2 drops',
        frequency: '4 times daily',
        duration: '2 weeks',
        route: 'Both Eyes',
        instructions: 'As needed for dryness',
      },
    ];

  // Helper to format date as DD Mon YYYY
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const summary = {
    datePrescribed: data?.summary?.datePrescribed || '',
    prescribedBy: data?.summary?.prescribedBy || '',
    nextVisit: data?.summary?.nextVisit || '',
  };

  // Auto-fill defaults on mount if empty
  useEffect(() => {
    const today = new Date();
    const nextVisitDate = new Date();
    nextVisitDate.setDate(today.getDate() + 15);

    const updates: any = {};
    let hasUpdates = false;

    if (!summary.datePrescribed) {
      updates.datePrescribed = formatDate(today);
      hasUpdates = true;
    }
    if (!summary.prescribedBy) {
      updates.prescribedBy = doctorName;
      hasUpdates = true;
    }
    if (!summary.nextVisit) {
      updates.nextVisit = formatDate(nextVisitDate);
      hasUpdates = true;
    }

    if (hasUpdates && updateData) {
      updateData(['medicationPrescribed', 'summary'], { ...summary, ...updates });
    }
  }, []); // Run once on mount

  const addMedication = () => {
    const next = [
      ...medications,
      {
        name: 'New Medication',
        dosage: '1 drop',
        frequency: 'Twice daily',
        duration: '1 week',
        route: 'Both Eyes',
        instructions: 'As directed',
      },
    ];
    if (updateData) updateData(['medicationPrescribed', 'items'], next);
  };

  const removeMedication = (index: number) => {
    const next = medications.filter((_, i) => i !== index);
    if (updateData) updateData(['medicationPrescribed', 'items'], next);
  };

  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    if (updateData) updateData(['medicationPrescribed', 'items'], updated);
  };

  const updateSummary = (field: keyof typeof summary, value: string) => {
    const updated = { ...summary, [field]: value };
    if (updateData) updateData(['medicationPrescribed', 'summary'], updated);
  };

  const fieldRefs = useRef<Record<string, EditableTextHandle | null>>({});

  // Compact dashboard view
  const cardContent = (
    <>
      <CardHeader icon={Pill} title="Medications Prescribed" />

      <div className="space-y-2 flex-1">
        {medications.slice(0, 3).map((med, index) => (
          <div
            key={index}
            className="bg-[#1a1a1a] rounded-lg p-2 border border-[#D4A574]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[#8B8B8B] text-xl truncate flex-1">
                {med.name}
              </span>
              <span className="text-white text-xl ml-2">{med.frequency}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  // Expanded view (full editable layout)
  const expandedContent = (
    <div className="space-y-6">
      {/* Medications Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[#D4A574] text-xl">Prescribed Medications</h4>
          {isEditable && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                addMedication();
              }}
              className="flex items-center gap-1 px-4 py-2 bg-[#D4A574] text-[#0a0a0a] rounded text-xl hover:bg-[#C9955E] transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Medication
            </button>
          )}
        </div>

        <div className="space-y-4">
          {medications.map((med, index) => (
            <div
              key={index}
              className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-5"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="grid grid-cols-2 gap-6">
                    <div
                      className="cursor-pointer hover:bg-[#222] p-2 rounded transition-colors"
                      onClick={() => fieldRefs.current[`med-${index}-name`]?.startEditing()}
                    >
                      <div className="text-[#8B8B8B] text-xl mb-1">
                        Medication Name
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <EditableText
                          ref={(el) => fieldRefs.current[`med-${index}-name`] = el}
                          value={med.name}
                          onSave={(val) => updateMedication(index, 'name', val)}
                          className="text-white text-xl"
                          placeholder="Enter name"
                          isEditable={isEditable}
                        />
                      </div>
                    </div>
                    <div
                      className="cursor-pointer hover:bg-[#222] p-2 rounded transition-colors"
                      onClick={() => fieldRefs.current[`med-${index}-dosage`]?.startEditing()}
                    >
                      <div className="text-[#8B8B8B] text-xl mb-1">Dosage</div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <EditableText
                          ref={(el) => fieldRefs.current[`med-${index}-dosage`] = el}
                          value={med.dosage}
                          onSave={(val) =>
                            updateMedication(index, 'dosage', val)
                          }
                          className="text-white text-xl"
                          placeholder="Enter dosage"
                          isEditable={isEditable}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {isEditable && (
                  <div className="flex-shrink-0 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeMedication(index);
                      }}
                      className="p-2 hover:bg-[#2a2a2a] rounded transition-colors"
                      aria-label="Remove medication"
                    >
                      <X className="w-5 h-5 text-[#8B8B8B] hover:text-[#EF4444]" />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-6 mb-4">
                <div
                  className="cursor-pointer hover:bg-[#222] p-2 rounded transition-colors"
                  onClick={() => fieldRefs.current[`med-${index}-frequency`]?.startEditing()}
                >
                  <div className="text-[#8B8B8B] text-xl mb-1">Frequency</div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <EditableText
                      ref={(el) => fieldRefs.current[`med-${index}-frequency`] = el}
                      value={med.frequency}
                      onSave={(val) =>
                        updateMedication(index, 'frequency', val)
                      }
                      className="text-white text-xl"
                      placeholder="Enter frequency"
                      isEditable={isEditable}
                    />
                  </div>
                </div>

                <div
                  className="cursor-pointer hover:bg-[#222] p-2 rounded transition-colors"
                  onClick={() => fieldRefs.current[`med-${index}-duration`]?.startEditing()}
                >
                  <div className="text-[#8B8B8B] text-xl mb-1">Duration</div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <EditableText
                      ref={(el) => fieldRefs.current[`med-${index}-duration`] = el}
                      value={med.duration}
                      onSave={(val) =>
                        updateMedication(index, 'duration', val)
                      }
                      className="text-white text-xl"
                      placeholder="Enter duration"
                      isEditable={isEditable}
                    />
                  </div>
                </div>

                <div
                  className="cursor-pointer hover:bg-[#222] p-2 rounded transition-colors"
                  onClick={() => fieldRefs.current[`med-${index}-route`]?.startEditing()}
                >
                  <div className="text-[#8B8B8B] text-xl mb-1">Route</div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <EditableText
                      ref={(el) => fieldRefs.current[`med-${index}-route`] = el}
                      value={med.route}
                      onSave={(val) => updateMedication(index, 'route', val)}
                      className="text-white text-xl"
                      placeholder="Enter route"
                      isEditable={isEditable}
                    />
                  </div>
                </div>
              </div>

              <div
                className="cursor-pointer hover:bg-[#222] p-2 rounded transition-colors"
                onClick={() => fieldRefs.current[`med-${index}-instructions`]?.startEditing()}
              >
                <div className="text-[#8B8B8B] text-xl mb-1">
                  Special Instructions
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <EditableText
                    ref={(el) => fieldRefs.current[`med-${index}-instructions`] = el}
                    value={med.instructions}
                    onSave={(val) =>
                      updateMedication(index, 'instructions', val)
                    }
                    className="text-white text-xl"
                    placeholder="Enter special instructions"
                    isEditable={isEditable}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prescription Summary */}
      <div className="bg-[#0a0a0a] border border-[#D4A574] rounded-lg p-5">
        <h5 className="text-[#D4A574] text-xl mb-4">Prescription Summary</h5>
        <div className="space-y-4 text-xl">
          <div className="flex items-center justify-between p-2 rounded hover:bg-[#222]">
            <span className="text-[#8B8B8B]">Total Medications:</span>
            <span className="text-white">{medications.length}</span>
          </div>

          <div
            className="flex items-center justify-between cursor-pointer hover:bg-[#222] p-2 rounded transition-colors"
            onClick={() => fieldRefs.current['summary-datePrescribed']?.startEditing()}
          >
            <span className="text-[#8B8B8B] text-xl">Date Prescribed:</span>
            <div onClick={(e) => e.stopPropagation()}>
              <EditableText
                ref={(el) => fieldRefs.current['summary-datePrescribed'] = el}
                value={summary.datePrescribed}
                onSave={(val) => updateSummary('datePrescribed', val)}
                className="text-white text-xl"
                placeholder="Enter date"
                isEditable={isEditable}
              />
            </div>
          </div>

          <div
            className="flex items-center justify-between cursor-pointer hover:bg-[#222] p-2 rounded transition-colors"
            onClick={() => fieldRefs.current['summary-prescribedBy']?.startEditing()}
          >
            <span className="text-[#8B8B8B] text-xl">Prescribed By:</span>
            <div onClick={(e) => e.stopPropagation()}>
              <EditableText
                ref={(el) => fieldRefs.current['summary-prescribedBy'] = el}
                value={summary.prescribedBy}
                onSave={(val) => updateSummary('prescribedBy', val)}
                className="text-white text-xl"
                placeholder="Enter doctor name"
                isEditable={isEditable}
              />
            </div>
          </div>

          <div
            className="flex items-center justify-between cursor-pointer hover:bg-[#222] p-2 rounded transition-colors"
            onClick={() => fieldRefs.current['summary-nextVisit']?.startEditing()}
          >
            <span className="text-[#8B8B8B] text-xl">Next Visit:</span>
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <EditableText
                ref={(el) => fieldRefs.current['summary-nextVisit'] = el}
                value={summary.nextVisit}
                onSave={(val) => updateSummary('nextVisit', val)}
                className="text-white text-xl"
                placeholder="Enter next visit date"
                isEditable={isEditable}
              />
              <Calendar className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* General Instructions */}
      <div className="bg-[#0a0a0a] border border-[#D4A574] rounded-lg p-5">
        <h5 className="text-[#D4A574] text-xl mb-3">General Instructions</h5>
        <div className="space-y-2 text-xl">
          <EditableText
            value="• Wash hands before instilling eye drops"
            onSave={() => { }}
            isEditable={false}
            className="text-white text-xl"
          />
          <EditableText
            value="• Wait at least 5 minutes between different eye drop medications"
            onSave={() => { }}
            isEditable={false}
            className="text-white text-xl"
          />
          <EditableText
            value="• Store medications as per manufacturer's instructions"
            onSave={() => { }}
            isEditable={false}
            className="text-white text-xl"
          />
          <EditableText
            value="• Report any adverse reactions immediately"
            onSave={() => { }}
            isEditable={false}
            className="text-white text-xl"
          />
          <EditableText
            value="• Do not discontinue medications without consulting doctor"
            onSave={() => { }}
            isEditable={false}
            className="text-white text-xl"
          />
          <p className="text-[#8B8B8B] mt-2 text-xl">
            Follow-up appointment scheduled for medication review
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <ExpandableCard
      title="Medication Prescribed"
      expandedContent={expandedContent}
    >
      {cardContent}
    </ExpandableCard>
  );
}
