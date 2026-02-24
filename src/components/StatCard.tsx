import { useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { EditableText } from './EditableText';

interface StatCardProps {
  value: string;
  label: string;
  percentage?: string;
  icon?: LucideIcon;
}

export function StatCard({ value: initialValue, label: initialLabel, percentage: initialPercentage, icon: Icon }: StatCardProps) {
  const [value, setValue] = useState(initialValue);
  const [label, setLabel] = useState(initialLabel);
  const [percentage, setPercentage] = useState(initialPercentage || '');

  return (
    <div className="bg-[#121212] rounded-lg p-4 border border-[#D4A574] relative group hover:border-[#D4A574] transition-all duration-300 shadow-[0_0_30px_rgba(212,165,116,0.25)] hover:shadow-[0_0_40px_rgba(212,165,116,0.4)]">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#D4A574]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
      
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <EditableText
            value={label}
            onSave={setLabel}
            className="text-[#8B8B8B] text-xs uppercase tracking-wide"
            placeholder="Enter label"
          />
          {Icon && <Icon className="w-4 h-4 text-[#D4A574]" />}
        </div>

        <div className="flex items-baseline gap-2">
          <EditableText
            value={value}
            onSave={setValue}
            className="text-white text-3xl tracking-tight"
            placeholder="Enter value"
            evalField={label}
          />
          {percentage && (
            <EditableText
              value={percentage}
              onSave={setPercentage}
              className="text-[#D4A574] text-sm"
              placeholder="+0%"
              evalField="percentage"
            />
          )}
        </div>
      </div>
    </div>
  );
}
