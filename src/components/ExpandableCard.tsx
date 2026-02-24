import { useState, useEffect } from 'react';
import { Maximize2, X, ChevronLeft, ChevronRight, History } from 'lucide-react';

interface ExpandableCardProps {
  children: React.ReactNode;
  expandedContent?: React.ReactNode;
  title?: string;
  // Task 2: Previous visit navigation props
  showVisitNav?: boolean;
  visitIndex?: number; // 0 = current, 1 = previous, etc.
  totalVisits?: number;
  onPrevVisit?: () => void;
  onNextVisit?: () => void;
  isViewingPastVisit?: boolean;
  fullScreen?: boolean;
  sideActionPanel?: React.ReactNode;
}

export function ExpandableCard({
  children,
  expandedContent,
  title,
  showVisitNav = false,
  visitIndex = 0,
  totalVisits = 1,
  onPrevVisit,
  onNextVisit,
  isViewingPastVisit = false,
  fullScreen = false,
  sideActionPanel
}: ExpandableCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded]);

  // Visit navigation controls
  const canGoPrev = showVisitNav && visitIndex < totalVisits - 1;
  const canGoNext = showVisitNav && visitIndex > 0;

  const VisitNavControls = () => {
    if (!showVisitNav || totalVisits <= 1) return null;

    return (
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onPrevVisit?.(); }}
          disabled={!canGoPrev}
          className={`p-1.5 rounded transition-colors ${canGoPrev
            ? 'hover:bg-[#2a2a2a] text-[#D4A574]'
            : 'text-[#3a3a3a] cursor-not-allowed'
            }`}
          title="Previous visit"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5 px-2 py-1 bg-[#1a1a1a] rounded text-xs">
          {isViewingPastVisit ? (
            <>
              <History className="w-3 h-3 text-yellow-500" />
              <span className="text-yellow-500 font-medium">Past Visit {visitIndex}</span>
            </>
          ) : (
            <span className="text-[#8B8B8B]">Current</span>
          )}
          <span className="text-[#444]">/ {totalVisits}</span>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onNextVisit?.(); }}
          disabled={!canGoNext}
          className={`p-1.5 rounded transition-colors ${canGoNext
            ? 'hover:bg-[#2a2a2a] text-[#D4A574]'
            : 'text-[#3a3a3a] cursor-not-allowed'
            }`}
          title="Next visit (towards current)"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <>
      <div
        className={`bg-[#121212] rounded-lg p-6 border transition-all duration-300 hover:border-[#D4A574] shadow-[0_0_30px_rgba(212,165,116,0.25)] hover:shadow-[0_0_40px_rgba(212,165,116,0.4)] cursor-pointer group relative h-full flex flex-col ${isViewingPastVisit ? 'border-yellow-500/40' : 'border-[#D4A574]'
          }`}
        onClick={() => setIsExpanded(true)}
      >
        {/* Past visit indicator banner */}
        {isViewingPastVisit && (
          <div className="absolute top-0 left-0 right-0 bg-yellow-500/10 border-b border-yellow-500/30 px-3 py-1 rounded-t-lg">
            <div className="flex items-center gap-1.5 text-yellow-500 text-[10px] font-bold uppercase tracking-wider">
              <History className="w-3 h-3" />
              <span>Read-only: Past Visit #{visitIndex}</span>
            </div>
          </div>
        )}

        <div className={`absolute top-3 right-3 flex items-center gap-2 ${isViewingPastVisit ? 'top-8' : ''}`}>
          {showVisitNav && totalVisits > 1 && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <VisitNavControls />
            </div>
          )}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Maximize2 className="w-4 h-4 text-[#D4A574]" />
          </div>
        </div>
        <div className={isViewingPastVisit ? 'mt-4' : ''}>
          {children}
        </div>
      </div>

      {/* Expanded Modal */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-6 overflow-hidden"
          onClick={() => setIsExpanded(false)}
        >
          <div className="flex gap-4 max-h-[95vh] w-full justify-center">
            {/* Main Content Box */}
            <div
              className={`bg-[#121212] rounded-lg border-2 shadow-[0_0_60px_rgba(212,165,116,0.3)] flex flex-col ${fullScreen ? 'w-full max-w-6xl h-[80vh]' : 'w-full max-w-5xl max-h-[80vh]'
                } overflow-hidden ${isViewingPastVisit ? 'border-yellow-500' : 'border-[#D4A574]'
                }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-[#121212] border-b border-[#D4A574] px-6 py-4 flex items-center justify-between z-10 shrink-0">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] border border-[#D4A574] rounded-lg text-sm text-[#8B8B8B] hover:text-[#D4A574] hover:border-[#D4A574] transition-all group"
                  >
                    <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                    Back
                  </button>
                  <div className="h-6 w-px bg-[#333] mx-2"></div>
                  <h2 className="text-white text-xl font-bold tracking-tight">{title || 'Details'}</h2>
                  {isViewingPastVisit && (
                    <span className="flex items-center gap-1.5 px-2 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-500 text-xs font-medium">
                      <History className="w-3 h-3" />
                      Read-only: Past Visit
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <VisitNavControls />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExpanded(false);
                    }}
                    className="flex items-center gap-2 px-6 py-2 bg-[#D4A574] text-[#0a0a0a] border border-[#D4A574] rounded-lg font-bold text-sm hover:bg-[#C9955E] transition-colors shadow-lg"
                  >
                    Save
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-[#2a2a2a]">
                {expandedContent || children}
              </div>
            </div>

            {/* Side Action Panel (Rendered outside the main box) */}
            {sideActionPanel && (
              <div
                className="w-56 shrink-0 pt-16 animate-in slide-in-from-right-4 fade-in duration-300"
                onClick={(e) => e.stopPropagation()}
              >
                {sideActionPanel}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
