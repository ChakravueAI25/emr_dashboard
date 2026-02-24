import React from 'react';
import { User } from 'lucide-react';

interface CardHeaderProps {
  icon?: React.ElementType;
  title: string;
  subtitle?: string;
}

export function CardHeader({ icon: Icon, title, subtitle }: CardHeaderProps) {
  const IconComp = Icon || User;
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-full bg-[#D4A574] flex items-center justify-center">
        <IconComp className="w-4 h-4 text-[#0a0a0a]" />
      </div>
      <div>
        <h3 className="text-white font-medium">{title}</h3>
        {subtitle && <div className="text-[#8B8B8B] text-xs mt-0.5">{subtitle}</div>}
      </div>
    </div>
  );
}

export default CardHeader;
