import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { EditableText } from './EditableText';
import { ExpandableCard } from './ExpandableCard';

const data = [
  { name: 'Jan', value: 65 },
  { name: 'Feb', value: 75 },
  { name: 'Mar', value: 85 },
  { name: 'Apr', value: 95 },
  { name: 'May', value: 90 },
  { name: 'Jun', value: 80 },
];

export function BarChartWidget() {
  const [title, setTitle] = useState('Performance Index');
  const [subtitle, setSubtitle] = useState('Monthly Overview');
  const [metric, setMetric] = useState('20.5***');

  const cardContent = (
    <>
      <div className="flex items-center justify-between mb-2" onClick={(e) => e.stopPropagation()}>
        <div>
          <EditableText
            value={title}
            onSave={setTitle}
            className="text-white"
            placeholder="Enter title"
          />
          <EditableText
            value={subtitle}
            onSave={setSubtitle}
            className="text-[#8B8B8B] text-xs mt-1"
            placeholder="Enter subtitle"
          />
        </div>
        <div className="text-right">
          <EditableText
            value={metric}
            onSave={setMetric}
            className="text-[#D4A574]"
            placeholder="0.0"
          />
        </div>
      </div>

      <div className="h-24 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#4a4a4a"
              tick={{ fill: '#6B6B6B', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              stroke="#4a4a4a"
              tick={{ fill: '#6B6B6B', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
            />
            <Bar
              dataKey="value"
              fill="#D4A574"
              radius={[8, 8, 0, 0]}
              maxBarSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );

  const expandedContent = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white">{title}</h3>
          <p className="text-[#8B8B8B] text-xs">{subtitle}</p>
        </div>
        <p className="text-[#D4A574] text-4xl">{metric}</p>
      </div>

      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#4a4a4a"
              tick={{ fill: '#6B6B6B', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              stroke="#4a4a4a"
              tick={{ fill: '#6B6B6B', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Bar
              dataKey="value"
              fill="#D4A574"
              radius={[8, 8, 0, 0]}
              maxBarSize={60}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#D4A574]">
          <p className="text-[#8B8B8B] text-xs mb-1">Average</p>
          <p className="text-white text-xl">81.7</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#D4A574]">
          <p className="text-[#8B8B8B] text-xs mb-1">Peak</p>
          <p className="text-white text-xl">95</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#D4A574]">
          <p className="text-[#8B8B8B] text-xs mb-1">Growth</p>
          <p className="text-[#4CAF50] text-xl">+23%</p>
        </div>
      </div>
    </div>
  );

  return (
    <ExpandableCard title={title} expandedContent={expandedContent}>
      {cardContent}
    </ExpandableCard>
  );
}