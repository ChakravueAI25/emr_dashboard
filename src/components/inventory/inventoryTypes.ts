export type InventoryItemType = 'SERIAL_TRACKED' | 'CONSUMABLE';

export interface VendorOption {
  id?: string;
  _id?: string;
  name: string;
}

export interface InventoryAnalytics {
  totalInventoryValue: number;
  totalPurchaseToday: number;
  totalPurchaseThisMonth: number;
  totalPurchaseThisYear: number;
  totalInventoryItems: number;
  lowStockItems: number;
  expiringItems: number;
  lowStockList: StockRow[];
  expiringSoonItems: ExpiringSoonRow[];
}

export interface ProductRow {
  id: string;
  itemType: InventoryItemType;
  description: string;
  hsn: string;
  qty: string;
  unit: string;
  amount: string;
  gst: '5' | '18';
  mrp: string;
  freeQty: string;
  minimumStockLevel: string;
  expiryDate: string;
  isSerialTracked: boolean;
  serialNumbersText: string;
}

export interface StockRow {
  id?: string;
  description: string;
  available_qty: number;
  unit: string;
  mrp: number;
  item_type?: InventoryItemType;
  minimum_stock_level?: number;
  last_updated?: string;
}

export interface ExpiringSoonRow {
  description: string;
  expiry_date: string;
  available_qty: number;
  unit: string;
}

export interface LensSerialRow {
  id?: string;
  serial_number: string;
  lens_model: string;
  status: 'IN_STOCK' | 'USED' | 'RESERVED';
  expiry_date?: string;
  patient_name?: string;
  surgery_date?: string;
  doctor?: string;
  eye?: string;
}

export interface PurchaseHistoryRow {
  id?: string;
  invoice_id: string;
  description: string;
  hsn: string;
  qty: number;
  unit: string;
  amount: number;
  gst: number;
  mrp: number;
  free_qty: number;
  item_type?: InventoryItemType;
  expiry_date?: string;
  minimum_stock_level?: number;
  is_serial_tracked: boolean;
  vendor?: string;
  invoice_number?: string;
  invoice_date?: string;
}

export interface UsageHistoryRow {
  id?: string;
  usage_id?: string;
  serial_number: string;
  patient_id: string;
  patient_name: string;
  doctor: string;
  surgery_date: string;
  eye: string;
  invoice_id: string;
  lens_model?: string;
  user?: string;
}

export interface ConsumableUsageHistoryRow {
  id?: string;
  usage_id?: string;
  description: string;
  qty_used: number;
  department: string;
  date: string;
  remarks?: string;
  user?: string;
}

export interface LedgerRow {
  id?: string;
  description: string;
  movement_type: 'PURCHASE' | 'USAGE' | 'SERIAL_USAGE' | 'ADJUSTMENT' | 'EXPIRY';
  quantity: number;
  previous_balance: number;
  new_balance: number;
  reference_id?: string;
  date: string;
  user?: string;
}

export interface ItemHistoryResponse {
  description: string;
  purchase_history: PurchaseHistoryRow[];
  usage_history: UsageHistoryRow[];
  consumable_usage_history: ConsumableUsageHistoryRow[];
  ledger_history: LedgerRow[];
}

export interface UsageReportRow {
  label: string;
  totalQtyUsed: number;
  entries: number;
}

export interface UsageReportResponse {
  rows: UsageReportRow[];
  records: ConsumableUsageHistoryRow[];
}

export interface PurchaseRecord {
  invoice_id: string;
  vendor: string;
  invoice_number: string;
  invoice_value: number;
  invoice_date: string;
  created_by?: string;
}

export interface PurchaseReportResponse {
  totalInvoices: number;
  totalPurchaseValue: number;
  records: PurchaseRecord[];
}

export interface LensUsageReportResponse {
  totalUsed: number;
  records: UsageHistoryRow[];
}