/**
 * Pharmacy API Helper Functions
 * Easy-to-use methods for managing medicines and inventory
 */

import { API_ENDPOINTS } from '../config/api';

export interface MedicineData {
  name: string;
  category: 'Eye Drops' | 'Tablets' | 'Ointments' | 'Contact Lens' | 'Surgical';
  price: number;
  stock: number;
  description: string;
  manufacturer: string;
  batch_number: string;
  expiry_date: string; // Format: YYYY-MM-DD
  reorder_level: number;
}

/**
 * Add a new medicine to the pharmacy
 * @param medicineData - Object containing medicine details
 * @returns Response with medicine ID and confirmation
 */
export async function addNewMedicine(medicineData: MedicineData) {
  try {
    const response = await fetch(API_ENDPOINTS.PHARMACY.CREATE_MEDICINE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(medicineData),
    });

    if (!response.ok) {
      throw new Error(`Failed to add medicine: ${response.statusText}`);
    }

    const result = await response.json();
    alert(`✓ Medicine added successfully!\nID: ${result.medicineId}\nName: ${medicineData.name}`);
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to add medicine';
    alert(`Error: ${errorMsg}`);
    throw error;
  }
}

/**
 * Update medicine details (name, price, description, etc.)
 * @param medicineId - ID of the medicine to update
 * @param updateData - Fields to update
 * @returns Updated medicine data
 */
export async function updateMedicineDetails(
  medicineId: string,
  updateData: Partial<MedicineData>
) {
  try {
    const response = await fetch(API_ENDPOINTS.PHARMACY.UPDATE_MEDICINE(medicineId), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      throw new Error(`Failed to update medicine: ${response.statusText}`);
    }

    const result = await response.json();
    alert(`✓ Medicine updated successfully!`);
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to update medicine';
    alert(`Error: ${errorMsg}`);
    throw error;
  }
}

/**
 * Update only the stock quantity for a medicine
 * @param medicineId - ID of the medicine
 * @param newStock - New stock quantity
 * @returns Updated medicine data
 */
export async function updateMedicineStock(medicineId: string, newStock: number) {
  try {
    const response = await fetch(API_ENDPOINTS.PHARMACY.UPDATE_STOCK(medicineId), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newStock }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update stock: ${response.statusText}`);
    }

    const result = await response.json();
    alert(`✓ Stock updated!\nNew Stock: ${newStock} units`);
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to update stock';
    alert(`Error: ${errorMsg}`);
    throw error;
  }
}

/**
 * Get all medicines from the pharmacy
 * @returns Array of all medicines
 */
export async function getAllMedicines() {
  try {
    const response = await fetch(API_ENDPOINTS.PHARMACY.GET_MEDICINES);
    if (!response.ok) {
      throw new Error('Failed to fetch medicines');
    }
    const data = await response.json();
    return data.medicines || [];
  } catch (error) {
    console.error('Error fetching medicines:', error);
    return [];
  }
}

/**
 * Get a specific medicine by ID
 * @param medicineId - ID of the medicine
 * @returns Medicine details
 */
export async function getMedicineById(medicineId: string) {
  try {
    const response = await fetch(API_ENDPOINTS.PHARMACY.GET_MEDICINE(medicineId));
    if (!response.ok) {
      throw new Error('Failed to fetch medicine');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching medicine:', error);
    return null;
  }
}

/**
 * Get stock report for all medicines
 * @returns Stock report with inventory status
 */
export async function getStockReport() {
  try {
    const response = await fetch(API_ENDPOINTS.PHARMACY.STOCK_REPORT);
    if (!response.ok) {
      throw new Error('Failed to fetch stock report');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching stock report:', error);
    return null;
  }
}

/**
 * Initialize sample medicines (for testing/demo)
 * @returns Sample medicines data
 */
export async function initializeSampleMedicines() {
  try {
    const response = await fetch(API_ENDPOINTS.PHARMACY.INITIALIZE_SAMPLE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Failed to initialize sample data');
    }

    const result = await response.json();
    alert(`✓ Sample medicines loaded!\nTotal: ${result.count} medicines`);
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to initialize';
    alert(`Error: ${errorMsg}`);
    throw error;
  }
}

/**
 * Quick add medicine with minimal data (uses defaults for optional fields)
 * @param name - Medicine name
 * @param category - Medicine category
 * @param price - Medicine price
 * @param stock - Initial stock quantity
 * @param description - Short description
 * @returns Result with medicine ID
 */
export async function quickAddMedicine(
  name: string,
  category: 'Eye Drops' | 'Tablets' | 'Ointments' | 'Contact Lens' | 'Surgical',
  price: number,
  stock: number,
  description: string = ''
) {
  const medicineData: MedicineData = {
    name,
    category,
    price,
    stock,
    description: description || `${name} for eye care`,
    manufacturer: 'Unknown',
    batch_number: `BATCH-${Date.now()}`,
    expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0], // 1 year from now
    reorder_level: Math.ceil(stock * 0.2), // 20% of initial stock
  };

  return addNewMedicine(medicineData);
}
