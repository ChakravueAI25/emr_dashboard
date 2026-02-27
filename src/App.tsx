// ...existing imports...

// Place this inside the App component, after all hooks are defined
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { produce } from 'immer'
import API_ENDPOINTS from './config/api';
import { Sidebar } from './components/Sidebar';
import { EditableText } from './components/EditableText';
import Navbar from './components/Navbar';

import { ReceptionistDashboardView } from './components/ReceptionistDashboardView';
import { ReceptionistProfileView } from './components/ReceptionistProfileView';

import { AnalyticsView } from './components/AnalyticsView';
import { BillingView } from './components/BillingView';
import { AlertModal, showAlert } from './components/ui/AlertModal';
import { BillingDashboardView } from './components/BillingDashboardView';
import { IndividualBillingView } from './components/IndividualBillingView';
import { UserLoginView } from './components/UserLoginView';
import { DocumentsView } from './components/DocumentsView';
import { NotificationsView } from './components/NotificationsView';
import { DashboardView, AppSettings } from './components/DashboardView';
import { AppointmentBookingView } from './components/AppointmentBookingView';
import { AppointmentQueueView } from './components/AppointmentQueueView';
import { ReceptionQueueView } from './components/ReceptionQueueView';
import { ReceptionistPortal } from './components/ReceptionistPortal';
import { OpdPortal } from './components/OpdPortal';
import { DoctorPortal } from './components/DoctorPortal';
import { OperationsCenter } from './components/OperationsCenter';
import { PharmacyBillingView } from './components/PharmacyBillingView';
import { MedicineManagementView } from './components/MedicineManagementView';
import { PatientHistoryView } from './components/PatientHistoryView';
import { DataRepairView } from './components/DataRepairView';
import { ProfileSettings } from './components/ProfileSettings';
import { DeviceInfoDisplay } from './components/DeviceInfoDisplay';
import { PaymentSetupView } from './components/PaymentSetupView';
import { OrganizationLoginView } from './components/OrganizationLoginView';
import { AdminDashboardView } from './components/AdminDashboardView';
import { AdminDataManagementView } from './components/AdminDataManagementView';
import { TelemedicineView } from './components/TelemedicineView';
import { ArrowLeft, Search, Bell, Settings, User, Save, UserPlus, CalendarPlus, Layers, Eye, Stethoscope, CheckCircle, ClipboardList, UserCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { ImageWithFallback } from './components/figma/ImageWithFallback';
import { PatientData, UserRole, ROLES, CARD_ACCESS } from './components/patient';
import { transformPatientDataForAPI } from './components/apiUtils';
import { PatientDashboard } from './components/dashboard/PatientDashboard';
import { SearchOverlay } from './components/SearchOverlay';

// A default empty state for a new patient
const defaultPatientData: PatientData = {
  patientDetails: {
    name: '', registrationId: 'Not Assigned', age: '', sex: '', profilePic: null,
    password: '', phone: '', email: '', address: '', bloodType: '', allergies: '', emergencyContact: ''
  },
  presentingComplaints: {
    complaints: [{ id: '1', complaint: '', duration: '' }],
    history: { severity: '', onset: '', aggravating: '', relieving: '', associated: '' },
    timeline: []
  },
  medicalHistory: {
    medical: [], surgical: [], familyHistory: '',
    socialHistory: { smoking: '', alcohol: '', exercise: '' }
  },
  drugHistory: {
    allergies: [], currentMeds: [],
    compliance: { adherenceRate: '', missedDoses: '', lastRefill: '' },
    previousMeds: ''
  },
  optometry: {
    vision: { unaided: { rightEye: '', leftEye: '' }, withGlass: { rightEye: '', leftEye: '' }, withPinhole: { rightEye: '', leftEye: '' }, bestCorrected: { rightEye: '', leftEye: '' } },
    autoRefraction: { ur: { sph: '', cyl: '', axis: '' }, dr: { sph: '', cyl: '', axis: '' } },
    finalGlasses: { rightEye: { sph: '', cyl: '', axis: '', prism: '', va: '', nv: '' }, leftEye: { sph: '', cyl: '', axis: '', prism: '', va: '', nv: '' }, add: '', mDist: '' },
    currentGlasses: { rightEye: { sph: '', cyl: '', axis: '', va: '', add: '' }, leftEye: { sph: '', cyl: '', axis: '', va: '', add: '' } },
    oldGlass: { rightEye: { sph: '', cyl: '', axis: '', va: '', add: '' }, leftEye: { sph: '', cyl: '', axis: '', va: '', add: '' } },
    additional: { gpAdvisedFor: '', gpAdvisedBy: '', useOfGlass: '', product: '' }
  },
  // Initialize other card data structures here as they are created
};

// Sample data for an existing patient
const existingPatientData: PatientData = {
  patientDetails: {
    name: 'John Doe', registrationId: 'REG-2025-001234', age: '45', sex: 'Male', profilePic: null,
    password: 'securepassword123', phone: '+1 (555) 123-4567', email: 'john.doe@email.com',
    address: '123 Main St, City, State 12345', bloodType: 'O+', allergies: 'Penicillin, Peanuts',
    emergencyContact: 'Jane Doe - +1 (555) 987-6543'
  },
  presentingComplaints: {
    complaints: [
      { id: '1', complaint: 'Chest pain radiating to left arm', duration: '2 hours' },
      { id: '2', complaint: 'Shortness of breath', duration: '1 hour' }
    ],
    history: {
      severity: 'Moderate to Severe', onset: 'Sudden onset while at rest', aggravating: 'Deep breathing, movement',
      relieving: 'Rest, sitting upright', associated: 'Sweating, nausea'
    },
    timeline: [
      { id: 't1', text: '2 hours ago - Onset of chest pain' },
      { id: 't2', text: '1.5 hours ago - Pain intensified' },
    ]
  },
  medicalHistory: {
    medical: [
      { id: 'mh1', condition: 'Type 2 Diabetes', year: '2018', status: 'Active' },
      { id: 'mh2', condition: 'Hypertension', year: '2015', status: 'Active' },
    ],
    surgical: [
      { id: 'sh1', procedure: 'Appendectomy', year: '2010', type: 'Emergency' },
    ],
    familyHistory: 'Father: CAD, Mother: Type 2 Diabetes',
    socialHistory: { smoking: 'Ex-smoker (quit 2015)', alcohol: 'Occasional', exercise: 'Sedentary lifestyle' }
  },
  drugHistory: {
    allergies: [
      { id: 'da1', drug: 'Penicillin', reaction: 'Rash, hives', severity: 'Moderate' },
      { id: 'da2', drug: 'Sulfa drugs', reaction: 'Anaphylaxis', severity: 'Severe' },
    ],
    currentMeds: [
      { id: 'cm1', name: 'Metformin 500mg', dosage: '2x daily', indication: 'Type 2 Diabetes', started: 'Jan 2018' },
    ],
    compliance: { adherenceRate: '85%', missedDoses: '4', lastRefill: 'Oct 5, 2025' },
    previousMeds: 'Glibenclamide 5mg - Stopped Aug 2020'
  },
  optometry: {
    vision: { unaided: { rightEye: '6/24p', leftEye: '6/24p' }, withGlass: { rightEye: '6/6', leftEye: '6/6' }, withPinhole: { rightEye: '6/6', leftEye: '6/6' }, bestCorrected: { rightEye: '6/6', leftEye: '6/6' } },
    autoRefraction: { ur: { sph: '*', cyl: '', axis: '' }, dr: { sph: '*', cyl: '', axis: '' } },
    finalGlasses: { rightEye: { sph: '+2.00', cyl: '', axis: '', prism: '', va: '6/6', nv: '' }, leftEye: { sph: '+2.50', cyl: '', axis: '', prism: '', va: '6/6', nv: '' }, add: '+1.75', mDist: '' },
    currentGlasses: { rightEye: { sph: '+2.00', cyl: '', axis: '', va: '6/6', add: '+1.75' }, leftEye: { sph: '+2.50', cyl: '', axis: '', va: '6/6', add: '+1.75' } },
    oldGlass: { rightEye: { sph: '+2.00', cyl: '', axis: '', va: '6/6', add: '+1.75' }, leftEye: { sph: '+2.50', cyl: '', axis: '', va: '6/6', add: '+1.75' } },
    additional: { gpAdvisedFor: '', gpAdvisedBy: '', useOfGlass: '', product: '' }
  },
  // ... other patient data sections
};

export default function App() {
  const [dashboardTitle, setDashboardTitle] = useState('Chakravue AI');
  const [dashboardSubtitle, setDashboardSubtitle] = useState('');
  
  // Persisted State Initialization
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => localStorage.getItem('is_authenticated') === 'true');
  const [userRole, setUserRole] = useState<UserRole | null>(() => (localStorage.getItem('user_role') as UserRole) || null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(() => localStorage.getItem('current_username'));

  // Default to the login view, or restore from storage
  const [currentView, setCurrentView] = useState<'dashboard' | 'analytics' | 'billing' | 'billing-dashboard' | 'individual-billing' | 'login' | 'documents' | 'notifications' | 'settings' | 'profile-settings' | 'patients' | 'appointments' | 'appointment-queue' | 'reception-queue' | 'opd-queue' | 'doctor-queue' | 'patient-history' | 'data-repair' | 'pharmacy-billing' | 'medicine-management' | 'payment-setup' | 'organization-login' | 'admin-dashboard' | 'admin-data-management' | 'telemedicine' | 'reception-patient-view'>(
    () => (localStorage.getItem('current_view') as any) || 'login'
  );

  // Persistence Effect
  useEffect(() => {
    localStorage.setItem('is_authenticated', String(isAuthenticated));
    if (userRole) localStorage.setItem('user_role', userRole);
    if (currentUsername) localStorage.setItem('current_username', currentUsername);
    localStorage.setItem('current_view', currentView);
  }, [isAuthenticated, userRole, currentUsername, currentView]);

  
  // Debug: log view changes to trace why receptionist profile nav isn't showing
  useEffect(() => {
    console.log('[DEBUG] currentView:', currentView, 'userRole:', userRole);
  }, [currentView, userRole]);

  const isFullScreen = (currentView === 'login' && !isAuthenticated) || currentView === 'organization-login' || currentView === 'payment-setup';

  const [isNewPatientMode, setIsNewPatientMode] = useState(false);
  // Do not preload a patient before authentication
  const [activePatientData, setActivePatientData] = useState<PatientData | null>(null);
  const [newVisit, setNewVisit] = useState(false);  // Flag: true = fresh visit, false = editing existing
  // Track last saved patient registration ID so receptionist can upload documents for that patient
  const [lastSavedRegistrationId, setLastSavedRegistrationId] = useState<string | null>(null);
  // Track patient data passed from appointment booking for pre-filling
  const [lastAppointmentPatientData, setLastAppointmentPatientData] = useState<any>(null);
  // Track if currently viewed patient is discharged (read-only mode)
  const [isPatientDischarged, setIsPatientDischarged] = useState(false);
  // Header show/hide on scroll
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);
  const [notificationCount, setNotificationCount] = useState(0);

  // Visit Navigation State
  const [visitIndex, setVisitIndex] = useState(0); // 0 = current
  const [totalVisits, setTotalVisits] = useState(1);
  const [patientHistory, setPatientHistory] = useState<any[]>([]);
  const [currentVisitDraft, setCurrentVisitDraft] = useState<PatientData | null>(null);

  // Helper to map history to patient data
  const mapHistoryToPatientData = (visit: any, currentDetails: any): PatientData => {
    const stages = visit.stages || {};
    const rd = stages.reception?.data || {};
    const od = stages.opd?.data || {};
    const dd = stages.doctor?.data || {};

    // Construct data object merging history with defaults
    return {
      patientDetails: currentDetails || { name: '', registrationId: 'History', age: '', sex: '', phone: '', email: '', address: '' },
      presentingComplaints: rd.presentingComplaints || { complaints: [], history: {}, timeline: [] },
      medicalHistory: rd.medicalHistory || { medical: [], surgical: [], familyHistory: '', socialHistory: {} },
      drugHistory: rd.drugHistory || { allergies: [], currentMeds: [], compliance: {}, previousMeds: '' },
      vitalSigns: { // Defaults
        temperature: { value: '', unit: 'C', time: '' },
        pulse: { value: '', unit: 'bpm' },
        respiratoryRate: { value: '', unit: 'breaths/min' },
        bloodPressure: { systolic: '', diastolic: '', unit: 'mmHg' }
      },
      optometry: od.optometry || {},
      iop: od.iop || {},
      ophthalmicInvestigations: od.ophthalmicInvestigations || {},
      systemicInvestigations: od.systemicInvestigations || {},
      ophthalmologistExamination: dd.ophthalmologistExamination || {},
      specialExamination: dd.specialExamination || {},
      medicationPrescribed: dd.medicationPrescribed || {},
      investigationsSurgeries: dd.investigationsSurgeries || {},
      additional: {}
    } as any; // Cast as any to avoid strict interface matching for minor missing fields
  };

  // --- NAVIGATION HANDLERS (Draft Saving Logic) ---
  const handlePrevVisit = () => {
    // If we are currently at the 'Current' visit (0), save the draft (snapshot) before moving back
    if (visitIndex === 0 && activePatientData) {
      // Deep clone to ensure we detach from state
      const draft = JSON.parse(JSON.stringify(activePatientData));
      setCurrentVisitDraft(draft);
    }
    setVisitIndex(prev => Math.min(prev + 1, totalVisits - 1));
  };

  const handleNextVisit = () => {
    setVisitIndex(prev => Math.max(prev - 1, 0));
  };

  // Handle Time Travel (Viewing Past Visits)
  useEffect(() => {
    if (visitIndex === 0) {
      // Restoring Current Visit
      if (currentVisitDraft) {
        setActivePatientData(currentVisitDraft);
        // Do NOT clear draft immediately if you want to persist it across multiple back-and-forths, 
        // but typically we clear it to ensure fresh state if we load a new patient? 
        // No, keep it null so we don't accidentally restore old data later?
        // Actually, if we clear it, we rely on the user editing 'activePatientData' again.
        // It's safer to leave it or clear it. Let's clear it to signify "we have restored".
        setCurrentVisitDraft(null);
      }
    } else {
      // Load historical data
      const pastVisit = patientHistory[visitIndex - 1];
      if (pastVisit && activePatientData) {
        const historicalData = mapHistoryToPatientData(pastVisit, activePatientData.patientDetails);
        setActivePatientData(historicalData);
      }
    }
  }, [visitIndex]); // patientHistory dependency omitted to avoid loops, purely index based logic


  // Monitor notifications globally for the sidebar badge
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkNotifications = async () => {
      try {
        let count = 0;

        // Check for arrived patients in reception queue
        const queueRes = await fetch(API_ENDPOINTS.QUEUE_RECEPTION);
        if (queueRes.ok) {
          const queueData = await queueRes.json();
          const today = new Date().toISOString().split('T')[0];
          const waiting = (queueData.items || []).filter((p: any) => {
            const itemDate = p.appointmentDate || (p.receptionData && p.receptionData.appointmentDate);
            return (p.status === 'waiting' || p.status === 'arrived') && itemDate === today;
          }).length;
          count += waiting;
        }

        // Check for pending bills
        const billingRes = await fetch(API_ENDPOINTS.BILLING_DASHBOARD.STATS);
        if (billingRes.ok) {
          const billingData = await billingRes.json();
          if (billingData.status === 'success') {
            const pending = (billingData.records || []).filter((r: any) =>
              r.paymentStatus === 'unpaid' || r.paymentStatus === 'partially_paid'
            ).length;
            count += pending;
          }
        }

        setNotificationCount(count);
      } catch (e) {
        console.error('Notification check failed', e);
      }
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Sidebar resizing logic
  const [sidebarWidth, setSidebarWidth] = useState(370);
  const isResizing = useRef(false);

  const startResizing = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      // Limit width between 250px and 800px
      const newWidth = Math.max(250, Math.min(e.clientX, 800));
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  const updateActivePatientData = (path: (string | number)[], value: any) => {
    try {
      if (import.meta.env.MODE !== 'production') {
        // Lightweight debug to help trace surprising updates from cards like IOPCard
        // Keep concise to avoid huge logs
        // eslint-disable-next-line no-console
        console.debug('updateActivePatientData called', { path, value });
      }
      setActivePatientData(
        produce(draft => {
          if (!draft) return;

          // Walk the path, creating missing objects/arrays and mutating the draft in-place.
          // This implementation is defensive: if any intermediate container is a primitive
          // (e.g. a string) we'll coerce it to the expected container (object or array)
          // rather than trying to index into the primitive and throwing.
          let cur: any = draft;
          let parent: any = null;
          let parentKey: any = null;

          for (let i = 0; i < path.length; i++) {
            const key = path[i];
            const isLast = i === path.length - 1;
            const nextKey = path[i + 1];

            if (isLast) {
              if (import.meta.env.MODE !== 'production') {
                // eslint-disable-next-line no-console
                console.debug('  setting final key', { key, currentContainerType: Array.isArray(cur) ? 'array' : typeof cur, value });
              }
              // Ensure current container is writable
              if (cur === undefined || cur === null || typeof cur !== 'object') {
                // If parent exists, replace parent's slot with an object so we can set the final key.
                if (parent && parentKey !== null) {
                  parent[parentKey] = {};
                  cur = parent[parentKey];
                } else {
                  // Fallback: if somehow draft itself is corrupted, skip the update to avoid crashes.
                  // (this is defensive; such state corruption should be investigated separately)
                  return;
                }
              }

              cur[key as any] = value;
              break;
            }

            // If current container is unexpectedly a primitive, coerce it to an object/array on its parent
            if (cur === undefined || cur === null || typeof cur !== 'object') {
              if (parent && parentKey !== null) {
                parent[parentKey] = typeof key === 'number' ? [] : {};
                cur = parent[parentKey];
              } else {
                // If root is corrupted, abort the update to avoid throwing inside React
                return;
              }
            }

            const child = cur[key as any];
            if (child === undefined || child === null || typeof child !== 'object') {
              // create appropriate container for the next step
              cur[key as any] = typeof nextKey === 'number' ? [] : {};
            } else {
              // If existing value has wrong container type, coerce to expected container
              if (typeof nextKey === 'number' && !Array.isArray(cur[key as any])) {
                cur[key as any] = [];
              }
              if (typeof nextKey !== 'number' && Array.isArray(cur[key as any])) {
                cur[key as any] = {};
              }
            }

            parent = cur;
            parentKey = key;
            cur = cur[key as any];
          }
        })
      );
    } catch (e) {
      // Don't let an error during state update crash the whole app; log and show a friendly message.
      // eslint-disable-next-line no-console
      console.error('updateActivePatientData error for path', path, 'value', value, e);
      try {
        // If possible, show a small UI alert to the user
        showAlert('Failed to update field. See console for details.');
      } catch { }
    }
  };

  const [appSettings, setAppSettings] = useState<AppSettings>({
    fontSize: 'medium',
    theme: 'gold-vintage',
    accentColor: '#D4A574',
    glowIntensity: 'high',
    autoSave: true,
    notifications: true,
    language: 'en'
  });

  const handleNewPatientClick = () => {
    setIsNewPatientMode(true);
    setActivePatientData(defaultPatientData);
  };

  const handleSavePatientClick = async () => {
    if (!activePatientData) return;

    try {
      const apiData = transformPatientDataForAPI(activePatientData);

      const response = await fetch(API_ENDPOINTS.PATIENTS_NEW, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // FastAPI 422 errors have a `detail` array of objects
        if (Array.isArray(errorData.detail)) {
          const formattedError = errorData.detail.map((e: any) => `  - ${e.loc.join(' -> ')}: ${e.msg}`).join('\n');
          throw new Error(`Validation Error:\n${formattedError}`);
        } else {
          throw new Error(errorData.detail || 'Failed to save patient data.');
        }
      }

      const savedPatient = await response.json();

      showAlert(`Patient saved successfully! Registration ID: ${savedPatient.registrationId}`);

      // Keep registration id for uploading documents to this patient
      setLastSavedRegistrationId(savedPatient.registrationId || null);

      // Keep the receptionist's entered data loaded into the dashboard so the
      // first-row cards reflect what was saved. This lets OPD users (or the same
      // receptionist switching context) see the full row without data loss.
      setIsNewPatientMode(false);

    } catch (error: any) {
      showAlert(`Error: ${error.message}`);
    }
  };

  // Helper function to save visit data to patient history
  const saveVisitToHistory = async (patientName: string, registrationId: string, stage: 'reception' | 'opd' | 'doctor', stageData: any) => {
    try {
      // Only save to MongoDB when doctor stage is completed (end of patient journey)
      if (stage === 'doctor') {
        console.log('Saving complete patient record to MongoDB...');

        // Create a complete patient record to save
        const patientRecord = {
          registrationId: registrationId,
          name: stageData?.patientDetails?.name || patientName,
          demographics: {
            age: stageData?.patientDetails?.age || '',
            sex: stageData?.patientDetails?.sex || '',
            bloodType: stageData?.patientDetails?.bloodType || ''
          },
          contactInfo: {
            phone: stageData?.patientDetails?.phone || '',
            email: stageData?.patientDetails?.email || '',
            address: stageData?.patientDetails?.address || ''
          },
          visitData: {
            visitDate: new Date().toISOString(),
            reception: stageData?.presentingComplaints || {},
            opd: stageData?.optometry || {},
            doctor: {
              examination: stageData?.ophthalmologistExamination || {},
              prescription: stageData?.medicationPrescribed || {},
              specialExamination: stageData?.specialExamination || {},
              investigationsSurgeries: stageData?.investigationsSurgeries || {}
            }
          },
          lastUpdated: new Date().toISOString()
        };

        console.log('Patient record to save:', patientRecord);

        // Try to save using a simple PUT endpoint that upserts by registrationId
        try {
          const response = await fetch(API_ENDPOINTS.PATIENT(registrationId), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patientRecord)
          });

          console.log('MongoDB save response status:', response.status);

          if (response.ok) {
            const result = await response.json().catch(() => ({}));
            console.log('✓ Patient record saved to MongoDB:', result);

            // NEW: Archive this visit to history
            try {
              const visitPayload = {
                visitId: `${registrationId}-${new Date().getTime()}`,
                visitDate: new Date().toISOString(),
                stages: {
                  reception: {
                    data: {
                      patientDetails: stageData?.patientDetails,
                      presentingComplaints: stageData?.presentingComplaints || {},
                      medicalHistory: stageData?.medicalHistory || {},
                      drugHistory: stageData?.drugHistory || {}
                    }
                  },
                  opd: {
                    data: {
                      optometry: stageData?.optometry || {},
                      iop: stageData?.iop || {},
                      ophthalmicInvestigations: stageData?.ophthalmicInvestigations || {},
                      systemicInvestigations: stageData?.systemicInvestigations || {}
                    }
                  },
                  doctor: {
                    data: {
                      ophthalmologistExamination: stageData?.ophthalmologistExamination || {},
                      specialExamination: stageData?.specialExamination || {},
                      medicationPrescribed: stageData?.medicationPrescribed || {},
                      investigationsSurgeries: stageData?.investigationsSurgeries || {}
                    }
                  }
                }
              };

              await fetch(API_ENDPOINTS.PATIENT_VISIT_SAVE(registrationId), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(visitPayload)
              });
              console.log('✓ Visit history archived');
            } catch (histErr) {
              console.error('Failed to archive visit history:', histErr);
            }

          } else {
            const errText = await response.text();
            console.error('MongoDB save returned status', response.status, ':', errText);
            showAlert('Failed to save patient record to server. No browser fallback is active.');
            return;
          }
        } catch (fetchErr) {
          console.error('MongoDB backend unreachable:', fetchErr);
          showAlert('Failed to reach backend to save patient record. Data will NOT be stored locally.');
          return;
        }
      }
    } catch (err) {
      console.error('Error in saveVisitToHistory:', err);
      // Don't throw - just log, since data is already in localStorage
    }
  };

  const handleReceptionCompleteCheckIn = async () => {
    if (!activePatientData) return;

    try {
      const registrationId = activePatientData.patientDetails.registrationId;

      if (!registrationId || registrationId === 'Not Assigned') {
        showAlert('Cannot complete: Patient has no registration ID');
        return;
      }

      // Step 1: Save patient data to MongoDB (always)
      const apiData = transformPatientDataForAPI(activePatientData);
      console.log('Saving patient to backend:', registrationId, apiData);

      const patientResp = await fetch(API_ENDPOINTS.PATIENT(registrationId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...apiData, name: activePatientData.patientDetails.name, registrationId }),
      });

      if (!patientResp.ok) {
        const errorText = await patientResp.text();
        throw new Error(`Failed to save patient: ${patientResp.status} - ${errorText}`);
      }
      console.log('Patient saved successfully');

      // Step 2: Find the reception queue item for this patient and mark it done
      // IMPORTANT: Find the WAITING item, not a completed one from a previous visit
      let receptionQueueId = null;
      try {
        const queueResp = await fetch(API_ENDPOINTS.QUEUE_RECEPTION);
        if (queueResp.ok) {
          const queueData = await queueResp.json();
          const items = queueData.items || [];
          // Find the WAITING queue item for this patient (not a completed one)
          const matched = items.find((item: any) =>
            (item.status === 'waiting' || !item.status) &&
            (item.registrationId === registrationId ||
              (item.receptionData && item.receptionData.patientRegistrationId === registrationId))
          );
          if (matched) {
            receptionQueueId = matched.id || matched._id;
          }
        }
      } catch (e) {
        console.warn('Could not fetch reception queue:', e);
      }

      // Step 3: Update reception queue item (this creates OPD queue item automatically)
      if (receptionQueueId) {
        console.log('Updating reception queue item:', receptionQueueId);
        const updateResp = await fetch(API_ENDPOINTS.QUEUE_RECEPTION_ITEM(receptionQueueId), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'done',
            action: 'reception_done',
            receptionData: { ...apiData, notes: '' },
            completedAt: new Date().toISOString()
          })
        });

        if (!updateResp.ok) {
          const errorText = await updateResp.text();
          throw new Error(`Failed to update reception queue: ${updateResp.status} - ${errorText}`);
        }
        console.log('Reception queue updated, OPD queue created');
      } else {
        console.warn('No reception queue item found for patient, updating appointment directly');
        // Fallback: update appointment status directly if no queue item
        const apptsResp = await fetch(API_ENDPOINTS.APPOINTMENTS);
        if (apptsResp.ok) {
          const apptsJson = await apptsResp.json();
          const appts = apptsJson.appointments || [];
          const matched = appts.find((a: any) =>
            a.patientRegistrationId === registrationId ||
            a.patientName === activePatientData.patientDetails.name
          );
          if (matched) {
            const idToUpdate = matched._id || matched.id || matched.appointmentId;
            await fetch(API_ENDPOINTS.APPOINTMENT(idToUpdate), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'opd_pending' })
            });
          }
        }
      }

      setLastSavedRegistrationId(registrationId);

      // Step 4: Notify other components to refresh
      window.dispatchEvent(new CustomEvent('receptionQueueUpdated', { detail: { registrationId } }));

      // Step 5: Save to patient history
      saveVisitToHistory(
        activePatientData.patientDetails.name,
        registrationId,
        'reception',
        activePatientData
      );

      // Step 6: Clear active patient and reset mode
      setActivePatientData(null);
      setIsPatientDischarged(false);
      setIsNewPatientMode(false);

      // Step 7: Return to the Hub
      setCurrentView('login');

      showAlert(`Patient ${activePatientData.patientDetails.name} checked in and sent to OPD queue successfully!`);
    } catch (error: any) {
      console.error('Error completing reception:', error);
      showAlert(`Error: ${error.message}`);
    }
  };

  const handleOPDSave = async () => {
    if (!activePatientData) return;
    const regId = (activePatientData.patientDetails && activePatientData.patientDetails.registrationId && activePatientData.patientDetails.registrationId !== 'Not Assigned')
      ? activePatientData.patientDetails.registrationId
      : lastSavedRegistrationId;

    if (!regId) {
      showAlert('No registration ID available. Save patient first from Reception.');
      return;
    }

    try {
      // Step 1: Save OPD data to patient document
      const opdPayload = {
        optometry: activePatientData.optometry || {},
        iop: activePatientData.iop || {},
        ophthalmicInvestigations: activePatientData.ophthalmicInvestigations || {},
        systemicInvestigations: activePatientData.systemicInvestigations || {},
        lastStage: 'opd',
        lastUpdated: new Date().toISOString()
      };

      console.log('Saving OPD data for patient:', regId);
      const patientResp = await fetch(API_ENDPOINTS.PATIENT(regId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opdPayload)
      });

      if (!patientResp.ok) {
        const txt = await patientResp.text().catch(() => '');
        throw new Error(`Backend OPD save failed: ${patientResp.status} ${txt}`);
      }
      console.log('✓ OPD data saved to patient document');

      // Step 2: Find and update the OPD queue item (this will create doctor queue item)
      // IMPORTANT: Find the WAITING item, not a completed one from a previous visit
      let opdQueueId = null;
      try {
        const queueResp = await fetch(API_ENDPOINTS.QUEUE_OPD);
        if (queueResp.ok) {
          const queueData = await queueResp.json();
          const items = queueData.items || [];
          // Find the WAITING queue item for this patient (not a completed one)
          const matched = items.find((item: any) =>
            (item.status === 'waiting' || !item.status) &&
            (item.registrationId === regId ||
              (item.receptionData && item.receptionData.patientRegistrationId === regId))
          );
          if (matched) {
            opdQueueId = matched.id || matched._id;
          }
        }
      } catch (e) {
        console.warn('Could not fetch OPD queue:', e);
      }

      // Step 3: Update OPD queue item (this creates doctor queue item automatically)
      if (opdQueueId) {
        console.log('Updating OPD queue item:', opdQueueId);
        const updateResp = await fetch(API_ENDPOINTS.QUEUE_OPD_ITEM(opdQueueId), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'done',
            action: 'opd_done',
            opdData: opdPayload,
            completedAt: new Date().toISOString()
          })
        });

        if (!updateResp.ok) {
          const errorText = await updateResp.text();
          throw new Error(`Failed to update OPD queue: ${updateResp.status} - ${errorText}`);
        }
        console.log('✓ OPD queue updated, Doctor queue created');
      } else {
        console.warn('No OPD queue item found for this patient');
      }

      // Notify components to refresh from backend
      window.dispatchEvent(new CustomEvent('opdQueueUpdated', { detail: { registrationId: regId } }));
      window.dispatchEvent(new CustomEvent('doctorQueueUpdated', { detail: { registrationId: regId } }));

      // Clear dashboard
      setActivePatientData(null);

      showAlert('OPD examination completed and patient sent to Doctor queue.');
    } catch (err: any) {
      console.error('Error saving OPD data:', err);
      showAlert(`Error saving OPD data: ${err.message || err}`);
    }
  };

  const handleDoctorSave = async () => {
    if (!activePatientData) return;
    const regId = (activePatientData.patientDetails && activePatientData.patientDetails.registrationId && activePatientData.patientDetails.registrationId !== 'Not Assigned')
      ? activePatientData.patientDetails.registrationId
      : lastSavedRegistrationId;

    if (!regId) {
      showAlert('No registration ID available. Save patient first from Reception.');
      return;
    }

    try {
      // Step 1: Collect doctor data from activePatientData
      const doctorPayload: any = {
        doctorName: currentUsername || 'Unknown',
        ophthalmologistExam: (activePatientData as any).ophthalmologistExamination || {},
        prescription: (activePatientData as any).medicationPrescribed || {},
        specialExamination: (activePatientData as any).specialExamination || {},
        investigationsSurgeries: (activePatientData as any).investigationsSurgeries || {},
        diagnosis: (activePatientData as any).diagnosis || '',
        followUp: (activePatientData as any).followUp || '',
        lastStage: 'doctor',
        lastUpdated: new Date().toISOString()
      };

      // Step 2: Save doctor data to patient document
      console.log('Saving doctor data for patient:', regId);
      const patientResp = await fetch(API_ENDPOINTS.PATIENT(regId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doctorPayload)
      });

      if (!patientResp.ok) {
        const txt = await patientResp.text().catch(() => '');
        throw new Error(`Backend doctor save failed: ${patientResp.status} ${txt}`);
      }
      console.log('✓ Doctor data saved to patient document');

      // Step 3: Find and update the doctor queue item
      // IMPORTANT: Find the WAITING item, not a completed one from a previous visit
      let doctorQueueId = null;
      try {
        const queueResp = await fetch(API_ENDPOINTS.QUEUE_DOCTOR);
        if (queueResp.ok) {
          const queueData = await queueResp.json();
          const items = queueData.items || [];
          // Find the WAITING queue item for this patient (not a completed one)
          const matched = items.find((item: any) =>
            (item.status === 'waiting' || !item.status) &&
            (item.registrationId === regId ||
              (item.receptionData && item.receptionData.patientRegistrationId === regId))
          );
          if (matched) {
            doctorQueueId = matched.id || matched._id;
          }
        }
      } catch (e) {
        console.warn('Could not fetch doctor queue:', e);
      }

      // Step 4: Update doctor queue item (this marks patient as discharged)
      if (doctorQueueId) {
        console.log('Updating doctor queue item:', doctorQueueId);
        const updateResp = await fetch(API_ENDPOINTS.QUEUE_DOCTOR_ITEM(doctorQueueId), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'done',
            action: 'doctor_done',
            doctorData: doctorPayload,
            completedAt: new Date().toISOString()
          })
        });

        if (!updateResp.ok) {
          const errorText = await updateResp.text();
          throw new Error(`Failed to update doctor queue: ${updateResp.status} - ${errorText}`);
        }
        console.log('✓ Doctor queue updated, patient discharged');
      } else {
        console.warn('No doctor queue item found for this patient');
      }

      // Notify components to refresh
      window.dispatchEvent(new CustomEvent('doctorQueueUpdated', { detail: { registrationId: regId } }));

      // Clear dashboard
      setActivePatientData(null);

      showAlert('Patient examination completed and discharged.');
    } catch (err: any) {
      console.error('Error saving doctor data:', err);
      showAlert(`Error saving doctor data: ${err.message || err}`);
    }
  };

  // Log the user out and clear client-side session
  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setCurrentUsername(null);
    setActivePatientData(null);
    setIsNewPatientMode(false);
    setLastSavedRegistrationId(null);
    setCurrentView('login');
    
    try { 
      localStorage.removeItem('auth_token'); 
      localStorage.removeItem('user_role'); 
      localStorage.removeItem('is_authenticated');
      localStorage.removeItem('current_username');
      localStorage.removeItem('current_view');
    } catch { }
  };


  // Header show / hide on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Always show header near top
      if (currentScrollY < 10) {
        setShowHeader(true);
      }
      // Scrolling down → hide
      else if (currentScrollY > lastScrollY.current) {
        setShowHeader(false);
      }
      // Scrolling up → show
      else {
        setShowHeader(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);




  // Apply theme changes to CSS custom properties
  useEffect(() => {
    const root = document.documentElement;

    // Set accent color
    root.style.setProperty('--theme-accent', appSettings.accentColor);

    // Convert hex to RGB for use in rgba() functions
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
        : '212, 165, 116';
    };
    root.style.setProperty('--theme-accent-rgb', hexToRgb(appSettings.accentColor));

    // Set font size
    const fontSizeMap = {
      small: '10px',
      medium: '12px',
      large: '14px'
    };
    root.style.setProperty('--base-font-size', fontSizeMap[appSettings.fontSize]);

    // Set glow intensity
    const glowMap = {
      low: '0.1',
      medium: '0.15',
      high: '0.2'
    };
    root.style.setProperty('--glow-intensity', glowMap[appSettings.glowIntensity]);
  }, [appSettings]);

  // Search state (receptionist only)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ name?: string; registrationId?: string; email?: string; phone?: string; profilePic?: string; lastVisit?: string; created_at?: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const resultsContainerRef = useRef<HTMLDivElement | null>(null);

  // Map backend patient document to frontend PatientData (partial mapping)
  const mapDocToPatientData = (doc: any): PatientData => {
    const demographics = (doc && doc.demographics) || {};
    const contact = (doc && doc.contactInfo) || {};
    const history = (doc && doc.history) || {};
    return {
      patientDetails: {
        name: (doc && doc.name) || '',
        registrationId: (doc && doc.registrationId) || 'Not Assigned',
        age: String(demographics.age || ''),
        sex: demographics.sex || '',
        profilePic: null,
        password: '',
        phone: contact.phone || '',
        email: contact.email || '',
        address: contact.address || '',
        bloodType: demographics.bloodType || '',
        allergies: Array.isArray(doc?.allergies) ? doc.allergies.join(', ') : (doc?.allergies || ''),
        emergencyContact: (doc?.emergencyContact && (doc.emergencyContact.name || '')) || ''
      },
      presentingComplaints: (() => {
        const encounters = Array.isArray(doc?.encounters) ? doc.encounters : [];
        let complaints = [{ id: '1', complaint: '', duration: '' }];
        for (const enc of encounters) {
          if (enc && Array.isArray(enc.presentingComplaints) && enc.presentingComplaints.length) {
            complaints = enc.presentingComplaints.map((c: any, idx: number) => ({ id: c.id || String(idx + 1), complaint: c.complaint || '', duration: c.duration || '' }));
            break;
          }
        }
        return {
          complaints,
          history: { severity: history.severity || '', onset: history.onset || '', aggravating: history.aggravating || '', relieving: history.relieving || '', associated: history.associated || '' },
          timeline: []
        };
      })(),
      medicalHistory: {
        medical: history.medical || [],
        surgical: history.surgical || [],
        familyHistory: history.family || '',
        socialHistory: { smoking: '', alcohol: '', exercise: '' }
      },
      drugHistory: doc.drugHistory || { allergies: [], currentMeds: [], compliance: { adherenceRate: '', missedDoses: '', lastRefill: '' }, previousMeds: '' },
      optometry: (doc.optometry || { vision: { unaided: { rightEye: '', leftEye: '' }, withGlass: { rightEye: '', leftEye: '' }, withPinhole: { rightEye: '', leftEye: '' }, bestCorrected: { rightEye: '', leftEye: '' } }, autoRefraction: { ur: { sph: '', cyl: '', axis: '' }, dr: { sph: '', cyl: '', axis: '' } }, finalGlasses: { rightEye: { sph: '', cyl: '', axis: '', prism: '', va: '', nv: '' }, leftEye: { sph: '', cyl: '', axis: '', prism: '', va: '', nv: '' }, add: '', mDist: '' }, oldGlass: { rightEye: { sph: '', cyl: '', axis: '', va: '', add: '' }, leftEye: { sph: '', cyl: '', axis: '', va: '', add: '' } }, additional: { gpAdvisedFor: '', gpAdvisedBy: '', useOfGlass: '', product: '' } }) as any,
      iop: doc.iop || {} as any,
      ophthalmicInvestigations: doc.ophthalmicInvestigations || {} as any,
      systemicInvestigations: doc.systemic || {} as any,
      ophthalmologistExamination: doc.doctor || {} as any,
      specialExamination: {} as any,
      medicationPrescribed: { items: [] },
      investigationsSurgeries: { investigations: [], surgeries: [] }
    } as PatientData;
  };

  // Keyboard navigation for search results
  useEffect(() => {
    if (!showSearchResults) return;
    // reset selection when results change
    setSelectedIndex(searchResults.length ? 0 : -1);
  }, [searchResults, showSearchResults]);

  useEffect(() => {
    if (selectedIndex < 0) return;
    // scroll selected row into view inside the results container
    try {
      const container = resultsContainerRef.current as HTMLElement | null;
      const el = container?.querySelectorAll('tbody tr')[selectedIndex] as HTMLElement | undefined;
      if (el && container) {
        const elTop = el.offsetTop;
        const elBottom = elTop + el.offsetHeight;
        if (elTop < container.scrollTop) container.scrollTop = elTop;
        else if (elBottom > container.scrollTop + container.clientHeight) container.scrollTop = elBottom - container.clientHeight;
      }
    } catch (e) { }
  }, [selectedIndex]);

  // Global key handler while overlay is open (captures keys even if input not focused)
  useEffect(() => {
    if (!showSearchResults) return;
    const onKey = (e: KeyboardEvent) => {
      if (!searchResults || searchResults.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(Math.max(i, 0) + 1, searchResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        setShowSearchResults(false);
        if (selectedIndex >= 0 && searchResults[selectedIndex]) {
          loadPatientByRegistration(searchResults[selectedIndex].registrationId, true);
        }
      } else if (e.key === 'Escape') {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showSearchResults, searchResults, selectedIndex]);

  const handleSearchInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchResults || searchResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(Math.max(i, 0) + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && searchResults[selectedIndex]) {
        loadPatientByRegistration(searchResults[selectedIndex].registrationId, true);
      } else {
        doSearch();
      }
    } else if (e.key === 'Escape') {
      setShowSearchResults(false);
    }
  };

  const doSearch = async (query?: string) => {
    const q = (query !== undefined) ? query : searchQuery;
    if (!q || !q.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    if (userRole !== ROLES.RECEPTIONIST) {
      showAlert('Search is available to Receptionist role only.');
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);
    try {
      // Search supports multiple fields:
      // 1. Patient Name (existing)
      // 2. Patient ID / Registration ID (existing)
      // 3. Phone Number (extended)
      // The query is flexible and searches across all these fields
      const resp = await fetch(`${API_ENDPOINTS.PATIENTS_SEARCH}?q=${encodeURIComponent(q)}`);
      if (!resp.ok) throw new Error('Search failed');
      const data = await resp.json();
      setSearchResults(data.results || []);
    } catch (err: any) {
      console.error('Search error', err);
      showAlert('Failed to search patients. See console for details.');
    } finally {
      setIsSearching(false);
    }
  };

  // Debounce timer ref for search
  const searchTimerRef = useRef<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchDropdownRef = useRef<HTMLDivElement | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ left: number; top: number; width: number } | null>(null);
  const overlayInputRef = useRef<HTMLInputElement | null>(null);

  // Compute dropdown position synchronously when user clicks/focuses so portal can render immediately
  const computeDropdownPos = () => {
    const inp = searchInputRef.current;
    if (!inp) return;
    const rect = inp.getBoundingClientRect();
    const left = Math.max(8, rect.left + window.scrollX);
    const top = rect.bottom + window.scrollY + 6; // small gap
    const width = rect.width;
    setDropdownPos({ left, top, width });
  };

  // When searchQuery changes, run a debounced search (only for receptionist)
  useEffect(() => {
    if (!showSearchResults) return;
    if (userRole !== ROLES.RECEPTIONIST) return;

    if (searchTimerRef.current) {
      window.clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }

    if (!searchQuery || !searchQuery.trim()) {
      // If empty, don't query but keep overlay open
      setSearchResults([]);
      return;
    }

    // debounce 300ms
    searchTimerRef.current = window.setTimeout(() => {
      doSearch(searchQuery);
      searchTimerRef.current = null;
    }, 300);

    return () => {
      if (searchTimerRef.current) {
        window.clearTimeout(searchTimerRef.current);
        searchTimerRef.current = null;
      }
    };
  }, [searchQuery, showSearchResults, userRole]);

  const loadPatientByRegistration = async (registrationId?: string, preserveClinical: boolean = false, preventNavigation: boolean = false) => {
    if (!registrationId) return;
    try {
      const resp = await fetch(API_ENDPOINTS.PATIENT(registrationId));
      if (!resp.ok) throw new Error('Patient not found');
      const doc = await resp.json();
      const mapped = mapDocToPatientData(doc);

      // Task 2: Calculate total visits for navigation
      // doc.visits contains past saved visits. 
      const visits = Array.isArray(doc.visits) ? doc.visits : [];
      // Sort visits by date (newest first) if not already sorted
      const sortedVisits = [...visits].sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());

      setPatientHistory(sortedVisits);
      setTotalVisits(sortedVisits.length + 1); // +1 for the current session
      setVisitIndex(0); // Reset to current
      setCurrentVisitDraft(null); // Clear any previous draft

      if (preserveClinical) {
        // Open full patient record including existing clinical data
        setNewVisit(false);
        setActivePatientData(mapped);
        if (!preventNavigation) setCurrentView('dashboard');
        setShowSearchResults(false);
        setSearchQuery('');
        return;
      }

      // For new visit: keep only personal details, clear all clinical data
      setNewVisit(true);
      const freshVisitData: PatientData = {
        patientDetails: mapped.patientDetails,  // KEEP: patient info (name, age, phone, email, etc.)
        // All clinical data is FRESH for new visit - not carried over
        presentingComplaints: {
          complaints: [],
          history: { severity: '', onset: '', aggravating: '', relieving: '', associated: '' },
          timeline: []
        },
        medicalHistory: {
          medical: [],
          surgical: [],
          familyHistory: '',
          socialHistory: { smoking: '', alcohol: '', exercise: '' }
        },
        drugHistory: {
          allergies: [],
          currentMeds: [],
          compliance: { adherenceRate: '', missedDoses: '', lastRefill: '' },
          previousMeds: ''
        },
        vitalSigns: {
          temperature: { value: '', unit: 'C', time: '' },
          pulse: { value: '', unit: 'bpm' },
          respiratoryRate: { value: '', unit: 'breaths/min' },
          bloodPressure: { systolic: '', diastolic: '', unit: 'mmHg' }
        },
        optometry: {
          vision: {
            unaided: { rightEye: '', leftEye: '' },
            withGlass: { rightEye: '', leftEye: '' },
            withPinhole: { rightEye: '', leftEye: '' },
            bestCorrected: { rightEye: '', leftEye: '' }
          },
          autoRefraction: {
            ur: { sph: '', cyl: '', axis: '' },
            dr: { sph: '', cyl: '', axis: '' }
          },
          finalGlasses: {
            rightEye: { sph: '', cyl: '', axis: '', prism: '', va: '', nv: '' },
            leftEye: { sph: '', cyl: '', axis: '', prism: '', va: '', nv: '' },
            add: '',
            mDist: ''
          },
          currentGlasses: {
            rightEye: { sph: '', cyl: '', axis: '', va: '', add: '' },
            leftEye: { sph: '', cyl: '', axis: '', va: '', add: '' }
          },
          oldGlass: {
            rightEye: { sph: '', cyl: '', axis: '', va: '', add: '' },
            leftEye: { sph: '', cyl: '', axis: '', va: '', add: '' }
          },
          additional: { gpAdvisedFor: '', gpAdvisedBy: '', useOfGlass: '', product: '' }
        },
        iop: { iopReadings: [] } as any,
        ophthalmicInvestigations: {} as any,
        systemicInvestigations: { bloodTests: [], lipidProfile: [], renalFunction: [], liverFunction: [] } as any
      };

      setActivePatientData(freshVisitData);
      if (!preventNavigation) setCurrentView('dashboard');
      setShowSearchResults(false);
      setSearchQuery('');
    } catch (err: any) {
      console.error('Load patient error', err);
      showAlert('Failed to load patient.');
    }
  };

  // Close search overlay on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSearchResults(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // When the overlay opens, focus its input so typing starts immediately
  useEffect(() => {
    if (showSearchResults) {
      window.requestAnimationFrame(() => {
        overlayInputRef.current?.focus();
      });
    }
  }, [showSearchResults]);

  // Close search dropdown when clicking outside (no overlay mode)
  useEffect(() => {
    if (!showSearchResults) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (searchDropdownRef.current && searchInputRef.current) {
        if (searchDropdownRef.current.contains(target) || searchInputRef.current.contains(target as any)) {
          return;
        }
      }
      setShowSearchResults(false);
    };
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [showSearchResults]);

  // Calculate portal dropdown position so it sits above other stacking contexts
  useEffect(() => {
    if (!showSearchResults) {
      setDropdownPos(null);
      return;
    }

    const updatePos = () => {
      const inp = searchInputRef.current;
      if (!inp) return;
      const rect = inp.getBoundingClientRect();
      // Position the dropdown just under the input, account for page scroll
      const left = Math.max(8, rect.left + window.scrollX);
      const top = rect.bottom + window.scrollY + 6; // small gap
      const width = rect.width;
      setDropdownPos({ left, top, width });
    };

    // Update immediately and on resize/scroll
    updatePos();
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
    const ro = new ResizeObserver(updatePos);
    if (searchInputRef.current) ro.observe(searchInputRef.current);

    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
      try { ro.disconnect(); } catch { }
    };
  }, [showSearchResults]);

  // Dashboard starts empty - patient data only loads when explicitly selected from a queue
  // (Reception Queue, OPD Queue, or Doctor Queue)


  const handleViewChange = (view: any) => {
    // If the user clicked the profile/login icon while authenticated
    if (view === 'login') {
      // For clinical/reception roles, always show their respective Portal (which is the 'login' view)
      if (isAuthenticated && (userRole === ROLES.RECEPTIONIST || userRole === 'opd' || userRole === 'doctor')) {
        setCurrentView('login');
      } else if (isAuthenticated) {
        // For other roles (e.g. admin), show settings or analytics
        setCurrentView('profile-settings');
      } else {
        setCurrentView('login');
      }
      return;
    }

    // NEW: Support profile-settings view for receptionists
    if (view === 'profile-settings') {
      console.log('[DEBUG] handleViewChange profile-settings - userRole:', userRole);
      setCurrentView('profile-settings');
      return;
    }

    if (view === 'dashboard') {
      const isCurrentlyInPatientDocumentation = currentView === 'reception-patient-view' || currentView === 'opd-queue' || currentView === 'doctor-queue';

      // If already in documentation and wanting to go back to dashboard/hub, clear the active patient
      if (isCurrentlyInPatientDocumentation) {
        setActivePatientData(null);
        setIsPatientDischarged(false);
        setCurrentView('dashboard');
        return;
      }

      // If elsewhere and have an active patient, return to their documentation
      if (isAuthenticated && activePatientData) {
        if (userRole === ROLES.RECEPTIONIST) {
          setCurrentView('reception-patient-view');
          return;
        } else if (userRole === 'opd') {
          setCurrentView('opd-queue');
          return;
        } else if (userRole === 'doctor') {
          setCurrentView('doctor-queue');
          return;
        }
      }

      setCurrentView('dashboard');
      return;
    }

    // Protect all non-login views behind authentication
    if (!isAuthenticated) {
      // Minimal UX: send user to login and inform them
      showAlert('Please sign in to access the dashboard.');
      setCurrentView('login');
      return;
    }

    // Role-based queue access
    if (view === 'reception-queue' && userRole && userRole !== 'receptionist' && userRole !== 'admin' && userRole !== 'patient') {
      showAlert('Only reception staff can access this queue');
      return;
    }
    if (view === 'opd-queue' && userRole && userRole !== 'opd' && userRole !== 'admin' && userRole !== 'patient') {
      showAlert('Only OPD staff can access this queue');
      return;
    }
    if (view === 'doctor-queue' && userRole && userRole !== 'doctor' && userRole !== 'admin' && userRole !== 'patient') {
      showAlert('Only doctors can access this queue');
      return;
    }

    setCurrentView(view);
    // Reset new patient mode when navigating to any queue view
    if ((view === 'reception-queue' || view === 'opd-queue' || view === 'doctor-queue') && isNewPatientMode) {
      setIsNewPatientMode(false);
    }
    // Clear active patient when navigating to queue views (so dashboard starts empty)
    if (view === 'reception-queue' || view === 'opd-queue' || view === 'doctor-queue') {
      setActivePatientData(null);
      setIsPatientDischarged(false);
    }
  };

  // Listen for global navigation events from ReceptionistPortal
  useEffect(() => {
    function handleNavigateToBilling(e: any) {
      const { registrationId, patientData } = e.detail || {};
      console.log('📍 [App] Received global navigate-to-billing event:', { registrationId, patientData });
      setLastSavedRegistrationId(registrationId);
      setLastAppointmentPatientData(patientData);
      setCurrentView('individual-billing');
    }
    window.addEventListener('navigate-to-billing', handleNavigateToBilling);
    return () => window.removeEventListener('navigate-to-billing', handleNavigateToBilling);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <AlertModal />
      {!isFullScreen && (
        <Sidebar
          currentView={currentView}
          onViewChange={(view) => handleViewChange(view)}
          userRole={userRole || undefined}
          notificationCount={notificationCount}
        />
      )}

      {/* Main Content */}
      <div className={`${!isFullScreen ? 'pl-16 pt-20' : ''} min-h-screen transition-all duration-300`}>

        {/* Navbar */}
        {!isFullScreen && (
          <Navbar
            dashboardTitle={dashboardTitle}
            setDashboardTitle={setDashboardTitle}
            dashboardSubtitle={dashboardSubtitle}
            setDashboardSubtitle={setDashboardSubtitle}
            userRole={userRole}
            setShowSearchResults={setShowSearchResults}
            overlayInputRef={overlayInputRef}
            searchInputRef={searchInputRef}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            doSearch={doSearch}
            handleSearchInputKeyDown={handleSearchInputKeyDown}
            computeDropdownPos={computeDropdownPos}
            isNewPatientMode={isNewPatientMode}
            handleSavePatientClick={handleSavePatientClick}
            activePatientData={activePatientData}
            handleReceptionCompleteCheckIn={handleReceptionCompleteCheckIn}
            handleOPDSave={handleOPDSave}
            handleDoctorSave={handleDoctorSave}
            isAuthenticated={isAuthenticated}
            handleLogout={handleLogout}
            notificationCount={notificationCount}
            setCurrentView={setCurrentView}
            currentView={currentView}
          />
        )}



        {/* Dashboard Grid */}
        <main className="relative min-h-[calc(100vh-4rem)]">
          {/* Background decorative images */}


          {/* Content with relative positioning */}
          <div className="relative z-10">
            {currentView === 'login' ? (
              isAuthenticated ? (
                <DashboardView
                  appSettings={appSettings}
                  setAppSettings={setAppSettings}
                  username={currentUsername || undefined}
                  userRole={userRole || undefined}
                />
              ) : (
                <UserLoginView
                  onAuthSuccess={(user) => {
                    // user.role expected like 'receptionist' | 'opd' | 'doctor' | 'patient'
                    const roleStr = (user.role || '').toLowerCase();
                    if (roleStr === 'receptionist' || roleStr === 'opd' || roleStr === 'doctor' || roleStr === 'patient') {
                      setUserRole(roleStr as UserRole);
                    } else {
                      setUserRole(ROLES.RECEPTIONIST);
                    }
                    // Store the logged-in username
                    setCurrentUsername(user.username);
                    // mark authenticated and open dashboard
                    setIsAuthenticated(true);
                    // For receptionist and OPD, start with empty dashboard. Doctor gets default data
                    if (roleStr === 'receptionist' || roleStr === 'opd') {
                      setActivePatientData(null);
                    } else {
                      setActivePatientData(defaultPatientData);
                    }

                    // All users now start at the main dashboard
                    setCurrentView('dashboard');
                  }}
                  onNavigate={(view) => setCurrentView(view)}
                />
              )
            ) : currentView === 'payment-setup' ? (
              <PaymentSetupView />
            ) : currentView === 'organization-login' ? (
              <OrganizationLoginView
                onLoginSuccess={(data) => {
                  setIsAuthenticated(true);
                  setCurrentView('login');
                }}
              />
            ) : currentView === 'admin-dashboard' ? (
              <AdminDashboardView onNavigate={(view) => setCurrentView(view)} />
            ) : currentView === 'admin-data-management' ? (
              <AdminDataManagementView />
            ) : currentView === 'telemedicine' ? (
              <TelemedicineView
                patientId={activePatientData?.patientDetails.registrationId}
                patientName={activePatientData?.patientDetails.name}
                doctorName={currentUsername || 'Doctor'}
              />
            )  : currentView === 'dashboard' ? (
  isAuthenticated && (userRole === ROLES.RECEPTIONIST) ? (
    <ReceptionistDashboardView
      username={currentUsername || 'Receptionist'}
      onLogout={handleLogout}
      onPatientSelected={(selected) => {
        const regId = selected.patientRegistrationId || selected.registrationId;
        if (regId && regId !== 'Not Assigned') {
          loadPatientByRegistration(regId, true, true);
          setCurrentView('reception-patient-view');
        } else {
          setActivePatientData({
            ...JSON.parse(JSON.stringify(defaultPatientData)),
            patientDetails: {
              ...defaultPatientData.patientDetails,
              name: selected.patientName || selected.name || 'New Patient',
              registrationId: 'Not Assigned'
            }
          });
          setCurrentView('reception-patient-view');
        }
      }}
    />
              ) : isAuthenticated && userRole === 'doctor' ? (
                <DoctorPortal
                  username={currentUsername || 'Doctor'}
                  onLogout={handleLogout}
                  onViewChange={setCurrentView}
                  onPatientSelected={async (selected) => {
                    const regId = selected.patientRegistrationId || selected.registrationId;
                    const discharged = selected.isDischargedPatient || selected.level === 'Discharged';
                    setIsPatientDischarged(discharged);

                    if (regId && regId !== 'Not Assigned') {
                      await loadPatientByRegistration(regId, true);
                      setCurrentView('doctor-queue');
                    } else {
                      setActivePatientData({
                        ...JSON.parse(JSON.stringify(defaultPatientData)),
                        patientDetails: {
                          ...defaultPatientData.patientDetails,
                          name: selected.patientName || selected.name || 'New Patient',
                          registrationId: 'Not Assigned'
                        }
                      });
                      setCurrentView('doctor-queue');
                    }
                  }}
                />
              ) : isAuthenticated && userRole === 'opd' ? (
                <OpdPortal
                  username={currentUsername || 'OPD Staff'}
                  userRole={userRole}
                  onLogout={handleLogout}
                  onViewChange={setCurrentView}

                  onPatientSelected={async (selected) => {
                    const regId = selected.patientRegistrationId || selected.registrationId;
                    const discharged = selected.isDischargedPatient || selected.level === 'Discharged';
                    setIsPatientDischarged(discharged);

                    if (regId && regId !== 'Not Assigned') {
                      await loadPatientByRegistration(regId, true);
                      setCurrentView('opd-queue');
                    } else {
                      setActivePatientData({
                        ...JSON.parse(JSON.stringify(defaultPatientData)),
                        patientDetails: {
                          ...defaultPatientData.patientDetails,
                          name: selected.patientName || selected.name || 'New Patient',
                          registrationId: 'Not Assigned'
                        }
                      });
                      setCurrentView('opd-queue');
                    }
                  }}
                />
              ) : (
                <div className="h-screen overflow-hidden bg-[#050505]">
                  <OperationsCenter
                    compact={false}
                    userRole={userRole}
                    onNavigateToPatient={(patient) => {
                      const regId = patient.patientRegistrationId || patient.registrationId;
                      const discharged = patient.isDischargedPatient || patient.level === 'Discharged';
                      setIsPatientDischarged(discharged);
                      if (regId && regId !== 'Not Assigned') {
                        loadPatientByRegistration(regId, true);
                      }
                    }}
                  />
                </div>
              )

            ) : (currentView === 'opd-queue' || currentView === 'doctor-queue' || currentView === 'reception-patient-view') ? (
              <div className="flex overflow-hidden" style={{ height: 'calc(100vh - 5rem)' }}>
                {/* Unified Sidebar Queue for Dashboard - Ensures patients are "Visible" once pushed */}
                {!activePatientData && (
                  <div
                    className="border-r border-[#1a1a1a] bg-[#050505] flex flex-col shrink-0"
                    style={{ width: sidebarWidth }}
                  >
                    {isAuthenticated && (userRole === 'opd' || userRole === 'doctor' || userRole === ROLES.RECEPTIONIST) ? (
                      <div className="flex-1 flex flex-col overflow-y-auto p-4 custom-scrollbar">
                        <OperationsCenter
                          compact={true}
                          userRole={userRole}
                          onPatientSelected={(selected) => {
                            const regId = selected.patientRegistrationId || selected.registrationId;
                            // Check if patient is discharged
                            const discharged = selected.isDischargedPatient || selected.level === 'Discharged';
                            setIsPatientDischarged(discharged);
                            if (regId && regId !== 'Not Assigned') {
                              loadPatientByRegistration(regId, true);
                            }
                          }}
                          onNavigateToPatient={(patient) => {
                            const regId = patient.patientRegistrationId || patient.registrationId;
                            // Check if patient is discharged
                            const discharged = patient.isDischargedPatient || patient.level === 'Discharged';
                            setIsPatientDischarged(discharged);
                            if (regId && regId !== 'Not Assigned') {
                              loadPatientByRegistration(regId, true);
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="p-8 text-center text-[#444]">
                        <ClipboardList className="w-10 h-10 mx-auto mb-4 opacity-20" />
                        <p className="text-xs uppercase tracking-widest font-bold">Standard Dashboard</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Resizer Handle */}
                {!activePatientData && (
                  <div
                    className="w-1 bg-[#2a2a2a] hover:bg-[#D4A574] cursor-col-resize transition-colors z-50 flex items-center justify-center group shrink-0 select-none"
                    onMouseDown={startResizing}
                  >
                    <div className="h-8 w-0.5 bg-[#444] rounded-full group-hover:bg-white transition-colors opacity-0 group-hover:opacity-100" />
                  </div>
                )}

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 p-8 overflow-y-auto scrollbar-hide">
                    <PatientDashboard
                      activePatientData={activePatientData}
                      userRole={userRole}
                      updateActivePatientData={updateActivePatientData}
                      visitIndex={visitIndex}
                      totalVisits={totalVisits}
                      setVisitIndex={setVisitIndex}
                      handlePrevVisit={handlePrevVisit}
                      handleNextVisit={handleNextVisit}
                      isPatientDischarged={isPatientDischarged}
                      handleReceptionCompleteCheckIn={handleReceptionCompleteCheckIn}
                      handleOPDSave={handleOPDSave}
                      handleDoctorSave={handleDoctorSave}
                      setActivePatientData={setActivePatientData}
                      setIsPatientDischarged={setIsPatientDischarged}
                      setCurrentView={setCurrentView}
                      newVisit={newVisit}
                    />
                  </div>
                </div>
              </div>
            ) : currentView === 'analytics' ? (
              <AnalyticsView registrationId={activePatientData?.patientDetails.registrationId} />
            ) : currentView === 'billing' ? (
              <BillingView registrationId={activePatientData?.patientDetails.registrationId} />
            ) : currentView === 'billing-dashboard' ? (
              <BillingDashboardView
                onBillingClick={(regId) => {
                  // Find patient data or just set regId
                  setLastSavedRegistrationId(regId);
                  setCurrentView('individual-billing');
                }}
              />
            ) : currentView === 'individual-billing' ? (
              <IndividualBillingView
                registrationId={lastSavedRegistrationId || activePatientData?.patientDetails?.registrationId}
                onBack={() => setCurrentView('billing-dashboard')}
                currentUser={currentUsername || 'Admin'}
                patientData={lastAppointmentPatientData}
              />
            ) : currentView === 'appointments' ? (
              <AppointmentBookingView 
                onNavigateToBilling={(registrationId, patientData) => {
                  console.log('📍 [App] AppointmentBooking callback invoked with:', { registrationId, patientData });
                  (window as any)._debugBillingNav = {
                    registrationId,
                    patientData,
                    stack: new Error().stack
                  };
                  setLastSavedRegistrationId(registrationId);
                  setLastAppointmentPatientData(patientData);
                  setCurrentView('individual-billing');
                  setTimeout(() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    console.log('📍 [App] After setCurrentView, state:', {
                      lastSavedRegistrationId,
                      lastAppointmentPatientData,
                      currentView: 'individual-billing'
                    });
                  }, 100);
                }}
              />
            ) : currentView === 'appointment-queue' ? (
              <AppointmentQueueView />
            ) : currentView === 'reception-queue' ? (
              <div className="min-h-screen">
                {/* Reception Queue View */}
                <ReceptionQueueView
                  userRole={userRole || undefined}
                  updatedPatientData={activePatientData || undefined}
                  onPatientSelected={(patient, patientData) => {
                    setActivePatientData(patientData);
                  }}
                />
              </div>
            ) : currentView === 'documents' ? (
              // Enable document uploads for any patient that has a valid registration ID:
              // 1. First check if we have a lastSavedRegistrationId (from a save operation)
              // 2. Then check activePatientData's registrationId (from queue selection)
              // This allows document uploads as soon as a patient is selected from any queue
              (() => {
                const computedPatientRegistrationId =
                  lastSavedRegistrationId ||
                  (activePatientData?.patientDetails?.registrationId &&
                    activePatientData.patientDetails.registrationId !== 'Not Assigned'
                    ? activePatientData.patientDetails.registrationId
                    : undefined);
                const computedPatientName = activePatientData?.patientDetails?.name || undefined;
                return <DocumentsView patientRegistrationId={computedPatientRegistrationId} patientName={computedPatientName} />;
              })()
            ) : currentView === 'pharmacy-billing' ? (
              <PharmacyBillingView
                registrationId={activePatientData?.patientDetails?.registrationId}
                patientName={activePatientData?.patientDetails?.name}
              />
            ) : currentView === 'medicine-management' ? (
              <MedicineManagementView />
            ) : currentView === 'patient-history' ? (
              <PatientHistoryView />
            ) : currentView === 'data-repair' ? (
              <DataRepairView />
            ) : currentView === 'settings' || currentView === 'profile-settings' ? (
              (() => {
                console.log('[DEBUG] profile view - userRole:', userRole, 'currentUsername:', currentUsername);
                if (userRole === ROLES.RECEPTIONIST) {
                  return (
                    <ReceptionistProfileView 
                      username={currentUsername || ''}
                      onPatientSelected={(patient) => {
                        const regId = patient.patientRegistrationId || patient.registrationId;
                        if (regId && regId !== 'Not Assigned') {
                          loadPatientByRegistration(regId, true);
                        }
                      }}
                    />
                  );
                }
                return (
                  <ProfileSettings 
                    username={currentUsername || undefined} 
                    role={userRole || undefined}
                    onPatientSelected={(patient) => {
                      const regId = patient.patientRegistrationId || patient.registrationId;
                      if (regId && regId !== 'Not Assigned') {
                        loadPatientByRegistration(regId, true);
                      }
                    }}
                  />
                );
              })()
            ) : (
              <NotificationsView />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}