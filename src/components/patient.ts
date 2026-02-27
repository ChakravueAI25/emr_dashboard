// Insurance types matching IndividualBillingView
export type InsuranceType = 'CGHS' | 'SGHS' | 'PRIVATE' | null;

export interface PatientInsurance {
  hasInsurance: boolean;
  insuranceType: InsuranceType;
  companyName: string;
  tpaName: string;
  policyNumber?: string;
  validTill?: string;
}

export interface PatientDetail {
  name: string;
  registrationId: string;
  age: string;
  sex: string;
  profilePic: string | null;
  password: string;
  phone: string;
  email: string;
  address: string;
  bloodType: string;
  allergies: string;
  emergencyContact: string;
  // Insurance details
  insurance?: PatientInsurance;
}

export interface Complaint {
  id: string;
  complaint: string;
  duration: string;
  durationUnit?: 'hours' | 'days' | 'weeks' | 'months' | 'years';
  eye?: 'left' | 'right' | 'both';
  // Per-complaint factors (Task 1: complaint-scoped, not global)
  aggravatingFactors?: string[];
  relievingFactors?: string[];
}

export interface PresentingComplaints {
  complaints: Complaint[];
  history: {
    severity: string;
    onset: string;
    aggravating: string;
    relieving: string;
    associated: string;
  };
  timeline: { id: string; text: string }[];
}

export interface MedicalHistoryItem {
  id: string;
  condition: string;
  year: string;
  status: string;
}

export interface SurgicalHistoryItem {
  id: string;
  procedure: string;
  year: string;
  type: string;
}

export interface MedicalHistory {
  medical: MedicalHistoryItem[];
  surgical: SurgicalHistoryItem[];
  familyHistory: string;
  socialHistory: {
    smoking: string;
    alcohol: string;
    exercise: string;
  };
}

export interface DrugAllergy {
  id: string;
  drug: string;
  reaction: string;
  severity: 'Mild' | 'Moderate' | 'Severe';
}

export interface CurrentMedication {
  id: string;
  name: string;
  dosage: string;
  indication: string;
  started: string;
}

export interface DrugHistory {
  allergies: DrugAllergy[];
  currentMeds: CurrentMedication[];
  compliance: {
    adherenceRate: string;
    missedDoses: string;
    lastRefill: string;
  };
  previousMeds: string;
}

export interface VisionData {
  unaided: { rightEye: string; leftEye: string };
  withGlass: { rightEye: string; leftEye: string };
  withPinhole: { rightEye: string; leftEye: string };
  bestCorrected: { rightEye: string; leftEye: string };
}

export interface RefractionData {
  sph: string;
  cyl: string;
  axis: string;
}

export interface GlassData extends RefractionData {
  prism: string;
  va: string;
  nv: string;
}

export interface OptometryData {
  vision: VisionData;
  autoRefraction: {
    ur: RefractionData;
    dr: RefractionData;
  };
  finalGlasses: {
    rightEye: GlassData;
    leftEye: GlassData;
    add: string;
    mDist: string;
  };
  currentGlasses: {
    rightEye: { sph: string; cyl: string; axis: string; va: string; add: string };
    leftEye: { sph: string; cyl: string; axis: string; va: string; add: string };
  };
  oldGlass: {
    rightEye: { sph: string; cyl: string; axis: string; va: string; add: string };
    leftEye: { sph: string; cyl: string; axis: string; va: string; add: string };
  };
  additional: {
    gpAdvisedFor: string;
    gpAdvisedBy: string;
    useOfGlass: string;
    product: string;
  };
}

export interface IOPReading {
  time: string;
  method: string;
  od: string;
  os: string;
  pachyOd?: string;
  pachyOs?: string;
  remarks?: string;
}

export interface IOPData {
  iopReadings: IOPReading[];
  chartData?: Array<Record<string, any>>;
}

export interface OCTFindingsEye {
  cmt?: string;
  rnfl?: string;
  gcl?: string;
  findings?: string;
}

export interface OphthalmicInvestigationsData {
  oct?: { od: OCTFindingsEye; os: OCTFindingsEye; date?: string; performedBy?: string };
  ffa?: Record<string, any>;
  hvf?: Record<string, any>;
  biometry?: {
    od?: { [key: string]: string };
    os?: { [key: string]: string };
  };
  pachymetry?: {
    od?: string;
    os?: string;
    image?: string; // Base64 encoded file
    fileName?: string;
  };
  colourVision?: {
    od?: string;
    os?: string;
    image?: string; // Base64 encoded file
    fileName?: string;
  };
  additionalImages?: string;
  otherInvestigations?: Array<Record<string, any>>;
}

export interface LabTest {
  name: string;
  value: string;
  unit?: string;
  normalRange?: string;
  status?: 'normal' | 'abnormal' | 'borderline' | string;
}

export interface SystemicInvestigationsData {
  bloodTests: LabTest[];
  lipidProfile: LabTest[];
  renalFunction: LabTest[];
  liverFunction: LabTest[];
  otherTests?: Array<Record<string, any>>;
  vitals?: {
    bp?: { value: string; unit: string; notes: string };
    rp?: { value: string; unit: string; notes: string };
    rbs?: { value: string; unit: string; notes: string };
    pulse?: { value: string; unit: string; notes: string };
  };
}

// Doctor-specific interfaces
export interface OphthalmologistExaminationData {
  visualAcuity?: string; // e.g., "OD: 6/6 | OS: 6/9"
  lensOD?: string;
  lensOS?: string;
  remarks?: string;
  // allow additional free-form fields from UI
  [key: string]: any;
}

export interface SpecialExaminationItem {
  id: string;
  name: string;
  status?: string; // e.g., 'Done', 'Examined', ''
  notes?: string;
}

// Special examinations are stored as a permissive dictionary to match
// the UI which stores multiple named sub-objects (eg. indirectOphthalmoscopy,
// gonioscopy, slitLamp, pachymetry, specularMicroscopy, otherExams, etc.).
// Keep this permissive so doctor payloads can evolve without breaking types.
export interface SpecialExaminationData {
  [key: string]: any;
}

export interface PrescribedMedicationItem {
  id: string;
  name: string;
  frequency?: string; // e.g., 'Once daily'
  notes?: string;
}

export interface MedicationPrescribedData {
  items: PrescribedMedicationItem[];
}

export interface InvestigationsSurgeriesData {
  investigations: string[]; // short labels or ids
  surgeries: string[]; // short labels or ids
  nextAppointmentDate?: string; // optional date string
  [key: string]: any;
}

// ... (Interfaces for all other cards would go here)

export interface VitalSignsData {
  temperature: { value: string; unit: string; time: string };
  pulse: { value: string; unit: string };
  respiratoryRate: { value: string; unit: string };
  bloodPressure: { systolic: string; diastolic: string; unit: string };
}

/**
 * The master interface for all patient data, combining all individual card data structures.
 */
export interface PatientData {
  patientDetails: PatientDetail;
  presentingComplaints: PresentingComplaints;
  medicalHistory: MedicalHistory;
  drugHistory: DrugHistory;
  vitalSigns?: VitalSignsData;
  optometry: OptometryData;
  iop?: IOPData;
  ophthalmicInvestigations?: OphthalmicInvestigationsData;
  systemicInvestigations?: SystemicInvestigationsData;
  // Doctor-entered sections
  ophthalmologistExamination?: OphthalmologistExaminationData;
  specialExamination?: SpecialExaminationData;
  medicationPrescribed?: MedicationPrescribedData;
  investigationsSurgeries?: InvestigationsSurgeriesData;
  // iop: IOPData;
  // ophthalmicInvestigations: OphthalmicInvestigationsData;
  // systemicInvestigations: SystemicInvestigationsData;
  // ophthalmologistExamination: OphthalmologistExaminationData;
  // specialExamination: SpecialExaminationData;
  // medicationPrescribed: MedicationPrescribedData;
  // investigationsSurgeries: InvestigationsSurgeriesData;
}

export type UserRole = 'receptionist' | 'opd' | 'doctor' | 'patient' | 'admin';

export const ROLES = {
  RECEPTIONIST: 'receptionist' as UserRole,
  OPD: 'opd' as UserRole,
  DOCTOR: 'doctor' as UserRole,
  PATIENT: 'patient' as UserRole,
  ADMIN: 'admin' as UserRole,
};

export const CARD_ACCESS: Record<UserRole, string[]> = {
  receptionist: ['PatientDetailsCard', 'VitalSignsCard', 'AppointmentsCard', 'MedicationsCard'],
  opd: [
    'PatientDetailsCard', 'VitalSignsCard', 'AppointmentsCard', 'MedicationsCard',
    'OptometryCard', 'IOPCard', 'OphthalmicInvestigationsCard', 'SystemicInvestigationsCard'
  ],
  doctor: [
    'PatientDetailsCard', 'VitalSignsCard', 'AppointmentsCard', 'MedicationsCard',
    'OptometryCard', 'IOPCard', 'OphthalmicInvestigationsCard', 'SystemicInvestigationsCard',
    'OphthalmologistExaminationCard', 'SpecialExaminationCard', 'MedicationPrescribedCard', 'InvestigationsSurgeriesCard'
  ],
  patient: [
    'PatientDetailsCard', 'VitalSignsCard', 'AppointmentsCard', 'MedicationsCard',
    'OptometryCard', 'IOPCard', 'OphthalmicInvestigationsCard', 'SystemicInvestigationsCard',
    'OphthalmologistExaminationCard', 'SpecialExaminationCard', 'MedicationPrescribedCard', 'InvestigationsSurgeriesCard'
  ],
  admin: [
    'PatientDetailsCard', 'VitalSignsCard', 'AppointmentsCard', 'MedicationsCard',
    'OptometryCard', 'IOPCard', 'OphthalmicInvestigationsCard', 'SystemicInvestigationsCard',
    'OphthalmologistExaminationCard', 'SpecialExaminationCard', 'MedicationPrescribedCard', 'InvestigationsSurgeriesCard'
  ]
};