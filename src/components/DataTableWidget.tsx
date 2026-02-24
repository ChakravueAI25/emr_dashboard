import { useState } from 'react';
import { ArrowUpRight, Circle } from 'lucide-react';
import { EditableText } from './EditableText';
import { ExpandableCard } from './ExpandableCard';

const tableData = [
  { name: 'Namakkal', status: 'active', mobility: 'â†’ NETLD-G', progress: 95, cost: '₹589,704' },
  { name: 'Arumanallur', status: 'active', mobility: 'â†’ NETLD-G', progress: 87, cost: '₹482,331' },
  { name: 'Thirumanur', status: 'warning', mobility: 'â†’ TFILD-G ', progress: 72, cost: '₹398,228' },
  { name: 'Rasipuram', status: 'active', mobility: 'â†’ VF06-L', progress: 91, cost: '₹445,994' },
  { name: 'Senthamangalam', status: 'active', mobility: 'â†’ GF44A-L', progress: 88, cost: '₹398,228' },
];

export function DataTableWidget() {
  const [title, setTitle] = useState('Regions');
  const [subtitle, setSubtitle] = useState('Active Campaigns');

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
      </div>

      <div className="space-y-2 flex-1">
        {tableData.slice(0, 2).map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-2 p-2 bg-[#0a0a0a] rounded-lg border border-[#D4A574]"
          >
            <Circle
              className={`w-2 h-2 flex-shrink-0 ${
                item.status === 'active'
                  ? 'text-[#4CAF50] fill-[#4CAF50]'
                  : 'text-[#FFA726] fill-[#FFA726]'
              }`}
            />
            <span className="text-white text-xs truncate flex-1">{item.name}</span>
            <span className="text-[#8B8B8B] text-xs">{item.progress}%</span>
          </div>
        ))}
      </div>
    </>
  );

  const expandedContent = (
    <div className="space-y-4">
      {tableData.map((item, index) => (
        <div
          key={index}
          className="flex items-center gap-4 p-4 bg-[#0a0a0a] rounded-lg border border-[#D4A574] hover:border-[#D4A574] transition-colors"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Circle
              className={`w-3 h-3 flex-shrink-0 ${
                item.status === 'active'
                  ? 'text-[#4CAF50] fill-[#4CAF50]'
                  : 'text-[#FFA726] fill-[#FFA726]'
              }`}
            />
            <span className="text-white truncate">{item.name}</span>
          </div>

          <div className="flex items-center gap-2 flex-1">
            <span className="text-[#8B8B8B] text-xs">{item.mobility}</span>
          </div>

          <div className="w-32">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[#8B8B8B]">Progress</span>
              <span className="text-[#8B8B8B]">{item.progress}%</span>
            </div>
            <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#D4A574] rounded-full"
                style={{ width: `${item.progress}%` }}
              ></div>
            </div>
          </div>

          <div className="text-right min-w-[100px]">
            <p className="text-[#8B8B8B] text-xs mb-1">Cost</p>
            <span className="text-white">{item.cost}</span>
          </div>

          <button className="text-[#8B8B8B] hover:text-[#D4A574]">
            <ArrowUpRight className="w-5 h-5" />
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <ExpandableCard title={title} expandedContent={expandedContent}>
      {cardContent}
    </ExpandableCard>
  );
}