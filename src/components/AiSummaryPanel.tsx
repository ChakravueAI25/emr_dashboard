import { useState, useCallback } from 'react';
import { Sparkles, X, RefreshCw, ThumbsUp, ThumbsDown, Star } from 'lucide-react';
import API_ENDPOINTS from '../config/api';

interface AiSummaryPanelProps {
  patientName: string;
  registrationId: string;
  mongoId: string;
  onClose: () => void;
}

export function AiSummaryPanel({ patientName, registrationId, mongoId, onClose }: AiSummaryPanelProps) {
  const [summaryText, setSummaryText] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  
  // Feedback state
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const generateSummary = useCallback(() => {
    if (loading || !mongoId) return;
    setLoading(true);
    setHasGenerated(true);
    
    // Reset feedback on new generation
    setShowFeedback(false);
    setFeedbackSubmitted(false);
    setRating(0);
    setFeedbackText('');
    
    setSummaryText('Initializing AI Agent...\nRetrieving Patient History...\nSearching Medical Knowledge Base...\nGenerating Summary...');

    fetch(API_ENDPOINTS.AI_GENERATE_SUMMARY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId: mongoId }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.summary) {
          setSummaryText(d.summary);
          setShowFeedback(true);
        } else {
          setSummaryText('No summary returned. ' + (d.detail || ''));
        }
      })
      .catch((e) => {
        setSummaryText('Error: ' + e.message + '\nEnsure Backend is running on port 8008.');
      })
      .finally(() => setLoading(false));
  }, [mongoId, loading]);

  const handleFeedbackSubmit = () => {
    if (!rating) return;
    setIsSubmittingFeedback(true);
    
    fetch(API_ENDPOINTS.AI_SAVE_FEEDBACK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        patientId: mongoId,
        summary: summaryText,
        feedback: feedbackText,
        rating: rating
      }),
    })
    .then((r) => r.json())
    .then(() => {
      setFeedbackSubmitted(true);
      setTimeout(() => {
        setShowFeedback(false);
      }, 2000);
    })
    .catch((err) => console.error("Feedback submit error", err))
    .finally(() => setIsSubmittingFeedback(false));
  };

  // Auto-generate on first mount
  if (!hasGenerated) {
    generateSummary();
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-end pt-20 pr-6" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-[520px] max-h-[85vh] bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl shadow-2xl shadow-black/60 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
              <Sparkles className="w-5 h-5 text-[#D4A574]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">AI Clinical Summary</h3>
              <p className="text-[10px] text-[#666]">
                {patientName} - {registrationId}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={generateSummary}
              disabled={loading}
              className="px-3 py-1.5 bg-[#D4A574] text-black text-xs font-bold rounded-lg hover:bg-[#b08d55] transition-all disabled:opacity-50 disabled:cursor-wait flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Analyzing...' : 'Regenerate'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#555] hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
          <div className="bg-[#080808] rounded-xl p-5 border border-[#1a1a1a]">
            <h4 className="text-[#D4A574] text-[10px] font-bold uppercase tracking-widest mb-3">
              Analysis Result
            </h4>

            {loading ? (
              <div className="space-y-2">
                {summaryText.split('\n').map((line, i) => (
                  <div key={i} className="flex items-center gap-2 text-gray-400 text-sm">
                    <RefreshCw className="w-3 h-3 animate-spin text-[#D4A574]" />
                    {line}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 text-gray-200 leading-relaxed text-base">
                {summaryText.split('\n').map((line, i) => {
                  // Bold "Likely Dx:" and "Advise:" labels in point 4
                  const dxAdvise = line.match(/^(\d+\.\s*)(Likely Dx:\s*)(.+?)(\.?\s*Advise:\s*)(.+)$/i);
                  if (dxAdvise) {
                    return (
                      <div key={i} className="leading-relaxed">
                        <span>{dxAdvise[1]}</span>
                        <span className="font-semibold text-[#D4A574]">{dxAdvise[2]}</span>
                        <span>{dxAdvise[3]}</span>
                        <span className="font-semibold text-[#D4A574]">{dxAdvise[4]}</span>
                        <span>{dxAdvise[5]}</span>
                      </div>
                    );
                  }
                  return <div key={i}>{line}</div>;
                })}
              </div>
            )}
          </div>
          
          {/* Feedback Section */}
          {showFeedback && !loading && !feedbackSubmitted && (
            <div className="bg-[#111] rounded-xl p-4 border border-[#222]">
               <div className="flex items-center justify-between mb-3">
                 <span className="text-xs font-medium text-gray-400">Rate this summary to improve AI</span>
                 <div className="flex gap-1">
                   {[1, 2, 3, 4, 5].map((s) => (
                     <button 
                       key={s}
                       onClick={() => setRating(s)}
                       className={`p-1 hover:scale-110 transition-transform ${rating >= s ? 'text-yellow-400' : 'text-gray-700'}`}
                     >
                       <Star className="w-4 h-4 fill-current" />
                     </button>
                   ))}
                 </div>
               </div>
               
               {rating > 0 && (
                 <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                   <textarea
                     value={feedbackText}
                     onChange={(e) => setFeedbackText(e.target.value)}
                     placeholder="Optional: What should be improved? (e.g. 'Mention IOP first')"
                     className="w-full bg-[#080808] border border-[#333] rounded-lg p-2 text-xs text-white placeholder-gray-600 mb-2 focus:outline-none focus:border-[#D4A574]"
                     rows={2}
                   />
                   <div className="flex justify-end">
                     <button
                       onClick={handleFeedbackSubmit}
                       disabled={isSubmittingFeedback}
                       className="px-3 py-1.5 bg-[#222] hover:bg-[#333] text-white text-[10px] font-bold rounded-md transition-colors border border-[#333]"
                     >
                       {isSubmittingFeedback ? 'Saving...' : 'Submit Feedback'}
                     </button>
                   </div>
                 </div>
               )}
            </div>
          )}
          
          {feedbackSubmitted && (
             <div className="bg-[#111] rounded-xl p-3 border border-[#222] flex items-center justify-center gap-2 text-green-500 text-xs font-medium animate-in fade-in">
                <ThumbsUp className="w-4 h-4" />
                Wait Feedback saved. AI will adapt next time.
             </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
