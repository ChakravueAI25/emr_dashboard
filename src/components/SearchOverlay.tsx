import { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';

interface SearchResult {
    name?: string;
    registrationId?: string;
    email?: string;
    phone?: string;
    profilePic?: string;
    lastVisit?: string;
    created_at?: string;
}

interface SearchOverlayProps {
    showSearchResults: boolean;
    setShowSearchResults: (show: boolean) => void;
    searchResults: SearchResult[];
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    isSearching: boolean;
    selectedIndex: number;
    setSelectedIndex: (index: number) => void;
    loadPatientByRegistration: (id: string, preserveClinical: boolean) => void;
    overlayInputRef: React.RefObject<HTMLInputElement | null>;
    resultsContainerRef: React.RefObject<HTMLDivElement | null>;
    searchDropdownRef: React.RefObject<HTMLDivElement | null>;
    handleSearchInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const SearchOverlay = ({
    showSearchResults,
    setShowSearchResults,
    searchResults,
    searchQuery,
    setSearchQuery,
    isSearching,
    selectedIndex,
    setSelectedIndex,
    loadPatientByRegistration,
    overlayInputRef,
    resultsContainerRef,
    searchDropdownRef,
    handleSearchInputKeyDown
}: SearchOverlayProps) => {

    if (!showSearchResults) return null;

    return createPortal(
        <div ref={searchDropdownRef} style={{ position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999 }}>
            {/* Top-right close X */}
            <button onClick={() => setShowSearchResults(false)} aria-label="Close search" className="absolute right-6 top-6 text-[#8B8B8B] hover:text-white z-50">✕</button>

            <div className="h-full w-full flex items-center justify-center">
                <div className="w-full max-w-5xl mx-6 my-8 bg-[#050505] text-white rounded-md shadow-2xl overflow-visible" style={{ pointerEvents: 'auto', height: '88vh' }}>
                    <div className="p-4 border-b border-[#262626] sticky top-0 z-40 bg-[#050505]">
                        <div className="max-w-4xl mx-auto">
                            <div className="flex items-center gap-3">
                                <Search className="w-4 h-4 text-[#9aa0a6]" />
                                <input
                                    ref={overlayInputRef}
                                    type="text"
                                    placeholder="Search by name, phone number, email or registration ID"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleSearchInputKeyDown}
                                    className="w-full bg-transparent border border-[#111111] rounded-md px-3 py-2 text-sm text-white placeholder-[#9aa0a6] focus:outline-none focus:border-[#D4A574]"
                                />
                            </div>
                            <div className="text-xs text-[#9aa0a6] mt-3">{isSearching ? 'Searching...' : `${searchResults.length} results`}</div>
                            <div className="text-xs text-[#6b7280] mt-1">Filter by: Name • Phone • Email • Registration ID | Use ↑/↓ to navigate, Enter to select, Esc to close</div>
                        </div>
                    </div>

                    <div className="h-[calc(88vh-72px)] flex flex-col">
                        {searchResults.length === 0 ? (
                            <div className="p-6 text-center text-sm text-[#9aa0a6]">No matches</div>
                        ) : (
                            <div className="p-4 flex-1 flex flex-col">
                                <div
                                    className="border border-[#262626] rounded-md overflow-y-auto max-h-[64vh] pr-2 search-scroll"
                                    ref={resultsContainerRef}
                                    tabIndex={0}
                                    onWheel={(e) => {
                                        // Forward wheel to the results container to ensure scrolling works on all platforms
                                        const c = resultsContainerRef.current;
                                        if (c) {
                                            c.scrollTop += (e as React.WheelEvent).deltaY;
                                            e.preventDefault();
                                        }
                                    }}
                                    style={{ scrollbarWidth: 'thin' }}
                                >
                                    <table className="w-full max-w-4xl mx-auto table-fixed border-collapse">
                                        <thead>
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs text-[#e6eef2] uppercase tracking-wide border-b border-r border-[#262626] font-semibold sticky top-0 bg-[#050505] z-40">Name</th>
                                                <th className="px-4 py-3 text-left text-xs text-[#e6eef2] uppercase tracking-wide border-b border-r border-[#262626] font-semibold sticky top-0 bg-[#050505] z-40">Email</th>
                                                <th className="px-4 py-3 text-left text-xs text-[#e6eef2] uppercase tracking-wide border-b border-r border-[#262626] font-semibold sticky top-0 bg-[#050505] z-40">Phone</th>
                                                <th className="px-4 py-3 text-right text-xs text-[#e6eef2] uppercase tracking-wide border-b border-r border-[#262626] font-semibold sticky top-0 bg-[#050505] z-40">Registration ID</th>
                                                <th className="px-4 py-3 text-right text-xs text-[#e6eef2] uppercase tracking-wide border-b border-[#262626] font-semibold sticky top-0 bg-[#050505] z-40">Time</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {searchResults.map((r, idx) => {
                                                const lv = r.lastVisit || r.created_at || null;
                                                let formattedDate: string | null = null;
                                                if (lv) {
                                                    const d = new Date(lv);
                                                    formattedDate = isNaN(d.getTime()) ? String(lv) : d.toLocaleString();
                                                }
                                                return (
                                                    <tr
                                                        key={r.registrationId || Math.random().toString(36).slice(2)}
                                                        className={`hover:bg-[#070707] even:bg-[#060606] cursor-pointer border-b border-[#262626] ${selectedIndex === idx ? 'bg-[#111111] border-l-4 border-[#D4A574]' : ''}`}
                                                        onClick={() => r.registrationId && loadPatientByRegistration(r.registrationId, true)}
                                                        onMouseEnter={() => setSelectedIndex(idx)}
                                                    >
                                                        <td className="px-4 py-4 align-top border-r border-[#262626]">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-full bg-[#0b0b0b] flex items-center justify-center overflow-hidden flex-shrink-0 ring-1 ring-[#111111]">
                                                                    {r.profilePic ? (
                                                                        // eslint-disable-next-line @next/next/no-img-element
                                                                        <img src={r.profilePic} alt="avatar" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <span className="text-xs text-[#c7ced2] font-semibold">{(r.name || 'U').split(' ').map(s => s[0]).slice(0, 2).join('')}</span>
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="text-sm text-white font-semibold truncate">{r.name || 'Unnamed'}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 align-top border-r border-[#262626]">
                                                            <div className="text-sm text-[#e6e6e6] truncate">{r.email || '—'}</div>
                                                        </td>
                                                        <td className="px-4 py-4 align-top border-r border-[#262626]">
                                                            <div className="text-sm text-[#c7ced2]">{r.phone || '—'}</div>
                                                        </td>
                                                        <td className="px-4 py-4 align-top text-xs text-[#e6e6e6] whitespace-nowrap font-mono text-right border-r border-[#262626]">{r.registrationId || 'Not assigned'}</td>
                                                        <td className="px-4 py-4 align-top text-xs text-[#9aa0a6] text-right">{formattedDate || '—'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
