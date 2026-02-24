import { useState, useEffect } from 'react';
import { Search, Calendar, User, Stethoscope, Eye, AlertCircle, Download, Edit3, Save, X, RotateCcw } from 'lucide-react';
import API_ENDPOINTS from '../config/api';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface VisitRecord {
  visitId: string;
  visitDate: string;
  stages: {
    reception: { stageCompletedAt: string; data: any } | null;
    opd: { stageCompletedAt: string; data: any } | null;
    doctor: { stageCompletedAt: string; data: any } | null;
  } | null;
}

interface PatientRecord {
  patientId: string;
  patientName: string;
  registrationId: string;
  phone?: string;
  email?: string;
  visits: VisitRecord[];
  createdAt: string;
}

export function PatientHistoryView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [allPatients, setAllPatients] = useState<PatientRecord[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<PatientRecord[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [expandedVisit, setExpandedVisit] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Edit mode states
  const [editingVisit, setEditingVisit] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);
  const [editReason, setEditReason] = useState('');
  const [saving, setSaving] = useState(false);

  // Helper function to safely render a value (handles objects, arrays, etc.)
  const safeRender = (value: any, fallback: string = 'N/A'): string => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string') return value || fallback;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : fallback;
    if (typeof value === 'object') {
      // Try to extract meaningful data from object
      if (Object.keys(value).length === 0) return fallback;
      return JSON.stringify(value);
    }
    return String(value) || fallback;
  };

  useEffect(() => {
    // Initial load only
    loadPatientRecords();
  }, []);

  useEffect(() => {
    if (searchTerm.trim().length >= 1) {
      const filtered = allPatients.filter(
        p =>
          p.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.registrationId.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPatients(filtered);
    } else {
      setFilteredPatients([]);
    }
  }, [searchTerm, allPatients]);

  const loadPatientRecords = async () => {
    try {
      // setLoading(true); // Removed to show view directly

      // Try to fetch from MongoDB via backend endpoint
      try {
        // First, get all patients from MongoDB
        const response = await fetch(API_ENDPOINTS.PATIENTS_ALL);

        if (response.ok) {
          const patientsData = await response.json();
          const patients = Array.isArray(patientsData) ? patientsData : patientsData.patients || [];

          // Sort by newest created first
          const sortedBasePatients = patients.sort((a: any, b: any) =>
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );

          // Only take first 50 to keep it fast, full list load is overkill if searching
          const limit = 50;
          const processingPatients = sortedBasePatients.slice(0, limit);

          // Process each patient to fetch their visits
          const allPatientsWithVisits: PatientRecord[] = [];

          for (const patient of processingPatients) {
            const regId = patient.registrationId;

            try {
              // We'll fetch visits on demand when selected instead of during bulk load to speed up search
              allPatientsWithVisits.push({
                patientId: patient._id || patient.id || '',
                patientName: patient.name || '',
                registrationId: regId,
                phone: patient.contactInfo?.phone || '',
                email: patient.contactInfo?.email || '',
                visits: [], // Load on selection for speed
                createdAt: patient.createdAt || new Date().toISOString()
              });
            } catch (err) {
              console.warn(err);
            }
          }

          setAllPatients(allPatientsWithVisits);
          setLoading(false);
          return;
        }
      } catch (mongoErr) {
        // If fetching from backend fails, surface error instead of falling back to localStorage
        throw mongoErr;
      }

      // No fallback: if backend is unavailable, let caller handle the error
      // (avoids local-only persistence that causes multi-device inconsistency)
      setAllPatients([]);
      setLoading(false);
      return;

      // NOTE: the legacy localStorage fallback was intentionally removed to
      // ensure the backend is the single source of truth for patient history.
      // If you'd like, we can add a one-time migration script to import any
      // existing localStorage data into MongoDB; for now we avoid using
      // client-only storage for authoritative patient records.
      setAllPatients([]);
      setLoading(false);
    } catch (err) {
      console.error('Error loading patient records:', err);
      setLoading(false);
    }
  };

  const getVisitCount = (patient: PatientRecord) => patient.visits.length;

  const getLatestVisit = (patient: PatientRecord) => {
    if (patient.visits.length === 0) return null;
    return patient.visits[patient.visits.length - 1];
  };

  const formatDate = (isoDate: string) => {
    try {
      const date = new Date(isoDate);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoDate;
    }
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'reception':
        return <User className="w-4 h-4 text-blue-400" />;
      case 'opd':
        return <Eye className="w-4 h-4 text-purple-400" />;
      case 'doctor':
        return <Stethoscope className="w-4 h-4 text-green-400" />;
      default:
        return null;
    }
  };

  const getStageLabel = (stage: string) => {
    return stage.charAt(0).toUpperCase() + stage.slice(1);
  };

  const exportPatientData = (patient: PatientRecord) => {
    const dataStr = JSON.stringify(patient, null, 2);
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(dataStr));
    element.setAttribute('download', `${patient.patientName}_${patient.registrationId}_history.json`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const exportVisitData = (patient: PatientRecord, visit: VisitRecord, visitNumber: number) => {
    const visitExport = {
      patientName: patient.patientName,
      registrationId: patient.registrationId,
      phone: patient.phone,
      email: patient.email,
      visitNumber: visitNumber,
      visitId: visit.visitId,
      visitDate: visit.visitDate,
      stages: visit.stages,
      exportedAt: new Date().toISOString()
    };
    const dataStr = JSON.stringify(visitExport, null, 2);
    const element = document.createElement('a');
    const dateStr = new Date(visit.visitDate).toISOString().split('T')[0];
    element.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(dataStr));
    element.setAttribute('download', `${patient.patientName}_${patient.registrationId}_visit${visitNumber}_${dateStr}.json`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Start editing a visit
  const startEditVisit = (visit: VisitRecord) => {
    setEditingVisit(visit.visitId);
    setEditData(JSON.parse(JSON.stringify(visit.stages))); // Deep clone
    setEditReason('');
    setExpandedVisit(visit.visitId);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingVisit(null);
    setEditData(null);
    setEditReason('');
  };

  // Save edited visit
  const saveEditedVisit = async () => {
    if (!selectedPatient || !editingVisit || !editData) return;

    if (!editReason.trim()) {
      alert('Please provide a reason for the correction');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        `${API_ENDPOINTS.PATIENT_VISITS(selectedPatient.registrationId)}/${encodeURIComponent(editingVisit)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stages: editData,
            editReason: editReason,
            editedBy: 'User' // In real app, get from auth context
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save changes');
      }

      alert('Visit record updated successfully!');

      // Refresh data
      await loadPatientRecords();

      // Reset edit state
      cancelEdit();
    } catch (err) {
      console.error('Error saving visit:', err);
      alert('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Update nested edit data
  const updateEditData = (stage: string, field: string, value: any) => {
    setEditData((prev: any) => ({
      ...prev,
      [stage]: {
        ...prev[stage],
        data: {
          ...prev[stage]?.data,
          [field]: value
        }
      }
    }));
  };

  // Update deeply nested edit data (e.g., patientDetails.age)
  const updateNestedEditData = (stage: string, parentField: string, childField: string, value: any) => {
    setEditData((prev: any) => ({
      ...prev,
      [stage]: {
        ...prev[stage],
        data: {
          ...prev[stage]?.data,
          [parentField]: {
            ...prev[stage]?.data?.[parentField],
            [childField]: value
          }
        }
      }
    }));
  };

  /* 
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0a]">
        <div className="text-center">
          <Search className="w-12 h-12 text-[#D4A574] animate-spin mx-auto mb-4" />
          <p className="text-[#8B8B8B]">Loading patient records...</p>
        </div>
      </div>
    );
  }
  */

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8 ml-16">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-light tracking-tight mb-2">Patient History</h1>
        <p className="text-[#8B8B8B]">Search and view complete patient examination records</p>
        <div className="w-16 h-1 bg-gradient-to-r from-[#D4A574] to-transparent rounded-full"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Search and Patient List */}
        <div className="lg:col-span-1">
          <div className="bg-[#0f0f0f] border border-[#D4A574] rounded-xl p-6">
            {/* Search Input */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-[#8B8B8B]" />
                <Input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-[#1a1a1a] border-[#D4A574] text-white placeholder-[#5a5a5a]"
                />
              </div>
              {searchTerm && (
                <p className="text-xs text-[#8B8B8B] mt-2">
                  Found {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* Patient List */}
            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
              {filteredPatients.length === 0 && searchTerm ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 text-[#5a5a5a] mx-auto mb-2" />
                  <p className="text-[#8B8B8B] text-sm">No patients found</p>
                </div>
              ) : (
                filteredPatients.map((patient) => (
                  <button
                    key={patient.patientId}
                    onClick={async () => {
                      // Fetch visits for this patient specifically when selected for speed
                      if (patient.visits.length === 0) {
                        try {
                          const resp = await fetch(API_ENDPOINTS.PATIENT_VISITS(patient.registrationId));
                          if (resp.ok) {
                            const data = await resp.json();
                            const visits = data.visits || [];
                            const sorted = visits.sort((a: any, b: any) =>
                              new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
                            );

                            const updatedPatient = { ...patient, visits: sorted };
                            setSelectedPatient(updatedPatient);

                            // Also update in the main list so we don't refetch
                            setAllPatients(prev => prev.map(p =>
                              p.registrationId === patient.registrationId ? updatedPatient : p
                            ));
                          } else {
                            setSelectedPatient(patient);
                          }
                        } catch (err) {
                          console.error(err);
                          setSelectedPatient(patient);
                        }
                      } else {
                        setSelectedPatient(patient);
                      }
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${selectedPatient?.registrationId === patient.registrationId
                      ? 'bg-[#D4A574]/10 border-[#D4A574]'
                      : 'bg-[#1a1a1a] border-[#D4A574] hover:border-[#D4A574]/50'
                      }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white font-semibold text-sm">{patient.patientName}</p>
                        <p className="text-xs text-[#D4A574] font-mono">{patient.registrationId}</p>
                        <p className="text-xs text-[#8B8B8B] mt-1">
                          {getVisitCount(patient)} visit{getVisitCount(patient) !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Patient Details and Visit History */}
        <div className="lg:col-span-2">
          {selectedPatient ? (
            <>
              {/* Patient Info Card */}
              <div className="bg-[#0f0f0f] border border-[#D4A574] rounded-xl p-8 mb-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-[#8B8B8B] uppercase mb-2">Patient Name</p>
                    <p className="text-white font-semibold text-lg">{selectedPatient.patientName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#8B8B8B] uppercase mb-2">Registration ID</p>
                    <p className="text-[#D4A574] font-mono text-sm">{selectedPatient.registrationId}</p>
                  </div>
                  {selectedPatient.phone && (
                    <div>
                      <p className="text-xs text-[#8B8B8B] uppercase mb-2">Phone</p>
                      <p className="text-white text-sm">{selectedPatient.phone}</p>
                    </div>
                  )}
                  {selectedPatient.email && (
                    <div>
                      <p className="text-xs text-[#8B8B8B] uppercase mb-2">Email</p>
                      <p className="text-white text-sm">{selectedPatient.email}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-[#8B8B8B] uppercase mb-2">Total Visits</p>
                    <p className="text-[#D4A574] font-semibold text-lg">{getVisitCount(selectedPatient)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#8B8B8B] uppercase mb-2">First Visit</p>
                    <p className="text-white text-sm">{formatDate(selectedPatient.createdAt)}</p>
                  </div>
                </div>

                <Button
                  onClick={() => exportPatientData(selectedPatient)}
                  className="mt-6 w-full bg-[#D4A574] hover:bg-[#E8B88B] text-[#0a0a0a] font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Patient Data
                </Button>
              </div>

              {/* Visit History */}
              <div className="space-y-4">
                <h2 className="text-lg font-medium text-white mb-4">Visit History</h2>

                {selectedPatient.visits.length === 0 ? (
                  <Card className="bg-[#0f0f0f] border border-[#D4A574] p-8 text-center">
                    <Calendar className="w-12 h-12 text-[#5a5a5a] mx-auto mb-4" />
                    <p className="text-[#8B8B8B]">No visit records found</p>
                  </Card>
                ) : (
                  selectedPatient.visits.map((visit, idx) => (
                    <div
                      key={visit.visitId}
                      className="bg-[#0f0f0f] border border-[#D4A574] rounded-xl overflow-hidden"
                    >
                      {/* Visit Header */}
                      <div className="w-full p-6 hover:bg-[#1a1a1a]/50 transition-colors flex items-center justify-between">
                        <button
                          onClick={() =>
                            setExpandedVisit(expandedVisit === visit.visitId ? null : visit.visitId)
                          }
                          className="flex items-center gap-4 flex-1"
                        >
                          <div className="flex-shrink-0">
                            <div className="text-xs bg-[#D4A574] text-[#0a0a0a] px-3 py-2 rounded font-bold">
                              Visit #{selectedPatient.visits.length - idx}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-4">
                              <span className="text-white font-semibold">{formatDate(visit.visitDate)}</span>
                              <div className="flex items-center gap-1">
                                {visit.stages?.reception && getStageIcon('reception')}
                                {visit.stages?.opd && getStageIcon('opd')}
                                {visit.stages?.doctor && getStageIcon('doctor')}
                              </div>
                            </div>
                          </div>
                        </button>
                        <div className="flex items-center gap-3">
                          {/* Edit Button */}
                          {editingVisit !== visit.visitId ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditVisit(visit);
                              }}
                              className="p-2 bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 rounded-lg transition-colors"
                              title="Edit this visit"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  saveEditedVisit();
                                }}
                                disabled={saving}
                                className="p-2 bg-green-500/20 hover:bg-green-500/40 text-green-400 rounded-lg transition-colors disabled:opacity-50"
                                title="Save changes"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelEdit();
                                }}
                                className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg transition-colors"
                                title="Cancel edit"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              exportVisitData(selectedPatient, visit, selectedPatient.visits.length - idx);
                            }}
                            className="p-2 bg-[#D4A574]/20 hover:bg-[#D4A574]/40 text-[#D4A574] rounded-lg transition-colors"
                            title="Export this visit"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              setExpandedVisit(expandedVisit === visit.visitId ? null : visit.visitId)
                            }
                            className="text-[#8B8B8B] hover:text-white transition-colors"
                          >
                            {expandedVisit === visit.visitId ? 'âˆ’' : '+'}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {expandedVisit === visit.visitId && (
                        <div className="border-t border-[#D4A574] p-6 bg-[#1a1a1a]/50">
                          {/* Edit Reason Input - shown when editing */}
                          {editingVisit === visit.visitId && (
                            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <RotateCcw className="w-4 h-4 text-yellow-400" />
                                <p className="text-yellow-400 font-semibold text-sm">Edit Mode Active</p>
                              </div>
                              <p className="text-[#8B8B8B] text-xs mb-3">
                                Make your corrections below. A reason is required to save changes.
                              </p>
                              <Input
                                type="text"
                                placeholder="Reason for correction (required)..."
                                value={editReason}
                                onChange={(e) => setEditReason(e.target.value)}
                                className="bg-[#1a1a1a] border-yellow-500/30 text-white placeholder-[#5a5a5a]"
                              />
                            </div>
                          )}

                          <div className="space-y-8">
                            {/* Reception Data */}
                            {visit.stages?.reception && visit.stages.reception.data?.patientDetails && (
                              <div>
                                <div className="flex items-center gap-2 mb-3">
                                  {getStageIcon('reception')}
                                  <h4 className="text-[#D4A574] font-semibold">Reception Details</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="text-[#8B8B8B]">Age</p>
                                    {editingVisit === visit.visitId ? (
                                      <Input
                                        type="text"
                                        value={safeRender(editData?.reception?.data?.patientDetails?.age, '')}
                                        onChange={(e) => updateNestedEditData('reception', 'patientDetails', 'age', e.target.value)}
                                        className="mt-1 bg-[#0a0a0a] border-[#D4A574] text-white h-8"
                                      />
                                    ) : (
                                      <p className="text-white">{safeRender(visit.stages.reception.data.patientDetails.age)}</p>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-[#8B8B8B]">Sex</p>
                                    {editingVisit === visit.visitId ? (
                                      <select
                                        value={safeRender(editData?.reception?.data?.patientDetails?.sex, '')}
                                        onChange={(e) => updateNestedEditData('reception', 'patientDetails', 'sex', e.target.value)}
                                        className="mt-1 w-full bg-[#0a0a0a] border border-[#D4A574] text-white h-8 rounded px-2"
                                      >
                                        <option value="">Select</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                      </select>
                                    ) : (
                                      <p className="text-white">{safeRender(visit.stages.reception.data.patientDetails.sex)}</p>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-[#8B8B8B]">Blood Type</p>
                                    {editingVisit === visit.visitId ? (
                                      <Input
                                        type="text"
                                        value={safeRender(editData?.reception?.data?.patientDetails?.bloodType, '')}
                                        onChange={(e) => updateNestedEditData('reception', 'patientDetails', 'bloodType', e.target.value)}
                                        className="mt-1 bg-[#0a0a0a] border-[#D4A574] text-white h-8"
                                      />
                                    ) : (
                                      <p className="text-white">{safeRender(visit.stages.reception.data.patientDetails.bloodType)}</p>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-[#8B8B8B]">Allergies</p>
                                    {editingVisit === visit.visitId ? (
                                      <Input
                                        type="text"
                                        value={safeRender(editData?.reception?.data?.patientDetails?.allergies, '')}
                                        onChange={(e) => updateNestedEditData('reception', 'patientDetails', 'allergies', e.target.value)}
                                        className="mt-1 bg-[#0a0a0a] border-[#D4A574] text-white h-8"
                                      />
                                    ) : (
                                      <p className="text-white">{safeRender(visit.stages.reception.data.patientDetails.allergies, 'None')}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* OPD Data */}
                            {visit.stages?.opd && (
                              <div>
                                <div className="flex items-center gap-2 mb-3">
                                  {getStageIcon('opd')}
                                  <h4 className="text-[#D4A574] font-semibold">OPD Examination</h4>
                                </div>
                                <div className="space-y-4">
                                  {visit.stages.opd.data?.optometry && Object.keys(visit.stages.opd.data.optometry).length > 0 && (
                                    <div className="bg-[#0f0f0f] p-4 rounded-lg border border-[#D4A574]">
                                      <p className="text-[#8B8B8B] text-sm mb-2">Optometry Findings</p>
                                      {editingVisit === visit.visitId ? (
                                        <textarea
                                          value={JSON.stringify(editData?.opd?.data?.optometry || {}, null, 2)}
                                          onChange={(e) => {
                                            try {
                                              const parsed = JSON.parse(e.target.value);
                                              updateEditData('opd', 'optometry', parsed);
                                            } catch {
                                              // Allow invalid JSON while typing
                                            }
                                          }}
                                          className="w-full bg-[#0a0a0a] border border-[#D4A574] text-white text-sm p-2 rounded font-mono"
                                          rows={6}
                                        />
                                      ) : (
                                        <p className="text-white text-sm whitespace-pre-wrap">
                                          {JSON.stringify(visit.stages.opd.data.optometry, null, 2)}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                  {visit.stages.opd.data?.iop && Object.keys(visit.stages.opd.data.iop).length > 0 && (
                                    <div className="bg-[#0f0f0f] p-4 rounded-lg border border-[#D4A574]">
                                      <p className="text-[#8B8B8B] text-sm mb-2">IOP Readings</p>
                                      {editingVisit === visit.visitId ? (
                                        <textarea
                                          value={JSON.stringify(editData?.opd?.data?.iop || {}, null, 2)}
                                          onChange={(e) => {
                                            try {
                                              const parsed = JSON.parse(e.target.value);
                                              updateEditData('opd', 'iop', parsed);
                                            } catch {
                                              // Allow invalid JSON while typing
                                            }
                                          }}
                                          className="w-full bg-[#0a0a0a] border border-[#D4A574] text-white text-sm p-2 rounded font-mono"
                                          rows={4}
                                        />
                                      ) : (
                                        <p className="text-white text-sm whitespace-pre-wrap">
                                          {JSON.stringify(visit.stages.opd.data.iop, null, 2)}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Doctor Data */}
                            {visit.stages?.doctor && (
                              <div>
                                <div className="flex items-center gap-2 mb-3">
                                  {getStageIcon('doctor')}
                                  <h4 className="text-[#D4A574] font-semibold">Doctor Consultation</h4>
                                </div>
                                <div className="space-y-4">
                                  <div className="bg-[#0f0f0f] p-4 rounded-lg border border-[#D4A574]">
                                    <p className="text-[#8B8B8B] text-sm mb-2">Diagnosis</p>
                                    {editingVisit === visit.visitId ? (
                                      <textarea
                                        value={safeRender(editData?.doctor?.data?.doctorFindings?.diagnosis || editData?.doctor?.data?.diagnosis, '')}
                                        onChange={(e) => {
                                          setEditData((prev: any) => ({
                                            ...prev,
                                            doctor: {
                                              ...prev.doctor,
                                              data: {
                                                ...prev.doctor?.data,
                                                doctorFindings: {
                                                  ...prev.doctor?.data?.doctorFindings,
                                                  diagnosis: e.target.value
                                                },
                                                diagnosis: e.target.value
                                              }
                                            }
                                          }));
                                        }}
                                        className="w-full bg-[#0a0a0a] border border-[#D4A574] text-white text-sm p-2 rounded"
                                        rows={3}
                                      />
                                    ) : (
                                      <p className="text-white text-sm">{safeRender(visit.stages.doctor.data?.doctorFindings?.diagnosis || visit.stages.doctor.data?.diagnosis)}</p>
                                    )}
                                  </div>
                                  <div className="bg-[#0f0f0f] p-4 rounded-lg border border-[#D4A574]">
                                    <p className="text-[#8B8B8B] text-sm mb-2">Prescription</p>
                                    {editingVisit === visit.visitId ? (
                                      <textarea
                                        value={safeRender(editData?.doctor?.data?.doctorFindings?.prescription || editData?.doctor?.data?.prescription, '')}
                                        onChange={(e) => {
                                          setEditData((prev: any) => ({
                                            ...prev,
                                            doctor: {
                                              ...prev.doctor,
                                              data: {
                                                ...prev.doctor?.data,
                                                doctorFindings: {
                                                  ...prev.doctor?.data?.doctorFindings,
                                                  prescription: e.target.value
                                                },
                                                prescription: e.target.value
                                              }
                                            }
                                          }));
                                        }}
                                        className="w-full bg-[#0a0a0a] border border-[#D4A574] text-white text-sm p-2 rounded"
                                        rows={3}
                                      />
                                    ) : (
                                      <p className="text-white text-sm">{safeRender(visit.stages.doctor.data?.doctorFindings?.prescription || visit.stages.doctor.data?.prescription)}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Edit History (if any) */}
                            {(visit as any).editHistory && (visit as any).editHistory.length > 0 && (
                              <div className="border-t border-[#D4A574] pt-4 mt-4">
                                <p className="text-[#8B8B8B] text-xs uppercase mb-2">Edit History</p>
                                <div className="space-y-2">
                                  {(visit as any).editHistory.map((edit: any, editIdx: number) => (
                                    <div key={editIdx} className="text-xs bg-[#0a0a0a] p-2 rounded border border-[#D4A574]">
                                      <span className="text-[#D4A574]">{formatDate(edit.editedAt)}</span>
                                      <span className="text-[#8B8B8B]"> by {edit.editedBy}: </span>
                                      <span className="text-white">{edit.reason}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <Card className="bg-[#0f0f0f] border border-[#D4A574] p-12 text-center h-full flex items-center justify-center">
              <div>
                <Search className="w-12 h-12 text-[#5a5a5a] mx-auto mb-4" />
                <p className="text-[#8B8B8B]">Search for a patient to view their history</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
