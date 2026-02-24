import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Edit2 } from 'lucide-react';
import API_ENDPOINTS from '../config/api';

interface SurgeryPackageItem {
  description: string;
  amount: number;
}

interface SurgeryPackage {
  _id: string;
  hospitalId: string;
  name: string;
  items: SurgeryPackageItem[];
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

interface SurgeryPackagesManagerProps {
  userRole?: string;
  hospitalId?: string;
  onPackageSelect?: (packageId: string) => void;
}

export const SurgeryPackagesManager: React.FC<SurgeryPackagesManagerProps> = ({
  userRole = 'DOCTOR',
  hospitalId = '',
  onPackageSelect,
}) => {
  const [packages, setPackages] = useState<SurgeryPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    items: [{ description: '', amount: 0 }],
  });

  // Only render if user is DOCTOR
  if (userRole !== 'DOCTOR') {
    return null;
  }

  useEffect(() => {
    fetchPackages();
  }, [hospitalId]);

  const fetchPackages = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(API_ENDPOINTS.SURGERY_PACKAGES.GET_ALL);
      if (!response.ok) throw new Error('Failed to fetch packages');
      const data = await response.json();
      setPackages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', amount: 0 }],
    });
  };

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleItemChange = (
    index: number,
    field: 'description' | 'amount',
    value: string | number
  ) => {
    const newItems = [...formData.items];
    if (field === 'amount') {
      newItems[index].amount = typeof value === 'string' ? parseFloat(value) || 0 : value;
    } else {
      newItems[index].description = value as string;
    }
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Package name is required');
      return;
    }

    if (formData.items.some(item => !item.description.trim())) {
      setError('All items must have descriptions');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        name: formData.name,
        items: formData.items,
      };

      const url = editingId
        ? API_ENDPOINTS.SURGERY_PACKAGES.UPDATE(editingId)
        : API_ENDPOINTS.SURGERY_PACKAGES.CREATE;

      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to save package');

      setFormData({ name: '', items: [{ description: '', amount: 0 }] });
      setEditingId(null);
      setShowForm(false);
      await fetchPackages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Submit error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (pkg: SurgeryPackage) => {
    setFormData({
      name: pkg.name,
      items: pkg.items,
    });
    setEditingId(pkg._id);
    setShowForm(true);
  };

  const handleDelete = async (packageId: string) => {
    if (!confirm('Are you sure you want to delete this package?')) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        API_ENDPOINTS.SURGERY_PACKAGES.DELETE(packageId),
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to delete package');

      await fetchPackages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Delete error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', items: [{ description: '', amount: 0 }] });
    setError('');
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Surgery Packages</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
          >
            <Plus size={20} />
            New Package
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-100 text-red-800 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-6 rounded-lg mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? 'Edit Package' : 'Create New Package'}
          </h3>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Package Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Cataract Surgery Package"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Items
            </label>
            <div className="space-y-3">
              {formData.items.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) =>
                      handleItemChange(index, 'description', e.target.value)
                    }
                    placeholder="Item description"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    value={item.amount}
                    onChange={(e) =>
                      handleItemChange(index, 'amount', parseFloat(e.target.value) || 0)
                    }
                    placeholder="Amount"
                    className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="mt-2 text-blue-500 hover:text-blue-700 text-sm font-medium"
            >
              + Add Item
            </button>
          </div>

          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-gray-600">Total Amount:</div>
            <div className="text-2xl font-bold text-blue-600">
              ₹{calculateTotal().toFixed(2)}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : editingId ? 'Update Package' : 'Create Package'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 bg-gray-400 text-white py-2 rounded-lg hover:bg-gray-500 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && !showForm && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin">
            <div className="border-4 border-gray-300 border-t-blue-500 rounded-full w-8 h-8"></div>
          </div>
        </div>
      )}

      {!loading && packages.length === 0 && !showForm && (
        <div className="text-center py-8 text-gray-500">
          No surgery packages created yet.
        </div>
      )}

      {packages.length > 0 && !showForm && (
        <div className="space-y-4">
          {packages.map((pkg) => (
            <div
              key={pkg._id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{pkg.name}</h3>
                  <p className="text-sm text-gray-500">
                    {pkg.items.length} item{pkg.items.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Total Amount</div>
                  <div className="text-2xl font-bold text-green-600">
                    ₹{pkg.totalAmount.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded mb-3">
                <ul className="text-sm space-y-1">
                  {pkg.items.map((item, idx) => (
                    <li key={idx} className="text-gray-700">
                      <span className="font-medium">{item.description}</span>
                      <span className="float-right text-gray-600">₹{item.amount.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(pkg)}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
                >
                  <Edit2 size={16} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(pkg._id)}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
                {onPackageSelect && (
                  <button
                    onClick={() => onPackageSelect(pkg._id)}
                    className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition"
                  >
                    Select
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SurgeryPackagesManager;
