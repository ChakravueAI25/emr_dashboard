import { useRef } from 'react';
import { Eye } from 'lucide-react';
import { CardHeader } from './CardHeader';
import { ExpandableCard } from './ExpandableCard';
import { EditableText, EditableTextHandle } from './EditableText';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { IOPData } from './patient';

interface IOPCardProps {
  data?: IOPData;
  updateData?: (path: (string | number)[], value: any) => void;
  isEditable?: boolean;
}

export function IOPCard({ data, updateData, isEditable = false }: IOPCardProps) {
  const fieldRefs = useRef<{ [key: string]: EditableTextHandle | null }>({});

  const iopReadings =
    data?.iopReadings || [
      { type: 'NCT', time: '10:15 AM', od: '13', os: '14', remarks: '' },
      { type: 'AT', time: '--:--', od: '--', os: '--', remarks: '' },
    ];

  const chartData =
    data?.chartData || [
      { date: 'Jan 2025', previousOD: 14, previousOS: 15, currentOD: 13, currentOS: 14 },
    ];

  const updateReading = (index: number, field: string, value: string) => {
    try {
      if (!updateData) return;
      const existing = data?.iopReadings || iopReadings;
      const newArray = existing.map((r: any, i: number) => (i === index ? { ...r, [field]: (value ?? '').toString() } : r));
      updateData(['iop', 'iopReadings'], newArray);
    } catch (err) {
      console.error('Error updating reading:', err);
    }
  };

  const isElevated = (value: string) => {
    const numValue = parseFloat(value);
    return !isNaN(numValue) && numValue > 20;
  };

  const cardContent = (
    <>
      <CardHeader icon={Eye} title="Intraocular Pressure" />

      <div className="space-y-2 flex-1">
        {iopReadings.map((reading, idx) => (
          <div
            key={idx}
            className={`bg-[#1a1a1a] rounded-lg p-2 border ${isElevated(reading.od) || isElevated(reading.os)
              ? 'border-[#EF4444] bg-[#EF4444] bg-opacity-10'
              : 'border-[#D4A574]'
              }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#0a0a0a] border border-[#D4A574] flex items-center justify-center">
                  <Eye className="w-4 h-4 text-[#D4A574]" />
                </div>
                <div className="min-w-0">
                  <div className="text-[#D4A574] text-sm font-semibold truncate">{(reading as any).type}</div>
                  <div className="text-[#8B8B8B] text-xs">{(reading as any).time || '--:--'}</div>
                </div>
              </div>

              <div className="flex-shrink-0 min-w-[110px] text-right">
                <div className="flex items-center justify-end gap-3">
                  <div className={`text-xs ${isElevated(reading.od) ? 'text-[#EF4444]' : 'text-white'}`}>OD: {reading.od || '--'}</div>
                  <div className="text-[#8B8B8B] text-xs">|</div>
                  <div className={`text-xs ${isElevated(reading.os) ? 'text-[#EF4444]' : 'text-white'}`}>OS: {reading.os || '--'}</div>
                </div>
              </div>
            </div>

            {reading.remarks ? (
              <div className="h-px bg-[#2a2a2a] my-2" />
            ) : (
              <div className="my-2" />
            )}

            <div className="text-[#8B8B8B] text-xs text-left truncate">{reading.remarks || ''}</div>
          </div>
        ))}
      </div>
    </>
  );

  const expandedContent = (
    <div className="space-y-6">
      {/* IOP Table */}
      <div>
        <h4 className="text-[#D4A574] mb-3 text-lg">Intraocular Pressure Readings</h4>
        <div className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg overflow-hidden">
          <table className="w-full text-sm table-auto border-collapse">
            <thead>
              <tr className="bg-[#D4A574] bg-opacity-20">
                <th className="p-3 text-left text-[#8B8B8B] border-r border-[#D4A574] text-xs">Type</th>
                <th className="p-3 text-center text-[#8B8B8B] border-r border-[#D4A574] text-xs">Time</th>
                <th className="p-3 text-center text-[#8B8B8B] border-r border-[#D4A574] text-xs">OD (Right Eye)</th>
                <th className="p-3 text-center text-[#8B8B8B] border-r border-[#D4A574] text-xs">OS (Left Eye)</th>
                <th className="p-3 text-center text-[#8B8B8B] text-xs">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {iopReadings.map((reading, index) => (
                <tr
                  key={index}
                  className={`${index % 2 === 0 ? 'bg-[#121212]' : 'bg-[#1a1a1a]'} hover:bg-[#2a2a2a] transition-colors`}
                >
                  <td className="p-3 text-[#D4A574] font-semibold border-r border-[#D4A574] text-left align-middle text-sm">{(reading as any).type}</td>

                  <td
                    className="p-3 text-center border-r border-[#D4A574] align-middle cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                    onClick={() => fieldRefs.current[`iop-${index}-time`]?.startEditing()}
                  >
                    <EditableText
                      ref={(el) => { fieldRefs.current[`iop-${index}-time`] = el; }}
                      value={reading.time ?? ''}
                      onSave={(val) => updateReading(index, 'time', (val ?? '').toString())}
                      className="text-white text-sm"
                      placeholder="--:--"
                      isEditable={isEditable}
                    />
                  </td>

                  <td
                    className="p-3 text-center border-r border-[#D4A574] align-middle cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                    onClick={() => fieldRefs.current[`iop-${index}-od`]?.startEditing()}
                  >
                    <EditableText
                      ref={(el) => { fieldRefs.current[`iop-${index}-od`] = el; }}
                      value={reading.od ?? ''}
                      onSave={(val) => updateReading(index, 'od', (val ?? '').toString())}
                      className="text-white text-sm"
                      placeholder="--"
                      isEditable={isEditable}
                      evalField="iop"
                    />
                  </td>

                  <td
                    className="p-3 text-center border-r border-[#D4A574] align-middle cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                    onClick={() => fieldRefs.current[`iop-${index}-os`]?.startEditing()}
                  >
                    <EditableText
                      ref={(el) => { fieldRefs.current[`iop-${index}-os`] = el; }}
                      value={reading.os ?? ''}
                      onSave={(val) => updateReading(index, 'os', (val ?? '').toString())}
                      className="text-white text-sm"
                      placeholder="--"
                      isEditable={isEditable}
                      evalField="iop"
                    />
                  </td>

                  <td
                    className="p-3 text-center align-middle cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                    onClick={() => fieldRefs.current[`iop-${index}-remarks`]?.startEditing()}
                  >
                    <EditableText
                      ref={(el) => { fieldRefs.current[`iop-${index}-remarks`] = el; }}
                      value={reading.remarks ?? ''}
                      onSave={(val) => updateReading(index, 'remarks', (val ?? '').toString())}
                      className="text-white text-sm"
                      placeholder="--"
                      isEditable={isEditable}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chart */}
      <div>
        <h4 className="text-[#D4A574] mb-3 text-lg">IOP Trend: Previous vs Current</h4>
        <div className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-4">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="date" stroke="#8B8B8B" tick={{ fill: '#8B8B8B', fontSize: 11 }} />
              <YAxis
                stroke="#8B8B8B"
                tick={{ fill: '#8B8B8B', fontSize: 11 }}
                label={{
                  value: 'IOP (mmHg)',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#8B8B8B',
                  fontSize: 11,
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0a0a0a',
                  border: '1px solid #D4A574',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
                labelStyle={{ color: '#D4A574' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} iconType="line" />
              <Line type="monotone" dataKey="previousOD" stroke="#8B8B8B" strokeWidth={2} name="Previous OD" />
              <Line type="monotone" dataKey="previousOS" stroke="#6B6B6B" strokeWidth={2} name="Previous OS" />
              <Line type="monotone" dataKey="currentOD" stroke="#D4A574" strokeWidth={2} name="Current OD" />
              <Line type="monotone" dataKey="currentOS" stroke="#FFA726" strokeWidth={2} name="Current OS" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  return (
    <ExpandableCard title="Intraocular Pressure (IOP)" expandedContent={expandedContent}>
      {cardContent}
    </ExpandableCard>
  );
}
