/// <reference types="vite/client" />

/**
 * API Configuration
 * Centralized API endpoint management for easy deployment across environments
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) ||'https://admin.chakravue.co.in';

export { API_BASE_URL };

export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH_LOGIN: `${API_BASE_URL}/auth/login`,
  USERS_NEW: `${API_BASE_URL}/users/new`,
  USERS_ALL: `${API_BASE_URL}/users/all`,
  USERS_BY_ROLE: (role: string) => `${API_BASE_URL}/users/all?role=${encodeURIComponent(role)}`,
  
  // Telemedicine & Slit Lamp
  SLIT_LAMP_UPLOAD: `${API_BASE_URL}/slit-lamp/upload`,
  SLIT_LAMP_PATIENT_IMAGES: (id: string) => `${API_BASE_URL}/slit-lamp/patient/${id}`,

  // Patient endpoints
  PATIENTS_NEW: `${API_BASE_URL}/patients/new`,
  PATIENTS_ALL: `${API_BASE_URL}/patients/all`,
  PATIENTS_SEARCH: `${API_BASE_URL}/patients/search`,
  PATIENT: (registrationId: string) => `${API_BASE_URL}/patients/${encodeURIComponent(registrationId)}`,
  PATIENT_VISITS: (registrationId: string) => `${API_BASE_URL}/patients/${encodeURIComponent(registrationId)}/visits`,
  PATIENT_VISIT_SAVE: (registrationId: string) => `${API_BASE_URL}/patients/${encodeURIComponent(registrationId)}/visit`,
  PATIENT_DOCUMENTS: (registrationId: string) => `${API_BASE_URL}/patients/${encodeURIComponent(registrationId)}/documents`,
  PATIENT_DOCUMENT_DOWNLOAD: (registrationId: string, docId: string, inline: boolean = false) => 
    `${API_BASE_URL}/patients/${encodeURIComponent(registrationId)}/documents/${encodeURIComponent(docId)}/download${inline ? '?inline=1' : ''}`,

  // Queue endpoints
  QUEUE_RECEPTION: `${API_BASE_URL}/queue/reception`,
  QUEUE_RECEPTION_ITEM: (queueId: string) => `${API_BASE_URL}/queue/reception/${encodeURIComponent(queueId)}`,
  QUEUE_OPD: `${API_BASE_URL}/queue/opd`,
  QUEUE_OPD_ITEM: (queueId: string) => `${API_BASE_URL}/queue/opd/${encodeURIComponent(queueId)}`,
  QUEUE_DOCTOR: `${API_BASE_URL}/queue/doctor`,
  QUEUE_DOCTOR_ITEM: (queueId: string) => `${API_BASE_URL}/queue/doctor/${encodeURIComponent(queueId)}`,
  QUEUE_RECALL_TO_RECEPTION: `${API_BASE_URL}/queue/recall/to-reception`,
  QUEUE_RECALL_TO_OPD: `${API_BASE_URL}/queue/recall/to-opd`,

  // Appointments endpoints
  APPOINTMENTS: `${API_BASE_URL}/appointments`,
  APPOINTMENT: (appointmentId: string) => `${API_BASE_URL}/appointments/${encodeURIComponent(appointmentId)}`,

  // Evaluation endpoints
  EVALUATE_READING: `${API_BASE_URL}/evaluate-reading`,

  // Analytics endpoints
  ANALYTICS_IOP_TREND: (registrationId: string) => `${API_BASE_URL}/api/analytics/patient/${encodeURIComponent(registrationId)}/iop-trend`,
  ANALYTICS_VISUAL_ACUITY: (registrationId: string) => `${API_BASE_URL}/api/analytics/patient/${encodeURIComponent(registrationId)}/visual-acuity`,
  ANALYTICS_VISITS: (registrationId: string) => `${API_BASE_URL}/api/analytics/patient/${encodeURIComponent(registrationId)}/visits`,
  ANALYTICS_IOP_DISTRIBUTION: (registrationId: string) => `${API_BASE_URL}/api/analytics/patient/${encodeURIComponent(registrationId)}/iop-distribution`,
  ANALYTICS_PROCEDURES: (registrationId: string) => `${API_BASE_URL}/api/analytics/patient/${encodeURIComponent(registrationId)}/procedures`,

  // Billing endpoints
  BILLING_SUMMARY: (registrationId: string) => `${API_BASE_URL}/api/billing/patient/${encodeURIComponent(registrationId)}/summary`,
  BILLING_INSURANCE: (registrationId: string) => `${API_BASE_URL}/api/billing/patient/${encodeURIComponent(registrationId)}/insurance`,
  BILLING_INVOICES: (registrationId: string) => `${API_BASE_URL}/api/billing/patient/${encodeURIComponent(registrationId)}/invoices`,
  BILLING_PAYMENTS: (registrationId: string) => `${API_BASE_URL}/api/billing/patient/${encodeURIComponent(registrationId)}/payments`,
  BILLING_CLAIMS: (registrationId: string) => `${API_BASE_URL}/api/billing/patient/${encodeURIComponent(registrationId)}/claims`,

  // Pharmacy endpoints
  PHARMACY: {
    GET_MEDICINES: `${API_BASE_URL}/pharmacy/medicines`,
    GET_MEDICINE: (medicineId: string) => `${API_BASE_URL}/pharmacy/medicines/${encodeURIComponent(medicineId)}`,
    CREATE_MEDICINE: `${API_BASE_URL}/pharmacy/medicines`,
    UPDATE_MEDICINE: (medicineId: string) => `${API_BASE_URL}/pharmacy/medicines/${encodeURIComponent(medicineId)}`,
    UPDATE_STOCK: (medicineId: string) => `${API_BASE_URL}/pharmacy/medicines/${encodeURIComponent(medicineId)}/stock`,
    CREATE_BILL: `${API_BASE_URL}/pharmacy/billing`,
    GET_BILL: (billId: string) => `${API_BASE_URL}/pharmacy/billing/${encodeURIComponent(billId)}`,
    GET_PATIENT_BILLS: (registrationId: string) => `${API_BASE_URL}/pharmacy/billing/patient/${encodeURIComponent(registrationId)}`,
    STOCK_REPORT: `${API_BASE_URL}/pharmacy/stock-report`,
    INITIALIZE_SAMPLE: `${API_BASE_URL}/pharmacy/initialize-sample-data`,
  },

  // Billing Surgery endpoints
  BILLING_SURGERY: {
    GET_BILLS: (registrationId: string) => `${API_BASE_URL}/api/billing/patient/${encodeURIComponent(registrationId)}/surgery-bills`,
    CREATE_INITIAL: (registrationId: string) => `${API_BASE_URL}/api/billing/patient/${encodeURIComponent(registrationId)}/surgery-bills/initial`,
    CREATE_FINAL: (registrationId: string) => `${API_BASE_URL}/api/billing/patient/${encodeURIComponent(registrationId)}/surgery-bills/final`,
  },

  // Coupons endpoints
  COUPONS: {
    GET_QUOTA: (user: string) => `${API_BASE_URL}/api/coupons/quota/${encodeURIComponent(user)}`,
    REFRESH: `${API_BASE_URL}/api/coupons/refresh`,
  },

  // Billing Dashboard
  BILLING_DASHBOARD: {
    STATS: `${API_BASE_URL}/api/billing/dashboard/stats`,
  },

  // Surgery Packages endpoints
  SURGERY_PACKAGES: {
    CREATE: `${API_BASE_URL}/api/surgery-packages`,
    GET_ALL: `${API_BASE_URL}/api/surgery-packages`,
    GET_ONE: (packageId: string) => `${API_BASE_URL}/api/surgery-packages/${encodeURIComponent(packageId)}`,
    UPDATE: (packageId: string) => `${API_BASE_URL}/api/surgery-packages/${encodeURIComponent(packageId)}`,
    DELETE: (packageId: string) => `${API_BASE_URL}/api/surgery-packages/${encodeURIComponent(packageId)}`,
    SAVE_FROM_BILL: `${API_BASE_URL}/api/save-surgery-package`,
    GET_RECENT: `${API_BASE_URL}/api/surgery-packages/recent`,
    SEARCH: `${API_BASE_URL}/api/surgery-packages/search`,
  },

  // Organization endpoints
  ORGANIZATION: {
    ALL: `${API_BASE_URL}/master/all-organizations`,
    LOGIN: `${API_BASE_URL}/organization-login`,
  },

  // SaaS endpoints (deprecated - kept for backward compatibility)
  SAAS: {
    SIGNUP: `${API_BASE_URL}/signup`,
    PROCESS_PAYMENT: `${API_BASE_URL}/process-payment`,
    ADD_USER: `${API_BASE_URL}/add-user`,
  },

  // Master Admin
  MASTER_ADMIN: {
    ALL_ORGANIZATIONS: `${API_BASE_URL}/master/all-organizations`,
    ORG_USERS: (orgId: string) => `${API_BASE_URL}/organization/${encodeURIComponent(orgId)}/users`,
  },

  // Admin Data Management
  ADMIN: {
    HOSPITALS: `${API_BASE_URL}/admin/hospitals`,
    HOSPITAL_PATIENTS: (hospitalId: string) => `${API_BASE_URL}/admin/hospital/${encodeURIComponent(hospitalId)}/patients`,
    HOSPITAL_STATS: (hospitalId: string) => `${API_BASE_URL}/admin/hospital/${encodeURIComponent(hospitalId)}/stats`,
    DELETE_PATIENT: (hospitalId: string, patientId: string) => `${API_BASE_URL}/admin/hospital/${encodeURIComponent(hospitalId)}/patient/${encodeURIComponent(patientId)}`,
  },
};

export default API_ENDPOINTS;
