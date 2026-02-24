import { useState } from 'react';
import { Circle } from 'lucide-react';
import { EditableText } from './EditableText';
import { ExpandableCard } from './ExpandableCard';

export function CircularGauge() {
  const [label, setLabel] = useState('Select Campaigns');
  const [location, setLocation] = useState('Kaliningrad');
  const [status, setStatus] = useState('GOLD');

  const cardContent = (
    <>
      <div className="flex items-center justify-between mb-4">
        <div onClick={(e) => e.stopPropagation()}>
          <EditableText
            value={label}
            onSave={setLabel}
            className="text-[#8B8B8B] text-xs"
            placeholder="Enter label"
          />
          <EditableText
            value={location}
            onSave={setLocation}
            className="text-white text-sm"
            placeholder="Enter location"
          />
        </div>
      </div>

      {/* Circular Gauge */}
      <div className="relative w-32 h-32 mx-auto my-4">
        {/* Outer rings */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200">
          {/* Background circles */}
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="#1a1a1a"
            strokeWidth="1"
          />
          <circle
            cx="100"
            cy="100"
            r="75"
            fill="none"
            stroke="#1a1a1a"
            strokeWidth="1"
          />
          <circle
            cx="100"
            cy="100"
            r="60"
            fill="none"
            stroke="#D4A574"
            strokeWidth="2"
            opacity="0.3"
          />
          
          {/* Progress arc */}
          <circle
            cx="100"
            cy="100"
            r="85"
            fill="none"
            stroke="#D4A574"
            strokeWidth="3"
            strokeDasharray="400 534"
            strokeDashoffset="-80"
            strokeLinecap="round"
            transform="rotate(-90 100 100)"
          />

          {/* Decorative lines */}
          <line x1="100" y1="10" x2="100" y2="25" stroke="#D4A574" strokeWidth="1" />
          <line x1="190" y1="100" x2="175" y2="100" stroke="#D4A574" strokeWidth="1" />
          <line x1="100" y1="190" x2="100" y2="175" stroke="#D4A574" strokeWidth="1" />
          <line x1="10" y1="100" x2="25" y2="100" stroke="#D4A574" strokeWidth="1" />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <div className="text-center">
            <EditableText
              value={status}
              onSave={setStatus}
              className="text-[#D4A574] text-xl tracking-wider"
              placeholder="STATUS"
            />
            <p className="text-[#8B8B8B] text-xs mt-1">STATUS</p>
          </div>
        </div>

        {/* Corner decorations */}
        <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-[#D4A574] opacity-50"></div>
        <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-[#D4A574] opacity-50"></div>
      </div>

      {/* Bottom labels */}
      <div className="flex items-center gap-2 text-xs mt-auto">
        <div className="flex-1 bg-[#1a1a1a] h-1 rounded-full overflow-hidden">
          <div className="bg-[#D4A574] h-full w-3/4"></div>
        </div>
        <span className="text-[#8B8B8B]">75%</span>
      </div>
    </>
  );

  return (
    <ExpandableCard title={`${label} - ${location}`}>
      {cardContent}
    </ExpandableCard>
  );
}