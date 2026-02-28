import React, { useState, useEffect } from 'react';
import { Plus, Minus, Trash2, Edit2, Save, X, AlertCircle, Upload } from 'lucide-react';
import API_ENDPOINTS, { API_BASE_URL } from '../config/api';

interface Medicine {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  description: string;
  // Backend fields used for internal mapping
  expiry_date?: string;
  batch_number?: string;
  manufacturer?: string;
  // Frontend/Form fields
  expiryDate?: string;
  batchNumber?: string;
  vendorName?: string;

  invoiceNumber?: string;
  mrp?: number;
  purchasePrice?: number;
  purchaseDate?: string;
  branchName?: string;
  isExisting?: boolean;
}

export function MedicineManagementView() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Invoice Upload State
  const [importedMedicines, setImportedMedicines] = useState<Partial<Medicine>[]>([]);
  const [isProcessingInvoice, setIsProcessingInvoice] = useState(false);

  // Stock Management State
  const [stockChanges, setStockChanges] = useState<{ [key: string]: number }>({});

  const categories = [
    'Drops',
    'Tablet',
    'Capsules',
    'Ointment',
    'Injection',
    'Others',
    'Surgical',
    'Eye Drops',
    'Tablets',
    'Ointments',
    'Contact Lens'
  ];

  const [formData, setFormData] = useState({
    name: '',
    category: 'Eye Drops',
    price: '',
    stock: '',
    description: '',
    expiryDate: '',
    batchNumber: '',
    vendorName: '',
    invoiceNumber: '',
    mrp: '',
    purchasePrice: '',
    purchaseDate: '',
    branchName: ''
  });

  // Fetch medicines on mount
  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(API_ENDPOINTS.PHARMACY.GET_MEDICINES);
      if (!response.ok) throw new Error('Failed to fetch medicines');
      const data = await response.json();
      if (data.medicines && Array.isArray(data.medicines)) {
        // Map backend fields to frontend if needed or keep as is
        setMedicines(data.medicines);
      }
    } catch (err) {
      console.error('Error fetching medicines:', err);
      setError('Failed to load medicines');
    } finally {
      setLoading(false);
    }
  };

  // --- Invoice Parsing Logic ---
  const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsProcessingInvoice(true);
    setError(null);
    setSuccess(null);
    
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/medicines/parse-invoice`, {
            method: 'POST',
            body: formDataUpload,
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Failed to parse invoice');
        }
        
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
            // Map parsed data to our structure
            const mapped = data.map((item: any, idx: number) => {
                // Check if medicine already exists (simple fuzzy match on name)
                const existing = medicines.find(m => 
                    m.name.toLowerCase().trim() === (item.name || '').toLowerCase().trim()
                );

                if (existing) {
                    return {
                        ...existing, // Keep existing ID and details
                        stock: item.stock || 0, // This will be ADDED to stock
                        // Update price/mrp if available in invoice, otherwise keep existing
                        price: item.mrp || existing.price,
                        mrp: item.mrp || existing.mrp || 0,
                        purchasePrice: item.purchasePrice || existing.purchasePrice || 0,
                        
                        // New batch info
                        expiry_date: item.expiry || existing.expiry_date,
                        batch_number: item.batch || existing.batch_number,
                        
                        // Frontend helpers
                        expiryDate: item.expiry || existing.expiryDate,
                        batchNumber: item.batch || existing.batchNumber,
                        
                        isExisting: true // Flag to UI
                    };
                } else {
                    return {
                        id: `import-${Date.now()}-${idx}`,
                        name: item.name || '',
                        category: 'Others',
                        price: item.mrp || 0,
                        stock: item.stock || 0,
                        description: '',
                        expiry_date: item.expiry || '',
                        batch_number: item.batch || '',
                        mrp: item.mrp || 0,
                        purchasePrice: item.purchasePrice || 0,
                        expiryDate: item.expiry || '',
                        batchNumber: item.batch || '',
                        isExisting: false
                    };
                }
            });
            setImportedMedicines(mapped);
            setSuccess(`Successfully extracted ${data.length} medicines. matched ${mapped.filter((m: any) => m.isExisting).length} existing items.`);
        } else {
            setError('No medicines could be extracted from this invoice. Please try a clearer image or PDF.');
        }
    } catch (err: any) {
        console.error('Error uploading invoice:', err);
        setError(err.message || 'Failed to upload invoice');
    } finally {
        setIsProcessingInvoice(false);
        e.target.value = ''; // Reset input
    }
  };

  const saveImportedMedicine = async (index: number) => {
    const medicineToSave = importedMedicines[index];
    if (!medicineToSave) return;

    try {
        if (medicineToSave.isExisting && medicineToSave.id && !medicineToSave.id.startsWith('import-')) {
            // Update existing stock
            const existing = medicines.find(m => m.id === medicineToSave.id);
            const currentStock = existing ? existing.stock : 0;
            const quantityToAdd = Number(medicineToSave.stock);
            
            const response = await fetch(API_ENDPOINTS.PHARMACY.UPDATE_MEDICINE(medicineToSave.id), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stock: currentStock + quantityToAdd,
                    // Optionally update price/batch if it changed
                    price: Number(medicineToSave.price),
                    mrp: Number(medicineToSave.mrp),
                    expiry_date: medicineToSave.expiryDate,
                    batch_number: medicineToSave.batchNumber
                })
            });
            if (!response.ok) throw new Error('Failed to update stock');
        } else {
            // Create new medicine
            const payload = {
                ...medicineToSave,
                price: Number(medicineToSave.price),
                stock: Number(medicineToSave.stock),
                mrp: Number(medicineToSave.mrp),
                expiry_date: medicineToSave.expiryDate,
                batch_number: medicineToSave.batchNumber
            };
            // Remove temp ID if it exists
            if (payload.id && payload.id.startsWith('import-')) {
                delete (payload as any).id;
            }
            // Remove UI flags
            delete (payload as any).isExisting;

            const response = await fetch(API_ENDPOINTS.PHARMACY.CREATE_MEDICINE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error('Failed to save medicine');
        }

        // Remove from import list
        const newImported = [...importedMedicines];
        newImported.splice(index, 1);
        setImportedMedicines(newImported);
        
        fetchMedicines();
        setSuccess(`Saved ${medicineToSave.name}`);
        
        if (newImported.length === 0) {
            setSuccess('All imported medicines saved successfully!');
        }
    } catch (err) {
        console.error(err);
        setError('Failed to save medicine');
    }
  };

  const saveAllImportedMedicines = async () => {
    if (!window.confirm(`Save all ${importedMedicines.length} medicines? This will update stock for existing items and create new entries for others.`)) return;
    
    setIsProcessingInvoice(true);
    let successCount = 0;
    let failCount = 0;

    // Process sequentially to avoid race conditions or backend overload
    // We iterate backwards or create a copy so splicing doesn't mess up indexing?
    // Better to iterate a copy and clear successful ones.
    
    // Actually, let's just process all and then remove successful ones.
    const remaining = [...importedMedicines];
    const processedIndices: number[] = [];

    for (let i = 0; i < importedMedicines.length; i++) {
        const medicineToSave = importedMedicines[i];
        try {
            if (medicineToSave.isExisting && medicineToSave.id && !medicineToSave.id.startsWith('import-')) {
                const existing = medicines.find(m => m.id === medicineToSave.id);
                const currentStock = existing ? existing.stock : 0;
                const quantityToAdd = Number(medicineToSave.stock);
                
                await fetch(API_ENDPOINTS.PHARMACY.UPDATE_MEDICINE(medicineToSave.id), {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        stock: currentStock + quantityToAdd,
                        price: Number(medicineToSave.price),
                        mrp: Number(medicineToSave.mrp),
                        expiry_date: medicineToSave.expiryDate,
                        batch_number: medicineToSave.batchNumber
                    })
                });
            } else {
                 const payload = {
                    ...medicineToSave,
                    price: Number(medicineToSave.price),
                    stock: Number(medicineToSave.stock),
                    mrp: Number(medicineToSave.mrp),
                    expiry_date: medicineToSave.expiryDate,
                    batch_number: medicineToSave.batchNumber
                };
                if (payload.id && payload.id.startsWith('import-')) delete (payload as any).id;
                delete (payload as any).isExisting;

                await fetch(API_ENDPOINTS.PHARMACY.CREATE_MEDICINE, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            }
            processedIndices.push(i);
            successCount++;
        } catch (e) {
            console.error(e);
            failCount++;
        }
    }

    // Update state to remove successfully saved items
    // Filter out items that were processed successfully
    const newImportedList = importedMedicines.filter((_, index) => !processedIndices.includes(index));
    setImportedMedicines(newImportedList);
    
    fetchMedicines();
    setIsProcessingInvoice(false);
    
    if (failCount === 0) {
        setSuccess(`Successfully saved all ${successCount} medicines.`);
    } else {
        setError(`Saved ${successCount} medicines, but failed to save ${failCount}. Please review remaining items.`);
    }
  };

  const updateImportedField = (index: number, field: keyof Medicine, value: any) => {
      const newImported = [...importedMedicines];
      const updates: any = { [field]: value };
      
      // Sync duplicate fields
      if (field === 'expiryDate') updates.expiry_date = value;
      if (field === 'batchNumber') updates.batch_number = value;

      newImported[index] = { ...newImported[index], ...updates };
      setImportedMedicines(newImported);
  };

  const removeImportedMedicine = (index: number) => {
      const newImported = [...importedMedicines];
      newImported.splice(index, 1);
      setImportedMedicines(newImported);
  };

  // --- CRUD Operations ---

  const handleAddMedicine = async () => {
    if (!formData.name || !formData.price || !formData.stock) {
      setError('Please fill all required fields');
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.PHARMACY.CREATE_MEDICINE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock),
          description: formData.description,
          expiry_date: formData.expiryDate || null,
          batch_number: formData.batchNumber || null,
          manufacturer: formData.vendorName || null,
          invoiceNumber: formData.invoiceNumber || null,
          mrp: formData.mrp ? parseFloat(formData.mrp) : null,
          purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : null,
          purchaseDate: formData.purchaseDate || null,
          branchName: formData.branchName || null
        })
      });

      if (!response.ok) throw new Error('Failed to add medicine');

      setSuccess('Medicine added successfully!');
      setFormData({ name: '', category: 'Eye Drops', price: '', stock: '', description: '', expiryDate: '', batchNumber: '', vendorName: '', invoiceNumber: '', mrp: '', purchasePrice: '', purchaseDate: '', branchName: '' });
      setShowAddForm(false);
      await fetchMedicines();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error adding medicine:', err);
      setError('Failed to add medicine');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleUpdateMedicine = async (medicineId: string, updates: Partial<Medicine>) => {
    try {
      const response = await fetch(API_ENDPOINTS.PHARMACY.UPDATE_MEDICINE(medicineId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) throw new Error('Failed to update medicine');

      setSuccess('Medicine updated successfully!');
      setEditingId(null);
      await fetchMedicines();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating medicine:', err);
      setError('Failed to update medicine');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleAddStock = async (medicineId: string, quantity: number) => {
    if (quantity <= 0) {
      setError('Quantity must be greater than 0');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      const medicine = medicines.find(m => m.id === medicineId);
      if (!medicine) return;

      const response = await fetch(API_ENDPOINTS.PHARMACY.UPDATE_MEDICINE(medicineId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock: medicine.stock + quantity
        })
      });

      if (!response.ok) throw new Error('Failed to add stock');

      setSuccess(`Added ${quantity} units to stock`);
      setStockChanges(prev => ({ ...prev, [medicineId]: 0 }));
      await fetchMedicines();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error adding stock:', err);
      setError('Failed to add stock');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleRemoveStock = async (medicineId: string, quantity: number) => {
    if (quantity <= 0) {
      setError('Quantity must be greater than 0');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      const medicine = medicines.find(m => m.id === medicineId);
      if (!medicine) return;

      if (medicine.stock < quantity) {
        setError('Insufficient stock');
        setTimeout(() => setError(null), 3000);
        return;
      }

      const response = await fetch(API_ENDPOINTS.PHARMACY.UPDATE_MEDICINE(medicineId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock: medicine.stock - quantity
        })
      });

      if (!response.ok) throw new Error('Failed to remove stock');

      setSuccess(`Removed ${quantity} units from stock`);
      setStockChanges(prev => ({ ...prev, [medicineId]: 0 }));
      await fetchMedicines();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error removing stock:', err);
      setError('Failed to remove stock');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDeleteMedicine = async (medicineId: string) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Medicine',
      description: 'Are you sure you want to delete this medicine?',
      onConfirm: async () => {
        try {
          const response = await fetch(API_ENDPOINTS.PHARMACY.UPDATE_MEDICINE(medicineId), {
            method: 'DELETE'
          });
          if (!response.ok) throw new Error('Failed to delete medicine');
          setSuccess('Medicine deleted successfully!');
          await fetchMedicines();
          setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
          console.error('Error deleting medicine:', err);
          setError('Failed to delete medicine');
          setTimeout(() => setError(null), 3000);
        }
      }
    });
    return;
  };

  const filteredMedicines = medicines.filter(med =>
    med.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#050406] text-[#F5F3EF] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Medicine Management</h1>
          <p className="text-[#C2BAB1]">Add, update, and manage medicine inventory</p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-600 rounded-lg flex items-center gap-3">
            <AlertCircle size={20} className="text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-600 rounded-lg flex items-center gap-3">
            <AlertCircle size={20} className="text-green-500" />
            <span>{success}</span>
          </div>
        )}

        {/* Controls */}
        <div className="mb-6 flex gap-4 flex-wrap items-center">
          <input
            type="text"
            placeholder="Search medicines..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[250px] px-4 py-2 bg-[#121015] border border-[#262028] rounded-lg text-[#F5F3EF] placeholder-[#8C847B]"
          />
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-6 py-2 bg-[#D4A574] text-[#0a0a0a] font-bold rounded-xl border border-[#D4A574] hover:bg-[#C9955E] transition-all flex items-center gap-2 shadow-lg shadow-[#D4A574]/20"
          >
            <Plus size={20} />
            Add Medicine
          </button>
          
          <label className={`px-6 py-2 bg-[#1E1C24] text-[#F5F3EF] border border-[#262028] rounded-xl hover:bg-[#262028] transition-all flex items-center gap-2 cursor-pointer ${isProcessingInvoice ? 'opacity-50 pointer-events-none' : ''}`}>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.bmp" className="hidden" onChange={handleInvoiceUpload} disabled={isProcessingInvoice} />
            <Upload size={20} />
            <span>{isProcessingInvoice ? 'Processing...' : 'Upload Invoice'}</span>
          </label>
        </div>

        {/* Imported Medicines Review Section */}
        {importedMedicines.length > 0 && (
          <div className="mb-8 p-6 bg-[#121015] border border-[#D4A574] rounded-2xl shadow-lg shadow-[#D4A574]/10">
            <h3 className="text-xl font-semibold mb-4 text-[#D4A574] flex justify-between items-center">
              <span>Review Imported Medicines ({importedMedicines.length})</span>
              <div className="flex gap-2">
                <button 
                  onClick={saveAllImportedMedicines}
                  className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-semibold flex items-center gap-1"
                >
                  <Save size={16} />
                  Save All
                </button>
                <button 
                  onClick={() => setImportedMedicines([])}
                  className="px-4 py-1.5 bg-red-900/40 hover:bg-red-900/60 text-red-400 rounded text-sm"
                >
                  Discard All
                </button>
              </div>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[#8C847B] border-b border-[#262028]">
                    <th className="p-3">Status</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Batch</th>
                    <th className="p-3">Expiry</th>
                    <th className="p-3">MRP</th>
                    <th className="p-3">Qty (+Current)</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {importedMedicines.map((med, idx) => {
                    // Calculate expected total for display if matched
                    const existing = medicines.find(m => m.id === med.id);
                    const currentStock = existing ? existing.stock : 0;
                    
                    return (
                    <tr key={idx} className={`border-b border-[#262028] hover:bg-[#1E1C24] ${med.isExisting ? 'bg-blue-900/10' : ''}`}>
                      <td className="p-3">
                        {med.isExisting ? (
                          <span className="px-2 py-1 bg-blue-900/40 text-blue-300 text-xs rounded border border-blue-800">Update Stock</span>
                        ) : (
                          <span className="px-2 py-1 bg-green-900/40 text-green-300 text-xs rounded border border-green-800">New Item</span>
                        )}
                      </td>
                      <td className="p-3">
                        <input 
                          type="text" 
                          value={med.name} 
                          onChange={(e) => updateImportedField(idx, 'name', e.target.value)}
                          className="bg-transparent border border-[#262028] rounded px-2 py-1 w-full text-[#F5F3EF]"
                        />
                      </td>
                      <td className="p-3">
                         <input 
                          type="text" 
                          value={med.batchNumber || med.batch_number} 
                          onChange={(e) => updateImportedField(idx, 'batchNumber', e.target.value)}
                          className="bg-transparent border border-[#262028] rounded px-2 py-1 w-24 text-[#F5F3EF]"
                          placeholder="Batch"
                        />
                      </td>
                      <td className="p-3">
                        <input 
                          type="text" 
                          value={med.expiryDate || med.expiry_date} 
                          onChange={(e) => updateImportedField(idx, 'expiryDate', e.target.value)}
                          className="bg-transparent border border-[#262028] rounded px-2 py-1 w-24 text-[#F5F3EF]"
                          placeholder="MM/YY"
                        />
                      </td>
                      <td className="p-3">
                        <input 
                          type="number" 
                          value={med.mrp} 
                          onChange={(e) => updateImportedField(idx, 'mrp', parseFloat(e.target.value))}
                          className="bg-transparent border border-[#262028] rounded px-2 py-1 w-20 text-[#F5F3EF]"
                        />
                      </td>
                      <td className="p-3">
                         <div className="flex items-center gap-1">
                            <input 
                            type="number" 
                            value={med.stock} 
                            onChange={(e) => updateImportedField(idx, 'stock', parseFloat(e.target.value))}
                            className="bg-transparent border border-[#262028] rounded px-2 py-1 w-16 text-[#F5F3EF]"
                            />
                            {med.isExisting && (
                                <span className="text-xs text-[#8C847B] whitespace-nowrap">
                                    + {currentStock} = {currentStock + (med.stock || 0)}
                                </span>
                            )}
                         </div>
                      </td>
                      <td className="p-3 flex gap-2">
                        <button 
                            onClick={() => saveImportedMedicine(idx)}
                            className="p-2 bg-green-900/40 text-green-400 rounded hover:bg-green-900/60"
                            title={med.isExisting ? "Update Stock" : "Create New"}
                        >
                            <Save size={16} />
                        </button>
                        <button 
                            onClick={() => removeImportedMedicine(idx)}
                            className="p-2 bg-red-900/40 text-red-400 rounded hover:bg-red-900/60"
                            title="Remove"
                        >
                            <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Medicine Form */}
        {showAddForm && (
          <div className="mb-6 p-6 bg-[#121015] border border-[#262028] rounded-2xl">
            <h3 className="text-xl font-semibold mb-4">Add New Medicine</h3>

            {/* Basic Information */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-[#D4A574] mb-3">Basic Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Medicine Name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="px-4 py-2 bg-[#0A0809] border border-[#262028] rounded-lg text-[#F5F3EF]"
                />
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                  className="px-4 py-2 bg-[#0A0809] border border-[#262028] rounded-lg text-[#F5F3EF]"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Selling Price (₹)"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  className="px-4 py-2 bg-[#0A0809] border border-[#262028] rounded-lg text-[#F5F3EF]"
                />
                <input
                  type="number"
                  placeholder="MRP (₹)"
                  value={formData.mrp}
                  onChange={e => setFormData({ ...formData, mrp: e.target.value })}
                  className="px-4 py-2 bg-[#0A0809] border border-[#262028] rounded-lg text-[#F5F3EF]"
                />
                <input
                  type="number"
                  placeholder="Purchase Price (₹)"
                  value={formData.purchasePrice}
                  onChange={e => setFormData({ ...formData, purchasePrice: e.target.value })}
                  className="px-4 py-2 bg-[#0A0809] border border-[#262028] rounded-lg text-[#F5F3EF]"
                />
                <input
                  type="number"
                  placeholder="Initial Stock"
                  value={formData.stock}
                  onChange={e => setFormData({ ...formData, stock: e.target.value })}
                  className="px-4 py-2 bg-[#0A0809] border border-[#262028] rounded-lg text-[#F5F3EF]"
                />
              </div>
              <textarea
                placeholder="Description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 bg-[#0A0809] border border-[#262028] rounded-lg text-[#F5F3EF] mb-4"
                rows={2}
              />
            </div>

            {/* Inventory Details */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-[#D4A574] mb-3">Inventory Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Batch Number"
                  value={formData.batchNumber}
                  onChange={e => setFormData({ ...formData, batchNumber: e.target.value })}
                  className="px-4 py-2 bg-[#0A0809] border border-[#262028] rounded-lg text-[#F5F3EF]"
                />
                <input
                  type="text"
                  placeholder="Invoice Number"
                  value={formData.invoiceNumber}
                  onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  className="px-4 py-2 bg-[#0A0809] border border-[#262028] rounded-lg text-[#F5F3EF]"
                />
                <input
                  type="date"
                  placeholder="Purchase Date"
                  value={formData.purchaseDate}
                  onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })}
                  className="px-4 py-2 bg-[#0A0809] border border-[#262028] rounded-lg text-[#F5F3EF]"
                />
                <input
                  type="date"
                  placeholder="Expiry Date"
                  value={formData.expiryDate}
                  onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                  className="px-4 py-2 bg-[#0A0809] border border-[#262028] rounded-lg text-[#F5F3EF]"
                />
              </div>
            </div>

            {/* Vendor Information */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-[#D4A574] mb-3">Vendor Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Vendor/Supplier Name"
                  value={formData.vendorName}
                  onChange={e => setFormData({ ...formData, vendorName: e.target.value })}
                  className="px-4 py-2 bg-[#0A0809] border border-[#262028] rounded-lg text-[#F5F3EF]"
                />
                <input
                  type="text"
                  placeholder="Branch Name"
                  value={formData.branchName}
                  onChange={e => setFormData({ ...formData, branchName: e.target.value })}
                  className="px-4 py-2 bg-[#0A0809] border border-[#262028] rounded-lg text-[#F5F3EF]"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAddMedicine}
                className="px-6 py-2 bg-[#D4A574] text-[#0a0a0a] rounded-xl font-bold border border-[#D4A574] hover:bg-[#C9955E] transition-all shadow-lg shadow-[#D4A574]/10"
              >
                Save Medicine
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-6 py-2 bg-[#262028] hover:bg-[#3A3237] rounded-lg font-semibold transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-[#C2BAB1]">Loading medicines...</p>
          </div>
        )}

        {/* Medicines Table */}
        {!loading && filteredMedicines.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#262028]">
                  <th className="text-left p-4 text-[#C2BAB1] font-semibold min-w-[150px]">Name</th>
                  <th className="text-left p-4 text-[#C2BAB1] font-semibold min-w-[120px]">Category</th>
                  <th className="text-left p-4 text-[#C2BAB1] font-semibold min-w-[80px]">Price</th>
                  <th className="text-left p-4 text-[#C2BAB1] font-semibold min-w-[80px]">MRP</th>
                  <th className="text-left p-4 text-[#C2BAB1] font-semibold min-w-[100px]">Cost Price</th>
                  <th className="text-left p-4 text-[#C2BAB1] font-semibold min-w-[70px]">Stock</th>
                  <th className="text-left p-4 text-[#C2BAB1] font-semibold min-w-[100px]">Batch</th>
                  <th className="text-left p-4 text-[#C2BAB1] font-semibold min-w-[100px]">Expiry</th>
                  <th className="text-left p-4 text-[#C2BAB1] font-semibold min-w-[150px]">Vendor</th>
                  <th className="text-left p-4 text-[#C2BAB1] font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMedicines.map(medicine => (
                  <tr key={medicine.id} className="border-b border-[#262028] hover:bg-[#121015] transition-colors">
                    <td className="p-4">
                      <div>
                        {medicine.name}
                        {medicine.description && (
                          <div className="text-sm text-[#8C847B]">{medicine.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-[#262028] rounded text-sm text-[#C2BAB1]">
                        {medicine.category}
                      </span>
                    </td>
                    <td className="p-4">₹{medicine.price}</td>
                    <td className="p-4">{medicine.mrp ? `₹${medicine.mrp}` : '-'}</td>
                    <td className="p-4">{medicine.purchasePrice ? `₹${medicine.purchasePrice}` : '-'}</td>
                    <td className="p-4">
                      <span className={`font-semibold ${medicine.stock < 10 ? 'text-red-500' : 'text-green-500'}`}>
                        {medicine.stock} units
                      </span>
                    </td>
                    <td className="p-4 font-mono text-sm">{medicine.batchNumber || medicine.batch_number || '-'}</td>
                    <td className="p-4 text-sm">{medicine.expiryDate || medicine.expiry_date || '-'}</td>
                    <td className="p-4 text-sm">{medicine.vendorName || medicine.manufacturer || '-'}</td>
                    <td className="p-4">
                      {/* Edit Mode Logic */}
                      {editingId === medicine.id ? (
                        <div className="flex flex-col gap-2 min-w-[300px] bg-[#0A0809] border border-[#262028] rounded p-4 absolute right-12 z-10 shadow-xl">
                          <h5 className="font-semibold text-sm mb-2">Edit Details</h5>
                          <input
                            type="text"
                            value={medicine.name}
                            onChange={e => {
                                const updated = { ...medicine, name: e.target.value };
                                setMedicines(medicines.map(m => m.id === medicine.id ? updated : m));
                            }}
                            className="bg-[#121015] border border-[#262028] rounded p-2 text-sm"
                            placeholder="Name"
                          />
                          <div className="grid grid-cols-2 gap-2">
                             <input
                                type="number"
                                value={medicine.price}
                                onChange={e => {
                                    const updated = { ...medicine, price: parseFloat(e.target.value) };
                                    setMedicines(medicines.map(m => m.id === medicine.id ? updated : m));
                                }}
                                className="bg-[#121015] border border-[#262028] rounded p-2 text-sm"
                                placeholder="Price"
                            />
                            <input
                                type="number"
                                value={medicine.stock}
                                onChange={e => {
                                    const updated = { ...medicine, stock: parseFloat(e.target.value) };
                                    setMedicines(medicines.map(m => m.id === medicine.id ? updated : m));
                                }}
                                className="bg-[#121015] border border-[#262028] rounded p-2 text-sm"
                                placeholder="Stock"
                            />
                          </div>
                          <div className="flex gap-2 mt-2">
                            <button
                                onClick={() => handleUpdateMedicine(medicine.id, medicine)}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded py-1 text-sm font-semibold"
                            >
                                Save
                            </button>
                            <button
                                onClick={() => {
                                    setEditingId(null);
                                    fetchMedicines(); // revert changes
                                }}
                                className="flex-1 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded py-1 text-sm"
                            >
                                Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                            {/* Stock Management */}
                            <div className="flex items-center gap-1 bg-[#1E1C24] rounded-lg p-1 mr-2 border border-[#262028]">
                            <span className="text-xs text-[#8C847B] px-1">Qt</span>
                            <input
                                type="number"
                                value={stockChanges[medicine.id] || ''}
                                onChange={e => setStockChanges(prev => ({ ...prev, [medicine.id]: parseInt(e.target.value) || 0 }))}
                                placeholder="0"
                                className="w-8 bg-transparent text-center text-sm focus:outline-none"
                            />
                            <div className="flex gap-1 border-l border-[#262028] pl-1">
                                <button
                                    onClick={() => handleAddStock(medicine.id, stockChanges[medicine.id] || 1)}
                                    title="Add Stock"
                                    className="p-1 hover:text-green-400 text-[#8C847B]"
                                >
                                <Plus size={14} />
                                </button>
                                <button
                                    onClick={() => handleRemoveStock(medicine.id, stockChanges[medicine.id] || 1)}
                                    title="Remove Stock"
                                    className="p-1 hover:text-red-400 text-[#8C847B]"
                                >
                                <Minus size={14} />
                                </button>
                            </div>
                            </div>

                            <button
                                onClick={() => setEditingId(medicine.id)}
                                className="p-2 hover:bg-[#262028] rounded transition-colors text-[#00A3FF]"
                                title="Edit"
                            >
                                <Edit2 size={16} />
                            </button>
                            <button
                                onClick={() => handleDeleteMedicine(medicine.id)}
                                className="p-2 hover:bg-red-600/20 rounded transition-colors text-red-500"
                                title="Delete"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredMedicines.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[#C2BAB1]">No medicines found</p>
          </div>
        )}
      </div>
    </div>
  );
}
