import { PatientData } from './components/patient';

/**
 * Transforms the frontend's comprehensive PatientData into the specific
 * format required by the /patients/new API endpoint.
 */
export function transformPatientDataForAPI(patientData: PatientData) {
  // Validation for required fields before sending
  const { name, password, phone } = patientData.patientDetails;
  if (!name || !password || !phone) {
    throw new Error('Name, Password, and Phone are required.');
  }

  // Backend now accepts the same structure as the frontend state
  return patientData;
}