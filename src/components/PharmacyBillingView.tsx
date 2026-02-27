import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Search, Eye, User, X, ChevronDown, CheckCircle } from 'lucide-react';
import API_ENDPOINTS from '../config/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';

interface MedicineItem {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  description: string;
}

interface CartItem extends MedicineItem {
  quantity: number;
}

interface PharmacyBillingViewProps {
  registrationId?: string;
  patientName?: string;
  onBillingComplete?: (total: number) => void;
}

export function PharmacyBillingView({
  registrationId,
  patientName,
  onBillingComplete
}: PharmacyBillingViewProps) {
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableStock, setAvailableStock] = useState<{ [key: string]: number }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Updated to match Database categories from Excel import
  const categories = ['All', 'Drops', 'Tablet', 'Capsules', 'Ointment', 'Injection', 'Others', 'Surgical'];

  // Patient Search State
  const [currentRegId, setCurrentRegId] = useState<string | undefined>(registrationId);
  const [currentPatientName, setCurrentPatientName] = useState<string | undefined>(patientName);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState<any[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);

  // Wave Off State
  const [isWaveOffMode, setIsWaveOffMode] = useState(false);
  const [waveOffReason, setWaveOffReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [gstRate, setGstRate] = useState<number>(0);

  // Payment & Insurance State
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [isInsuranceClaim, setIsInsuranceClaim] = useState(false);
  const [insuranceDetails, setInsuranceDetails] = useState({
    provider: '',
    claimNumber: '',
    amount: 0
  });

  const WAVE_OFF_REASONS = ['Staff', 'Charity', 'Camp', 'Other'];
  const STAFF_PIN = "1234"; 

  // Initialize checks if props change
  useEffect(() => {
    if (registrationId) setCurrentRegId(registrationId);
    if (patientName) setCurrentPatientName(patientName);
  }, [registrationId, patientName]);

  // Patient Search Effect
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

  const handleSelectPatient = (patient: any) => {
    setCurrentRegId(patient.registrationId);
    setCurrentPatientName(patient.name);
    setPatientSearchQuery('');
    setPatientSearchResults([]);
    setShowPatientDropdown(false);
  };

  // Fetch medicines from backend
  useEffect(() => {
    const fetchMedicines = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(API_ENDPOINTS.PHARMACY.GET_MEDICINES);
        if (!response.ok) throw new Error('Failed to fetch medicines');

        const data = await response.json();
        if (data.medicines && Array.isArray(data.medicines)) {
          setMedicines(data.medicines);
          const stockMap: { [key: string]: number } = {};
          data.medicines.forEach((med: MedicineItem) => {
            stockMap[med.id] = med.stock;
          });
          setAvailableStock(stockMap);
        } else {
          throw new Error('Invalid medicines data format');
        }
      } catch (err) {
        console.error('Error fetching medicines:', err);
        setError('Failed to load medicines from server');
        setMedicines([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMedicines();
  }, []);

  const filteredMedicines = medicines.filter(med => {
    const matchesCategory = selectedCategory === 'All' || med.category === selectedCategory;
    const matchesSearch = med.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  }).slice(0, selectedCategory === 'All' ? 20 : undefined);

  const addToCart = (medicine: MedicineItem) => {
    const currentStock = availableStock[medicine.id] || medicine.stock;
    if (currentStock <= 0) return;

    const existing = cart.find(item => item.id === medicine.id);
    if (existing) {
      if (existing.quantity < currentStock) {
        setCart(cart.map(item =>
          item.id === medicine.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
        setAvailableStock(prev => ({
          ...prev,
          [medicine.id]: prev[medicine.id] - 1
        }));
      }
    } else {
      setCart([...cart, { ...medicine, quantity: 1 }]);
      setAvailableStock(prev => ({
        ...prev,
        [medicine.id]: prev[medicine.id] - 1
      }));
    }
  };

  const removeFromCart = (medicineId: string) => {
    const cartItem = cart.find(item => item.id === medicineId);
    if (cartItem) {
      setAvailableStock(prev => ({
        ...prev,
        [medicineId]: prev[medicineId] + cartItem.quantity
      }));
    }
    setCart(cart.filter(item => item.id !== medicineId));
  };

  const updateQuantity = (medicineId: string, quantity: number) => {
    const currentCartItem = cart.find(item => item.id === medicineId);
    const currentStock = availableStock[medicineId] || 0;

    if (quantity <= 0) {
      removeFromCart(medicineId);
    } else {
      const oldQuantity = currentCartItem?.quantity || 0;
      const difference = quantity - oldQuantity;

      if (difference > 0 && currentStock < difference) {
        return;
      }

      setCart(cart.map(item =>
        item.id === medicineId ? { ...item, quantity } : item
      ));

      setAvailableStock(prev => ({
        ...prev,
        [medicineId]: prev[medicineId] - difference
      }));
    }
  };

  const cartSubTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const gstAmount = (cartSubTotal * gstRate) / 100;

  // Insurance Calculation
  const insuranceDeduction = isInsuranceClaim ? (insuranceDetails.amount || 0) : 0;
  const totalBeforeInsurance = cartSubTotal + gstAmount;

  // Final Amount Logic - Ensure non-negative
  const cartTotal = isWaveOffMode ? 0 : Math.max(0, totalBeforeInsurance - insuranceDeduction);
  
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handlePrintPharmacyBill = (billId: string, items: CartItem[], total: number) => {
    // Skip printing for Wave Off
    if (isWaveOffMode) return;

    const today = new Date();
    const dateStr = today.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = today.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    let itemsRows = '';
    items.forEach((item, index) => {
      itemsRows += `
        <tr>
          <td style="border: 1px solid #333; padding: 6px; text-align: center;">${index + 1}</td>
          <td style="border: 1px solid #333; padding: 6px;">${item.name}</td>
          <td style="border: 1px solid #333; padding: 6px; text-align: center;">${item.quantity}</td>
          <td style="border: 1px solid #333; padding: 6px; text-align: right;">₹${item.price}</td>
          <td style="border: 1px solid #333; padding: 6px; text-align: right;">₹${(item.price * item.quantity).toLocaleString('en-IN')}</td>
        </tr>
      `;
    });

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pharmacy Bill - ${billId}</title>
        <style>
          @page { size: A4; margin: 10mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.2; color: #000; }
          .invoice-container { max-width: 100%; padding: 10px; border: 1px solid #ccc; }
          .header { display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; align-items: center; padding: 8px 0; border-bottom: 2px solid #333; }
          .bill-title { text-align: center; font-size: 14px; font-weight: bold; padding: 4px; background-color: #eee; border: 1px solid #333; margin: 10px 0; }
          .patient-info { display: grid; grid-template-columns: 1fr 1fr; margin-bottom: 10px; font-size: 11px; }
          .info-row { margin-bottom: 3px; }
          .billing-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          .billing-table th { background-color: #f2f2f2; border: 1px solid #333; padding: 6px; font-weight: bold; text-align: center; font-size: 10px; }
          .totals-section { display: flex; justify-content: flex-end; margin-top: 10px; }
          .footer { margin-top: 30px; display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px solid #ccc; }
          @media print { .invoice-container { border: none; } }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <div style="text-align: left; font-size: 9px;">
              <div style="font-weight: bold; font-size: 11px;">SPARK EYE CARE HOSPITAL</div>
              <div>182-705/5/12/A, New Malakpet, Hyd-500008</div>
              <div>Ph: 040-24542000</div>
            </div>
            <div style="text-align: center;">
              <img src="/Hospital.png" alt="Logo" style="height: 60px;">
              <div style="font-weight: bold;">PHARMACY</div>
            </div>
            <div style="text-align: right; font-size: 9px;">
              <div style="font-weight: bold; font-size: 11px;">SPARK EYE CARE HOSPITAL</div>
              <div>Secunderabad, Metro Pillar 1033, 500020</div>
              <div>Ph: 090-29500266</div>
            </div>
          </div>

          <div class="bill-title">PHARMACY ${isWaveOffMode ? 'WAVEOFF' : paymentMode.toUpperCase()} BILL</div>

          <div class="patient-info">
            <div>
              <div class="info-row"><strong>Name:</strong> ${currentPatientName || 'Walk-in Patient'}</div>
              <div class="info-row"><strong>Reg ID:</strong> ${currentRegId || '-'}</div>
              ${isInsuranceClaim ? `<div class="info-row"><strong>Insurance:</strong> ${insuranceDetails.provider}</div>` : ''}
            </div>
            <div style="text-align: right;">
              <div class="info-row"><strong>Bill No:</strong> ${billId}</div>
              <div class="info-row"><strong>Date:</strong> ${dateStr} ${timeStr}</div>
              ${isInsuranceClaim ? `<div class="info-row"><strong>Claim #:</strong> ${insuranceDetails.claimNumber}</div>` : ''}
            </div>
          </div>

          <table class="billing-table">
            <thead>
              <tr>
                <th style="width: 40px;">S.No</th>
                <th>Medicine / Product</th>
                <th style="width: 50px;">Qty</th>
                <th style="width: 80px;">Rate</th>
                <th style="width: 100px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
            <tfoot>
               ${gstRate > 0 ? `
               <tr>
                 <td colspan="4" style="text-align: right; padding: 6px; font-weight: bold; border: 1px solid #333;">Subtotal</td>
                 <td style="text-align: right; padding: 6px; border: 1px solid #333;">₹${cartSubTotal.toLocaleString('en-IN')}</td>
               </tr>
               <tr>
                 <td colspan="4" style="text-align: right; padding: 6px; font-weight: bold; border: 1px solid #333;">GST (${gstRate}%)</td>
                 <td style="text-align: right; padding: 6px; border: 1px solid #333;">₹${gstAmount.toLocaleString('en-IN')}</td>
               </tr>
               ` : ''}
               ${isInsuranceClaim ? `
               <tr>
                 <td colspan="4" style="text-align: right; padding: 6px; font-weight: bold; border: 1px solid #333;">Insurance Claim</td>
                 <td style="text-align: right; padding: 6px; border: 1px solid #333;">-₹${(insuranceDetails.amount || 0).toLocaleString('en-IN')}</td>
               </tr>
               ` : ''}
               <tr>
                <td colspan="4" style="text-align: right; padding: 6px; font-weight: bold; border: 1px solid #333;">Net Total</td>
                <td style="text-align: right; padding: 6px; font-weight: bold; border: 1px solid #333;">₹${total.toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          </table>

          <div class="footer">
            <div style="text-align: center;">
              ________________<br>Patient Signature
            </div>
            <div style="text-align: center;">
              ________________<br>Pharmacist Signature
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => printWindow.print();
    }
  };

  const handlePinVerify = async () => {
    if (pin === STAFF_PIN) {
        setShowPinModal(false);
        setPin('');
        setPinError('');
        await processCheckout();
    } else {
        setPinError('Incorrect PIN');
    }
  };

  const processCheckout = async () => {
    try {
      const finalWaveOffReason = customReason ? `${waveOffReason} - ${customReason}` : waveOffReason;
      const billingData = {
        registrationId: isWaveOffMode ? 'WAVEOFF-STAFF' : currentRegId,
        patientName: isWaveOffMode ? 'Hospital Staff / Internal' : (currentPatientName || 'Unknown'),
        items: cart.map(item => ({
          medicineId: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: isWaveOffMode ? 0 : item.price * item.quantity
        })),
        totalAmount: cartTotal,
        gstRate: isWaveOffMode ? 0 : gstRate,
        gstAmount: isWaveOffMode ? 0 : gstAmount,
        subTotal: isWaveOffMode ? 0 : cartSubTotal,
        paymentMethod: isWaveOffMode ? 'WaveOff' : paymentMode,
        waveOffReason: isWaveOffMode ? finalWaveOffReason : undefined,
        isInsuranceClaimed: isWaveOffMode ? false : isInsuranceClaim,
        insuranceDetails: isWaveOffMode ? {} : insuranceDetails
      };

      const response = await fetch(API_ENDPOINTS.PHARMACY.CREATE_BILL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(billingData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create pharmacy bill');
      }

      const result = await response.json();

      // Auto-print bill
      handlePrintPharmacyBill(result.billId, cart, cartTotal);

      alert(`Pharmacy billing completed!\nBill ID: ${result.billId}\nTotal: ₹${cartTotal}`);
      
      setWaveOffReason('');
      setCustomReason('');
      setIsInsuranceClaim(false);
      setInsuranceDetails({ provider: '', claimNumber: '', amount: 0 });
      setPaymentMode('Cash');

      // Refresh medicines
      const refreshResponse = await fetch(API_ENDPOINTS.PHARMACY.GET_MEDICINES);
      if (refreshResponse.ok) {
        const refreshedData = await refreshResponse.json();
        if (refreshedData.medicines) {
          setMedicines(refreshedData.medicines);
        }
      }

      setCart([]);
      if (onBillingComplete) onBillingComplete(cartTotal);
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Failed to complete checkout'}`);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Please add items to cart');
      return;
    }

    if (isWaveOffMode) {
      if (!waveOffReason) {
        alert('Please select a mandatory reason for Wave Off');
        return;
      }
      setShowPinModal(true);
      return;
    }
    
    if (!currentRegId) {
      alert('Please select a patient');
      return;
    }
    
    await processCheckout();
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-[#0a0a0a] to-[#1a1a1a] flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-[#D4A574]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">OphtalMed Pharmacy</h1>
            <p className="text-[#8B8B8B] text-sm">Touch Screen Billing System</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Wave Off Toggle */}
            <div className="flex items-center gap-2 bg-[#1a1a1a] px-3 py-2 rounded-lg border border-[#D4A574]/50 hover:border-[#D4A574] transition-colors">
              <span className={`text-sm font-medium ${isWaveOffMode ? 'text-[#D4A574]' : 'text-gray-400'}`}>Wave Off</span>
              <button 
                onClick={() => {
                  setIsWaveOffMode(!isWaveOffMode);
                  if (!isWaveOffMode) {
                    setCurrentRegId(undefined);
                    setCurrentPatientName(undefined);
                    setWaveOffReason('');
                    setCustomReason('');
                  }
                }}
                className={`w-10 h-5 rounded-full relative transition-colors ${isWaveOffMode ? 'bg-[#D4A574]' : 'bg-gray-700'}`}
              >
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isWaveOffMode ? 'left-6' : 'left-1'}`} />
              </button>
            </div>

            {isWaveOffMode ? (
              <div className="flex items-center gap-2">
                <select 
                  value={waveOffReason}
                  onChange={(e) => setWaveOffReason(e.target.value)}
                  className="bg-[#1a1a1a] text-[#D4A574] border border-[#D4A574] rounded px-3 py-2 outline-none focus:ring-1 focus:ring-[#D4A574] text-sm"
                >
                  <option value="" disabled>Select Reason</option>
                  {WAVE_OFF_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                
                {waveOffReason && (
                   <input 
                    type="text"
                    placeholder="Add specific notes (optional)"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="bg-[#121212] border border-[#D4A574] rounded px-3 py-2 text-white text-sm outline-none focus:border-[#C9955E] w-64"
                   />
                )}
              </div>
            ) : (
            /* Search Patient Box */
            <div className="relative w-[300px] z-20">
              <div className="flex items-center bg-[#121212] border border-[#D4A574] rounded-lg px-3 py-2 transition-colors focus-within:border-[#D4A574]">
                <Search className="w-4 h-4 text-[#8B8B8B] mr-2" />
                <input
                  type="text"
                  placeholder="Search Patient (Name/Mobile/ID)"
                  value={patientSearchQuery}
                  onChange={(e) => setPatientSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-white text-sm w-full placeholder-[#4a4a4a]"
                />
                {isSearchingPatient && (
                  <div className="w-4 h-4 border-2 border-[#D4A574] border-t-transparent rounded-full animate-spin ml-2"></div>
                )}
              </div>

              {/* Dropdown Results */}
              {showPatientDropdown && patientSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-[#D4A574] rounded-lg shadow-xl overflow-hidden max-h-[300px] overflow-y-auto">
                  {patientSearchResults.map((patient) => (
                    <div
                      key={patient.registrationId}
                      onClick={() => handleSelectPatient(patient)}
                      className="p-3 hover:bg-[#2a2a2a] cursor-pointer border-b border-[#D4A574] last:border-0 transition-colors"
                    >
                      <div className="font-semibold text-white">{patient.name}</div>
                      <div className="text-xs text-[#8B8B8B] flex justify-between mt-1">
                        <span>{patient.registrationId}</span>
                        <span>{patient.contactNumber}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}


            {/* Selected Patient Display */}
            {currentPatientName ? (
              <div className="flex items-center gap-3 bg-[#121212] px-4 py-3 rounded-lg border border-[#D4A574]">
                <div className="w-10 h-10 bg-[#D4A574] rounded-full flex items-center justify-center text-[#0a0a0a] font-bold shadow-lg shadow-[#D4A574]/20">
                  {currentPatientName.charAt(0)}
                </div>
                <div>
                  <p className="text-white font-semibold">{currentPatientName}</p>
                  <p className="text-[#8B8B8B] text-xs">Reg ID: {currentRegId}</p>
                </div>
                <button 
                  onClick={() => {
                    setCurrentRegId(undefined);
                    setCurrentPatientName(undefined);
                    if (onBillingComplete) onBillingComplete(0); // Optional: Reset parent state if needed
                  }}
                  className="ml-2 hover:bg-[#2a2a2a] p-1 rounded-full text-[#8B8B8B] hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-[#121212] px-4 py-3 rounded-lg border border-[#D4A574] opacity-60">
                <div className="w-10 h-10 bg-[#2a2a2a] rounded-full flex items-center justify-center text-[#4a4a4a] font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[#8B8B8B] font-semibold">No Patient</p>
                  <p className="text-[#4a4a4a] text-xs">Select a patient to bill</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Split Screen 50/50 */}
      <div className="flex-1 flex flex-row overflow-hidden">
        {/* Left Side - Medicines Grid */}
        <div className="w-1/2 flex flex-col min-w-0 border-r border-[#D4A574]">
          {/* Fixed Header Section */}
          <div className="shrink-0 p-6 border-b border-[#D4A574]">
            {/* Category Filter */}
            <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded text-sm whitespace-nowrap font-semibold transition-colors ${
                    selectedCategory === cat
                      ? 'bg-black text-white border border-[#D4A574]'
                      : 'bg-[#121212] text-[#8B8B8B] border border-[#D4A574] hover:border-[#D4A574]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#8B8B8B]" />
              <Input
                type="text"
                placeholder="Search medicines..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#121212] border-[#D4A574] text-white placeholder-[#6B6B6B]"
              />
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto">
            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D4A574] mb-4"></div>
                  <p className="text-[#8B8B8B]">Loading medicines...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 m-6">
                <p className="text-red-400">{error}</p>
              </div>
            )}

              {/* Medicine Grid - 4 columns for clean layout */}
            {!loading && (
              <div className="grid grid-cols-5 gap-4 p-4">
                {filteredMedicines.map(medicine => (
                <div
                  key={medicine.id}
                  className="bg-[#121212] border border-[#D4A574] rounded-lg p-2 hover:border-[#D4A574] transition-all hover:shadow-lg hover:shadow-[#D4A574]/20"
                >
                  {/* Icon */}
                  <div className="w-full h-12 bg-[#1a1a1a] border border-[#D4A574] rounded flex items-center justify-center mb-3 shrink-0">
                    <Eye className="w-6 h-6 text-[#D4A574]" />
                  </div>

                  {/* Name and Price - Clearly separated */}
                  <div className="mb-2">
                    <h3 className="text-white font-semibold text-sm line-clamp-2 mb-1">{medicine.name}</h3>
                    <div className="flex items-baseline justify-between mb-1">
                      <p className="text-[#D4A574] font-bold text-lg">₹{medicine.price}</p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-[#8B8B8B] text-xs mb-2 line-clamp-2 h-8">{medicine.description}</p>

                  {/* Stock Info */}
                  <div className="mb-3 pb-2 border-t border-[#D4A574] pt-2">
                    <p className="text-[#8B8B8B] text-xs">
                      Available: <span className="text-[#D4A574] font-semibold">{availableStock[medicine.id] || medicine.stock}</span>
                    </p>
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    onClick={() => addToCart(medicine)}
                    disabled={(availableStock[medicine.id] || medicine.stock) === 0}
                    className="w-full py-2 bg-[#D4A574] text-[#0a0a0a] rounded hover:bg-[#C9955E] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold flex items-center justify-center gap-1 text-xs"
                  >
                    <Plus className="w-3 h-3" /> Add to Cart
                  </button>
                </div>
                ))}
              </div>
            )}

            {!loading && filteredMedicines.length === 0 && (
              <div className="text-center py-12">
                <p className="text-[#8B8B8B]">No medicines found</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Order Summary */}
        <div className="w-1/2 flex flex-col overflow-hidden border-l border-[#D4A574]">
          <Card className="bg-[#121212] border border-[#D4A574] flex flex-col h-full rounded-none">
            {/* Header */}
            <div className="p-4 border-b border-[#D4A574] flex items-center justify-between shrink-0">
              <h2 className="text-white font-bold text-base">Order Summary</h2>
              {cart.length > 0 && (
                <button className="text-[#D4A574] text-xs font-semibold hover:text-[#C9955E] transition-colors">
                  Edit
                </button>
              )}
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-3">
              {cart.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-[#8B8B8B] text-center text-xs">Cart is empty</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Item Count */}
                  <p className="text-[#D4A574] text-xs font-semibold">{cartItemCount} {cartItemCount === 1 ? 'Item' : 'Items'}</p>

                  {/* Cart Items */}
                  <div className="space-y-1 mb-2">
                    {cart.map(item => (
                      <div key={item.id} className="flex gap-2">
                        {/* Item bullet */}
                        <div className="w-1.5 h-1.5 bg-[#D4A574] rounded-full mt-1.5 shrink-0"></div>

                        {/* Item details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1">
                              <p className="text-white text-xs font-medium leading-tight">
                                {item.quantity}x {item.name}
                              </p>
                              <p className="text-[#8B8B8B] text-xs mt-0.5">
                                ₹{item.price.toFixed(2)}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[#D4A574] font-semibold text-xs">
                                ₹{(item.price * item.quantity).toFixed(2)}
                              </span>
                              <button
                                onClick={() => removeFromCart(item.id)}
                                className="text-[#8B8B8B] hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Quantity controls */}
                          <div className="flex items-center gap-0.5 mt-1">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="px-1.5 py-0.5 bg-[#1a1a1a] text-[#D4A574] rounded hover:bg-[#2a2a2a] transition-colors"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="px-1.5 text-white font-semibold text-xs">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="px-1.5 py-0.5 bg-[#1a1a1a] text-[#D4A574] rounded hover:bg-[#2a2a2a] transition-colors"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-[#D4A574] pt-1 space-y-1">
                    {/* Subtotal */}
                    <div className="flex justify-between items-center">
                      <span className="text-[#8B8B8B] text-xs">Subtotal</span>
                      <span className="text-white font-semibold text-xs">₹{cartSubTotal.toFixed(2)}</span>
                    </div>

                    {/* GST Selection */}
                    <div className="flex justify-between items-center">
                      <span className="text-[#8B8B8B] text-xs">GST</span>
                      <div className="flex items-center gap-2">
                        <select
                          value={gstRate}
                          onChange={(e) => setGstRate(Number(e.target.value))}
                          className="bg-[#1a1a1a] text-white text-xs border border-[#D4A574] rounded px-1 py-0.5 outline-none focus:border-[#C9955E]"
                          disabled={isWaveOffMode}
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="10">10%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                        </select>
                        <span className="text-white font-semibold text-xs">₹{gstAmount.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Payment Mode Selection */}
                    {!isWaveOffMode && (
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-[#8B8B8B] text-xs">Payment Mode</span>
                          <select
                            value={paymentMode}
                            onChange={(e) => setPaymentMode(e.target.value)}
                            className="bg-[#1a1a1a] text-white text-xs border border-[#D4A574] rounded px-1 py-0.5 outline-none focus:border-[#C9955E] w-[100px]"
                          >
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="Card">Card</option>
                          </select>
                        </div>
                    )}

                    {/* Insurance Section */}
                    {!isWaveOffMode && (
                        <div className="mt-2 pt-2 border-t border-[#D4A574]/30">
                           <div className="flex items-center justify-between mb-1">
                             <label className="text-[#8B8B8B] text-xs flex items-center gap-1 cursor-pointer">
                               <input 
                                 type="checkbox" 
                                 checked={isInsuranceClaim}
                                 onChange={(e) => {
                                    setIsInsuranceClaim(e.target.checked);
                                    if(!e.target.checked) {
                                        setInsuranceDetails(prev => ({...prev, amount: 0}));
                                    }
                                 }}
                                 className="accent-[#D4A574]"
                               />
                               Apply Insurance
                             </label>
                           </div>

                           {isInsuranceClaim && (
                             <div className="space-y-1 bg-[#1a1a1a] p-2 rounded border border-[#D4A574]/30">
                                <input
                                  type="text"
                                  placeholder="Provider Name"
                                  value={insuranceDetails.provider}
                                  onChange={(e) => setInsuranceDetails({...insuranceDetails, provider: e.target.value})}
                                  className="w-full bg-[#121212] border border-[#D4A574]/50 rounded px-2 py-1 text-xs text-white outline-none focus:border-[#D4A574] placeholder-[#4a4a4a]"
                                />
                                <div className="flex gap-1">
                                    <input
                                      type="text"
                                      placeholder="Claim No."
                                      value={insuranceDetails.claimNumber}
                                      onChange={(e) => setInsuranceDetails({...insuranceDetails, claimNumber: e.target.value})}
                                      className="flex-1 bg-[#121212] border border-[#D4A574]/50 rounded px-2 py-1 text-xs text-white outline-none focus:border-[#D4A574] placeholder-[#4a4a4a]"
                                    />
                                    <input
                                      type="number"
                                      placeholder="Amount"
                                      value={insuranceDetails.amount || ''}
                                      onChange={(e) => setInsuranceDetails({...insuranceDetails, amount:  Number(e.target.value)})}
                                      className="w-20 bg-[#121212] border border-[#D4A574]/50 rounded px-2 py-1 text-xs text-white outline-none focus:border-[#D4A574] placeholder-[#4a4a4a]"
                                    />
                                </div>
                             </div>
                           )}

                           {isInsuranceClaim && insuranceDetails.amount > 0 && (
                             <div className="flex justify-between items-center mt-1">
                               <span className="text-[#8B8B8B] text-xs">Insurance Coverage</span>
                               <span className="text-red-400 font-semibold text-xs">- ₹{insuranceDetails.amount.toFixed(2)}</span>
                             </div>
                           )}
                        </div>
                    )}

                    {/* Divider */}
                    <div className="border-t border-[#D4A574] pt-1"></div>

                    {/* Total */}
                    <div className="flex justify-between items-center">
                      <span className="text-white font-bold text-sm">Total</span>
                      <span className="text-[#D4A574] font-bold text-lg">₹{cartTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Checkout Button */}
            {cart.length > 0 && (
              <div className="border-t border-[#D4A574] p-3 shrink-0">
                <button
                  onClick={handleCheckout}
                  className="w-full py-2 bg-[#D4A574] text-[#0a0a0a] rounded hover:bg-[#C9955E] transition-colors font-bold text-sm"
                >
                  Checkout
                </button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* PIN Verification Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] border border-[#D4A574] p-6 rounded-lg w-96">
            <h3 className="text-xl font-bold text-[#D4A574] mb-4">Staff Verification</h3>
            <p className="text-gray-400 mb-4 text-sm">Please enter your PIN to authorize Wave Off billing.</p>
            
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full bg-[#121212] border border-[#D4A574] rounded p-2 text-white mb-2 outline-none focus:ring-1 focus:ring-[#D4A574]"
              placeholder="Enter PIN"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePinVerify();
              }}
            />
            
            {pinError && <p className="text-red-500 text-sm mb-4">{pinError}</p>}
            
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowPinModal(false);
                  setPin('');
                  setPinError('');
                }}
                className="px-4 py-2 text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handlePinVerify}
                className="px-4 py-2 bg-[#D4A574] text-black font-bold rounded hover:bg-[#C9955E]"
              >
                Verify & Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
