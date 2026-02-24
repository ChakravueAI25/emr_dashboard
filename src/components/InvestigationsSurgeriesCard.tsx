import { useRef } from 'react';
import { ClipboardList, Plus, X, Stethoscope, Scissors } from 'lucide-react';
import { ExpandableCard } from './ExpandableCard';
import { EditableText, EditableTextHandle } from './EditableText';
import { CardHeader } from './CardHeader';

interface Investigation {
  name: string;
  urgency: 'routine' | 'urgent' | 'stat';
  reason: string;
  scheduledDate: string;
  status: 'pending' | 'scheduled' | 'completed';
}

interface Surgery {
  name: string;
  eye: 'OD' | 'OS' | 'OU';
  urgency: 'elective' | 'urgent' | 'emergency';
  indication: string;
  scheduledDate: string;
  status: 'advised' | 'scheduled' | 'completed';
}

interface InvestigationsSurgeriesCardProps {
  data?: any;
  updateData?: (path: (string | number)[], value: any) => void;
  isEditable?: boolean;
}

export function InvestigationsSurgeriesCard({
  data,
  updateData,
  isEditable = false,
}: InvestigationsSurgeriesCardProps) {
  const investigations: Investigation[] =
    data?.investigations || [
      {
        name: 'OCT Macula',
        urgency: 'routine',
        reason: 'Baseline assessment for glaucoma monitoring',
        scheduledDate: '25 Oct 2025',
        status: 'scheduled',
      },
      {
        name: 'Visual Field 24-2',
        urgency: 'routine',
        reason: 'Follow-up visual field assessment',
        scheduledDate: '25 Oct 2025',
        status: 'scheduled',
      },
    ];

  const surgeries: Surgery[] =
    data?.surgeries || [
      {
        name: 'Phacoemulsification with IOL Implantation',
        eye: 'OS',
        urgency: 'elective',
        indication: 'Visually significant cataract OS',
        scheduledDate: '15 Nov 2025',
        status: 'scheduled',
      },
    ];

  const addInvestigation = () => {
    const next: Investigation[] = [
      ...investigations,
      {
        name: 'New Investigation',
        urgency: 'routine',
        reason: 'To be specified',
        scheduledDate: '',
        status: 'pending',
      },
    ];
    if (updateData) updateData(['investigationsSurgeries', 'investigations'], next);
  };

  const removeInvestigation = (index: number) => {
    const next: Investigation[] = investigations.filter((_, i) => i !== index);
    if (updateData) updateData(['investigationsSurgeries', 'investigations'], next);
  };

  const updateInvestigation = (index: number, field: keyof Investigation, value: string) => {
    const updated = [...investigations];
    updated[index] = { ...updated[index], [field]: value };
    if (updateData) updateData(['investigationsSurgeries', 'investigations'], updated);
  };

  const addSurgery = () => {
    const next: Surgery[] = [
      ...surgeries,
      {
        name: 'New Surgical Procedure',
        eye: 'OD',
        urgency: 'elective',
        indication: 'To be specified',
        scheduledDate: '',
        status: 'advised',
      },
    ];
    if (updateData) updateData(['investigationsSurgeries', 'surgeries'], next);
  };

  const removeSurgery = (index: number) => {
    const next: Surgery[] = surgeries.filter((_, i) => i !== index);
    if (updateData) updateData(['investigationsSurgeries', 'surgeries'], next);
  };

  const updateSurgery = (index: number, field: keyof Surgery, value: string) => {
    const updated = [...surgeries];
    updated[index] = { ...updated[index], [field]: value };
    if (updateData) updateData(['investigationsSurgeries', 'surgeries'], updated);
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'stat':
      case 'emergency':
        return 'bg-[#EF4444] bg-opacity-30 text-[#EF4444]';
      case 'urgent':
        return 'bg-[#FFA726] bg-opacity-30 text-[#FFA726]';
      case 'routine':
      case 'elective':
        return 'bg-[#4CAF50] bg-opacity-30 text-[#4CAF50]';
      default:
        return 'bg-[#8B8B8B] bg-opacity-30 text-[#8B8B8B]';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-[#4CAF50] bg-opacity-30 text-[#4CAF50]';
      case 'scheduled':
        return 'bg-[#2196F3] bg-opacity-30 text-[#2196F3]';
      case 'pending':
      case 'advised':
        return 'bg-[#8B8B8B] bg-opacity-30 text-[#8B8B8B]';
      default:
        return 'bg-[#8B8B8B] bg-opacity-30 text-[#8B8B8B]';
    }
  };

  const fieldRefs = useRef<Record<string, EditableTextHandle | null>>({});

  // Compact view (summary)
  const cardContent = (
    <>
      <CardHeader icon={ClipboardList} title="Investigations & Surgeries" />
      <div className="space-y-2 flex-1">
        <div className="bg-[#1a1a1a] rounded-lg p-2 border border-[#D4A574]">
          <div className="flex items-center justify-between">
            <span className="text-[#8B8B8B] text-xs">Investigations</span>
            <span className="text-white text-sm">{investigations.length} advised</span>
          </div>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-2 border border-[#D4A574]">
          <div className="flex items-center justify-between">
            <span className="text-[#8B8B8B] text-xs">Surgeries</span>
            <span className="text-white text-sm">{surgeries.length} advised</span>
          </div>
        </div>
        {surgeries.length > 0 && (
          <div className="bg-[#2196F3] bg-opacity-20 rounded-lg p-2 border border-[#2196F3] border-opacity-50">
            <div className="flex items-center justify-between">
              <span className="text-[#2196F3] text-xs">Next Surgery</span>
              <span className="text-white text-sm">{surgeries[0].scheduledDate}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );

  // Expanded editable section
  const expandedContent = (
    <div className="space-y-6">
      {/* Investigations Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-[#D4A574]" />
            <h4 className="text-[#D4A574] text-lg">Investigations Advised</h4>
          </div>
          {isEditable && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                addInvestigation();
              }}
              className="flex items-center gap-1 px-4 py-2 bg-[#D4A574] text-[#0a0a0a] rounded text-xs hover:bg-[#C9955E] transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Investigation
            </button>
          )}
        </div>

        <div className="space-y-4">
          {investigations.map((inv, index) => (
            <div key={index} className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="grid grid-cols-2 gap-6">
                    <div
                      className="cursor-pointer hover:bg-[#222] p-2 rounded transition-colors"
                      onClick={() => fieldRefs.current[`inv-${index}-name`]?.startEditing()}
                    >
                      <div className="text-[#8B8B8B] text-xs mb-1">Investigation Name</div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <EditableText
                          ref={(el) => { fieldRefs.current[`inv-${index}-name`] = el; }}
                          value={inv.name}
                          onSave={(val) => updateInvestigation(index, 'name', val)}
                          className="text-white text-sm"
                          isEditable={isEditable}
                        />
                      </div>
                    </div>
                    <div
                      className="cursor-pointer hover:bg-[#222] p-2 rounded transition-colors"
                      onClick={() => fieldRefs.current[`inv-${index}-scheduledDate`]?.startEditing()}
                    >
                      <div className="text-[#8B8B8B] text-xs mb-1">Scheduled Date</div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <EditableText
                          ref={(el) => { fieldRefs.current[`inv-${index}-scheduledDate`] = el; }}
                          value={inv.scheduledDate}
                          onSave={(val) => updateInvestigation(index, 'scheduledDate', val)}
                          className="text-white text-sm"
                          placeholder="Not scheduled"
                          isEditable={isEditable}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {isEditable && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeInvestigation(index);
                    }}
                    className="p-2 hover:bg-[#2a2a2a] rounded transition-colors"
                    aria-label="Remove investigation"
                  >
                    <X className="w-5 h-5 text-[#8B8B8B] hover:text-[#EF4444]" />
                  </button>
                )}
              </div>

              <div
                className="mb-4 cursor-pointer hover:bg-[#222] p-2 rounded transition-colors"
                onClick={() => fieldRefs.current[`inv-${index}-reason`]?.startEditing()}
              >
                <div className="text-[#8B8B8B] text-xs mb-1">Reason/Indication</div>
                <div onClick={(e) => e.stopPropagation()}>
                  <EditableText
                    ref={(el) => { fieldRefs.current[`inv-${index}-reason`] = el; }}
                    value={inv.reason}
                    onSave={(val) => updateInvestigation(index, 'reason', val)}
                    className="text-white text-sm"
                    isEditable={isEditable}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div
                  className="cursor-pointer hover:bg-[#222] p-2 rounded transition-colors"
                  onClick={() => fieldRefs.current[`inv-${index}-urgency`]?.startEditing()}
                >
                  <div className="text-[#8B8B8B] text-xs mb-1">Urgency</div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <EditableText
                      ref={(el) => { fieldRefs.current[`inv-${index}-urgency`] = el; }}
                      value={inv.urgency}
                      onSave={(val) => updateInvestigation(index, 'urgency', val)}
                      className="text-white text-sm"
                      isEditable={isEditable}
                    />
                  </div>
                </div>
                <div
                  className="cursor-pointer hover:bg-[#222] p-2 rounded transition-colors"
                  onClick={() => fieldRefs.current[`inv-${index}-status`]?.startEditing()}
                >
                  <div className="text-[#8B8B8B] text-xs mb-1">Status</div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <EditableText
                      ref={(el) => { fieldRefs.current[`inv-${index}-status`] = el; }}
                      value={inv.status}
                      onSave={(val) => updateInvestigation(index, 'status', val)}
                      className="text-white text-sm"
                      isEditable={isEditable}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Surgeries Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-[#D4A574]" />
            <h4 className="text-[#D4A574] text-lg">Surgeries Advised</h4>
          </div>
          {isEditable && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                addSurgery();
              }}
              className="flex items-center gap-1 px-4 py-2 bg-[#D4A574] text-[#0a0a0a] rounded text-xs hover:bg-[#C9955E] transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Surgery
            </button>
          )}
        </div>

        <div className="space-y-4">
          {surgeries.map((surg, index) => (
            <div key={index} className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="grid grid-cols-3 gap-6">
                    <div
                      className="col-span-2 cursor-pointer hover:bg-[#222] p-2 rounded transition-colors"
                      onClick={() => fieldRefs.current[`surgery-${index}-name`]?.startEditing()}
                    >
                      <div className="text-[#8B8B8B] text-xs mb-1">Surgical Procedure</div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <EditableText
                          ref={(el) => { fieldRefs.current[`surgery-${index}-name`] = el; }}
                          value={surg.name}
                          onSave={(val) => updateSurgery(index, 'name', val)}
                          className="text-white text-sm"
                          isEditable={isEditable}
                        />
                      </div>
                    </div>
                    <div
                      className="cursor-pointer hover:bg-[#222] p-2 rounded transition-colors"
                      onClick={() => fieldRefs.current[`surgery-${index}-eye`]?.startEditing()}
                    >
                      <div className="text-[#8B8B8B] text-xs mb-1">Eye</div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <EditableText
                          ref={(el) => { fieldRefs.current[`surgery-${index}-eye`] = el; }}
                          value={surg.eye}
                          onSave={(val) => updateSurgery(index, 'eye', val)}
                          className="text-white text-sm"
                          isEditable={isEditable}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {isEditable && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSurgery(index);
                    }}
                    className="p-2 hover:bg-[#2a2a2a] rounded transition-colors"
                    aria-label="Remove surgery"
                  >
                    <X className="w-5 h-5 text-[#8B8B8B] hover:text-[#EF4444]" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6 mb-4">
                <div
                  className="cursor-pointer hover:bg-[#222] p-2 rounded transition-colors"
                  onClick={() => fieldRefs.current[`surgery-${index}-scheduledDate`]?.startEditing()}
                >
                  <div className="text-[#8B8B8B] text-xs mb-1">Scheduled Date</div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <EditableText
                      ref={(el) => { fieldRefs.current[`surgery-${index}-scheduledDate`] = el; }}
                      value={surg.scheduledDate}
                      onSave={(val) => updateSurgery(index, 'scheduledDate', val)}
                      className="text-white text-sm"
                      placeholder="Not scheduled"
                      isEditable={isEditable}
                    />
                  </div>
                </div>
                <div
                  className="cursor-pointer hover:bg-[#222] p-2 rounded transition-colors"
                  onClick={() => fieldRefs.current[`surgery-${index}-status`]?.startEditing()}
                >
                  <div className="text-[#8B8B8B] text-xs mb-1">Status</div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <EditableText
                      ref={(el) => { fieldRefs.current[`surgery-${index}-status`] = el; }}
                      value={surg.status}
                      onSave={(val) => updateSurgery(index, 'status', val)}
                      className="text-white text-sm"
                      isEditable={isEditable}
                    />
                  </div>
                </div>
              </div>

              <div
                className="mb-4 cursor-pointer hover:bg-[#222] p-2 rounded transition-colors"
                onClick={() => fieldRefs.current[`surgery-${index}-indication`]?.startEditing()}
              >
                <div className="text-[#8B8B8B] text-xs mb-1">Indication</div>
                <div onClick={(e) => e.stopPropagation()}>
                  <EditableText
                    ref={(el) => { fieldRefs.current[`surgery-${index}-indication`] = el; }}
                    value={surg.indication}
                    onSave={(val) => updateSurgery(index, 'indication', val)}
                    className="text-white text-sm"
                    isEditable={isEditable}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div
                  className="cursor-pointer hover:bg-[#222] p-2 rounded transition-colors"
                  onClick={() => fieldRefs.current[`surgery-${index}-urgency`]?.startEditing()}
                >
                  <div className="text-[#8B8B8B] text-xs mb-1">Urgency</div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <EditableText
                      ref={(el) => { fieldRefs.current[`surgery-${index}-urgency`] = el; }}
                      value={surg.urgency}
                      onSave={(val) => updateSurgery(index, 'urgency', val)}
                      className="text-white text-sm"
                      isEditable={isEditable}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-[#0a0a0a] border border-[#D4A574] rounded-lg p-5">
        <h5 className="text-[#D4A574] text-lg mb-4">Summary</h5>
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded hover:bg-[#222]">
              <span className="text-[#8B8B8B]">Total Investigations:</span>
              <span className="text-white">{investigations.length}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded hover:bg-[#222]">
              <span className="text-[#8B8B8B]">Pending:</span>
              <span className="text-white">
                {investigations.filter((i) => i.status === 'pending').length}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded hover:bg-[#222]">
              <span className="text-[#8B8B8B]">Total Surgeries:</span>
              <span className="text-white">{surgeries.length}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded hover:bg-[#222]">
              <span className="text-[#8B8B8B]">Scheduled:</span>
              <span className="text-white">
                {surgeries.filter((s) => s.status === 'scheduled').length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ExpandableCard title="Investigations & Surgeries Advised" expandedContent={expandedContent}>
      {cardContent}
    </ExpandableCard>
  );
}
