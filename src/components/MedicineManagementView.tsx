import React, { useState, useEffect } from 'react';
import { Plus, Minus, Trash2, Edit2, Save, X, AlertCircle } from 'lucide-react';
import API_ENDPOINTS from '../config/api';

interface Medicine {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  description: string;
  // Backend fields
  expiry_date?: string;
  batch_number?: string;
  manufacturer?: string;
  // Legacy fields
  expiryDate?: string;
  batchNumber?: string;
  vendorName?: string;

  invoiceNumber?: string;
  mrp?: number;
  purchasePrice?: number;
  purchaseDate?: string;
  branchName?: string;
}

interface StockChange {
  medicineId: string;
  quantity: number;
  type: 'add' | 'remove';
}

export function MedicineManagementView() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const categories: string[] = [
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
    category: 'Eye Drops' as const,
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

  const [stockChanges, setStockChanges] = useState<{ [key: string]: number }>({});

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
        setMedicines(data.medicines);
      }
    } catch (err) {
      console.error('Error fetching medicines:', err);
      setError('Failed to load medicines');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMedicine = async () => {
    if (!formData.name || !formData.price || !formData.stock) {
      setError('Please fill all required fields');
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.PHARMACY.CREATE_MEDICINE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        </div>

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
                  <th className="text-left p-4 text-[#C2BAB1] font-semibold min-w-[120px]">Batch</th>
                  <th className="text-left p-4 text-[#C2BAB1] font-semibold min-w-[100px]">Expiry</th>
                  <th className="text-left p-4 text-[#C2BAB1] font-semibold min-w-[120px]">Vendor</th>
                  <th className="text-left p-4 text-[#C2BAB1] font-semibold min-w-[150px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMedicines.map(medicine => (
                  <tr key={medicine.id} className="border-b border-[#262028] hover:bg-[#121015] transition-colors">
                    <td className="p-4">{medicine.name}</td>
                    <td className="p-4">
                      <span className="px-3 py-1 bg-[#262028] rounded-full text-sm">
                        {medicine.category}
                      </span>
                    </td>
                    <td className="p-4">₹{medicine.price.toFixed(2)}</td>
                    <td className="p-4">{medicine.mrp ? `₹${medicine.mrp.toFixed(2)}` : '-'}</td>
                    <td className="p-4">{medicine.purchasePrice ? `₹${medicine.purchasePrice.toFixed(2)}` : '-'}</td>
                    <td className="p-4">
                      <span className={`font-semibold ${medicine.stock > 10 ? 'text-[#7CFF6B]' : medicine.stock > 0 ? 'text-[#FF9D00]' : 'text-red-500'}`}>
                        {medicine.stock} units
                      </span>
                    </td>
                    <td className="p-4 text-sm">{medicine.batch_number || medicine.batchNumber || '-'}</td>
                    <td className="p-4 text-sm">{(medicine.expiry_date || medicine.expiryDate) ? new Date((medicine.expiry_date || medicine.expiryDate) as string).toLocaleDateString('en-IN') : '-'}</td>
                    <td className="p-4 text-sm">{medicine.manufacturer || medicine.vendorName || '-'}</td>
                    <td className="p-4">
                      <div className="flex gap-2 flex-wrap">
                        {/* Stock Management */}
                        <div className="flex gap-1 items-center bg-[#121015] px-2 py-1 rounded">
                          <input
                            type="number"
                            min="1"
                            value={stockChanges[medicine.id] || ''}
                            onChange={e => setStockChanges(prev => ({ ...prev, [medicine.id]: parseInt(e.target.value) || 0 }))}
                            placeholder="Qty"
                            className="w-12 px-2 py-1 bg-[#0A0809] border border-[#262028] rounded text-[#F5F3EF] text-sm"
                          />
                          <button
                            onClick={() => handleAddStock(medicine.id, stockChanges[medicine.id] || 1)}
                            title="Add Stock"
                            className="p-1 hover:bg-green-600 rounded transition-colors"
                          >
                            <Plus size={16} className="text-green-500" />
                          </button>
                          <button
                            onClick={() => handleRemoveStock(medicine.id, stockChanges[medicine.id] || 1)}
                            title="Remove Stock"
                            className="p-1 hover:bg-red-600 rounded transition-colors"
                          >
                            <Minus size={16} className="text-red-500" />
                          </button>
                        </div>

                        {/* Edit & Delete */}
                        <button
                          onClick={() => setEditingId(editingId === medicine.id ? null : medicine.id)}
                          className="p-2 hover:bg-[#262028] rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} className="text-[#00A3FF]" />
                        </button>
                        <button
                          onClick={() => handleDeleteMedicine(medicine.id)}
                          className="p-2 hover:bg-red-600/20 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} className="text-red-500" />
                        </button>
                      </div>

                      {/* Edit Form */}
                      {editingId === medicine.id && (
                        <div className="mt-3 p-3 bg-[#0A0809] border border-[#262028] rounded col-span-5">
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <input
                              type="text"
                              value={medicine.name}
                              onChange={e => {
                                const updated = { ...medicine, name: e.target.value };
                                setMedicines(medicines.map(m => m.id === medicine.id ? updated : m));
                              }}
                              className="px-2 py-1 bg-[#121015] border border-[#262028] rounded text-sm"
                            />
                            <input
                              type="number"
                              value={medicine.price}
                              onChange={e => {
                                const updated = { ...medicine, price: parseFloat(e.target.value) };
                                setMedicines(medicines.map(m => m.id === medicine.id ? updated : m));
                              }}
                              className="px-2 py-1 bg-[#121015] border border-[#262028] rounded text-sm"
                            />
                          </div>
                          <button
                            onClick={() => handleUpdateMedicine(medicine.id, medicine)}
                            className="px-4 py-1 bg-green-600 hover:bg-green-700 rounded text-sm font-semibold transition-colors"
                          >
                            Save
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
