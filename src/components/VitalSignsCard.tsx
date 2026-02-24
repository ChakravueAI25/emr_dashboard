import { useRef } from 'react';
import { EditableText, EditableTextHandle } from './EditableText';
import { ExpandableCard } from './ExpandableCard';
import { FileText, Clock, AlertCircle, Plus, X, Eye, ChevronDown } from 'lucide-react';
import { CardHeader } from './CardHeader';
import { PresentingComplaints, Complaint } from './patient';

interface VitalSignsCardProps {
  data: PresentingComplaints;
  updateData: (path: (string | number)[], value: any) => void;
  isEditable: boolean;
  // Navigation props (Deprecated)
  showVisitNav?: boolean;
  visitIndex?: number;
  totalVisits?: number;
  onPrevVisit?: () => void;
  onNextVisit?: () => void;
  isViewingPastVisit?: boolean;
}

const EYE_COMPLAINTS = [
  'Blurred vision',
  'Eye pain',
  'Foreign body sensation',
  'Redness',
  'Itching',
  'Tearing',
  'Dryness',
  'Discharge',
  'Floaters',
  'Flashes of light',
  'Double vision',
  'Photophobia',
  'Decreased vision',
  'Eyelid swelling',
];

const AGGRAVATING_FACTORS = [
  'Bright light',
  'Near work',
  'Computer use',
  'Reading',
  'Evening time',
  'Cold weather',
  'Dust exposure',
  'Allergy',
  'Stress',
  'Fatigue',
  'Hot weather',
  'Air conditioning',
];

const RELIEVING_FACTORS = [
  'Rest',
  'Cool compress',
  'Lubricating drops',
  'Avoiding triggers',
  'Medication',
  'Sleep',
  'Outdoor activity',
  'Reduced screen time',
  'Warm compress',
  'Eye covering',
  'Blinking',
  'Massage',
];

const DURATION_UNITS = ['days', 'hrs', 'weeks'] as const;

export function VitalSignsCard({
  data,
  updateData,
  isEditable
}: VitalSignsCardProps) {
  const complaints = data?.complaints ?? [];
  const history = data?.history ?? { severity: '', onset: '', aggravating: '', relieving: '', associated: '' };

  const historyRef = useRef<EditableTextHandle>(null);

  // Removed global selectedAggravating/selectedRelieving - now stored per complaint

  const updateComplaint = (id: string, field: keyof Complaint, value: any) => {
    const index = complaints.findIndex(c => c.id === id);
    if (index !== -1) {
      updateData(['presentingComplaints', 'complaints', index, field], value);
    }
  };

  // Toggle a factor for a specific complaint (per-complaint, not global)
  const toggleComplaintFactor = (complaintId: string, factor: string, factorType: 'aggravatingFactors' | 'relievingFactors') => {
    const complaint = complaints.find(c => c.id === complaintId);
    if (!complaint) return;

    const currentFactors = complaint[factorType] || [];
    const newFactors = currentFactors.includes(factor)
      ? currentFactors.filter(f => f !== factor)
      : [...currentFactors, factor];

    updateComplaint(complaintId, factorType, newFactors);
  };

  const addComplaintFromButton = (complaintName: string) => {
    const newComplaint: Complaint = {
      id: Date.now().toString(),
      complaint: complaintName,
      duration: '',
      durationUnit: 'days',
      eye: 'both'
    };
    updateData(['presentingComplaints', 'complaints'], [...complaints, newComplaint]);
  };

  const removeComplaint = (id: string) => {
    if (complaints.length > 1) {
      const updatedComplaints = complaints.filter(c => c.id !== id);
      updateData(['presentingComplaints', 'complaints'], updatedComplaints);
    }
  };

  const updateHistory = (field: keyof typeof history, value: string) => {
    updateData(['presentingComplaints', 'history', field], value);
  };

  // Legacy global factor functions removed - factors are now per-complaint
  // Old data in history.aggravating/history.relieving is preserved but new data goes per-complaint

  const cardContent = (
    <>
      <CardHeader icon={FileText} title="Presenting Complaints" />
      <div className="space-y-2 flex-1">
        {complaints.slice(0, 2).map((item) => (
          <div key={item.id} className="bg-[var(--theme-bg-tertiary)] rounded-lg p-2 border border-[var(--theme-border)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <EditableText
                  value={item.complaint}
                  onSave={(value) => updateComplaint(item.id, 'complaint', value)}
                  isEditable={isEditable}
                  className="text-[var(--theme-text)] text-sm text-left justify-start font-medium"
                  placeholder="Enter complaint"
                  disableEval={true}
                />
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Clock className="w-3 h-3 text-[var(--theme-accent)]" />
                <span className="text-[var(--theme-text-muted)] text-xs whitespace-nowrap">
                  {item.duration}{item.durationUnit ? ` ${item.durationUnit}` : ''}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  const expandedContent = (
    <div className="space-y-6">
      {/* Complaints Selection Card */}
      <div>
        <h4 className="text-[var(--theme-accent)] font-bold mb-3 text-lg">Select Complaints</h4>
        <div className="bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border)] rounded-lg p-3 max-h-56 overflow-y-auto shadow-inner">
          <div className="grid grid-cols-4 gap-2">
            {EYE_COMPLAINTS.map((complaint) => (
              <button
                key={complaint}
                onClick={() => addComplaintFromButton(complaint)}
                className="bg-[var(--theme-bg)] border border-[var(--theme-border)] hover:bg-[var(--theme-accent)] hover:text-white text-[var(--theme-text)] text-xs p-2 rounded transition-all duration-200 font-bold shadow-sm"
              >
                {complaint}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Complaints with Eye and Duration */}
      {complaints.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-[var(--theme-accent)] font-bold text-lg">Selected Complaints</h4>
          {complaints.map((item) => (
            <div key={item.id} className="bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border)] rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[var(--theme-text)] font-bold text-sm underline decoration-[var(--theme-accent)]/30 underline-offset-4">{item.complaint}</p>
                {complaints.length > 1 && (
                  <button
                    onClick={() => removeComplaint(item.id)}
                    className="text-[var(--theme-text-muted)] hover:text-red-500 transition-colors p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Eye Selection + Duration in one row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Eye Selection */}
                <div>
                  <p className="text-[var(--theme-text-muted)] text-xs mb-2 flex items-center gap-1 font-medium">
                    <Eye className="w-4 h-4 text-[var(--theme-accent)]" />
                    Affected Eye
                  </p>
                  {isEditable ? (
                    <div className="flex gap-2">
                      {['LE', 'RE', 'BOTH'].map((eye) => (
                        <button
                          key={eye}
                          onClick={() => updateComplaint(item.id, 'eye', eye.toLowerCase())}
                          className={`flex-1 px-3 py-2 rounded text-xs font-bold transition-all shadow-sm ${(item.eye || 'both') === eye.toLowerCase()
                            ? 'bg-[var(--theme-accent)] text-white'
                            : 'bg-[var(--theme-bg)] border border-[var(--theme-border)] text-[var(--theme-text)] hover:border-[var(--theme-accent)]'
                            }`}
                        >
                          {eye}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[var(--theme-text)] text-sm font-bold capitalize">{item.eye ? `${item.eye} Eye` : 'Both'}</p>
                  )}
                </div>

                {/* Duration */}
                <div>
                  <p className="text-[var(--theme-text-muted)] text-xs mb-2 flex items-center gap-1 font-medium">
                    <Clock className="w-4 h-4 text-[var(--theme-accent)]" />
                    Duration
                  </p>
                  {isEditable ? (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        value={item.duration}
                        onChange={(e) => updateComplaint(item.id, 'duration', e.target.value)}
                        placeholder="Value"
                        className="flex-1 bg-[var(--theme-bg)] border border-[var(--theme-border)] text-[var(--theme-text)] text-sm p-2 rounded focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)] transition-all shadow-sm"
                      />
                      <select
                        value={item.durationUnit || 'days'}
                        onChange={(e) => updateComplaint(item.id, 'durationUnit', e.target.value)}
                        className="bg-[var(--theme-bg)] border border-[var(--theme-border)] text-[var(--theme-text)] text-sm p-2 rounded cursor-pointer appearance-none shadow-sm"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23753d3e' d='M1 1l5 5 5-5'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 8px center',
                          paddingRight: '28px'
                        }}
                      >
                        {DURATION_UNITS.map((unit) => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <p className="text-[var(--theme-text)] text-sm font-bold">
                      {item.duration ? `${item.duration} ${item.durationUnit || 'days'}` : '-'}
                    </p>
                  )}
                </div>
              </div>

              {/* Per-Complaint Aggravating & Relieving Factors (Task 1) */}
              <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-[var(--theme-border)]">
                {/* Aggravating Factors for this complaint */}
                <div>
                  <p className="text-[var(--theme-text-muted)] text-xs mb-2 flex items-center gap-1 font-bold">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    Aggravating
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {AGGRAVATING_FACTORS.map((factor) => {
                      const isSelected = (item.aggravatingFactors || []).includes(factor);
                      return (
                        <button
                          key={factor}
                          onClick={() => isEditable && toggleComplaintFactor(item.id, factor, 'aggravatingFactors')}
                          disabled={!isEditable}
                          className={`px-3 py-1.5 rounded text-[10px] font-bold transition-all shadow-sm ${isSelected
                            ? 'bg-red-500/10 text-red-600 border border-red-500/30'
                            : 'bg-[var(--theme-bg)] border border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:border-red-500/50 hover:text-red-500'
                            } ${!isEditable ? 'cursor-default opacity-60' : 'cursor-pointer'}`}
                        >
                          {factor}
                        </button>
                      );
                    })}
                  </div>
                  {/* Show selected factors summary */}
                  {(item.aggravatingFactors || []).length > 0 && (
                    <p className="text-red-600/80 text-[10px] mt-2 italic font-medium bg-red-500/5 p-1 rounded">
                      Selected: {(item.aggravatingFactors || []).join(', ')}
                    </p>
                  )}
                </div>

                {/* Relieving Factors for this complaint */}
                <div>
                  <p className="text-[var(--theme-text-muted)] text-xs mb-2 flex items-center gap-1 font-bold">
                    <ChevronDown className="w-4 h-4 text-green-600" />
                    Relieving
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {RELIEVING_FACTORS.map((factor) => {
                      const isSelected = (item.relievingFactors || []).includes(factor);
                      return (
                        <button
                          key={factor}
                          onClick={() => isEditable && toggleComplaintFactor(item.id, factor, 'relievingFactors')}
                          disabled={!isEditable}
                          className={`px-3 py-1.5 rounded text-[10px] font-bold transition-all shadow-sm ${isSelected
                            ? 'bg-green-500/10 text-green-600 border border-green-500/30'
                            : 'bg-[var(--theme-bg)] border border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:border-green-500/50 hover:text-green-500'
                            } ${!isEditable ? 'cursor-default opacity-60' : 'cursor-pointer'}`}
                        >
                          {factor}
                        </button>
                      );
                    })}
                  </div>
                  {/* Show selected factors summary */}
                  {(item.relievingFactors || []).length > 0 && (
                    <p className="text-green-600/80 text-[10px] mt-2 italic font-medium bg-green-500/5 p-1 rounded">
                      Selected: {(item.relievingFactors || []).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* History of Complaint */}
      <div>
        <h4 className="text-[var(--theme-accent)] font-bold mb-3 text-lg">History of Presenting Complaint</h4>
        <div className="bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border)] rounded-lg p-4 shadow-sm">
          <p
            className="text-[var(--theme-text-muted)] text-xs mb-3 cursor-pointer hover:text-[var(--theme-accent)] transition-colors font-bold uppercase tracking-wider"
            onClick={() => historyRef.current?.startEditing()}
          >
            Additional Notes & Observations
          </p>
          <EditableText
            ref={historyRef}
            value={history.severity}
            onSave={(value) => updateHistory('severity', value)}
            isEditable={isEditable}
            className="text-[var(--theme-text)] text-left text-sm font-medium min-h-[60px]"
            disableEval={true}
          />
        </div>
      </div>
    </div>
  );

  return (
    <ExpandableCard
      title="Presenting Complaints & History"
      expandedContent={expandedContent}
      fullScreen={true}
    >
      {cardContent}
    </ExpandableCard>
  );
}