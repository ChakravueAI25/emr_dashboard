import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { addNewMedicine, MedicineData } from '../utils/pharmacyAPI';

interface AddMedicineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMedicineAdded?: () => void;
}

export function AddMedicineModal({ isOpen, onClose, onMedicineAdded }: AddMedicineModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<MedicineData>({
    name: '',
    category: 'Eye Drops',
    price: 0,
    stock: 0,
    description: '',
    manufacturer: '',
    batch_number: '',
    expiry_date: '',
    reorder_level: 0,
  });

  const categories = ['Eye Drops', 'Tablets', 'Ointments', 'Contact Lens', 'Surgical'] as const;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['price', 'stock', 'reorder_level'].includes(name) ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      alert('Please enter medicine name');
      return;
    }
    if (formData.price <= 0) {
      alert('Price must be greater than 0');
      return;
    }
    if (formData.stock < 0) {
      alert('Stock cannot be negative');
      return;
    }
    if (!formData.expiry_date) {
      alert('Please enter expiry date');
      return;
    }

    setLoading(true);
    try {
      await addNewMedicine(formData);

      // Reset form
      setFormData({
        name: '',
        category: 'Eye Drops',
        price: 0,
        stock: 0,
        description: '',
        manufacturer: '',
        batch_number: '',
        expiry_date: '',
        reorder_level: 0,
      });

      // Callback to refresh medicines list
      if (onMedicineAdded) {
        onMedicineAdded();
      }

      onClose();
    } catch (error) {
      console.error('Error adding medicine:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="bg-[#121212] border border-[#D4A574] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#121212] p-6 border-b border-[#D4A574] flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">Add New Medicine</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-[#8B8B8B] hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Row 1: Name & Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-white text-sm font-semibold mb-2 block">Medicine Name *</label>
              <Input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Ofloxacin Eye Drop"
                className="bg-[#1a1a1a] border-[#D4A574] text-white placeholder-[#6B6B6B]"
                disabled={loading}
              />
            </div>
            <div>
              <label className="text-white text-sm font-semibold mb-2 block">Category *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#D4A574] text-white rounded transition-colors"
                disabled={loading}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Price & Stock */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-white text-sm font-semibold mb-2 block">Price (₹) *</label>
              <Input
                type="number"
                name="price"
                value={formData.price || ''}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="bg-[#1a1a1a] border-[#D4A574] text-white placeholder-[#6B6B6B]"
                disabled={loading}
              />
            </div>
            <div>
              <label className="text-white text-sm font-semibold mb-2 block">Stock Quantity *</label>
              <Input
                type="number"
                name="stock"
                value={formData.stock || ''}
                onChange={handleChange}
                placeholder="0"
                min="0"
                className="bg-[#1a1a1a] border-[#D4A574] text-white placeholder-[#6B6B6B]"
                disabled={loading}
              />
            </div>
          </div>

          {/* Row 3: Description */}
          <div>
            <label className="text-white text-sm font-semibold mb-2 block">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Brief description of the medicine"
              rows={2}
              className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#D4A574] text-white placeholder-[#6B6B6B] rounded transition-colors"
              disabled={loading}
            />
          </div>

          {/* Row 4: Manufacturer & Batch Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-white text-sm font-semibold mb-2 block">Manufacturer</label>
              <Input
                type="text"
                name="manufacturer"
                value={formData.manufacturer}
                onChange={handleChange}
                placeholder="e.g., Cipla, Bausch Health"
                className="bg-[#1a1a1a] border-[#D4A574] text-white placeholder-[#6B6B6B]"
                disabled={loading}
              />
            </div>
            <div>
              <label className="text-white text-sm font-semibold mb-2 block">Batch Number</label>
              <Input
                type="text"
                name="batch_number"
                value={formData.batch_number}
                onChange={handleChange}
                placeholder="e.g., BATCH-2025-001"
                className="bg-[#1a1a1a] border-[#D4A574] text-white placeholder-[#6B6B6B]"
                disabled={loading}
              />
            </div>
          </div>

          {/* Row 5: Expiry Date & Reorder Level */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-white text-sm font-semibold mb-2 block">Expiry Date (YYYY-MM-DD) *</label>
              <Input
                type="date"
                name="expiry_date"
                value={formData.expiry_date}
                onChange={handleChange}
                className="bg-[#1a1a1a] border-[#D4A574] text-white placeholder-[#6B6B6B]"
                disabled={loading}
              />
            </div>
            <div>
              <label className="text-white text-sm font-semibold mb-2 block">Reorder Level</label>
              <Input
                type="number"
                name="reorder_level"
                value={formData.reorder_level || ''}
                onChange={handleChange}
                placeholder="e.g., 10 (minimum stock to reorder)"
                min="0"
                className="bg-[#1a1a1a] border-[#D4A574] text-white placeholder-[#6B6B6B]"
                disabled={loading}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-4 border-t border-[#D4A574]">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-[#D4A574] text-[#0a0a0a] rounded-xl border border-[#D4A574] hover:bg-[#C9955E] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#D4A574]/10"
            >
              <Plus className="w-4 h-4" />
              {loading ? 'Adding...' : 'Add Medicine'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2 bg-[#2a2a2a] text-white rounded hover:bg-[#3a3a3a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold"
            >
              Cancel
            </button>
          </div>

          {/* Help Text */}
          <p className="text-[#8B8B8B] text-xs pt-4">
            * Required fields. All medicines will be added to the pharmacy inventory immediately.
          </p>
        </form>
      </Card>
    </div>
  );
}
