import { PatientData } from './patient';

/**
 * Transforms the full patient data from the UI state into the specific
 * format expected by the backend's /patients/new endpoint for a receptionist.
 */
export function transformPatientDataForAPI(patientData: PatientData) {
  return {
    patientDetails: patientData.patientDetails,
    presentingComplaints: patientData.presentingComplaints,
    medicalHistory: patientData.medicalHistory,
    drugHistory: patientData.drugHistory,
  };
}