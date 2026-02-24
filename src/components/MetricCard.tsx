import { useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { EditableText } from './EditableText';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: 'up' | 'down';
  trendValue?: string;
  icon?: React.ReactNode;
}

export function MetricCard({ title: initialTitle, value: initialValue, subtitle: initialSubtitle, trend, trendValue, icon }: MetricCardProps) {
  const [title, setTitle] = useState(initialTitle);
  const [value, setValue] = useState(initialValue);
  const [subtitle, setSubtitle] = useState(initialSubtitle || '');

  return (
    <div className="bg-[#121212] rounded-lg p-4 border border-[#D4A574] relative overflow-hidden transition-all duration-300 hover:border-[#D4A574] shadow-[0_0_30px_rgba(212,165,116,0.25)] hover:shadow-[0_0_40px_rgba(212,165,116,0.4)]">
      {/* Decorative corner */}
      <div className="absolute top-0 right-0 w-16 h-16 opacity-10">
        <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-[#D4A574]"></div>
      </div>

      <div className="flex items-start justify-between mb-3">
        <EditableText
          value={title}
          onSave={setTitle}
          className="text-[#8B8B8B] text-xs"
          placeholder="Enter title"
        />
        {icon && <div className="text-[#D4A574]">{icon}</div>}
      </div>

      <div className="space-y-1">
        <EditableText
          value={value}
          onSave={setValue}
          className="text-white text-2xl tracking-tight"
          placeholder="Enter value"
        />
        
        <EditableText
          value={subtitle}
          onSave={setSubtitle}
          className="text-[#6B6B6B] text-xs"
          placeholder="Enter subtitle"
        />

        {trend && trendValue && (
          <div className="flex items-center gap-1 mt-2">
            {trend === 'up' ? (
              <TrendingUp className="w-3 h-3 text-[#4CAF50]" />
            ) : (
              <TrendingDown className="w-3 h-3 text-[#F44336]" />
            )}
            <span className={`text-xs ${trend === 'up' ? 'text-[#4CAF50]' : 'text-[#F44336]'}`}>
              {trendValue}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
