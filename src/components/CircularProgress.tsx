import { useState } from 'react';
import { Clock } from 'lucide-react';
import { EditableText } from './EditableText';
import { ExpandableCard } from './ExpandableCard';

interface CircularProgressProps {
  value: number;
  max: number;
  label: string;
  time: string;
}

export function CircularProgress({ value, max, label: initialLabel, time: initialTime }: CircularProgressProps) {
  const [label, setLabel] = useState(initialLabel);
  const [time, setTime] = useState(initialTime);
  const percentage = (value / max) * 100;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const cardContent = (
    <>
      <div className="flex items-center justify-between mb-2" onClick={(e) => e.stopPropagation()}>
        <EditableText
          value={label}
          onSave={setLabel}
          className="text-[#8B8B8B] text-xs"
          placeholder="Enter label"
        />
        <Clock className="w-4 h-4 text-[#D4A574]" />
      </div>

      <div className="relative w-24 h-24 mx-auto flex-1 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="48"
            cy="48"
            r="35"
            fill="none"
            stroke="#1a1a1a"
            strokeWidth="6"
          />
          {/* Progress circle */}
          <circle
            cx="48"
            cy="48"
            r="35"
            fill="none"
            stroke="#D4A574"
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <EditableText
            value={time}
            onSave={setTime}
            className="text-white"
            placeholder="0:00"
            showEditIcon={false}
          />
          <p className="text-[#8B8B8B] text-xs">/{max}:00</p>
        </div>
      </div>
    </>
  );

  const expandedContent = (
    <div className="space-y-6">
      <div className="relative w-64 h-64 mx-auto">
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="128"
            cy="128"
            r="100"
            fill="none"
            stroke="#1a1a1a"
            strokeWidth="16"
          />
          {/* Progress circle */}
          <circle
            cx="128"
            cy="128"
            r="100"
            fill="none"
            stroke="#D4A574"
            strokeWidth="16"
            strokeDasharray={circumference * 2.22}
            strokeDashoffset={strokeDashoffset * 2.22}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-white text-5xl">{time}</p>
          <p className="text-[#8B8B8B] mt-2">/{max}:00</p>
          <p className="text-[#D4A574] mt-4 text-xl">{percentage.toFixed(0)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#D4A574] text-center">
          <p className="text-[#8B8B8B] text-xs mb-1">Completed</p>
          <p className="text-white text-xl">{value}:00</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#D4A574] text-center">
          <p className="text-[#8B8B8B] text-xs mb-1">Remaining</p>
          <p className="text-white text-xl">{max - value}:00</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#D4A574] text-center">
          <p className="text-[#8B8B8B] text-xs mb-1">Estimated</p>
          <p className="text-[#D4A574] text-xl">5:00 hrs</p>
        </div>
      </div>
    </div>
  );

  return (
    <ExpandableCard title={label} expandedContent={expandedContent}>
      {cardContent}
    </ExpandableCard>
  );
}