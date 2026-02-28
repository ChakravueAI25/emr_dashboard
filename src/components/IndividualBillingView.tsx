import React, { useState, useEffect, useRef } from 'react';
import { showAlert } from './ui/AlertModal';
import {
  Plus,
  Trash2,
  DollarSign,
  Printer,
  Download,
  Save,
  X,
  Search,
  CreditCard,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  User,
  Calendar,
  Mail
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { SurgerySelectionModal } from './SurgerySelectionModal';
import API_ENDPOINTS from '../config/api';

type InsuranceCategory = 'CGHS' | 'SGHS' | 'PRIVATE' | null;

interface InsurancePlan {
  company: string;
  tpas: string[];
  coveragePercent: number;
}

const MOCK_INSURANCE_PLANS: Record<
  Exclude<InsuranceCategory, null>,
  InsurancePlan[]
> = {
  CGHS: [
    { company: 'CGHS Central', tpas: ['Gov TPA 1', 'Gov TPA 2'], coveragePercent: 90 }
  ],
  SGHS: [
    { company: 'State Health Scheme', tpas: ['State TPA A', 'State TPA B'], coveragePercent: 85 }
  ],
  PRIVATE: [
    { company: 'Star Health', tpas: ['MediAssist', 'FHPL'], coveragePercent: 80 },
    { company: 'ICICI Lombard', tpas: ['Vidal', 'HealthIndia'], coveragePercent: 75 }
  ]
};

// Surgery breakdown particular interface
interface SurgeryParticular {
  sNo: number;
  particular: string;
  cost: number;
  qty: number;
  netAmt: number;
  grossAmt: number;
}

interface BillingItem {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  discount: number;
  tax: number;
  total: number;
  surgeryBreakdown?: SurgeryParticular[];
  totalGrossAmt?: number;
  mouDiscount?: number;
  receivedAmt?: number;
  isExpanded?: boolean;
  selectedPackage?: number; // Track which package is selected (35000, 40000, etc.)
}

// ============ SURGERY PACKAGE PRICING DATA ============
// 18 Particulars with prices for each package (35K, 40K, 50K, 60K, 75K)
type PackageAmount = 35000 | 40000 | 50000 | 60000 | 75000;

interface PackageParticulars {
  particulars: { particular: string; cost: number; qty: number }[];
}

const SURGERY_PACKAGES: Record<PackageAmount, PackageParticulars> = {
  35000: {
    particulars: [
      { particular: 'SURGEON CHARGES', cost: 10000, qty: 1 },
      { particular: 'ROOM CHARGES', cost: 1500, qty: 1 },
      { particular: 'NURSING CHARGES', cost: 1500, qty: 1 },
      { particular: 'Consumable Charges - 15\'LANCE TIP', cost: 170, qty: 1 },
      { particular: 'Consumable Charges - 2.8MM SLIT KNIFE', cost: 500, qty: 1 },
      { particular: 'Consumable Charges - DRAPES & SILICON SPEARS', cost: 120, qty: 1 },
      { particular: 'Consumable Charges - STERILE GLOVES', cost: 115, qty: 3 },
      { particular: 'Consumable Charges - STERILE GOWN SURGEON', cost: 355, qty: 1 },
      { particular: 'Consumable Charges - EYE DRAPE', cost: 65, qty: 1 },
      { particular: 'Consumable Charges - INTRA CATH', cost: 90, qty: 1 },
      { particular: 'Consumable Charges - BSS POUCH', cost: 450, qty: 1 },
      { particular: 'Consumable Charges - TROLLEY SHEET', cost: 45, qty: 1 },
      { particular: 'Consumable Charges - VISCOMET', cost: 360, qty: 1 },
      { particular: 'Consumable Charges - PHACO MICS TIP GENERIC', cost: 600, qty: 1 },
      { particular: 'Consumable Charges - PHACO MICS CHAMBER', cost: 300, qty: 1 },
      { particular: 'Consumable Charges - PHACO MICS SLEEVE', cost: 600, qty: 1 },
      { particular: 'IOL CHARGES', cost: 12000, qty: 1 },
      { particular: 'OPERATION THEATER CHARGES', cost: 6000, qty: 1 },
    ]
  },
  40000: {
    particulars: [
      { particular: 'SURGEON CHARGES', cost: 10000, qty: 1 },
      { particular: 'ROOM CHARGES', cost: 2000, qty: 1 },
      { particular: 'NURSING CHARGES', cost: 2000, qty: 1 },
      { particular: 'Consumable Charges - 15\'LANCE TIP', cost: 170, qty: 1 },
      { particular: 'Consumable Charges - 2.8MM SLIT KNIFE', cost: 500, qty: 1 },
      { particular: 'Consumable Charges - DRAPES & SILICON SPEARS', cost: 120, qty: 1 },
      { particular: 'Consumable Charges - STERILE GLOVES', cost: 115, qty: 3 },
      { particular: 'Consumable Charges - STERILE GOWN SURGEON', cost: 355, qty: 1 },
      { particular: 'Consumable Charges - EYE DRAPE', cost: 65, qty: 1 },
      { particular: 'Consumable Charges - INTRA CATH', cost: 90, qty: 1 },
      { particular: 'Consumable Charges - BSS POUCH', cost: 450, qty: 1 },
      { particular: 'Consumable Charges - TROLLEY SHEET', cost: 45, qty: 1 },
      { particular: 'Consumable Charges - VISCOMET', cost: 360, qty: 1 },
      { particular: 'Consumable Charges - PHACO MICS TIP GENERIC', cost: 600, qty: 1 },
      { particular: 'Consumable Charges - PHACO MICS CHAMBER', cost: 300, qty: 1 },
      { particular: 'Consumable Charges - PHACO MICS SLEEVE', cost: 600, qty: 1 },
      { particular: 'IOL CHARGES', cost: 17000, qty: 1 },
      { particular: 'OPERATION THEATER CHARGES', cost: 6000, qty: 1 },
    ]
  },
  50000: {
    particulars: [
      { particular: 'SURGEON CHARGES', cost: 7500, qty: 1 },
      { particular: 'ROOM CHARGES', cost: 500, qty: 1 },
      { particular: 'NURSING CHARGES', cost: 1200, qty: 1 },
      { particular: 'Consumable Charges - 15\'LANCE TIP', cost: 170, qty: 1 },
      { particular: 'Consumable Charges - 2.8MM SLIT KNIFE', cost: 500, qty: 1 },
      { particular: 'Consumable Charges - DRAPES & SILICON SPEARS', cost: 100, qty: 1 },
      { particular: 'Consumable Charges - STERILE GLOVES', cost: 110, qty: 3 },
      { particular: 'Consumable Charges - STERILE GOWN SURGEON', cost: 360, qty: 1 },
      { particular: 'Consumable Charges - EYE DRAPE', cost: 60, qty: 1 },
      { particular: 'Consumable Charges - INTRA CATH', cost: 90, qty: 1 },
      { particular: 'Consumable Charges - BSS POUCH', cost: 450, qty: 1 },
      { particular: 'Consumable Charges - TROLLEY SHEET', cost: 45, qty: 1 },
      { particular: 'Consumable Charges - VISCOMET', cost: 360, qty: 1 },
      { particular: 'Consumable Charges - PHACO MICS TIP GENERIC', cost: 600, qty: 1 },
      { particular: 'Consumable Charges - PHACO MICS CHAMBER', cost: 300, qty: 1 },
      { particular: 'Consumable Charges - PHACO MICS SLEEVE', cost: 600, qty: 1 },
      { particular: 'IOL CHARGES', cost: 32835, qty: 1 },
      { particular: 'OPERATION THEATER CHARGES', cost: 4000, qty: 1 },
    ]
  },
  60000: {
    particulars: [
      { particular: 'SURGEON CHARGES', cost: 16000, qty: 1 },
      { particular: 'ROOM CHARGES', cost: 2000, qty: 1 },
      { particular: 'NURSING CHARGES', cost: 4000, qty: 1 },
      { particular: 'Consumable Charges - 15\'LANCE TIP', cost: 180, qty: 1 },
      { particular: 'Consumable Charges - 2.8MM SLIT KNIFE', cost: 500, qty: 1 },
      { particular: 'Consumable Charges - DRAPES & SILICON SPEARS', cost: 120, qty: 1 },
      { particular: 'Consumable Charges - STERILE GLOVES', cost: 110, qty: 3 },
      { particular: 'Consumable Charges - STERILE GOWN SURGEON', cost: 360, qty: 1 },
      { particular: 'Consumable Charges - EYE DRAPE', cost: 65, qty: 1 },
      { particular: 'Consumable Charges - INTRA CATH', cost: 90, qty: 1 },
      { particular: 'Consumable Charges - BSS POUCH', cost: 450, qty: 1 },
      { particular: 'Consumable Charges - TROLLEY SHEET', cost: 45, qty: 1 },
      { particular: 'Consumable Charges - VISCOMET', cost: 360, qty: 1 },
      { particular: 'Consumable Charges - PHACO MICS TIP GENERIC', cost: 600, qty: 1 },
      { particular: 'Consumable Charges - PHACO MICS CHAMBER', cost: 300, qty: 1 },
      { particular: 'Consumable Charges - PHACO MICS SLEEVE', cost: 600, qty: 1 },
      { particular: 'IOL CHARGES', cost: 24000, qty: 1 },
      { particular: 'OPERATION THEATER CHARGES', cost: 10000, qty: 1 },
    ]
  },
  75000: {
    particulars: [
      { particular: 'SURGEON CHARGES', cost: 16000, qty: 1 },
      { particular: 'ROOM CHARGES', cost: 3000, qty: 1 },
      { particular: 'NURSING CHARGES', cost: 4500, qty: 1 },
      { particular: 'Consumable Charges - 15\'LANCE TIP', cost: 170, qty: 1 },
      { particular: 'Consumable Charges - 2.8MM SLIT KNIFE', cost: 500, qty: 1 },
      { particular: 'Consumable Charges - DRAPES & SILICON SPEARS', cost: 120, qty: 1 },
      { particular: 'Consumable Charges - STERILE GLOVES', cost: 110, qty: 3 },
      { particular: 'Consumable Charges - STERILE GOWN SURGEON', cost: 370, qty: 1 },
      { particular: 'Consumable Charges - EYE DRAPE', cost: 65, qty: 1 },
      { particular: 'Consumable Charges - INTRA CATH', cost: 90, qty: 1 },
      { particular: 'Consumable Charges - BSS POUCH', cost: 550, qty: 1 },
      { particular: 'Consumable Charges - TROLLEY SHEET', cost: 45, qty: 1 },
      { particular: 'Consumable Charges - VISCOMET', cost: 360, qty: 1 },
      { particular: 'Consumable Charges - PHACO MICS TIP GENERIC', cost: 700, qty: 1 },
      { particular: 'Consumable Charges - PHACO MICS CHAMBER', cost: 500, qty: 1 },
      { particular: 'Consumable Charges - PHACO MICS SLEEVE', cost: 700, qty: 1 },
      { particular: 'IOL CHARGES', cost: 34000, qty: 1 },
      { particular: 'OPERATION THEATER CHARGES', cost: 13000, qty: 1 },
    ]
  }
};

// Helper function to generate surgery breakdown from package
const generateSurgeryBreakdown = (packageAmount: PackageAmount): SurgeryParticular[] => {
  const packageData = SURGERY_PACKAGES[packageAmount];
  return packageData.particulars.map((p, idx) => ({
    sNo: idx + 1,
    particular: p.particular,
    cost: p.cost,
    qty: p.qty,
    netAmt: p.cost * p.qty,
    grossAmt: p.cost * p.qty,
  }));
};

// Default surgery breakdown templates (keep for backward compatibility)
const DEFAULT_SURGERY_BREAKDOWN: Record<string, SurgeryParticular[]> = {
  'Cataract Surgery (Phaco)': generateSurgeryBreakdown(35000),
  'LASIK Surgery': [
    { sNo: 1, particular: 'SURGEON CHARGES', cost: 15000, qty: 1, netAmt: 15000, grossAmt: 15000 },
    { sNo: 2, particular: 'LASER CHARGES', cost: 25000, qty: 1, netAmt: 25000, grossAmt: 25000 },
    { sNo: 3, particular: 'ROOM CHARGES', cost: 1000, qty: 1, netAmt: 1000, grossAmt: 1000 },
    { sNo: 4, particular: 'NURSING CHARGES', cost: 2000, qty: 1, netAmt: 2000, grossAmt: 2000 },
    { sNo: 5, particular: 'Consumable Charges - EYE DRAPE', cost: 500, qty: 2, netAmt: 1000, grossAmt: 1000 },
    { sNo: 6, particular: 'Consumable Charges - STERILE GLOVES', cost: 110, qty: 4, netAmt: 440, grossAmt: 440 },
    { sNo: 7, particular: 'MEDICATION', cost: 2500, qty: 1, netAmt: 2500, grossAmt: 2500 },
    { sNo: 8, particular: 'OPERATION THEATER CHARGES', cost: 8000, qty: 1, netAmt: 8000, grossAmt: 8000 },
  ]
}

interface IndividualBillingViewProps {
  registrationId?: string;
  onBack?: () => void;
  currentUser?: string;
  patientData?: {
    _id?: string;
    name?: string;
    registrationId?: string;
    age?: string;
    sex?: string;
    contactInfo?: {
      phone?: string;
      email?: string;
    };
  };
}

interface PatientSearchResult {
  name: string;
  registrationId: string;
  phone?: string;
  email?: string;
}

const COMMON_SERVICES = [
  { id: 'S1', name: 'Consultation Fee', category: 'Service', price: 500 },
  { id: 'S2', name: 'Follow-up Visit', category: 'Service', price: 300 },
  { id: 'S3', name: 'OCT Scan - Bilateral', category: 'Investigation', price: 2500 },
  { id: 'S4', name: 'Visual Field Test', category: 'Investigation', price: 1200 },
  { id: 'S5', name: 'Fundus Photography', category: 'Investigation', price: 800 },
  { id: 'S6', name: 'IOP Measurement', category: 'Investigation', price: 200 },
  { id: 'S7', name: 'Refraction', category: 'Investigation', price: 150 },
  { id: 'S8', name: 'Cataract Surgery (Phaco)', category: 'Surgery', price: 45000 },
  { id: 'S9', name: 'LASIK Surgery', category: 'Surgery', price: 65000 },
  { id: 'S10', name: 'Advance Fee', category: 'Payment', price: 0 },
];

export function IndividualBillingView({ registrationId: initialRegistrationId, onBack, currentUser, patientData: initialPatientData }: IndividualBillingViewProps) {
  const [patient, setPatient] = useState<any>(null);
  const [items, setItems] = useState<BillingItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'UPI' | 'Insurance' | 'Free Camp'>('Cash');
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [showCompanyTpaModal, setShowCompanyTpaModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newTpaNames, setNewTpaNames] = useState('');
  // New Contact Info State for Modal
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactAddress, setNewContactAddress] = useState('');

  const [currentRegId, setCurrentRegId] = useState<string | undefined>(initialRegistrationId);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState<PatientSearchResult[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [hasInitialPatientData, setHasInitialPatientData] = useState(!!initialPatientData);
  const searchTimeoutRef = useRef<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Surgery breakdown expanded state
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // New Insurance & Coupon State
  const [govtInsuranceEnabled, setGovtInsuranceEnabled] = useState(false);

  const [insuranceCategory, setInsuranceCategory] = useState<InsuranceCategory>(null);
  const [insuranceCompany, setInsuranceCompany] = useState('');
  const [insuranceTPA, setInsuranceTPA] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactAddress, setContactAddress] = useState('');
  const [claimNumber, setClaimNumber] = useState('');

  const [insuranceCovered, setInsuranceCovered] = useState(0);
  const [patientPayable, setPatientPayable] = useState(0);

  const [couponCode, setCouponCode] = useState('');
  const [workerQuota, setWorkerQuota] = useState<any>(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  // ============ SAVE AS PACKAGE STATE ============
  const [showSaveAsPackagePopup, setShowSaveAsPackagePopup] = useState(false);
  const [packageName, setPackageName] = useState('');
  const [isSavingAsPackage, setIsSavingAsPackage] = useState(false);
  const [savedPackages, setSavedPackages] = useState<any[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);

  // ============ SURGERY TWO-BILL SYSTEM STATE ============
  const [isSurgeryBillingMode, setIsSurgeryBillingMode] = useState(false);
  const [surgeryBillStage, setSurgeryBillStage] = useState<'initial' | 'final'>('initial');
  const [securityDeposit, setSecurityDeposit] = useState(0);
  const [insuranceApprovedAmount, setInsuranceApprovedAmount] = useState(0);
  const [existingInitialBill, setExistingInitialBill] = useState<any>(null);
  const [existingSurgeryBills, setExistingSurgeryBills] = useState<any[]>([]);
  const [showBillHistory, setShowBillHistory] = useState(false);

  // Calculated amounts for final bill
  const totalSurgeryCost = items.filter(i => i.category === 'Surgery').reduce((sum, i) => sum + i.total, 0);
  const patientTotalShare = totalSurgeryCost - insuranceApprovedAmount;
  const balancePayable = Math.max(0, patientTotalShare - securityDeposit);
  const refundAmount = Math.abs(Math.min(0, patientTotalShare - securityDeposit));

  // ============ DATE FIELDS & SURGERY SELECTION STATE ============
  const [dateOfSurgery, setDateOfSurgery] = useState('');
  const [dateOfDischarge, setDateOfDischarge] = useState('');
  const [showSurgerySelectionModal, setShowSurgerySelectionModal] = useState(false);

  // Fetch saved surgery packages when component mounts
  useEffect(() => {
    const fetchSavedPackages = async () => {
      setLoadingPackages(true);
      try {
        const response = await fetch(API_ENDPOINTS.SURGERY_PACKAGES.GET_ALL);
        if (response.ok) {
          const data = await response.json();
          setSavedPackages(data);
        }
      } catch (err) {
        console.error('Error fetching packages:', err);
      } finally {
        setLoadingPackages(false);
      }
    };
    fetchSavedPackages();
  }, []);

  // Patient search with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }

    if (!patientSearchQuery.trim()) {
      setPatientSearchResults([]);
      setShowPatientDropdown(false);
      return;
    }

    setIsSearchingPatient(true);
    searchTimeoutRef.current = window.setTimeout(async () => {
      try {
        const response = await fetch(`${API_ENDPOINTS.PATIENTS_SEARCH}?q=${encodeURIComponent(patientSearchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setPatientSearchResults(data.results || []);
          setShowPatientDropdown(true);
        }
      } catch (err) {
        console.error('Patient search error:', err);
      } finally {
        setIsSearchingPatient(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [patientSearchQuery]);

  // Select patient from search
  const handleSelectPatient = async (selectedPatient: PatientSearchResult) => {
    setCurrentRegId(selectedPatient.registrationId);
    setPatientSearchQuery('');
    setShowPatientDropdown(false);
    setPatientSearchResults([]);

    // Fetch full patient details
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.PATIENT(selectedPatient.registrationId));
      if (response.ok) {
        const data = await response.json();
        setPatient(data);
      }
    } catch (err) {
      console.error('Error fetching patient:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle patient data passed from AppointmentBooking FIRST
  useEffect(() => {
    if (initialPatientData && initialPatientData.registrationId) {
      console.log('📋 Pre-filling patient data from appointment booking:', initialPatientData);

      // Set the registration ID
      setCurrentRegId(initialPatientData.registrationId);
      setHasInitialPatientData(true);
      
      // Pre-fill patient object immediately
      const prefilledPatient = {
        name: initialPatientData.name || '',
        registrationId: initialPatientData.registrationId || '',
        demographics: {
          age: initialPatientData.demographics?.age || '',
          sex: initialPatientData.demographics?.sex || '',
        },
        contactInfo: {
          phone: initialPatientData.contactInfo?.phone || '',
          email: initialPatientData.contactInfo?.email || '',
          age: (initialPatientData as any).age || '',
          sex: (initialPatientData as any).sex || '',
          address: '',
          bloodType: '',
          allergies: '',
          emergencyContact: ''
        }
      };

      setPatient(prefilledPatient);
      setLoading(false);
      console.log('✅ Patient data pre-filled successfully');
      
      // Scroll to top when pre-filling data
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  }, [initialPatientData]);

  useEffect(() => {
    if (currentRegId && currentRegId !== 'Not Assigned') {
      // Even if we have pre-filled data, fetch the full details to get all fields (like age/sex for existing patients)
      console.log('🔄 Fetching patient details for registration:', currentRegId);
      fetchPatientDetails();
      fetchWorkerQuota();
      fetchSurgeryBills();
    } else {
      setLoading(false);
    }
  }, [currentRegId]);

  const fetchWorkerQuota = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.COUPONS.GET_QUOTA(currentUser || 'Admin'));
      if (response.ok) {
        const data = await response.json();
        setWorkerQuota(data);
      }
    } catch (err) {
      console.error('Error fetching quota:', err);
    }
  };

  // Fetch existing surgery bills for the patient
  const fetchSurgeryBills = async () => {
    if (!currentRegId) return;
    try {
      const response = await fetch(API_ENDPOINTS.BILLING_SURGERY.GET_BILLS(currentRegId));
      if (response.ok) {
        const bills = await response.json();
        setExistingSurgeryBills(bills);

        // Check if there's a pending initial bill (for continuing to final bill)
        const pendingInitial = bills.find((b: any) => b.billType === 'initial' && b.status !== 'settled');
        if (pendingInitial) {
          setExistingInitialBill(pendingInitial);
          setDateOfDischarge(pendingInitial.dateOfDischarge || '');
        }
      }
    } catch (err) {
      console.error('Error fetching surgery bills:', err);
    }
  };

  const fetchPatientDetails = async () => {
    if (!currentRegId || currentRegId === 'Not Assigned') {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.PATIENT(currentRegId));
      if (!response.ok) throw new Error('Failed to fetch patient');
      const data = await response.json();
      setPatient(data);

      // Auto-apply insurance details if present in patient data
      const insurance = data.patientDetails?.insurance;
      if (insurance && insurance.hasInsurance === true) {
        setGovtInsuranceEnabled(true);

        // Set insurance type (CGHS, SGHS, PRIVATE)
        if (insurance.insuranceType) {
          setInsuranceCategory(insurance.insuranceType as InsuranceCategory);
        }

        // Set company name
        if (insurance.companyName) {
          setInsuranceCompany(insurance.companyName);
        }

        // Set TPA name
        if (insurance.tpaName) {
          setInsuranceTPA(insurance.tpaName);
        }
      }
    } catch (err) {
      console.error('Error fetching patient:', err);
    } finally {
      setLoading(false);
    }
  };

  const addItem = (service: typeof COMMON_SERVICES[0]) => {
    const existing = items.find(i => i.id === service.id);
    if (existing) {
      setItems(items.map(i => i.id === service.id ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.price } : i));
    } else {
      // For surgery items, add default breakdown
      const isSurgery = service.category === 'Surgery';
      const defaultBreakdown = isSurgery ? DEFAULT_SURGERY_BREAKDOWN[service.name] : undefined;
      const totalFromBreakdown = defaultBreakdown ? defaultBreakdown.reduce((sum, p) => sum + p.grossAmt, 0) : service.price;

      setItems([...items, {
        id: service.id,
        name: service.name,
        category: service.category,
        price: isSurgery ? totalFromBreakdown : service.price,
        quantity: 1,
        discount: 0,
        tax: 0,
        total: isSurgery ? totalFromBreakdown : service.price,
        surgeryBreakdown: defaultBreakdown ? [...defaultBreakdown] : undefined,
        totalGrossAmt: defaultBreakdown ? totalFromBreakdown : undefined,
        mouDiscount: 0,
        receivedAmt: defaultBreakdown ? totalFromBreakdown : undefined,
        isExpanded: false
      }]);

      // If surgery item is added, enable surgery billing mode
      if (isSurgery) {
        setIsSurgeryBillingMode(true);
      }
    }
  };

  // Check if any surgery item exists in the bill
  useEffect(() => {
    const hasSurgery = items.some(i => i.category === 'Surgery');
    setIsSurgeryBillingMode(hasSurgery);
  }, [items]);

  // Toggle surgery breakdown expansion
  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Update surgery breakdown particular
  const updateSurgeryParticular = (itemId: string, sNo: number, field: keyof SurgeryParticular, value: number | string) => {
    setItems(items.map(item => {
      if (item.id !== itemId || !item.surgeryBreakdown) return item;

      const updatedBreakdown = item.surgeryBreakdown.map(p => {
        if (p.sNo !== sNo) return p;
        const updated = { ...p, [field]: value };
        // Recalculate net and gross amounts
        if (field === 'cost' || field === 'qty') {
          updated.netAmt = Number(updated.cost) * Number(updated.qty);
          updated.grossAmt = updated.netAmt;
        }
        return updated;
      });

      const totalGross = updatedBreakdown.reduce((sum, p) => sum + p.grossAmt, 0);
      return {
        ...item,
        surgeryBreakdown: updatedBreakdown,
        totalGrossAmt: totalGross,
        total: totalGross - (item.mouDiscount || 0),
        price: totalGross,
        receivedAmt: totalGross - (item.mouDiscount || 0)
      };
    }));
  };

  // Apply package to surgery item - replaces all particulars with package prices
  const applySurgeryPackage = (itemId: string, packageAmount: PackageAmount) => {
    setItems(items.map(item => {
      if (item.id !== itemId) return item;

      const newBreakdown = generateSurgeryBreakdown(packageAmount);
      const totalGross = newBreakdown.reduce((sum, p) => sum + p.grossAmt, 0);

      return {
        ...item,
        surgeryBreakdown: newBreakdown,
        selectedPackage: packageAmount,
        totalGrossAmt: totalGross,
        total: totalGross - (item.mouDiscount || 0),
        price: totalGross,
        receivedAmt: totalGross - (item.mouDiscount || 0)
      };
    }));
  };

  // Add new particular to surgery breakdown
  const addSurgeryParticular = (itemId: string) => {
    setItems(items.map(item => {
      if (item.id !== itemId || !item.surgeryBreakdown) return item;

      const newSNo = item.surgeryBreakdown.length + 1;
      const newParticular: SurgeryParticular = {
        sNo: newSNo,
        particular: 'New Item',
        cost: 0,
        qty: 1,
        netAmt: 0,
        grossAmt: 0
      };

      return {
        ...item,
        surgeryBreakdown: [...item.surgeryBreakdown, newParticular]
      };
    }));
  };

  // Remove particular from surgery breakdown
  const removeSurgeryParticular = (itemId: string, sNo: number) => {
    setItems(items.map(item => {
      if (item.id !== itemId || !item.surgeryBreakdown) return item;

      const updatedBreakdown = item.surgeryBreakdown
        .filter(p => p.sNo !== sNo)
        .map((p, idx) => ({ ...p, sNo: idx + 1 }));

      const totalGross = updatedBreakdown.reduce((sum, p) => sum + p.grossAmt, 0);
      return {
        ...item,
        surgeryBreakdown: updatedBreakdown,
        totalGrossAmt: totalGross,
        total: totalGross - (item.mouDiscount || 0),
        price: totalGross,
        receivedAmt: totalGross - (item.mouDiscount || 0)
      };
    }));
  };

  // Update MOU discount for surgery
  const updateMouDiscount = (itemId: string, discount: number) => {
    setItems(items.map(item => {
      if (item.id !== itemId) return item;
      const totalGross = item.totalGrossAmt || item.total;
      return {
        ...item,
        mouDiscount: discount,
        total: totalGross - discount,
        receivedAmt: totalGross - discount
      };
    }));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string, q: number) => {
    setItems(items.map(i => i.id === id ? { ...i, quantity: Math.max(1, q), total: Math.max(1, q) * i.price } : i));
  };

  const updatePrice = (id: string, newPrice: number) => {
    setItems(items.map(i => {
      if (i.id === id) {
        const totalGross = newPrice * i.quantity;
        return { 
          ...i, 
          price: newPrice, 
          totalGrossAmt: i.category === 'Surgery' ? totalGross : i.totalGrossAmt,
          total: totalGross - (i.mouDiscount || 0)
        };
      }
      return i;
    }));
  };

  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  const totalDiscount = items.reduce((sum, i) => sum + i.discount, 0);
  const totalTax = 0; // FIXED: Removed GST calculation
  const grandTotal = subtotal - totalDiscount - discountAmount;

  // ============ SURGERY BILL FUNCTIONS ============

  // Create Initial/Provisional Surgery Bill
  const handleCreateInitialBill = async () => {
    if (!patient || !currentRegId) {
      showAlert('Please select a patient first');
      return;
    }

    const surgeryItems = items.filter(i => i.category === 'Surgery');
    if (surgeryItems.length === 0) {
      showAlert('Please add at least one surgery item');
      return;
    }

    if (!govtInsuranceEnabled) {
      showAlert('Please enable insurance to create a surgery bill');
      return;
    }

    if (securityDeposit <= 0) {
      showAlert('Please enter the Security Deposit / Upfront Amount');
      return;
    }

    try {
      const billData = {
        patientName: patient.name || '',
        surgeryName: surgeryItems.map(s => s.name).join(', '),
        surgeryBreakdown: surgeryItems.flatMap(s => s.surgeryBreakdown || []),
        totalSurgeryCost: totalSurgeryCost,
        hasInsurance: true,
        insuranceType: insuranceCategory,
        insuranceCompany: insuranceCompany,
        insuranceTPA: insuranceTPA,
        insuranceContactPerson: {
            name: contactName,
            email: contactEmail,
            phone: contactPhone,
            address: contactAddress
        },
        claimNumber: claimNumber,
        dateOfSurgery: dateOfSurgery,
        dateOfDischarge: dateOfDischarge,
        estimatedInsuranceCoverage: insuranceCovered,
        securityDeposit: securityDeposit,
        securityDepositPaid: true,
        securityDepositPaymentMethod: paymentMethod,
        securityDepositDate: new Date().toISOString(),
        estimatedPatientShare: patientPayable,
        notes: 'Insurance Approval Pending',
        createdBy: currentUser || 'BillingStaff',
        items: surgeryItems.map(item => ({
          description: item.name,
          amount: item.price,
          quantity: item.quantity
        }))
      };

      const response = await fetch(API_ENDPOINTS.BILLING_SURGERY.CREATE_INITIAL(currentRegId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(billData)
      });

      if (response.ok) {
        const result = await response.json();
        showAlert(`âœ… Initial Bill Created!\n\nBill ID: ${result.billId}\n\nSecurity Deposit of ₹${securityDeposit.toLocaleString('en-IN')} collected.\n\nInsurance approval pending.`);
        handlePrintInitialBill(billData, result.billId);
        fetchSurgeryBills(); // Refresh the list
      } else {
        const error = await response.json();
        showAlert(`Error: ${error.detail || 'Failed to create initial bill'}`);
      }
    } catch (err) {
      console.error('Error creating initial bill:', err);
      showAlert('Failed to create initial bill. Please try again.');
    }
  };

  // Create Final Settlement Surgery Bill
  const handleCreateFinalBill = async () => {
    if (!patient || !currentRegId) {
      showAlert('Please select a patient first');
      return;
    }

    if (!existingInitialBill && !surgeryBillStage) {
      showAlert('No initial bill found. Please create an initial bill first.');
      return;
    }

    if (insuranceApprovedAmount <= 0) {
      showAlert('Please enter the Insurance Approved Amount (as per approval letter)');
      return;
    }

    try {
      const surgeryItems = items.filter(i => i.category === 'Surgery');

      const billData = {
        initialBillId: existingInitialBill?.billId || '',
        patientName: patient.name || '',
        surgeryName: existingInitialBill?.surgeryName || surgeryItems.map(s => s.name).join(', '),
        surgeryBreakdown: existingInitialBill?.surgeryBreakdown || surgeryItems.flatMap(s => s.surgeryBreakdown || []),
        totalSurgeryCost: existingInitialBill?.totalSurgeryCost || totalSurgeryCost,
        hasInsurance: true,
        insuranceType: existingInitialBill?.insuranceType || insuranceCategory,
        insuranceCompany: existingInitialBill?.insuranceCompany || insuranceCompany,
        insuranceTPA: existingInitialBill?.insuranceTPA || insuranceTPA,
        claimNumber: claimNumber,
        insuranceApprovedAmount: insuranceApprovedAmount,
        insuranceClaimReference: '', // Can be added as input
        insuranceApprovalDate: new Date().toISOString(),
        securityDepositPaid: existingInitialBill?.securityDeposit || securityDeposit,
        finalPaymentMethod: paymentMethod,
        notes: '',
        createdBy: currentUser || 'BillingStaff',
        dateOfSurgery: dateOfSurgery,
        dateOfDischarge: dateOfDischarge,
        items: surgeryItems.map(item => ({
          description: item.name,
          amount: item.price,
          quantity: item.quantity
        }))
      };

      const response = await fetch(API_ENDPOINTS.BILLING_SURGERY.CREATE_FINAL(currentRegId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(billData)
      });

      if (response.ok) {
        const result = await response.json();
        const calc = result.calculation;

        let message = `âœ… Final Settlement Bill Created!\n\nBill ID: ${result.billId}\n\n`;
        message += `ðŸ“Š Calculation Summary:\n`;
        message += `• Total Surgery Cost: ₹${calc.totalSurgeryCost.toLocaleString('en-IN')}\n`;
        message += `• Insurance Approved: ₹${calc.insuranceApprovedAmount.toLocaleString('en-IN')}\n`;
        message += `• Patient's Share: ₹${calc.patientTotalShare.toLocaleString('en-IN')}\n`;
        message += `• Security Deposit Paid: ₹${calc.securityDepositPaid.toLocaleString('en-IN')}\n\n`;

        if (calc.balancePayable > 0) {
          message += `ðŸ’° Balance Payable by Patient: ₹${calc.balancePayable.toLocaleString('en-IN')}`;
        } else if (calc.refundAmount > 0) {
          message += `ðŸ’µ Refund Due to Patient: ₹${calc.refundAmount.toLocaleString('en-IN')}`;
        } else {
          message += `âœ“ Bill Fully Settled - No Balance Due`;
        }

        showAlert(message);
        handlePrintFinalBill(billData, result.billId, calc);
        fetchSurgeryBills();
        setExistingInitialBill(null); // Clear since it's now settled
      } else {
        const error = await response.json();
        showAlert(`Error: ${error.detail || 'Failed to create final bill'}`);
      }
    } catch (err) {
      console.error('Error creating final bill:', err);
      showAlert('Failed to create final bill. Please try again.');
    }
  };

  // Load existing initial bill data when continuing to final bill
  const handleContinueToFinalBill = (initialBill: any) => {
    setExistingInitialBill(initialBill);
    setSurgeryBillStage('final');
    setIsSurgeryBillingMode(true); // Enable surgery billing mode
    setSecurityDeposit(initialBill.securityDeposit || 0);
    setInsuranceCategory(initialBill.insuranceType);
    setInsuranceCompany(initialBill.insuranceCompany);
    setInsuranceTPA(initialBill.insuranceTPA);
    setDateOfDischarge(initialBill.dateOfDischarge || '');
    setGovtInsuranceEnabled(true);

    // Scroll to the surgery billing section
    setTimeout(() => {
      const surgerySection = document.getElementById('surgery-billing-section');
      if (surgerySection) {
        surgerySection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleInsuranceToggle = (enabled: boolean) => {
    setGovtInsuranceEnabled(enabled);

    if (!enabled) {
      setInsuranceCategory(null);
      setInsuranceCompany('');
      setInsuranceTPA('');
      setInsuranceCovered(0);
      setPatientPayable(grandTotal);
    }
  };

  useEffect(() => {
    const amount = grandTotal;
    if (!govtInsuranceEnabled || !insuranceCategory || !insuranceCompany) {
      setInsuranceCovered(0);
      setPatientPayable(amount);
      return;
    }

    const plan = MOCK_INSURANCE_PLANS[insuranceCategory]
      .find(p => p.company === insuranceCompany);

    if (!plan) return;

    const covered = Math.round(
      (amount * plan.coveragePercent) / 100
    );

    setInsuranceCovered(covered);
    setPatientPayable(amount - covered);

  }, [govtInsuranceEnabled, insuranceCategory, insuranceCompany, grandTotal]);

  // Convert number to words (Indian format)
  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if (num === 0) return 'Zero';

    const convertLessThanThousand = (n: number): string => {
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLessThanThousand(n % 100) : '');
    };

    const convertToIndian = (n: number): string => {
      if (n < 1000) return convertLessThanThousand(n);
      if (n < 100000) {
        return convertLessThanThousand(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convertLessThanThousand(n % 1000) : '');
      }
      if (n < 10000000) {
        return convertLessThanThousand(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convertToIndian(n % 100000) : '');
      }
      return convertLessThanThousand(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convertToIndian(n % 10000000) : '');
    };

    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);

    let result = 'Rupees ' + convertToIndian(rupees);
    if (paise > 0) {
      result += ' and ' + convertToIndian(paise) + ' Paise';
    }
    return result + ' Only';
  };

  // ============ IFRAME PRINT HELPER (non-blocking, no focus loss) ============
  const printViaIframe = (htmlContent: string) => {
    const existingFrame = document.getElementById('__print_frame__');
    if (existingFrame) existingFrame.remove();

    const iframe = document.createElement('iframe');
    iframe.id = '__print_frame__';
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:0;';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      // Remove after a delay to let the browser send the print job
      setTimeout(() => iframe.remove(), 1000);
    };
  };

  // ============ PRINT INITIAL SURGERY BILL ============
  const handlePrintInitialBill = (billData: any, billId: string) => {
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = today.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    // Build surgery breakdown rows
    let breakdownRows = '';
    let sNo = 1;
    (billData.surgeryBreakdown || []).forEach((item: any) => {
      breakdownRows += `
        <tr>
          <td style="border: 1px solid #333; padding: 3px; text-align: center; font-size: 10px;">${sNo++}</td>
          <td style="border: 1px solid #333; padding: 3px; font-size: 10px;">${item.particular}</td>
          <td style="border: 1px solid #333; padding: 3px; text-align: right; font-size: 10px;">₹${item.cost?.toLocaleString('en-IN') || '0'}</td>
          <td style="border: 1px solid #333; padding: 3px; text-align: center; font-size: 10px;">${item.qty || 1}</td>
          <td style="border: 1px solid #333; padding: 3px; text-align: right; font-size: 10px;">₹${item.grossAmt?.toLocaleString('en-IN') || '0'}</td>
        </tr>
      `;
    });

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Initial Surgery Bill - ${billId}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.2; color: #000; }
          @page { size: A4; margin: 10mm; }
          .invoice-container { max-width: 100%; margin: 0; padding: 0; page-break-after: always; }
          .page-break { page-break-after: always; }
          .page-number { position: fixed; bottom: 10mm; right: 10mm; font-size: 9px; }
          .header { text-align: center; padding: 8px 0; border-bottom: 1px solid #333; background: linear-gradient(135deg, #f8f8f8 0%, #e8e8e8 100%); }
          .hospital-name { font-size: 14px; font-weight: bold; color: #2c5282; margin: 2px 0; }
          .bill-title { text-align: center; font-size: 13px; font-weight: bold; padding: 6px; background-color: #e67e22; color: white; letter-spacing: 1px; }
          .pending-note { text-align: center; font-size: 10px; padding: 5px; background-color: #fff3cd; color: #856404; font-weight: bold; }
          .patient-info { display: grid; grid-template-columns: 1fr 1fr; padding: 8px; border-bottom: 1px solid #333; gap: 5px; font-size: 10px; }
          .info-row { display: flex; margin-bottom: 2px; }
          .info-label { font-weight: bold; min-width: 100px; color: #333; }
          .billing-table { width: 100%; border-collapse: collapse; }
          .billing-table th { background-color: #e67e22; color: white; padding: 4px 3px; text-align: center; border: 1px solid #333; font-size: 9px; }
          .totals-section { padding: 8px; border-top: 1px solid #333; }
          .total-row { display: flex; justify-content: flex-end; margin-bottom: 3px; font-size: 10px; }
          .total-label { font-weight: bold; min-width: 180px; text-align: right; padding-right: 15px; }
          .total-value { min-width: 100px; text-align: right; font-weight: bold; }
          .insurance-info { background-color: #e3f2fd; padding: 8px; margin: 8px 0; border: 1px solid #2196f3; font-size: 9px; }
          .insurance-info h4 { margin-bottom: 5px; color: #1565c0; font-size: 10px; }
          .insurance-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
          .footer { padding: 10px; border-top: 1px solid #333; margin-top: 10px; font-size: 9px; }
          .signature-box { text-align: center; padding-top: 15px; }
          .signature-line { border-top: 1px solid #333; width: 100px; margin: 0 auto; padding-top: 2px; font-size: 9px; }
          @media print { body { padding: 0; margin: 0; } .invoice-container { border: none; } }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header" style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; align-items: center; padding: 8px 0;">
            <div style="text-align: left; font-size: 8px; line-height: 1.3;">
              <div style="font-weight: bold; font-size: 9px; margin-bottom: 2px;">SPARK EYE CARE HOSPITAL</div>
              <div><strong>Malakpet:</strong> 182-705/5/12/A, Hyderabad 500008</div>
              <div><strong>Ph:</strong> 040-24542000</div>
            </div>
            
            <div style="text-align: center;">
              <img src="/Hospital.png" alt="SPARK Logo" style="max-width: 80px; height: auto;">
              <div style="font-size: 10px; font-weight: bold; margin-top: 4px;">SPARK</div>
            </div>
            
            <div style="text-align: right; font-size: 8px; line-height: 1.3;">
              <div style="font-weight: bold; font-size: 9px; margin-bottom: 2px;">SPARK EYE CARE HOSPITAL</div>
              <div><strong>Secunderabad:</strong> 1st Floor, Metro Pillar 1033, 500020</div>
              <div><strong>Ph:</strong> 090-29500266</div>
            </div>
          </div>
          
          <div class="bill-title">IP INTIAL  BILL</div>
          <div class="pending-note">âš ï¸ FINAL APPROVAL PENDING - This is a provisional bill</div>
          
          <div class="patient-info">
            <div>
              <div class="info-row"><span class="info-label">Bill No:</span> <span>${billId}</span></div>
              <div class="info-row"><span class="info-label">Patient Name:</span> <span>${billData.patientName}</span></div>
              <div class="info-row"><span class="info-label">Reg. ID:</span> <span>${currentRegId}</span></div>
            </div>
            <div>
              <div class="info-row"><span class="info-label">Date:</span> <span>${dateStr}</span></div>
              <div class="info-row"><span class="info-label">Time:</span> <span>${timeStr}</span></div>
              <div class="info-row"><span class="info-label">Admission Date:</span> <span>${billData.admissionDate || dateStr}</span></div>
              <div class="info-row"><span class="info-label">Discharge Date:</span> <span>${billData.dateOfDischarge || '-'}</span></div>
            </div>
          </div>
          
          <div class="insurance-info">
            <h4>ðŸ¥ Insurance Information</h4>
            <div class="insurance-grid">
              <div><strong>Type:</strong> ${billData.insuranceType}</div>
              <div><strong>Company:</strong> ${billData.insuranceCompany}</div>
              <div><strong>TPA:</strong> ${billData.insuranceTPA}</div>
              ${billData.claimNumber ? `<div style="grid-column: span 2;"><strong>Claim Number:</strong> ${billData.claimNumber}</div>` : ''}
            </div>
          </div>
          
          <div style="padding: 6px 0;">
            <h4 style="margin-bottom: 4px; border-bottom: 1px solid #1565c0; padding-bottom: 4px; font-size: 10px;">ðŸ’Š Surgery: ${billData.surgeryName}</h4>
            <table class="billing-table">
              <thead>
                <tr>
                  <th style="width: 30px;">S.No</th>
                  <th>Particulars</th>
                  <th style="width: 70px;">Cost</th>
                  <th style="width: 40px;">Qty</th>
                  <th style="width: 70px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${breakdownRows}
              </tbody>
              <tfoot>
                <tr style="background-color: #f5f5f5;">
                  <td colspan="4" style="border: 1px solid #333; padding: 4px; text-align: right; font-weight: bold; font-size: 10px;">Total:</td>
                  <td style="border: 1px solid #333; padding: 4px; text-align: right; font-weight: bold; font-size: 11px;">₹${billData.totalSurgeryCost?.toLocaleString('en-IN')}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          <div class="totals-section">
            <div class="total-row">
              <span class="total-label">Total Surgery Cost:</span>
              <span class="total-value">₹${billData.totalSurgeryCost?.toLocaleString('en-IN')}</span>
            </div>
          </div>
          
          <div class="footer">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div class="signature-box">
                <div class="signature-line">Patient Signature</div>
              </div>
              <div class="signature-box">
                <div class="signature-line">Billing Staff</div>
              </div>
            </div>
            <div style="text-align: center; margin-top: 10px; font-size: 8px; color: #666;">
              Note: This is a provisional bill. Final bill will be generated after insurance approval.
            </div>
          </div>
          <div class="page-number">Page 1</div>
        </div>
      </body>
      </html>
    `;

    printViaIframe(printContent);
  };

  // ============ PRINT FINAL SURGERY BILL ============
  const handlePrintFinalBill = (billData: any, billId: string, calculation: any) => {
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = today.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    // Build surgery breakdown rows
    let breakdownRows = '';
    let sNo = 1;
    (billData.surgeryBreakdown || []).forEach((item: any) => {
      breakdownRows += `
        <tr>
          <td style="border: 1px solid #333; padding: 6px; text-align: center;">${sNo++}</td>
          <td style="border: 1px solid #333; padding: 6px;">${item.particular}</td>
          <td style="border: 1px solid #333; padding: 6px; text-align: right;">₹${item.cost?.toLocaleString('en-IN') || '0'}</td>
          <td style="border: 1px solid #333; padding: 6px; text-align: center;">${item.qty || 1}</td>
          <td style="border: 1px solid #333; padding: 6px; text-align: right;">₹${item.grossAmt?.toLocaleString('en-IN') || '0'}</td>
        </tr>
      `;
    });

    const hasBalance = calculation.balancePayable > 0;
    const hasRefund = calculation.refundAmount > 0;
    const isSettled = !hasBalance && !hasRefund;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>IP Final  Bill - ${billId}</title>
        <style>
          @page { size: A4; margin: 10mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.2; color: #000; padding: 0; }
          .invoice-container { max-width: 100%; border: 1px solid #333; padding: 0; }
          .header { display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; align-items: center; padding: 8px 0; border-bottom: 2px solid #333; }
          .hospital-name { font-size: 24px; font-weight: bold; color: #2c5282; margin: 5px 0; }
          .bill-title { text-align: center; font-size: 16px; font-weight: bold; padding: 6px; background-color: #27ae60; color: white; letter-spacing: 2px; }
          .patient-info { display: grid; grid-template-columns: 1fr 1fr; padding: 8px; border-bottom: 1px solid #333; gap: 3px; }
          .info-row { display: flex; margin-bottom: 3px; }
          .info-label { font-weight: bold; min-width: 110px; color: #333; }
          .billing-table { width: 100%; border-collapse: collapse; }
          .billing-table th { background-color: #27ae60; color: white; padding: 4px 3px; text-align: center; border: 1px solid #333; font-size: 9px; }
          .billing-table td { font-size: 10px; }
          .totals-section { padding: 8px; border-top: 2px solid #333; }
          .total-row { display: flex; justify-content: flex-end; margin-bottom: 6px; }
          .total-label { font-weight: bold; min-width: 200px; text-align: right; padding-right: 15px; }
          .total-value { min-width: 100px; text-align: right; font-weight: bold; }
          .final-amount { font-size: 15px; border: 2px solid ${hasBalance ? '#e74c3c' : '#27ae60'}; padding: 10px; margin: 8px; border-radius: 6px; background: ${hasBalance ? '#fdf2f2' : '#e8f8f0'}; text-align: center; }
          .insurance-info { background-color: #f7f7f7; padding: 8px; margin: 8px; border-radius: 6px; border: 1px solid #27ae60; }
          .calculation-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          .calculation-table td { padding: 4px; border-bottom: 1px solid #ddd; font-size: 10px; }
          .footer { padding: 10px; border-top: 1px solid #333; margin-top: 10px; }
          .signature-box { text-align: center; padding-top: 15px; }
          .signature-line { border-top: 1px solid #333; width: 120px; margin: 0 auto; padding-top: 3px; font-size: 9px; }
          .page-break { page-break-after: always; }
          .page-number { position: fixed; bottom: 10mm; right: 10mm; font-size: 9px; color: #666; }
          @media print { body { padding: 0; } .invoice-container { border: none; } }
        </style>
      </head>
      <body>
        <div class="invoice-container" style="padding: 8px;">
          <div class="header" style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; align-items: center; padding: 8px 0; border-bottom: 2px solid #333;">
            <!-- Left Address -->
            <div style="text-align: left; font-size: 9px; line-height: 1.3;">
              <div style="font-weight: bold; font-size: 10px; margin-bottom: 2px;">SPARK EYE CARE HOSPITAL</div>
              <div><strong>Malakpet:</strong></div>
              <div>182-705/5/12/A Opp Reliance Trand,</div>
              <div>New Malakpet, Hyderabad 500008</div>
              <div style="margin-top: 3px;"><strong>Phone:</strong> 040-24542000</div>
            </div>
            
            <!-- Center Logo -->
            <div style="text-align: center;">
              <img src="/Hospital.png" alt="SPARK Logo" style="max-width: 100px; height: auto; margin: 0 auto;">
              <div style="font-size: 10px; font-weight: bold; margin-top: 3px;">SPARK</div>
              <div style="font-size: 8px; color: #666;">Eye Care Hospital</div>
            </div>
            
            <!-- Right Address -->
            <div style="text-align: right; font-size: 9px; line-height: 1.3;">
              <div style="font-weight: bold; font-size: 10px; margin-bottom: 6px;">SPARK EYE CARE HOSPITAL</div>
              <div><strong>Secunderabad:</strong></div>
              <div>1st Floor Vijeetha Sanjeerani Apts,</div>
              <div>Metro Pillar 1033, Opp Gandhi Hospital,</div>
              <div>Musheerabad, Telangana 500020</div>
              <div style="margin-top: 3px;"><strong>Phone:</strong> 090-29500266</div>
            </div>
          </div>
          
          <div class="bill-title">IP FINAL BILL</div>
          
          <div class="patient-info">
            <div>
              <div class="info-row"><span class="info-label">Bill No:</span> <span>${billId}</span></div>
              <div class="info-row"><span class="info-label">Patient Name:</span> <span>${billData.patientName}</span></div>
              <div class="info-row"><span class="info-label">Reg. ID:</span> <span>${currentRegId}</span></div>
              ${billData.initialBillId ? `<div class="info-row"><span class="info-label">Initial Bill:</span> <span>${billData.initialBillId}</span></div>` : ''}
            </div>
            <div>
              <div class="info-row"><span class="info-label">Date:</span> <span>${dateStr}</span></div>
              <div class="info-row"><span class="info-label">Time:</span> <span>${timeStr}</span></div>
              <div class="info-row"><span class="info-label">Admission Date:</span> <span>${billData.admissionDate || dateStr}</span></div>
              <div class="info-row"><span class="info-label">Discharge Date:</span> <span>${billData.dateOfDischarge || '-'}</span></div>
            </div>
          </div>
          
          <div class="insurance-info">
            <h4 style="margin-bottom: 6px; color: #27ae60; font-size: 10px;">âœ“ Insurance Approved</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 10px;">
              <div><strong>Type:</strong> ${billData.insuranceType}</div>
              <div><strong>Company:</strong> ${billData.insuranceCompany}</div>
              <div><strong>TPA:</strong> ${billData.insuranceTPA}</div>
              <div><strong>Approved Amount:</strong> <span style="color: #27ae60; font-weight: bold;">₹${calculation.insuranceApprovedAmount?.toLocaleString('en-IN')}</span></div>
              ${billData.claimNumber ? `<div style="grid-column: span 2;"><strong>Claim Number:</strong> ${billData.claimNumber}</div>` : ''}
            </div>
          </div>
          
          <div style="padding: 8px;">
            <h4 style="margin-bottom: 6px; border-bottom: 1px solid #27ae60; padding-bottom: 4px; font-size: 10px;">ðŸ’Š Surgery: ${billData.surgeryName}</h4>
            <h4 style="margin-bottom: 6px; color: #666; font-size: 9px;">Breakdown - Surgery Particulars</h4>
            <table class="billing-table">
              <thead>
                <tr>
                  <th style="width: 40px;">S.No</th>
                  <th>Particulars</th>
                  <th style="width: 80px;">Cost</th>
                  <th style="width: 50px;">Qty</th>
                  <th style="width: 80px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${breakdownRows}
              </tbody>
              <tfoot>
                <tr style="background-color: #f5f5f5;">
                  <td colspan="4" style="border: 1px solid #333; padding: 4px 3px; text-align: right; font-weight: bold; font-size: 10px;">Total Surgery Cost:</td>
                  <td style="border: 1px solid #333; padding: 4px 3px; text-align: right; font-weight: bold; font-size: 11px;">₹${calculation.totalSurgeryCost?.toLocaleString('en-IN')}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          <div style="padding: 8px;">
            <h4 style="margin-bottom: 6px; font-size: 10px;">ðŸ’° Settlement Calculation</h4>
            <table class="calculation-table">
              <tr>
                <td>Total Surgery Cost</td>
                <td style="text-align: right; font-weight: bold;">₹${calculation.totalSurgeryCost?.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td>Insurance Approved Amount</td>
                <td style="text-align: right; color: #27ae60; font-weight: bold;">- ₹${calculation.insuranceApprovedAmount?.toLocaleString('en-IN')}</td>
              </tr>
              <tr style="background-color: #f5f5f5;">
                <td><strong>Patient's Total Share</strong></td>
                <td style="text-align: right; font-weight: bold;">₹${calculation.patientTotalShare?.toLocaleString('en-IN')}</td>
              </tr>
              <tr style="border-top: 2px solid #333;">
                <td><strong>${hasBalance ? 'Balance Payable by Patient' : 'Final Balance'}</strong></td>
                <td style="text-align: right; font-size: 12px; font-weight: bold; color: ${hasBalance ? '#e74c3c' : '#27ae60'};">
                  ${hasBalance ? '₹' + calculation.balancePayable?.toLocaleString('en-IN') : '₹0 (Settled)'}
                </td>
              </tr>
            </table>
          </div>
          
          <div class="final-amount">
            ${hasBalance ? `
              <div style="font-size: 11px; color: #e74c3c;">Balance Payable by Patient</div>
              <div style="font-size: 18px; font-weight: bold; color: #e74c3c;">₹${calculation.balancePayable?.toLocaleString('en-IN')}</div>
            ` : `
              <div style="font-size: 11px; color: #27ae60;">âœ“ Bill Fully Settled</div>
              <div style="font-size: 16px; font-weight: bold; color: #27ae60;">No Balance Due</div>
            `}
          </div>
          
          <div class="footer">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 9px;">
              <div class="signature-box">
                <div class="signature-line">Patient Signature</div>
              </div>
              <div class="signature-box">
                <div class="signature-line">Billing Staff</div>
              </div>
            </div>
            <div style="text-align: center; margin-top: 10px; font-size: 8px; color: #666;">
              This is a computer-generated final settlement bill.
            </div>
          </div>
          <div class="page-number">Page 1</div>
        </div>
      </body>
      </html>
    `;

    printViaIframe(printContent);
  };

  const handlePrint = () => {
    if (!patient) {
      showAlert('Please select a patient first');
      return;
    }

    // Generate unique invoice number
    const invoiceNo = `INV-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = today.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    // Calculate totals
    const totalGross = items.reduce((sum, item) => sum + (item.totalGrossAmt || item.total), 0);
    const totalMouDiscount = items.reduce((sum, item) => sum + (item.mouDiscount || 0), 0);
    const receivedAmount = totalGross - totalMouDiscount;

    // Create billData object for print template
    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    };

    const billData = {
      patientName: patient?.name || '',
      admissionDate: formatDate(dateOfSurgery) || dateStr,
      dateOfDischarge: formatDate(dateOfDischarge) || '',
      insuranceType: insuranceCategory || '',
      insuranceCompany: insuranceCompany || '',
      insuranceTPA: insuranceTPA || '',
      claimNumber: claimNumber || ''
    };

    // Build invoice rows from surgery breakdown or regular items
    let invoiceRows = '';
    let sNo = 1;

    items.forEach(item => {
      if (item.surgeryBreakdown && item.surgeryBreakdown.length > 0) {
        // Add surgery name as header
        invoiceRows += `
          <tr style="background-color: #f5f5f5;">
            <td colspan="6" style="border: 1px solid #333; padding: 8px; font-weight: bold; font-size: 13px;">
              ${item.name}
            </td>
          </tr>
        `;

        // Add breakdown items
        item.surgeryBreakdown.forEach(part => {
          invoiceRows += `
            <tr>
              <td style="border: 1px solid #333; padding: 6px; text-align: center;">${sNo}</td>
              <td style="border: 1px solid #333; padding: 6px;">${part.particular}</td>
              <td style="border: 1px solid #333; padding: 6px; text-align: right;">₹${part.cost.toLocaleString('en-IN')}</td>
              <td style="border: 1px solid #333; padding: 6px; text-align: center;">${part.qty}</td>
              <td style="border: 1px solid #333; padding: 6px; text-align: right;">₹${part.netAmt.toLocaleString('en-IN')}</td>
              <td style="border: 1px solid #333; padding: 6px; text-align: right;">₹${part.grossAmt.toLocaleString('en-IN')}</td>
            </tr>
          `;
          sNo++;
        });

        // Add subtotal row for this surgery
        invoiceRows += `
          <tr style="background-color: #e8e8e8;">
            <td colspan="4" style="border: 1px solid #333; padding: 6px; text-align: right; font-weight: bold;">Subtotal (${item.name}):</td>
            <td style="border: 1px solid #333; padding: 6px; text-align: right; font-weight: bold;">₹${(item.totalGrossAmt || item.total).toLocaleString('en-IN')}</td>
            <td style="border: 1px solid #333; padding: 6px; text-align: right; font-weight: bold;">₹${(item.totalGrossAmt || item.total).toLocaleString('en-IN')}</td>
          </tr>
        `;
      } else {
        // Regular service item
        invoiceRows += `
          <tr>
            <td style="border: 1px solid #333; padding: 6px; text-align: center;">${sNo}</td>
            <td style="border: 1px solid #333; padding: 6px;">${item.name}</td>
            <td style="border: 1px solid #333; padding: 6px; text-align: right;">₹${item.price.toLocaleString('en-IN')}</td>
            <td style="border: 1px solid #333; padding: 6px; text-align: center;">${item.quantity}</td>
            <td style="border: 1px solid #333; padding: 6px; text-align: right;">₹${item.total.toLocaleString('en-IN')}</td>
            <td style="border: 1px solid #333; padding: 6px; text-align: right;">₹${item.total.toLocaleString('en-IN')}</td>
          </tr>
        `;
        sNo++;
      }
    });

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${invoiceNo}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, sans-serif; 
            font-size: 12px; 
            line-height: 1.4;
            color: #000;
            padding: 20px;
          }
          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            border: 2px solid #333;
            padding: 0;
          }
          .header {
            text-align: center;
            padding: 15px;
            border-bottom: 2px solid #333;
            background: linear-gradient(135deg, #f8f8f8 0%, #e8e8e8 100%);
          }
          .header img {
            max-height: 60px;
            margin-bottom: 5px;
          }
          .hospital-name {
            font-size: 24px;
            font-weight: bold;
            color: #2c5282;
            margin: 5px 0;
          }
          .hospital-subtitle {
            font-size: 11px;
            color: #666;
          }
          .hospital-contact {
            font-size: 10px;
            color: #555;
            margin-top: 5px;
          }
          .bill-title {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            padding: 10px;
            background-color: #2c5282;
            color: white;
            letter-spacing: 2px;
          }
          .patient-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            padding: 15px;
            border-bottom: 1px solid #333;
            gap: 10px;
          }
          .info-row {
            display: flex;
            margin-bottom: 4px;
          }
          .info-label {
            font-weight: bold;
            min-width: 120px;
            color: #333;
          }
          .info-value {
            color: #000;
          }
          .billing-table {
            width: 100%;
            border-collapse: collapse;
          }
          .billing-table th {
            background-color: #2c5282;
            color: white;
            padding: 10px 6px;
            text-align: center;
            border: 1px solid #333;
            font-size: 11px;
          }
          .billing-table td {
            font-size: 11px;
          }
          .totals-section {
            padding: 15px;
            border-top: 2px solid #333;
          }
          .total-row {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 8px;
          }
          .total-label {
            font-weight: bold;
            min-width: 200px;
            text-align: right;
            padding-right: 20px;
          }
          .total-value {
            min-width: 120px;
            text-align: right;
            font-weight: bold;
          }
          .grand-total {
            font-size: 16px;
            color: #2c5282;
            border-top: 2px solid #333;
            padding-top: 10px;
            margin-top: 10px;
          }
          .amount-words {
            margin-top: 15px;
            padding: 10px;
            background-color: #f5f5f5;
            border: 1px solid #ddd;
            font-style: italic;
          }
          .footer {
            display: grid;
            grid-template-columns: 1fr 1fr;
            padding: 20px;
            border-top: 1px solid #333;
            margin-top: 20px;
          }
          .signature-box {
            text-align: center;
            padding-top: 40px;
          }
          .signature-line {
            border-top: 1px solid #333;
            width: 150px;
            margin: 0 auto;
            padding-top: 5px;
          }
          .thank-you {
            text-align: center;
            padding: 10px;
            background-color: #2c5282;
            color: white;
            font-size: 11px;
          }
          @media print {
            body { padding: 0; }
            .invoice-container { border: none; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <img src="/Hospital.png" alt="Hospital Logo" onerror="this.style.display='none'"/>
            <div class="hospital-name">SPARK Eye Care Hospital</div>
            <div class="hospital-subtitle">Excellence in Eye Care & Surgery</div>
            <div class="hospital-contact">
              ðŸ“ 123 Medical Center Road, Healthcare District | ðŸ“ž +91 9876543210 | âœ‰ info@sparkeyecare.com
            </div>
          </div>
          
          <div class="bill-title">IP FINAL BILL</div>
          
          <div class="patient-info">
            <div>
              <div class="info-row">
                <span class="info-label">Patient Name:</span>
                <span class="info-value">${patient?.name || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Registration ID:</span>
                <span class="info-value">${patient?.registrationId || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Age / Gender:</span>
                <span class="info-value">${patient?.demographics?.age || patient?.patientDetails?.age || patient?.age || 'N/A'}Y / ${patient?.demographics?.sex || patient?.patientDetails?.sex || patient?.sex || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Phone:</span>
                <span class="info-value">${patient?.contactInfo?.phone || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Address:</span>
                <span class="info-value">${patient?.contactInfo?.address || patient?.demographics?.address || 'N/A'}</span>
              </div>
            </div>
            <div>
              <div class="info-row">
                <span class="info-label">Invoice No:</span>
                <span class="info-value">${invoiceNo}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Date:</span>
                <span class="info-value">${dateStr}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Time:</span>
                <span class="info-value">${timeStr}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Payment Mode:</span>
                <span class="info-value">${paymentMethod}</span>
              </div>
              ${selectedDoctor ? `
              <div class="info-row">
                <span class="info-label">Consulting Doctor:</span>
                <span class="info-value">${selectedDoctor}</span>
              </div>
              ` : ''}
              ${govtInsuranceEnabled ? `
              <div class="info-row">
                <span class="info-label">Insurance:</span>
                <span class="info-value">${insuranceCompany} (${insuranceCategory})</span>
              </div>
              ` : ''}
            </div>
          </div>

          <table class="billing-table">
            <thead>
              <tr>
                <th style="width: 50px;">S.No</th>
                <th>Particulars</th>
                <th style="width: 100px;">Cost</th>
                <th style="width: 60px;">Qty</th>
                <th style="width: 100px;">Net Amt</th>
                <th style="width: 100px;">Gross Amt</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceRows}
            </tbody>
          </table>

          <div class="totals-section">
            <div class="total-row">
              <span class="total-label">Total Gross Amount:</span>
              <span class="total-value">₹${totalGross.toLocaleString('en-IN')}</span>
            </div>
            ${totalMouDiscount > 0 ? `
            <div class="total-row">
              <span class="total-label">MOU Discount:</span>
              <span class="total-value" style="color: #e53e3e;">- ₹${totalMouDiscount.toLocaleString('en-IN')}</span>
            </div>
            ` : ''}
            ${govtInsuranceEnabled ? `
            <div class="total-row">
              <span class="total-label">Insurance Covered:</span>
              <span class="total-value" style="color: #38a169;">- ₹${insuranceCovered.toLocaleString('en-IN')}</span>
            </div>
            <div class="total-row grand-total">
              <span class="total-label">Patient Payable:</span>
              <span class="total-value">₹${patientPayable.toLocaleString('en-IN')}</span>
            </div>
            ` : `
            <div class="total-row grand-total">
              <span class="total-label">Amount Received:</span>
              <span class="total-value">₹${receivedAmount.toLocaleString('en-IN')}</span>
            </div>
            `}
            
            <div class="amount-words">
              <strong>Amount in Words:</strong> ${numberToWords(govtInsuranceEnabled ? patientPayable : receivedAmount)}
            </div>
          </div>

          <div class="footer">
            <div class="signature-box">
              <div class="signature-line">Patient Signature</div>
            </div>
            <div class="signature-box">
              <div class="signature-line">Authorized Signatory</div>
            </div>
          </div>

          <div class="thank-you">
            Thank you for choosing SPARK Eye Care Hospital. Get well soon! ðŸ™
          </div>
        </div>
      </body>
      </html>
    `;

    printViaIframe(printContent);
  };

  const handleSaveBill = async (status: 'paid' | 'pending' | 'draft' = 'paid') => {
    if (!currentRegId || items.length === 0) {
      showAlert('Please select a patient and add items to the bill first.');
      return;
    }

    try {
      const isSurgery = items.some(item => item.category === 'Surgery');

      // Prepare items with surgery breakdown for surgery items
      const itemsWithBreakdown = items.map(item => {
        if (item.category === 'Surgery' && item.surgeryBreakdown) {
          return {
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            price: item.price,
            total: item.total,
            surgeryBreakdown: item.surgeryBreakdown,
            selectedPackage: item.selectedPackage, // Track which IOL package was selected
            totalGrossAmt: item.totalGrossAmt,
            mouDiscount: item.mouDiscount || 0,
            receivedAmt: item.receivedAmt
          };
        }
        return {
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          price: item.price,
          total: item.total
        };
      });

      const response = await fetch(API_ENDPOINTS.BILLING_INVOICES(currentRegId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: items.map(i => i.name).join(', '),
          serviceItems: itemsWithBreakdown, // Include full items with breakdown
          amount: subtotal + totalTax, // Total bill amount including tax
          status: status,
          insuranceCovered: govtInsuranceEnabled ? insuranceCovered : 0,
          insuranceStatus: govtInsuranceEnabled ? 'claimed' : 'none',
          patientResponsibility: govtInsuranceEnabled ? patientPayable : grandTotal,
          patientPaidAmount: govtInsuranceEnabled ? patientPayable : grandTotal,
          couponCode: couponCode,
          appliedBy: currentUser || 'Admin',
          discountAmount: discountAmount + totalDiscount,
          paymentMethod: paymentMethod, // Explicitly pass payment method
          notes: `Payment via ${paymentMethod}. ${govtInsuranceEnabled ? `Insurance Claim: ${insuranceCompany} - ${insuranceTPA}` : ''}`,
          // New Multi-stage tracking fields
          isSurgeryCase: isSurgery,
          expectedFromInsurance: govtInsuranceEnabled ? insuranceCovered : 0,
          upfrontPaid: govtInsuranceEnabled ? patientPayable : 0
        })
      });

      if (response.ok) {
        showAlert(status === 'draft' ? 'Draft saved successfully!' : 'Bill processed successfully!');

        // Show popup to save as package if it's a surgery item
        const hasSurgeryItems = items.some(item => item.category === 'Surgery');
        if (hasSurgeryItems && status === 'paid') {
          setShowSaveAsPackagePopup(true);
        }

        // Notify BillingDashboardView to refresh stats
        window.dispatchEvent(new CustomEvent('billingUpdated', {
          detail: {
            registrationId: currentRegId,
            invoiceId: currentRegId
          }
        }));

        if (onBack && !hasSurgeryItems) onBack();
      } else {
        const errData = await response.json();
        showAlert(`Error: ${errData.detail || 'Failed to process bill'}`);
      }
    } catch (err) {
      console.error('Error saving bill:', err);
      showAlert('Network error. Please check if the server is running.');
    }
  };

  const handleSaveAsPackage = async () => {
    if (!packageName.trim()) {
      showAlert('Please enter a package name');
      return;
    }

    setIsSavingAsPackage(true);

    try {
      const surgeryItems = items.filter(item => item.category === 'Surgery');
      const packageItems = surgeryItems.flatMap(item => {
        if (item.surgeryBreakdown) {
          return item.surgeryBreakdown.map(breakdown => ({
            description: breakdown.particular,
            amount: breakdown.grossAmt,
            // Store full breakdown data to preserve structure when loading
            breakdown: {
              sNo: breakdown.sNo,
              particular: breakdown.particular,
              cost: breakdown.cost,
              qty: breakdown.qty,
              netAmt: breakdown.netAmt,
              grossAmt: breakdown.grossAmt,
            }
          }));
        }
        return [{
          description: item.name,
          amount: item.total,
        }];
      });

      const response = await fetch(API_ENDPOINTS.SURGERY_PACKAGES.CREATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageName: packageName,
          items: packageItems,
          description: `Surgery package with ${packageItems.length} items`,
          createdBy: currentUser || 'System'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save package');
      }

      showAlert('Package saved successfully! You can now reuse it for future surgeries.');
      setShowSaveAsPackagePopup(false);
      setPackageName('');
      // Refresh packages list
      const packagesRes = await fetch(API_ENDPOINTS.SURGERY_PACKAGES.GET_ALL);
      if (packagesRes.ok) {
        const data = await packagesRes.json();
        setSavedPackages(data);
      }
      if (onBack) onBack();
    } catch (err) {
      console.error('Error saving package:', err);
      showAlert(err instanceof Error ? err.message : 'Failed to save package');
    } finally {
      setIsSavingAsPackage(false);
    }
  };

  const handleLoadPackage = (pkg: any) => {
    // Build all breakdown particulars from package items
    const surgeryBreakdown: SurgeryParticular[] = [];
    let totalAmount = 0;
    let sNo = 1;

    pkg.items.forEach((item: any) => {
      if (item.breakdown) {
        // Use stored breakdown if available
        surgeryBreakdown.push({
          sNo: sNo++,
          particular: item.breakdown.particular,
          cost: item.breakdown.cost,
          qty: item.breakdown.qty,
          netAmt: item.breakdown.netAmt,
          grossAmt: item.breakdown.grossAmt,
        });
        totalAmount += item.breakdown.grossAmt;
      } else {
        // Fallback for old flat structure
        surgeryBreakdown.push({
          sNo: sNo++,
          particular: item.description,
          cost: item.amount,
          qty: 1,
          netAmt: item.amount,
          grossAmt: item.amount,
        });
        totalAmount += item.amount;
      }
    });

    // Create ONE grouped item with all breakdown particulars
    const newItem: BillingItem = {
      id: `pkg-${pkg._id}-${Date.now()}`,
      name: pkg.packageName,
      category: 'Surgery',
      price: totalAmount,
      quantity: 1,
      discount: 0,
      tax: 0,
      total: totalAmount,
      surgeryBreakdown: surgeryBreakdown,
    };

    setItems([...items, newItem]);
    showAlert(`Package "${pkg.packageName}" loaded successfully!`);
  };

  // Handle selecting a surgery package from the modal
  const handleSelectSurgeryPackage = (pkg: any) => {
    // Build all breakdown particulars from package items
    const surgeryBreakdown: SurgeryParticular[] = [];
    let totalAmount = 0;
    let sNo = 1;

    pkg.items.forEach((item: any) => {
      if (item.breakdown) {
        // Use stored breakdown if available
        surgeryBreakdown.push({
          sNo: sNo++,
          particular: item.breakdown.particular,
          cost: item.breakdown.cost,
          qty: item.breakdown.qty,
          netAmt: item.breakdown.netAmt,
          grossAmt: item.breakdown.grossAmt,
        });
        totalAmount += item.breakdown.grossAmt;
      } else {
        // Fallback for old flat structure
        surgeryBreakdown.push({
          sNo: sNo++,
          particular: item.description,
          cost: item.amount,
          qty: 1,
          netAmt: item.amount,
          grossAmt: item.amount,
        });
        totalAmount += item.amount;
      }
    });

    // Create ONE grouped item with all breakdown particulars
    const newItem: BillingItem = {
      id: `pkg-${pkg._id}-${Date.now()}`,
      name: pkg.packageName,
      category: 'Surgery',
      price: totalAmount,
      quantity: 1,
      discount: 0,
      tax: 0,
      total: totalAmount,
      surgeryBreakdown: surgeryBreakdown,
    };

    setItems(prevItems => [...prevItems, newItem]);
    showAlert(`Package "${pkg.packageName}" added successfully!`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0a]">
        <div className="w-12 h-12 rounded-full border-2 border-[#D4A574] border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto p-12 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center gap-12 mb-6">
        <div className="flex-shrink-0">
          <h1 className="text-3xl font-light tracking-tight">Patient Billing</h1>
          {/* Selected Patient Info */}
          {patient ? (
            <p className="text-[#8B8B8B] text-sm mt-1">
              Selected: <span className="text-[#D4A574] font-medium">{patient.name}</span> ({patient.registrationId})
            </p>
          ) : (
            <p className="text-[#8B8B8B] text-sm mt-1">Search and select a patient to create invoice</p>
          )}
        </div>

        {/* Patient Search Input - Expanded */}
        <div className="flex-1 relative" ref={dropdownRef}>
          <div className="flex items-center gap-3 bg-[#1a1a1a] border border-[#D4A574] rounded-lg px-4 py-1.5 focus-within:ring-1 focus-within:ring-[#D4A574]">
            <Search className="w-4 h-4 text-[#5a5a5a]" />
            <input
              type="text"
              placeholder="Search patient by name, phone, or email..."
              value={patientSearchQuery}
              onChange={(e) => setPatientSearchQuery(e.target.value)}
              className="bg-transparent border-none text-sm text-white placeholder-[#5a5a5a] focus:outline-none w-full"
            />
            {isSearchingPatient && (
              <div className="w-4 h-4 border-2 border-[#D4A574] border-t-transparent rounded-full animate-spin"></div>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showPatientDropdown && patientSearchResults.length > 0 && (
            <div className="absolute top-full left-0 mt-1 w-full bg-[#1a1a1a] border border-[#D4A574] rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
              {patientSearchResults.map((result, idx) => (
                <button
                  key={`${result.registrationId}-${idx}`}
                  onClick={() => handleSelectPatient(result)}
                  className="w-full px-4 py-3 text-left hover:bg-[#2a2a2a] border-b border-[#D4A574] last:border-b-0 transition-colors"
                >
                  <p className="text-white text-sm font-medium">{result.name}</p>
                  <p className="text-[#5a5a5a] text-xs font-mono">{result.registrationId}</p>
                  {result.phone && <p className="text-[#5a5a5a] text-xs">{result.phone}</p>}
                </button>
              ))}
            </div>
          )}

          {showPatientDropdown && patientSearchResults.length === 0 && patientSearchQuery && !isSearchingPatient && (
            <div className="absolute top-full left-0 mt-1 w-full bg-[#1a1a1a] border border-[#D4A574] rounded-lg shadow-xl z-50 p-4">
              <p className="text-[#5a5a5a] text-sm text-center">No patients found</p>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 flex items-center gap-3">
          <Button
            className="bg-[#D4A574] text-[#0a0a0a] hover:bg-[#C9955E] font-bold h-[38px]"
            onClick={() => setShowCompanyTpaModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Company/TPA
          </Button>
          <Button
            className="bg-[#D4A574] text-[#0a0a0a] hover:bg-[#C9955E] font-bold disabled:opacity-50 h-[38px]"
            onClick={handlePrint}
            disabled={!patient}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Invoice
          </Button>
          <Button
            className="bg-[#D4A574] text-[#0a0a0a] hover:bg-[#C9955E] font-bold disabled:opacity-50 h-[38px]"
            onClick={() => handleSaveBill('paid')}
            disabled={!patient || items.length === 0}
          >
            <Save className="w-4 h-4 mr-2" />
            Save & Finalize
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Service Selection */}
        <div className="lg:col-span-2 space-y-6">

          {/* Service Search & List */}
          <Card className="bg-[#0f0f0f] border-[#D4A574] p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Add Services & Items</h3>
              <button
                onClick={() => setShowSurgerySelectionModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#D4A574] text-[#0a0a0a] rounded-lg hover:bg-[#C9955E] font-semibold text-sm transition-colors"
              >
                <Plus size={16} />
                Surgeries
              </button>
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a5a]" />
              <Input
                placeholder="Search services, tests, or medicines..."
                className="pl-10 bg-[#0a0a0a] border-[#D4A574] text-sm focus:border-[#D4A574]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-4 md:grid-cols-4 gap-3">
              {/* Common Services */}
              {COMMON_SERVICES.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map((service) => (
                <button
                  key={service.id}
                  onClick={() => addItem(service)}
                  className="relative flex flex-col p-4 pt-5 bg-[#0a0a0a] border border-[#D4A574] rounded-xl hover:bg-[#151515] transition-all group text-left ring-1 ring-[#D4A574]/30 min-h-[100px]"
                >
                  <div className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-lg bg-[#D4A574] group-hover:bg-[#C9955E] transition-colors">
                    <Plus className="w-4 h-4" style={{ color: '#ffffff' }} />
                  </div>
                  <p className="text-sm font-semibold text-white group-hover:text-[#D4A574] pr-8 leading-tight">{service.name}</p>
                  <p className="text-sm font-bold text-[#D4A574] mt-auto pt-2">₹{service.price.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-[#5a5a5a] uppercase tracking-wider mt-1 font-medium">{service.category}</p>
                </button>
              ))}

              {/* Saved Surgery Packages - Auto Display */}
              {savedPackages.map((pkg) => (
                <button
                  key={pkg._id}
                  onClick={() => handleLoadPackage(pkg)}
                  className="relative flex flex-col p-4 pt-5 bg-[#0a0a0a] border border-[#D4A574] rounded-xl hover:border-[#D4A574] hover:bg-[#151515] transition-all group text-left ring-1 ring-[#D4A574]/30 min-h-[100px]"
                  title={`Saved Package • ${pkg.items?.length || 0} items`}
                >
                  <div className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-lg bg-[#D4A574] group-hover:bg-[#C9955E] transition-colors">
                    <Plus className="w-4 h-4" style={{ color: '#ffffff' }} />
                  </div>
                  <p className="text-sm font-semibold text-white group-hover:text-[#D4A574] pr-8 leading-tight">{pkg.packageName || pkg.name}</p>
                  <p className="text-sm font-bold text-[#D4A574] mt-auto pt-2">₹{(pkg.totalAmount || pkg.price || 0).toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-[#5a5a5a] uppercase tracking-wider mt-1 font-medium">Saved Package</p>
                  {pkg.usageCount && pkg.usageCount > 1 && (
                    <p className="text-[9px] text-[#8B8B8B] mt-0.5">Used {pkg.usageCount}x</p>
                  )}
                </button>
              ))}
            </div>
          </Card>

          {/* Surgery Breakdown Section - Main Column managed */}
          {items.filter(item => item.category === 'Surgery').map((surgeryItem) => (
            <Card key={surgeryItem.id} className="bg-[#0f0f0f] border-[#D4A574] overflow-hidden">
              <div className="bg-[#D4A574]/10 p-4 border-b border-[#D4A574]/20 flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-white uppercase tracking-wider">{surgeryItem.name}</h3>
                  <p className="text-[10px] text-[#D4A574] font-medium uppercase mt-0.5">Edit Detailed Particulars & Costs</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => addSurgeryParticular(surgeryItem.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D4A574] text-[#0a0a0a] rounded-lg text-[10px] font-black uppercase hover:bg-[#C9955E] transition-all"
                  >
                    <Plus className="w-3 h-3" /> Add Particular
                  </button>
                </div>
              </div>

              {/* Package Quick Select */}
              <div className="p-4 bg-[#151515] border-b border-[#D4A574]/10">
                <p className="text-[10px] text-[#5a5a5a] uppercase font-bold tracking-widest mb-3">Select Pricing Package (IOL Type)</p>
                <div className="flex flex-wrap gap-2">
                  {([35000, 40000, 50000, 60000, 75000] as PackageAmount[]).map((pkg) => (
                    <button
                      key={pkg}
                      onClick={() => applySurgeryPackage(surgeryItem.id, pkg)}
                      className={`px-4 py-2 rounded-lg text-xs font-black transition-all border ${surgeryItem.selectedPackage === pkg
                        ? 'bg-[#D4A574] text-[#0a0a0a] border-[#D4A574] shadow-lg shadow-[#D4A574]/10'
                        : 'bg-[#0a0a0a] text-[#8B8B8B] border-[#D4A574]/20 hover:border-[#D4A574]/50'
                        }`}
                    >
                      ₹{pkg.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Breakdown Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-[#0a0a0a] border-b border-[#D4A574]/20">
                      <th className="p-3 text-left font-bold text-[#5a5a5a] uppercase">Particulars</th>
                      <th className="p-3 text-right font-bold text-[#5a5a5a] uppercase">Cost</th>
                      <th className="p-3 text-center font-bold text-[#5a5a5a] uppercase">Qty</th>
                      <th className="p-3 text-right font-bold text-[#5a5a5a] uppercase">Net Amt</th>
                      <th className="p-3 text-center font-bold text-[#5a5a5a] uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D4A574]/10">
                    {surgeryItem.surgeryBreakdown?.map((particular) => (
                      <tr key={particular.sNo} className="hover:bg-[#1a1a1a]/50 transition-colors">
                        <td className="p-3 text-white font-medium">
                          <input
                            type="text"
                            value={particular.particular}
                            onChange={(e) => updateSurgeryParticular(surgeryItem.id, particular.sNo, 'particular', e.target.value)}
                            className="bg-transparent border-none text-white w-full focus:ring-0 p-0 text-[11px]"
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end">
                            <span className="text-[#5a5a5a] mr-1">₹</span>
                            <input
                              type="number"
                              value={particular.cost}
                              onChange={(e) => updateSurgeryParticular(surgeryItem.id, particular.sNo, 'cost', Number(e.target.value))}
                              className="bg-transparent border-none text-right text-white w-20 focus:ring-0 p-0 text-[11px] font-mono"
                            />
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            value={particular.qty}
                            onChange={(e) => updateSurgeryParticular(surgeryItem.id, particular.sNo, 'qty', Number(e.target.value))}
                            className="bg-transparent border-none text-center text-[#D4A574] w-10 focus:ring-0 p-0 text-[11px] font-mono"
                          />
                        </td>
                        <td className="p-3 text-right text-white font-bold">₹{particular.netAmt.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => removeSurgeryParticular(surgeryItem.id, particular.sNo)}
                            className="p-1.5 text-[#5a5a5a] hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#1a1a1a] border-t border-[#D4A574]/30">
                      <td colSpan={3} className="p-4 text-right text-[#8B8B8B] font-bold uppercase tracking-widest text-[9px]">Item Total Gross</td>
                      <td className="p-4 text-right text-[#D4A574] font-black text-sm">₹{surgeryItem.totalGrossAmt?.toLocaleString('en-IN')}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          ))}

          {/* ============ SURGERY INSURANCE BILLING SECTION ============ */}
          {items.some(i => i.category === 'Surgery') && (
            <Card id="surgery-billing-section" className="bg-[#0f0f0f] border-[#D4A574] p-6">
              {/* Insurance Toggle */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center border border-[#D4A574]/30">
                    <CreditCard className={`w-5 h-5 ${govtInsuranceEnabled ? 'text-blue-500' : 'text-[#5a5a5a]'}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Govt. Insurance (For Surgery)</h3>
                    <p className="text-[10px] text-[#8B8B8B]">Late claim processing</p>
                  </div>
                </div>
                <button
                  onClick={() => handleInsuranceToggle(!govtInsuranceEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${govtInsuranceEnabled ? 'bg-blue-600' : 'bg-[#2a2a2a]'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${govtInsuranceEnabled ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              {govtInsuranceEnabled && (
                <div className="space-y-5">
                  {/* Insurance Type */}
                  <div className="space-y-2">
                    <label className="text-xs text-[#8B8B8B] font-medium">Insurance Type</label>
                    <select
                      value={insuranceCategory || ''}
                      onChange={(e) => {
                        setInsuranceCategory(e.target.value as InsuranceCategory);
                        setInsuranceCompany('');
                        setInsuranceTPA('');
                      }}
                      className="w-full bg-[#0a0a0a] border border-[#D4A574]/30 rounded-lg h-10 px-3 text-sm text-white focus:border-[#D4A574]"
                    >
                      <option value="">Select Insurance Type</option>
                      <option value="CGHS">CGHS</option>
                      <option value="SGHS">SGHS</option>
                      <option value="PRIVATE">PRIVATE</option>
                    </select>
                  </div>

                  {/* Company & TPA */}
                  {insuranceCategory && (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs text-[#8B8B8B] font-medium">Insurance Company</label>
                        <select
                          value={insuranceCompany}
                          onChange={(e) => {
                            setInsuranceCompany(e.target.value);
                            // Clear contact info if company changes (optional, but cleaner)
                            if (!e.target.value) {
                                setContactName('');
                                setContactPhone('');
                                setContactEmail('');
                                setContactAddress('');
                            }
                            setInsuranceTPA('');
                          }}
                          className="w-full bg-[#0a0a0a] border border-[#D4A574]/30 rounded-lg h-10 px-3 text-sm text-white focus:border-[#D4A574]"
                        >
                          <option value="">Select Company</option>
                          {MOCK_INSURANCE_PLANS[insuranceCategory]?.map((plan) => (
                            <option key={plan.company} value={plan.company}>{plan.company}</option>
                          ))}
                        </select>
                      </div>

                      {insuranceCompany && (
                        <div className="space-y-2">
                          <label className="text-xs text-[#8B8B8B] font-medium">TPA</label>
                          <select
                            value={insuranceTPA}
                            onChange={(e) => setInsuranceTPA(e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-[#D4A574]/30 rounded-lg h-10 px-3 text-sm text-white focus:border-[#D4A574]"
                          >
                            <option value="">Select TPA</option>
                            {MOCK_INSURANCE_PLANS[insuranceCategory]
                              ?.find(p => p.company === insuranceCompany)
                              ?.tpas.map((tpa) => (
                                <option key={tpa} value={tpa}>{tpa}</option>
                              ))}
                          </select>
                        </div>
                      )}

                      {insuranceCompany && (
                        <div className="space-y-2">
                          <label className="text-xs text-[#8B8B8B] font-medium">Claim Number</label>
                          <input
                            value={claimNumber}
                            onChange={(e) => setClaimNumber(e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-[#D4A574]/30 rounded-lg h-10 px-3 text-sm font-mono text-white focus:border-[#D4A574]"
                            placeholder="Enter claim number"
                          />
                        </div>
                      )}
                      {/* Added Contact Person Details Display */}
                      {insuranceCompany && contactName && (
                        <div className="mt-4 p-3 bg-[#1a1a1a] rounded-lg border border-[#D4A574]/20 space-y-1">
                          <p className="text-[10px] text-[#D4A574] uppercase font-bold mb-1">Contact Person</p>
                          <p className="text-xs text-white font-medium">{contactName}</p>
                          {contactPhone && <p className="text-[10px] text-[#8B8B8B] flex items-center gap-1">📞 {contactPhone}</p>}
                          {contactEmail && <p className="text-[10px] text-[#8B8B8B] flex items-center gap-1">✉️ {contactEmail}</p>}
                          {contactAddress && <p className="text-[10px] text-[#8B8B8B] line-clamp-2">📍 {contactAddress}</p>}
                        </div>
                      )}
                    </>
                  )}

                  {/* Date of Surgery & Discharge */}
                  <div className="border-t border-[#D4A574]/20 pt-4 grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-[#8B8B8B] font-medium">Date of Surgery</label>
                      <input
                        type="date"
                        value={dateOfSurgery}
                        onChange={(e) => setDateOfSurgery(e.target.value)}
                        className="w-full bg-[#0a0a0a] border border-[#D4A574]/30 rounded-lg h-10 px-3 text-sm text-white focus:border-[#D4A574]"
                      />
                      <p className="text-[9px] text-[#5a5a5a]">DD/MM/YYYY format</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-[#8B8B8B] font-medium">Date of Discharge</label>
                      <input
                        type="date"
                        value={dateOfDischarge}
                        onChange={(e) => setDateOfDischarge(e.target.value)}
                        className="w-full bg-[#0a0a0a] border border-[#D4A574]/30 rounded-lg h-10 px-3 text-sm text-white focus:border-[#D4A574]"
                      />
                      <p className="text-[9px] text-[#5a5a5a]">DD/MM/YYYY format</p>
                    </div>
                  </div>

                  {/* Surgery Insurance Billing - Two Bill System */}
                  <div className="border-t border-[#D4A574]/20 pt-5">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertCircle className="w-5 h-5 text-[#D4A574]" />
                      <div>
                        <h4 className="text-sm font-bold text-white">Surgery Insurance Billing</h4>
                        <p className="text-[10px] text-[#8B8B8B]">Two-Bill System: Initial → Final Settlement</p>
                      </div>
                    </div>

                    {/* Stage Toggle */}
                    <div className="grid grid-cols-2 gap-2 mb-5">
                      <button
                        onClick={() => setSurgeryBillStage('initial')}
                        className={`py-2.5 px-4 rounded-lg text-xs font-bold transition-all ${surgeryBillStage === 'initial'
                          ? 'bg-[#D4A574] text-[#0a0a0a] shadow-lg'
                          : 'bg-[#1a1a1a] text-[#8B8B8B] border border-[#D4A574]/20 hover:border-[#D4A574]/50'
                          }`}
                      >
                        Initial Bill
                      </button>
                      <button
                        onClick={() => setSurgeryBillStage('final')}
                        className={`py-2.5 px-4 rounded-lg text-xs font-bold transition-all ${surgeryBillStage === 'final'
                          ? 'bg-[#D4A574] text-[#0a0a0a] shadow-lg'
                          : 'bg-[#1a1a1a] text-[#8B8B8B] border border-[#D4A574]/20 hover:border-[#D4A574]/50'
                          }`}
                      >
                        Final Settlement
                      </button>
                    </div>

                    {/* Existing Initial Bill Detected */}
                    {existingInitialBill && surgeryBillStage === 'initial' && (
                      <div className="mb-5 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                        <p className="text-sm font-bold text-yellow-400 mb-1">⚠️ Pending Initial Bill Found</p>
                        <p className="text-[11px] text-[#8B8B8B]">Bill ID: {existingInitialBill.billId}</p>
                        <p className="text-[11px] text-[#8B8B8B]">Security Deposit: ₹{(existingInitialBill.securityDeposit || 0).toLocaleString('en-IN')}</p>
                        <button
                          onClick={() => handleContinueToFinalBill(existingInitialBill)}
                          className="w-full mt-3 py-2.5 bg-[#D4A574] text-[#0a0a0a] rounded-lg text-xs font-bold hover:bg-[#C9955E] transition-all"
                        >
                          Continue to Final Settlement →
                        </button>
                      </div>
                    )}

                    {/* Security Deposit (Initial Bill) */}
                    {surgeryBillStage === 'initial' && (
                      <div className="space-y-3 p-4 rounded-xl bg-[#1a1a1a] border border-[#D4A574]/20">
                        <h4 className="text-xs font-bold text-[#D4A574]">💰 Security Deposit / Upfront Amount (Paid by Patient)</h4>
                        <input
                          type="number"
                          value={securityDeposit || ''}
                          onChange={(e) => setSecurityDeposit(Number(e.target.value))}
                          className="w-full bg-[#0a0a0a] border border-[#D4A574]/30 rounded-lg h-10 px-3 text-sm text-white focus:border-[#D4A574]"
                          placeholder="Enter amount collected"
                        />
                        <p className="text-[9px] text-[#5a5a5a]">This is a temporary payment collected before surgery. Enter or adjust based on hospital policy.</p>
                      </div>
                    )}

                    {/* Insurance Approved Amount (Final Bill) */}
                    {surgeryBillStage === 'final' && (
                      <div className="space-y-3 p-4 rounded-xl bg-[#1a1a1a] border border-blue-500/20">
                        <h4 className="text-xs font-bold text-blue-400">📋 Insurance Approved Amount (As per approval letter)</h4>
                        <input
                          type="number"
                          value={insuranceApprovedAmount || ''}
                          onChange={(e) => setInsuranceApprovedAmount(Number(e.target.value))}
                          className="w-full bg-[#0a0a0a] border border-blue-500/30 rounded-lg h-10 px-3 text-sm text-white focus:border-blue-500"
                          placeholder="Enter approved amount"
                        />
                      </div>
                    )}

                    {/* Cost Summary */}
                    <div className="mt-4 p-4 rounded-xl bg-[#0a0a0a] border border-[#D4A574]/20 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#8B8B8B]">Total Surgery Cost:</span>
                        <span className="text-white font-bold">₹{totalSurgeryCost.toLocaleString('en-IN')}</span>
                      </div>
                      {surgeryBillStage === 'final' && insuranceApprovedAmount > 0 && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-blue-400">Insurance Approved:</span>
                            <span className="text-blue-400 font-bold">- ₹{insuranceApprovedAmount.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-[#8B8B8B]">Security Deposit Paid:</span>
                            <span className="text-[#8B8B8B] font-bold">- ₹{securityDeposit.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="pt-2 border-t border-[#D4A574]/20 flex justify-between text-sm">
                            <span className="text-white font-bold">{balancePayable > 0 ? 'Balance Payable:' : 'Refund Due:'}</span>
                            <span className={`font-bold ${balancePayable > 0 ? 'text-[#D4A574]' : 'text-green-500'}`}>
                              ₹{(balancePayable > 0 ? balancePayable : refundAmount).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </>
                      )}
                      {surgeryBillStage === 'initial' && (
                        <div className="flex justify-between text-sm">
                          <span className="text-[#8B8B8B]">Patient's Payable Amount:</span>
                          <span className="text-white font-bold">₹{totalSurgeryCost.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4">
                      {surgeryBillStage === 'initial' ? (
                        <Button
                          className="w-full bg-[#D4A574] text-[#0a0a0a] hover:bg-[#C9955E] h-11 font-bold text-sm rounded-xl"
                          onClick={handleCreateInitialBill}
                          disabled={!insuranceCategory || !insuranceCompany || securityDeposit <= 0}
                        >
                          Create Initial Bill (Collect Security Deposit)
                        </Button>
                      ) : (
                        <Button
                          className="w-full bg-blue-600 text-white hover:bg-blue-700 h-11 font-bold text-sm rounded-xl"
                          onClick={handleCreateFinalBill}
                          disabled={insuranceApprovedAmount <= 0}
                        >
                          Create Final Settlement Bill
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="bg-[#0f0f0f] border-[#D4A574] p-6 sticky top-6 shadow-2xl">
            <h3 className="text-sm font-bold text-[#D4A574]/80 uppercase tracking-[0.2em] mb-6">Bill Summary</h3>

            {/* Redesigned Identity Block - Unified with Main Card */}
            <div className="mb-4">
              <div className="flex gap-4 mb-3 pb-3 border-b border-[#D4A574]/20">
                <div className="w-14 h-14 rounded-full bg-[#0a0a0a] flex items-center justify-center border border-[#D4A574] flex-shrink-0">
                  <User className="w-8 h-8 text-[#D4A574]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-white truncate leading-tight">
                    {patient?.name || 'Select Patient'}
                  </h2>
                  <p className="text-[10px] text-[#8B8B8B] font-mono tracking-wider mt-0.5 uppercase truncate">
                    REG: {patient?.registrationId || 'N/A'}
                  </p>
                  <p className="text-[11px] text-[#D4A574] font-medium mt-1 truncate">
                    {patient ? `${patient.demographics?.age || 'N/A'} / ${patient.demographics?.sex || 'N/A'} / ${patient?.contactInfo?.phone || 'N/A'}` : 'N/A'}
                  </p>
                </div>
              </div>
              {/* Column headers for items */}
              <div className="flex gap-2 px-2 mb-1">
                <div className="flex-1 min-w-0" />
                <div className="w-[50px] flex-shrink-0 text-[10px] font-black text-[#5a5a5a] uppercase tracking-widest text-center">Qty</div>
                <div className="w-[80px] flex-shrink-0 text-[10px] font-black text-[#5a5a5a] uppercase tracking-widest text-right">Price</div>
                <div className="w-[50px] flex-shrink-0 text-[10px] font-black text-[#5a5a5a] uppercase tracking-widest text-center">Action</div>
              </div>

              {/* Compact Items List */}
              <div className="space-y-0.5 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                {items.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-xs text-[#5a5a5a] font-medium">No items added to the bill yet.</p>
                  </div>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="group flex gap-2 items-center py-3 border-b border-[#D4A574]/10 last:border-b-0 hover:bg-[#D4A574]/5 transition-colors rounded-lg px-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white truncate font-semibold">{item.name}</p>
                        {item.category === 'Surgery' && (
                          <p className="text-[9px] text-[#D4A574] uppercase tracking-widest font-bold mt-0.5 leading-none">Right Eye →</p>
                        )}
                      </div>
                      <div className="w-[50px] flex-shrink-0 text-xs text-[#8B8B8B] text-center font-mono font-bold">
                        {item.quantity}
                      </div>
                      <div className="w-[80px] flex-shrink-0 flex items-center justify-end">
                        <span className="text-xs text-[#8B8B8B] mr-1">₹</span>
                        <input
                          type="number"
                          min="0"
                          className="w-full bg-transparent text-right text-xs font-bold text-white focus:outline-none focus:border-b focus:border-[#D4A574] appearance-none"
                          value={item.price}
                          onChange={(e) => updatePrice(item.id, parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="w-[50px] flex-shrink-0 text-center">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-2 text-[#5a5a5a] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bill Totals & Breakdown */}
            <div className="space-y-3 mb-6 pt-4 border-t border-[#D4A574]/30">
              <div className="flex justify-between text-sm">
                <span className="text-[#8B8B8B] font-medium">Subtotal</span>
                <span className="text-white font-bold tracking-tight">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#8B8B8B] font-medium">Discount</span>
                <span className="text-green-500 font-bold tracking-tight">- ₹{(totalDiscount + discountAmount).toLocaleString('en-IN')}</span>
              </div>

              {govtInsuranceEnabled && items.some(i => i.category === 'Surgery') && (
                <div className="pt-2 space-y-2 border-t border-[#D4A574]/10">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-blue-400">Insurance Covered</span>
                    <span className="text-blue-400 font-bold">- ₹{insuranceCovered.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8B8B8B] font-semibold">Patient Payable</span>
                    <span className="text-white font-bold">₹{patientPayable.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-[#D4A574]/30 flex justify-between items-end">
                <span className="text-base font-bold text-white uppercase tracking-tight">
                  {govtInsuranceEnabled ? 'Patient Payable' : 'Grand Total'}
                </span>
                <span className="text-3xl font-black text-[#D4A574] tracking-tighter">
                  ₹{(govtInsuranceEnabled ? patientPayable : grandTotal).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Payment Method Preservation */}
            <div className="space-y-3 mb-6">
              <label className="text-[10px] font-bold text-[#5a5a5a] uppercase tracking-widest">Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                {['Cash', 'Card', 'UPI', 'Insurance', 'Free Camp'].map((method) => (
                  <button
                    key={method}
                    onClick={() => {
                        setPaymentMethod(method as any);
                        if (method === 'Free Camp') {
                            setDiscountAmount(subtotal);
                        } else if (paymentMethod === 'Free Camp') {
                            setDiscountAmount(0);
                        }
                    }}
                    className={`py-2.5 px-3 rounded-lg border text-xs font-bold transition-all ${paymentMethod === method
                      ? 'bg-[#D4A574] border-[#D4A574] text-[#0a0a0a] shadow-lg shadow-[#D4A574]/20'
                      : 'bg-[#1a1a1a] border-[#D4A574]/20 text-[#8B8B8B] hover:border-[#D4A574]/50'}`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                className="w-full bg-[#D4A574] text-[#0a0a0a] hover:bg-[#C9955E] h-12 font-bold text-base shadow-xl shadow-[#D4A574]/20 rounded-xl"
                onClick={() => handleSaveBill('paid')}
                disabled={items.length === 0}
              >
                COLLECT ₹{(govtInsuranceEnabled ? patientPayable : grandTotal).toLocaleString('en-IN')}
              </Button>
              <Button
                className="w-full bg-transparent border border-[#D4A574]/40 text-[#D4A574] hover:bg-[#1a1a1a] h-11 font-bold text-sm rounded-xl"
                onClick={() => handleSaveBill('draft')}
              >
                Save as Draft
              </Button>
            </div>

            {/* Re-integrated Insurance & Coupon Section */}
            <div className="space-y-4 pt-4 border-t border-[#D4A574]/20">
              {/* Coupon Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] text-[#5a5a5a] uppercase font-bold tracking-widest">Apply Coupon</label>
                  {workerQuota && (
                    <span className="text-[9px] text-[#D4A574] font-medium">Quota: {workerQuota.remaining}/{workerQuota.limit}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="flex-1 bg-[#0a0a0a] border border-[#D4A574]/30 rounded-lg h-9 px-3 text-xs font-mono text-white focus:border-[#D4A574]"
                    placeholder="Enter code"
                  />
                  <button
                    onClick={() => {
                      if (couponCode === 'GOVT50') {
                        setDiscountAmount(grandTotal * 0.5);
                        showAlert('50% Govt Discount Applied');
                      } else {
                        showAlert('Invalid Coupon');
                      }
                    }}
                    className="h-9 px-4 bg-[#D4A574]/10 border border-[#D4A574]/30 text-[#D4A574] rounded-lg text-xs font-bold hover:bg-[#D4A574] hover:text-[#0a0a0a] transition-all"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>

            {/* Email Footer */}
            <div className="mt-6 p-4 bg-[#1a1a1a] rounded-xl border border-[#D4A574]/10">
              <div className="flex items-center gap-3 text-[11px] text-[#8B8B8B]">
                <Mail className="w-4 h-4 text-[#D4A574]" />
                <span>Invoice will be sent to: <span className="text-white font-medium">{patient?.contactInfo?.email || 'raj@gmail.com'}</span></span>
              </div>
            </div>

            {/* Admin Quota Refresh (Only for CEO/Main Doc) */}
            {(currentUser === 'CEO' || currentUser === 'MainDoctor' || currentUser === 'Admin') && (
              <div className="mt-4 pt-4 border-t border-[#D4A574]">
                <Button
                  variant="ghost"
                  className="w-full text-[10px] text-[#5a5a5a] hover:text-[#D4A574]"
                  onClick={async () => {
                    const res = await fetch(API_ENDPOINTS.COUPONS.REFRESH, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ workerId: currentUser, refreshedBy: currentUser, limit: 20 })
                    });
                    if (res.ok) {
                      showAlert('Quota Refreshed!');
                      fetchWorkerQuota();
                    }
                  }}
                >
                  Refresh My Coupon Quota (Admin Only)
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div >

      {/* Save as Package Popup Modal */}
      {
        showSaveAsPackagePopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#0f0f0f] border border-[#D4A574] rounded-lg p-8 w-96 shadow-2xl">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <h3 className="text-xl font-bold">Save as Reusable Package</h3>
              </div>

              <p className="text-[#8B8B8B] text-sm mb-6">
                Would you like to save this surgery configuration as a reusable package? You can use it for future similar surgeries.
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-[#D4A574] mb-2">
                  Package Name
                </label>
                <input
                  type="text"
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  placeholder="e.g., Standard Cataract Surgery"
                  className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#D4A574] rounded-lg text-white placeholder-[#5a5a5a] focus:outline-none focus:border-[#D4A574]"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveAsPackage}
                  disabled={isSavingAsPackage || !packageName.trim()}
                  className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition disabled:opacity-50 font-medium"
                >
                  {isSavingAsPackage ? 'Saving...' : 'Save Package'}
                </button>
                <button
                  onClick={() => {
                    setShowSaveAsPackagePopup(false);
                    setPackageName('');
                    if (onBack) onBack();
                  }}
                  disabled={isSavingAsPackage}
                  className="flex-1 bg-[#2a2a2a] text-[#D4A574] py-2 rounded-lg hover:bg-[#3a3a3a] transition disabled:opacity-50 font-medium"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Surgery Selection Modal */}
      <SurgerySelectionModal
        isOpen={showSurgerySelectionModal}
        onClose={() => setShowSurgerySelectionModal(false)}
        onSelectPackage={handleSelectSurgeryPackage}
      />

      {/* Add Company/TPA Modal */}
      {
        showCompanyTpaModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#0f0f0f] border border-[#D4A574] rounded-lg p-8 w-96 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-4">Add Insurance Company & TPA</h3>


              <div className="space-y-4 mb-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                <div>
                  <label className="block text-sm text-[#D4A574] font-medium mb-2">Company Name</label>
                  <input
                    type="text"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="e.g., Star Health"
                    className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#D4A574] rounded-lg text-white placeholder-[#5a5a5a] focus:outline-none focus:border-[#D4A574]"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#D4A574] font-medium mb-2">TPA Names (comma-separated)</label>
                  <textarea
                    value={newTpaNames}
                    onChange={(e) => setNewTpaNames(e.target.value)}
                    placeholder="e.g., MediAssist, FHPL"
                    className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#D4A574] rounded-lg text-white placeholder-[#5a5a5a] focus:outline-none focus:border-[#D4A574] h-20"
                  />
                  <p className="text-[10px] text-[#5a5a5a] mt-1">Separate multiple TPA names with commas</p>
                </div>

                <div className="border-t border-[#D4A574]/20 pt-4 mt-4">
                  <h4 className="text-sm font-bold text-white mb-2">Contact Person Details</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-[#8B8B8B] font-medium mb-1">Name</label>
                      <input
                        type="text"
                        value={newContactName}
                        onChange={(e) => setNewContactName(e.target.value)}
                        placeholder="Contact Person Name"
                        className="w-full px-3 py-1.5 bg-[#1a1a1a] border border-[#D4A574]/50 rounded text-sm text-white placeholder-[#5a5a5a] focus:outline-none focus:border-[#D4A574]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#8B8B8B] font-medium mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={newContactPhone}
                        onChange={(e) => setNewContactPhone(e.target.value)}
                        placeholder="Phone Number"
                        className="w-full px-3 py-1.5 bg-[#1a1a1a] border border-[#D4A574]/50 rounded text-sm text-white placeholder-[#5a5a5a] focus:outline-none focus:border-[#D4A574]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#8B8B8B] font-medium mb-1">Email</label>
                      <input
                        type="email"
                        value={newContactEmail}
                        onChange={(e) => setNewContactEmail(e.target.value)}
                        placeholder="Email Address"
                        className="w-full px-3 py-1.5 bg-[#1a1a1a] border border-[#D4A574]/50 rounded text-sm text-white placeholder-[#5a5a5a] focus:outline-none focus:border-[#D4A574]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#8B8B8B] font-medium mb-1">Address</label>
                      <textarea
                        value={newContactAddress}
                        onChange={(e) => setNewContactAddress(e.target.value)}
                        placeholder="Full Address"
                        className="w-full px-3 py-1.5 bg-[#1a1a1a] border border-[#D4A574]/50 rounded text-sm text-white placeholder-[#5a5a5a] focus:outline-none focus:border-[#D4A574] h-16 resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (newCompanyName.trim()) {
                      setInsuranceCompany(newCompanyName);
                      if (newTpaNames.trim()) {
                        setInsuranceTPA(newTpaNames.split(',')[0].trim());
                      }
                      // Set Contact Info
                      setContactName(newContactName);
                      setContactEmail(newContactEmail);
                      setContactPhone(newContactPhone);
                      setContactAddress(newContactAddress);

                      setShowCompanyTpaModal(false);
                      setNewCompanyName('');
                      setNewTpaNames('');
                      setNewContactName('');
                      setNewContactEmail('');
                      setNewContactPhone('');
                      setNewContactAddress('');
                      showAlert('Company and Contact Details added successfully!');
                    } else {
                      showAlert('Please enter a company name');
                    }
                  }}
                  className="flex-1 bg-[#D4A574] text-[#0a0a0a] py-2 rounded-lg hover:bg-[#C9955E] font-medium"
                >
                  Add Details
                </button>
                <button
                  onClick={() => {
                    setShowCompanyTpaModal(false);
                    setNewCompanyName('');
                    setNewTpaNames('');
                    setNewContactName('');
                    setNewContactEmail('');
                    setNewContactPhone('');
                    setNewContactAddress('');
                  }}
                  className="flex-1 bg-[#2a2a2a] text-[#D4A574] py-2 rounded-lg hover:bg-[#3a3a3a] font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
