import { useState, useEffect } from 'react';
import { Search, Calendar, X, ChevronRight, Filter } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card } from './ui/card';
import API_ENDPOINTS from '../config/api';

interface Patient {
  _id?: string;
  id?: string;
  name?: string;
  registrationId?: string;
  created_at?: string;
  lastUpdated?: string;
  demographics?: {
    age?: number;
    sex?: string;
    bloodType?: string;
  };
  contactInfo?: {
    phone?: string;
    email?: string;
    address?: string;
  };
}

export function PatientsListView() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchName, setSearchName] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Fetch all patients on mount
  useEffect(() => {
    // Initial fetch of recent patients (e.g., 50)
    fetchPatients();
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
        fetchPatients(searchName);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchName]);

  // Apply DATE filters locally to the fetched results
  useEffect(() => {
    applyDateFilter();
  }, [patients, selectedDate]);

  const fetchPatients = async (query = '') => {
    try {
      setLoading(true);
      setError(null);
      
      let url;
      if (query.trim()) {
          url = `${API_ENDPOINTS.PATIENTS_SEARCH}?q=${encodeURIComponent(query)}&limit=50`;
      } else {
          // Use recent endpoint for initial load to avoid loading 8000 records
          // Use limit=50 to check recent records.
          // Note: If you need pagination, that would require more extensive UI changes.
           url = API_ENDPOINTS.PATIENTS_RECENT(50);
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch patients');
      }

      const data = await response.json();
      // Handle both formats: { results: [...] } from search or { patients: [...] } from recent
      const list = data.results || data.patients || (Array.isArray(data) ? data : []);
      setPatients(list);
      // We also update filteredPatients immediately with the new list, 
      // then let the date filter effect refine it if needed.
      setFilteredPatients(list); 
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyDateFilter = () => {
    let filtered = [...patients];

    // Filter by date only if a date is selected
    if (selectedDate) {
      filtered = filtered.filter(p => {
        if (!p.created_at && !p.lastUpdated) return false;

        const dateStr = p.created_at || p.lastUpdated;
        const patientDate = new Date(dateStr);

        // Skip invalid dates (including epoch 1970)
        if (isNaN(patientDate.getTime()) || patientDate.getFullYear() === 1970) {
          return false;
        }

        const patientDateStr = patientDate.toDateString();
        const filterDate = new Date(selectedDate).toDateString();
        return patientDateStr === filterDate;
      });
    }
    
    setFilteredPatients(filtered);
  };

  const clearFilters = () => {
    setSearchName('');
    setSelectedDate('');
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not registered';

    const date = new Date(dateString);

    // Check if date is valid and not the Unix epoch (1970-01-01)
    if (isNaN(date.getTime()) || date.getFullYear() === 1970) {
      return 'Not registered';
    }

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);

    // Check if date is valid and not the Unix epoch
    if (isNaN(date.getTime()) || date.getFullYear() === 1970) {
      return 'N/A';
    }

    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0a]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-[#D4A574] border-t-transparent animate-spin mx-auto mb-4"></div>
          <p className="text-[#8B8B8B] text-sm font-medium">Loading patient records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8 ml-16">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-light tracking-tight">Patient Directory</h1>
          <div className="text-sm text-[#8B8B8B]">{patients.length} Total Records</div>
        </div>
        <div className="w-16 h-1 bg-gradient-to-r from-[#D4A574] to-transparent rounded-full"></div>
      </div>

      {/* Filters Card */}
      <div className="mb-10 bg-[#0f0f0f] border border-[#D4A574] rounded-xl p-8">
        <div className="flex items-center gap-2 mb-6">
          <Filter className="w-5 h-5 text-[#D4A574]" />
          <h2 className="text-lg font-medium text-white">Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Name Search */}
          <div>
            <label className="block text-xs font-semibold text-[#8B8B8B] uppercase tracking-wider mb-3">
              Patient Name
            </label>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B8B8B] group-focus-within:text-[#D4A574] transition-colors" />
              <Input
                type="text"
                placeholder="Search by name..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="pl-10 bg-[#0a0a0a] border border-[#D4A574] group-hover:border-[#D4A574] group-focus-within:border-[#D4A574] text-white placeholder-[#5a5a5a] text-sm focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-xs font-semibold text-[#8B8B8B] uppercase tracking-wider mb-3">
              Registration Date
            </label>
            <div className="relative group">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B8B8B] group-focus-within:text-[#D4A574] transition-colors" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-10 bg-[#0a0a0a] border border-[#D4A574] group-hover:border-[#D4A574] group-focus-within:border-[#D4A574] text-white text-sm focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Clear Button */}
          <div className="flex items-end">
            <Button
              onClick={clearFilters}
              className="w-full bg-[#1a1a1a] hover:bg-[#2a2a2a] text-[#D4A574] border border-[#D4A574] hover:border-[#D4A574] font-medium text-sm transition-all"
            >
              Reset Filters
            </Button>
          </div>
        </div>

        {/* Filter Status */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#8B8B8B]">
            Showing <span className="text-[#D4A574] font-semibold">{filteredPatients.length}</span> of <span className="text-[#8B8B8B]">{patients.length}</span> patients
          </span>
          {(searchName || selectedDate) && (
            <span className="px-3 py-1 bg-[#D4A574]/10 border border-[#D4A574]/30 rounded text-[#D4A574] font-medium">
              {searchName ? 'âœ“ Name' : ''} {selectedDate ? 'âœ“ Date' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-8 bg-red-950/30 border border-red-900/50 rounded-xl p-4">
          <p className="text-red-400 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Patients List */}
        <div className="lg:col-span-2">
          {filteredPatients.length === 0 ? (
            <div className="bg-[#0f0f0f] border border-[#D4A574] rounded-xl p-16 text-center">
              <div className="text-[#5a5a5a] text-sm font-medium mb-2">No patients found</div>
              <p className="text-[#8B8B8B] text-xs">Adjust your search or date filters to find patients</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[75vh] overflow-y-auto pr-4">
              {filteredPatients.map((patient) => (
                <div
                  key={patient._id}
                  onClick={() => handleSelectPatient(patient)}
                  className={`group cursor-pointer transition-all duration-200`}
                >
                  <div
                    className={`bg-[#0f0f0f] border rounded-lg px-6 py-4 flex items-center justify-between hover:bg-[#151515] transition-all duration-200 ${selectedPatient?._id === patient._id
                        ? 'border-[#D4A574] shadow-lg shadow-[#D4A574]/10'
                        : 'border-[#D4A574] hover:border-[#D4A574]'
                      }`}
                  >
                    {/* Patient Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white text-base mb-2 truncate group-hover:text-[#D4A574] transition-colors">
                        {patient.name}
                      </h3>
                      <div className="flex items-center gap-4 text-xs text-[#8B8B8B]">
                        <span className="font-mono text-[#D4A574]">{patient.registrationId}</span>
                        <span>•</span>
                        <span>{formatDate(patient.created_at)}</span>
                      </div>
                    </div>

                    {/* Details Preview */}
                    <div className="hidden md:flex items-center gap-6 ml-4">
                      {patient.demographics?.age && (
                        <div className="text-right">
                          <div className="text-xs text-[#8B8B8B]">Age</div>
                          <div className="text-sm font-medium text-white">{patient.demographics.age}</div>
                        </div>
                      )}
                      {patient.demographics?.bloodType && (
                        <div className="text-right">
                          <div className="text-xs text-[#8B8B8B]">Blood</div>
                          <div className="text-sm font-medium text-white">{patient.demographics.bloodType}</div>
                        </div>
                      )}
                    </div>

                    {/* Arrow */}
                    <ChevronRight className={`w-5 h-5 text-[#8B8B8B] ml-4 transition-all ${selectedPatient?._id === patient._id ? 'text-[#D4A574] translate-x-1' : 'group-hover:text-[#D4A574]'}`} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Patient Details Panel */}
        <div className="lg:col-span-1">
          {selectedPatient ? (
            <div className="sticky top-8 animate-in fade-in duration-300">
              <div className="bg-[#0f0f0f] border border-[#D4A574] rounded-xl p-8">
                {/* Header */}
                <div className="flex justify-between items-start mb-8 pb-6 border-b border-[#D4A574]">
                  <div>
                    <h2 className="text-2xl font-light tracking-tight text-white mb-1">
                      {selectedPatient.name}
                    </h2>
                    <p className="text-xs text-[#8B8B8B] font-mono">{selectedPatient.registrationId}</p>
                  </div>
                  <button
                    onClick={() => setSelectedPatient(null)}
                    className="text-[#8B8B8B] hover:text-[#D4A574] hover:bg-[#1a1a1a] p-2 rounded transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Demographics */}
                {selectedPatient.demographics && (
                  <div className="mb-8">
                    <h3 className="text-xs font-semibold text-[#8B8B8B] uppercase tracking-widest mb-4">Demographics</h3>
                    <div className="space-y-3">
                      {selectedPatient.demographics.age && (
                        <div>
                          <div className="text-xs text-[#8B8B8B]">Age</div>
                          <div className="text-base font-medium text-white mt-1">{selectedPatient.demographics.age}</div>
                        </div>
                      )}
                      {selectedPatient.demographics.sex && (
                        <div>
                          <div className="text-xs text-[#8B8B8B]">Sex</div>
                          <div className="text-base font-medium text-white mt-1">{selectedPatient.demographics.sex}</div>
                        </div>
                      )}
                      {selectedPatient.demographics.bloodType && (
                        <div>
                          <div className="text-xs text-[#8B8B8B]">Blood Type</div>
                          <div className="text-base font-medium text-white mt-1">{selectedPatient.demographics.bloodType}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Contact Information */}
                {selectedPatient.contactInfo && (
                  <div className="mb-8">
                    <h3 className="text-xs font-semibold text-[#8B8B8B] uppercase tracking-widest mb-4">Contact Information</h3>
                    <div className="space-y-3">
                      {selectedPatient.contactInfo.phone && (
                        <div>
                          <div className="text-xs text-[#8B8B8B]">Phone</div>
                          <div className="text-sm font-mono text-white mt-1 break-all hover:text-[#D4A574] transition-colors cursor-text">
                            {selectedPatient.contactInfo.phone}
                          </div>
                        </div>
                      )}
                      {selectedPatient.contactInfo.email && (
                        <div>
                          <div className="text-xs text-[#8B8B8B]">Email</div>
                          <div className="text-sm font-mono text-white mt-1 break-all hover:text-[#D4A574] transition-colors cursor-text">
                            {selectedPatient.contactInfo.email}
                          </div>
                        </div>
                      )}
                      {selectedPatient.contactInfo.address && (
                        <div>
                          <div className="text-xs text-[#8B8B8B]">Address</div>
                          <div className="text-sm text-white mt-1 line-clamp-2 hover:text-[#D4A574] transition-colors cursor-text">
                            {selectedPatient.contactInfo.address}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Registration Info */}
                <div className="pt-6 border-t border-[#D4A574]">
                  <div className="text-xs text-[#8B8B8B] mb-1">Registered</div>
                  <div className="text-xs font-mono text-[#D4A574]">
                    {formatDate(selectedPatient.created_at)} at {formatTime(selectedPatient.created_at)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="sticky top-8 bg-[#0f0f0f] border border-[#D4A574] rounded-xl p-8 text-center h-fit">
              <div className="text-[#5a5a5a] text-sm font-medium mb-2">No patient selected</div>
              <p className="text-[#8B8B8B] text-xs">Select a patient from the list to view detailed information</p>
            </div>
          )}
        </div>
      </div>

      {/* Custom Scrollbar */}
      <style>{`
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }
        .overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(212, 165, 116, 0.2);
          border-radius: 3px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: rgba(212, 165, 116, 0.4);
        }
      `}</style>
    </div>
  );
}
