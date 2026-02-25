import React, { useState, useEffect } from 'react';
import { Loader, AlertCircle, Trash2, Edit2, RefreshCw } from 'lucide-react';
import { showAlert } from './ui/AlertModal';
import { API_ENDPOINTS } from '../config/api';

interface Hospital {
  organization_id: string;
  hospital_name: string;
  email: string;
  plan: string;
  status: string;
  created_date: string;
}

interface Patient {
  patient_id?: string;
  name?: string;
  age?: number;
  gender?: string;
  email?: string;
  phone?: string;
  [key: string]: any;
}

interface HospitalStats {
  patients: number;
  appointments: number;
  billing: number;
  total_records: number;
}

export const AdminDataManagementView: React.FC = () => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<HospitalStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'hospitals' | 'patients' | 'stats'>('hospitals');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  // Load all hospitals
  const loadHospitals = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(API_ENDPOINTS.ADMIN.HOSPITALS);
      const data = await response.json();
      if (data.status === 'success') {
        setHospitals(data.hospitals);
      } else {
        setError(data.detail || 'Failed to load hospitals');
      }
    } catch (err) {
      setError(`Error loading hospitals: ${err}`);
    }
    setLoading(false);
  };

  // Load patients for selected hospital
  const loadPatients = async (hospitalId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        API_ENDPOINTS.ADMIN.HOSPITAL_PATIENTS(hospitalId)
      );
      const data = await response.json();
      if (data.status === 'success') {
        setPatients(data.patients);
      } else {
        setError(data.detail || 'Failed to load patients');
      }
    } catch (err) {
      setError(`Error loading patients: ${err}`);
    }
    setLoading(false);
  };

  // Load stats for selected hospital
  const loadStats = async (hospitalId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        API_ENDPOINTS.ADMIN.HOSPITAL_STATS(hospitalId)
      );
      const data = await response.json();
      if (data.status === 'success') {
        setStats(data.stats);
      } else {
        setError(data.detail || 'Failed to load stats');
      }
    } catch (err) {
      setError(`Error loading stats: ${err}`);
    }
    setLoading(false);
  };

  // Delete patient
  const deletePatient = async (patientId: string) => {
    if (!selectedHospital) return;
    if (!window.confirm(`Are you sure you want to delete patient ${patientId}?`)) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        API_ENDPOINTS.ADMIN.DELETE_PATIENT(selectedHospital.organization_id, patientId),
        { method: 'DELETE' }
      );
      const data = await response.json();
      if (data.status === 'success') {
        // Reload patients
        await loadPatients(selectedHospital.organization_id);
        showAlert('Patient deleted successfully');
      } else {
        setError(data.detail || 'Failed to delete patient');
      }
    } catch (err) {
      setError(`Error deleting patient: ${err}`);
    }
    setLoading(false);
  };

  // Handle hospital selection
  const handleSelectHospital = (hospital: Hospital) => {
    setSelectedHospital(hospital);
    setActiveTab('stats');
    loadStats(hospital.organization_id);
    loadPatients(hospital.organization_id);
  };

  // Initial load
  useEffect(() => {
    loadHospitals();
  }, []);

  return (
    <div className="w-full min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Admin Data Management</h1>
          <p className="text-gray-600 mt-2">View, edit, and manage all hospital databases</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          {/* Left Panel - Hospital List */}
          <div className="col-span-12 md:col-span-4 lg:col-span-3">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Hospitals</h2>
                <button
                  onClick={loadHospitals}
                  className="p-2 hover:bg-gray-100 rounded-md transition"
                  title="Refresh"
                >
                  <RefreshCw size={16} className="text-gray-600" />
                </button>
              </div>

              <div className="overflow-y-auto max-h-96">
                {loading && hospitals.length === 0 ? (
                  <div className="p-8 flex justify-center">
                    <Loader className="animate-spin text-blue-600" />
                  </div>
                ) : hospitals.length === 0 ? (
                  <div className="p-4 text-gray-500 text-center">No hospitals found</div>
                ) : (
                  <div className="divide-y">
                    {hospitals.map((hospital) => (
                      <button
                        key={hospital.organization_id}
                        onClick={() => handleSelectHospital(hospital)}
                        className={`w-full p-4 text-left hover:bg-gray-50 transition ${selectedHospital?.organization_id === hospital.organization_id
                            ? 'bg-blue-50 border-l-4 border-blue-600'
                            : ''
                          }`}
                      >
                        <h3 className="font-medium text-gray-900 truncate">
                          {hospital.hospital_name}
                        </h3>
                        <p className="text-sm text-gray-600 truncate">{hospital.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {hospital.plan}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded ${hospital.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                              }`}
                          >
                            {hospital.status}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Hospital Details */}
          <div className="col-span-12 md:col-span-8 lg:col-span-9">
            {selectedHospital ? (
              <>
                {/* Hospital Header */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">{selectedHospital.hospital_name}</h2>
                  <p className="text-gray-600 mt-1">{selectedHospital.email}</p>
                  <div className="mt-4 flex gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Plan</p>
                      <p className="font-medium text-gray-900">{selectedHospital.plan}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <p className="font-medium text-green-600">{selectedHospital.status}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Created</p>
                      <p className="font-medium text-gray-900">
                        {new Date(selectedHospital.created_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-6 border-b border-gray-200">
                  <button
                    onClick={() => setActiveTab('stats')}
                    className={`px-4 py-2 font-medium border-b-2 transition ${activeTab === 'stats'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    Statistics
                  </button>
                  <button
                    onClick={() => setActiveTab('patients')}
                    className={`px-4 py-2 font-medium border-b-2 transition ${activeTab === 'patients'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    Patients
                  </button>
                </div>

                {/* Statistics Tab */}
                {activeTab === 'stats' && (
                  <div className="grid grid-cols-3 gap-4">
                    {loading ? (
                      <div className="col-span-3 flex justify-center p-8">
                        <Loader className="animate-spin text-blue-600" />
                      </div>
                    ) : stats ? (
                      <>
                        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                          <p className="text-gray-600 text-sm">Total Patients</p>
                          <p className="text-3xl font-bold text-blue-600 mt-2">{stats.patients}</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                          <p className="text-gray-600 text-sm">Appointments</p>
                          <p className="text-3xl font-bold text-green-600 mt-2">
                            {stats.appointments}
                          </p>
                        </div>
                        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                          <p className="text-gray-600 text-sm">Billing Records</p>
                          <p className="text-3xl font-bold text-purple-600 mt-2">
                            {stats.billing}
                          </p>
                        </div>
                      </>
                    ) : null}
                  </div>
                )}

                {/* Patients Tab */}
                {activeTab === 'patients' && (
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                    {/* Search */}
                    <div className="p-4 border-b border-gray-200">
                      <input
                        type="text"
                        placeholder="Search patients..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                      />
                    </div>

                    {/* Patient Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                              Patient ID
                            </th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                              Name
                            </th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                              Email
                            </th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                              Phone
                            </th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {loading ? (
                            <tr>
                              <td colSpan={5} className="p-8 text-center">
                                <Loader className="animate-spin text-blue-600 mx-auto" />
                              </td>
                            </tr>
                          ) : patients.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-gray-500">
                                No patients found
                              </td>
                            </tr>
                          ) : (
                            patients
                              .filter(
                                (p) =>
                                  !searchTerm ||
                                  p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  p.patient_id?.toLowerCase().includes(searchTerm.toLowerCase())
                              )
                              .map((patient) => (
                                <tr key={patient.patient_id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 text-sm text-gray-900">
                                    {patient.patient_id}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-900">
                                    {patient.name || 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-600">
                                    {patient.email || 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-600">
                                    {patient.phone || 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 text-sm">
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => setEditingPatient(patient)}
                                        className="p-2 hover:bg-blue-100 text-blue-600 rounded transition"
                                        title="Edit"
                                      >
                                        <Edit2 size={16} />
                                      </button>
                                      <button
                                        onClick={() =>
                                          deletePatient(patient.patient_id || '')
                                        }
                                        className="p-2 hover:bg-red-100 text-red-600 rounded transition"
                                        title="Delete"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
                <p className="text-gray-500 text-lg">Select a hospital to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
