import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart, ComposedChart } from 'recharts';
import { TrendingUp, Eye, Activity, Users, Calendar } from 'lucide-react';
import API_ENDPOINTS from '../config/api';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-3 shadow-lg shadow-[#D4A574]/20">
        <p className="text-[#D4A574] text-xs mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-white text-xs">
            {entry.name}: <span className="text-[#D4A574]">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

interface AnalyticsViewProps {
  registrationId?: string;
}

export function AnalyticsView({ registrationId }: AnalyticsViewProps) {
  const [iopData, setIopData] = useState<any[]>([]);
  const [visualAcuityData, setVisualAcuityData] = useState<any[]>([]);
  const [visitsData, setVisitsData] = useState<any[]>([]);
  const [iopDistribution, setIopDistribution] = useState<any[]>([]);
  const [proceduresData, setProceduresData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPatientView, setIsPatientView] = useState(false);

  useEffect(() => {
    if (registrationId) {
      fetchPatientData(registrationId);
    }
  }, [registrationId]);

  const fetchPatientData = async (regId: string) => {
    setLoading(true);
    try {
      const [iopRes, vaRes, visitsRes, iopDistRes, procsRes] = await Promise.all([
        fetch(API_ENDPOINTS.ANALYTICS_IOP_TREND(regId)),
        fetch(API_ENDPOINTS.ANALYTICS_VISUAL_ACUITY(regId)),
        fetch(API_ENDPOINTS.ANALYTICS_VISITS(regId)),
        fetch(API_ENDPOINTS.ANALYTICS_IOP_DISTRIBUTION(regId)),
        fetch(API_ENDPOINTS.ANALYTICS_PROCEDURES(regId))
      ]);

      const iop = await iopRes.json();
      const va = await vaRes.json();
      const visits = await visitsRes.json();
      const iopDist = await iopDistRes.json();
      const procs = await procsRes.json();

      setIopData(iop || []);
      setVisualAcuityData(va || []);
      setVisitsData(visits || []);

      // Transform IOP distribution into histogram bins
      if (iopDist.iops && iopDist.iops.length > 0) {
        const bins = createHistogramBins(iopDist.iops);
        setIopDistribution(bins);
      }

      setProceduresData(procs || []);
      setIsPatientView(true);
    } catch (err) {
      console.error('Failed to fetch patient analytics:', err);
      setIsPatientView(false);
    } finally {
      setLoading(false);
    }
  };

  const createHistogramBins = (values: number[]) => {
    // Create histogram with bins of size 5 (IOP range 0-40+)
    const bins: { [key: string]: number } = {};
    values.forEach(v => {
      if (v !== null && v !== undefined) {
        const binStart = Math.floor(v / 5) * 5;
        const binLabel = `${binStart}-${binStart + 4}`;
        bins[binLabel] = (bins[binLabel] || 0) + 1;
      }
    });
    return Object.entries(bins).map(([range, count]) => ({ range, count }));
  };

  if (loading) {
    return <div className="text-white text-center p-6">Loading patient data...</div>;
  }

  // Show empty state if no patient is selected
  if (!registrationId || !isPatientView) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-center">
          <Eye className="w-16 h-16 text-[#D4A574] mx-auto mb-4" />
          <h2 className="text-white text-2xl mb-2">No Patient Selected</h2>
          <p className="text-[#8B8B8B]">Select a patient from a queue or patient list to view their analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto p-12 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col gap-2 mb-2">
        <h1 className="text-4xl font-light text-[var(--theme-text)] tracking-tight">
          Clinical <span className="font-bold text-[var(--theme-accent)]">Analytics</span>
        </h1>
        <p className="text-[var(--theme-text-muted)] text-sm font-medium uppercase tracking-[0.2em] opacity-60">
          Patient Trend Analysis & Visualizations
        </p>
      </div>

      {/* Summary Cards - Patient-Specific Data */}
      <div className="grid grid-cols-4 gap-8">
        {/* Total Visits */}
        <div className="bg-[#121212] border border-[#D4A574] rounded-lg p-4 shadow-lg shadow-[#D4A574]/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[#D4A574] bg-opacity-20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#D4A574]" />
            </div>
            <div>
              <p className="text-[#8B8B8B] text-xs">Total Visits</p>
              <p className="text-white text-xl">{visitsData.reduce((sum, v) => sum + (v.visits || 0), 0)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[#8B8B8B]">Patient History</span>
          </div>
        </div>

        {/* Latest IOP OD */}
        <div className="bg-[#121212] border border-[#D4A574] rounded-lg p-4 shadow-lg shadow-[#D4A574]/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[#D4A574] bg-opacity-20 flex items-center justify-center">
              <Eye className="w-5 h-5 text-[#D4A574]" />
            </div>
            <div>
              <p className="text-[#8B8B8B] text-xs">Latest IOP (OD)</p>
              <p className="text-white text-xl">{iopData.length > 0 ? iopData[iopData.length - 1].od : '--'} mmHg</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[#8B8B8B]">Right Eye</span>
          </div>
        </div>

        {/* Latest IOP OS */}
        <div className="bg-[#121212] border border-[#D4A574] rounded-lg p-4 shadow-lg shadow-[#D4A574]/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[#D4A574] bg-opacity-20 flex items-center justify-center">
              <Eye className="w-5 h-5 text-[#D4A574]" />
            </div>
            <div>
              <p className="text-[#8B8B8B] text-xs">Latest IOP (OS)</p>
              <p className="text-white text-xl">{iopData.length > 0 ? iopData[iopData.length - 1].os : '--'} mmHg</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[#8B8B8B]">Left Eye</span>
          </div>
        </div>

        {/* Procedures Count */}
        <div className="bg-[#121212] border border-[#D4A574] rounded-lg p-4 shadow-lg shadow-[#D4A574]/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[#D4A574] bg-opacity-20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-[#D4A574]" />
            </div>
            <div>
              <p className="text-[#8B8B8B] text-xs">Procedures</p>
              <p className="text-white text-xl">{proceduresData.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[#8B8B8B]">Total Count</span>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-2 gap-6">
        {/* IOP Trend Chart */}
        <div className="bg-[#121212] border border-[#D4A574] rounded-lg p-6 shadow-lg shadow-[#D4A574]/10">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-[#D4A574]" />
            <h3 className="text-white">Intraocular Pressure (IOP) Trend</h3>
          </div>
          {iopData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={iopData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis
                    dataKey="date"
                    stroke="#8B8B8B"
                    style={{ fontSize: '11px' }}
                  />
                  <YAxis
                    stroke="#8B8B8B"
                    style={{ fontSize: '11px' }}
                    domain={[0, 30]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: '11px' }}
                    iconType="circle"
                  />
                  <Line
                    type="monotone"
                    dataKey="od"
                    stroke="#D4A574"
                    strokeWidth={2}
                    name="OD (Right Eye)"
                    dot={{ fill: '#D4A574', r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="os"
                    stroke="#EF4444"
                    strokeWidth={2}
                    name="OS (Left Eye)"
                    dot={{ fill: '#EF4444', r: 4 }}
                  />
                  {/* Reference line for high IOP */}
                  <Line
                    type="monotone"
                    dataKey={() => 21}
                    stroke="#FFA726"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    name="Upper Normal (21)"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-[#8B8B8B] text-xs mt-2">Note: Values above 21 mmHg (orange line) require attention</p>
            </>
          ) : (
            <div className="flex items-center justify-center h-[300px]">
              <p className="text-[#8B8B8B]">No IOP data available</p>
            </div>
          )}
        </div>

        {/* Patient Visits Chart - Enhanced Styling */}
        <div className="bg-[#121212] border border-[#D4A574] rounded-lg p-6 shadow-lg shadow-[#D4A574]/10">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-[#D4A574]" />
            <h3 className="text-white">Patient Visits by Month</h3>
          </div>
          {visitsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={visitsData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="visitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D4A574" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#D4A574" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#8B8B8B"
                  style={{ fontSize: '12px' }}
                  tick={{ fill: '#8B8B8B' }}
                />
                <YAxis
                  stroke="#8B8B8B"
                  style={{ fontSize: '12px' }}
                  tick={{ fill: '#8B8B8B' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="visits"
                  fill="url(#visitGradient)"
                  stroke="#D4A574"
                  strokeWidth={2}
                  name="Visits"
                />
                <Bar
                  dataKey="visits"
                  fill="#D4A574"
                  name="Visits"
                  radius={[8, 8, 0, 0]}
                  opacity={0.8}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px]">
              <p className="text-[#8B8B8B]">No visit data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 - Clinical Metrics */}
      <div className="grid grid-cols-2 gap-6">
        {/* Procedures Timeline Chart (Patient-Specific) */}
        {isPatientView && (
          <div className="bg-[#121212] border border-[#D4A574] rounded-lg p-6 shadow-lg shadow-[#D4A574]/10">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-[#D4A574]" />
              <h3 className="text-white">Procedures Timeline</h3>
            </div>
            {proceduresData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={proceduresData.map((p, i) => ({ ...p, procCount: p.procedures?.length || 0, index: i }))}
                  margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="procGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#8B8B8B"
                    style={{ fontSize: '10px' }}
                    tick={{ fill: '#8B8B8B' }}
                  />
                  <YAxis
                    stroke="#8B8B8B"
                    style={{ fontSize: '11px' }}
                    tick={{ fill: '#8B8B8B' }}
                  />
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-3 shadow-lg shadow-[#D4A574]/20">
                            <p className="text-[#D4A574] text-xs font-semibold">{data.date}</p>
                            <p className="text-white text-xs mt-1">
                              {data.procedures && data.procedures.length > 0
                                ? data.procedures.join(', ')
                                : 'No procedures'}
                            </p>
                            <p className="text-[#8B8B8B] text-xs mt-1">Count: {data.procCount}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="procCount"
                    fill="url(#procGradient)"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    name="Procedures"
                    isAnimationActive={true}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px]">
                <p className="text-[#8B8B8B]">No procedure data available</p>
              </div>
            )}
            <p className="text-[#8B8B8B] text-xs mt-3">Procedure count by visit date</p>
          </div>
        )}

        {/* Visual Acuity History Chart */}
        {isPatientView && (
          <div className="bg-[#121212] border border-[#D4A574] rounded-lg p-6 shadow-lg shadow-[#D4A574]/10">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-[#D4A574]" />
              <h3 className="text-white">Visual Acuity History</h3>
            </div>
            {visualAcuityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={visualAcuityData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis
                    dataKey="date"
                    stroke="#8B8B8B"
                    style={{ fontSize: '11px' }}
                    tick={{ fill: '#8B8B8B' }}
                  />
                  <YAxis
                    stroke="#8B8B8B"
                    style={{ fontSize: '11px' }}
                    tick={{ fill: '#8B8B8B' }}
                    domain={[0, 1]}
                  />
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-3 shadow-lg shadow-[#D4A574]/20">
                            <p className="text-[#D4A574] text-xs font-semibold">{data.date}</p>
                            {payload.map((entry: any, index: number) => (
                              <p key={index} className="text-white text-xs mt-1">
                                {entry.name}: <span style={{ color: entry.color }}>{entry.value?.toFixed(2) || '--'}</span>
                              </p>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px' }}
                    iconType="circle"
                  />
                  <Line
                    type="monotone"
                    dataKey="od"
                    stroke="#D4A574"
                    strokeWidth={2}
                    name="OD (Right Eye)"
                    dot={{ fill: '#D4A574', r: 4 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="os"
                    stroke="#4CAF50"
                    strokeWidth={2}
                    name="OS (Left Eye)"
                    dot={{ fill: '#4CAF50', r: 4 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px]">
                <p className="text-[#8B8B8B]">No visual acuity data available</p>
              </div>
            )}
            <p className="text-[#8B8B8B] text-xs mt-3">Visual acuity trend over time (1.0 = 20/20 vision)</p>
          </div>
        )}
      </div>

      {/* Row 3 - IOP Distribution Table */}
      {isPatientView && (
        <div className="bg-[#121212] border border-[#D4A574] rounded-lg p-6 shadow-lg shadow-[#D4A574]/10">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-[#D4A574]" />
            <h3 className="text-white">IOP Readings Distribution</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#D4A574] bg-opacity-20">
                  <th className="text-left p-3 text-white border-r border-[#D4A574]">IOP Range (mmHg)</th>
                  <th className="text-center p-3 text-white">Frequency</th>
                </tr>
              </thead>
              <tbody>
                {iopDistribution.length > 0 ? (
                  iopDistribution.map((bin, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-[#1a1a1a]' : 'bg-[#0a0a0a]'}>
                      <td className="p-3 text-white border-r border-[#D4A574]">{bin.range}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-24 h-6 bg-[#D4A574] bg-opacity-30 rounded" style={{ width: `${Math.min(bin.count * 20, 100)}px` }}></div>
                          <span className="text-[#D4A574] font-semibold">{bin.count}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="p-4 text-center text-[#8B8B8B]">No IOP data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[#8B8B8B] text-xs mt-3">Distribution of IOP readings in mmHg bins</p>
        </div>
      )}

    </div>
  );
}