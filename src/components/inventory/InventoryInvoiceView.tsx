import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { createProductRow, inputClass, labelClass, SectionCard, tableCellClass, tableHeaderClass } from './inventoryShared';
import type { ProductRow, VendorOption } from './inventoryTypes';

interface InventoryInvoiceViewProps {
  vendors: VendorOption[];
  submitting: boolean;
  onSubmit: (payload: {
    vendor: string;
    invoice_number: string;
    invoice_value: number;
    invoice_date: string;
    items: Array<Record<string, unknown>>;
  }) => Promise<void>;
}

export function InventoryInvoiceView({ vendors, submitting, onSubmit }: InventoryInvoiceViewProps) {
  const [vendor, setVendor] = useState('');
  const [invoiceValue, setInvoiceValue] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [productRows, setProductRows] = useState<ProductRow[]>([createProductRow()]);

  const updateProductRow = <K extends keyof ProductRow>(id: string, field: K, value: ProductRow[K]) => {
    setProductRows((current) => current.map((row) => {
      if (row.id !== id) {
        return row;
      }
      const nextRow = { ...row, [field]: value };
      if (field === 'itemType') {
        nextRow.isSerialTracked = value === 'SERIAL_TRACKED';
      }
      return nextRow;
    }));
  };

  const addProductRow = () => setProductRows((current) => [...current, createProductRow()]);
  const removeProductRow = (id: string) => setProductRows((current) => (current.length === 1 ? current : current.filter((row) => row.id !== id)));

  const resetForm = () => {
    setVendor('');
    setInvoiceValue('');
    setInvoiceNumber('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setProductRows([createProductRow()]);
  };

  const submit = async () => {
    const items = productRows
      .filter((row) => row.description.trim())
      .map((row) => ({
        item_type: row.itemType,
        description: row.description.trim(),
        hsn: row.hsn.trim(),
        qty: Number(row.qty || 0),
        unit: row.unit.trim() || 'pcs',
        amount: Number(row.amount || 0),
        gst: Number(row.gst),
        mrp: Number(row.mrp || 0),
        free_qty: Number(row.freeQty || 0),
        minimum_stock_level: Number(row.minimumStockLevel || 0),
        expiry_date: row.expiryDate || null,
        is_serial_tracked: row.itemType === 'SERIAL_TRACKED',
        serial_numbers: row.serialNumbersText
          .split(/\r?\n|,/) 
          .map((value) => value.trim())
          .filter(Boolean),
      }));

    await onSubmit({
      vendor: vendor.trim(),
      invoice_number: invoiceNumber.trim(),
      invoice_value: Number(invoiceValue || 0),
      invoice_date: invoiceDate,
      items,
    });
    resetForm();
  };

  return (
    <SectionCard title="Inventory Invoice Entry">
      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div>
          <label className={labelClass}>Vendor Name</label>
          <input className={inputClass} list="inventory-vendors" value={vendor} onChange={(event) => setVendor(event.target.value)} placeholder="Select or type vendor" />
          <datalist id="inventory-vendors">
            {vendors.map((option) => (
              <option key={option.id || option._id || option.name} value={option.name} />
            ))}
          </datalist>
        </div>
        <div>
          <label className={labelClass}>Invoice Value</label>
          <input className={inputClass} type="number" min="0" step="0.01" value={invoiceValue} onChange={(event) => setInvoiceValue(event.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Invoice Number</label>
          <input className={inputClass} value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Invoice Date</label>
          <input className={inputClass} type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--theme-accent)]/10">
        <table className="w-full min-w-[1450px] border-collapse text-sm">
          <thead>
            <tr className="bg-[var(--theme-bg)]">
              {['S.No', 'Type', 'Description', 'HSN / Serial Number', 'Qty', 'Unit', 'Amount', 'GST', 'MRP', 'Free', 'Min Stock', 'Expiry', ''].map((header) => (
                <th key={header} className={tableHeaderClass}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {productRows.map((row, index) => {
              const enteredSerials = row.serialNumbersText.split(/\r?\n|,/).map((value) => value.trim()).filter(Boolean);
              const expectedSerials = Number(row.qty || 0) + Number(row.freeQty || 0);

              return (
                <tr key={row.id} className="border-b border-[var(--theme-accent)]/10 align-top last:border-0">
                  <td className={tableCellClass}>{index + 1}</td>
                  <td className={tableCellClass}>
                    <select className={inputClass} value={row.itemType} onChange={(event) => updateProductRow(row.id, 'itemType', event.target.value as ProductRow['itemType'])}>
                      <option value="CONSUMABLE">Consumable</option>
                      <option value="SERIAL_TRACKED">Serial Tracked</option>
                    </select>
                  </td>
                  <td className={tableCellClass}>
                    <input className={inputClass} value={row.description} onChange={(event) => updateProductRow(row.id, 'description', event.target.value)} />
                  </td>
                  <td className={tableCellClass}>
                    <input className={`${inputClass} mb-2`} value={row.hsn} onChange={(event) => updateProductRow(row.id, 'hsn', event.target.value)} placeholder="HSN" />
                    {row.itemType === 'SERIAL_TRACKED' ? (
                      <div>
                        <textarea className={`${inputClass} min-h-[92px] resize-y`} value={row.serialNumbersText} onChange={(event) => updateProductRow(row.id, 'serialNumbersText', event.target.value)} placeholder={'One serial per line\nSN10001\nSN10002'} />
                        <div className="mt-1 text-[11px] text-[var(--theme-text-muted)]">{enteredSerials.length} entered / {expectedSerials} expected</div>
                      </div>
                    ) : null}
                  </td>
                  <td className={tableCellClass}><input className={inputClass} type="number" min="0" step="1" value={row.qty} onChange={(event) => updateProductRow(row.id, 'qty', event.target.value)} /></td>
                  <td className={tableCellClass}><input className={inputClass} value={row.unit} onChange={(event) => updateProductRow(row.id, 'unit', event.target.value)} /></td>
                  <td className={tableCellClass}><input className={inputClass} type="number" min="0" step="0.01" value={row.amount} onChange={(event) => updateProductRow(row.id, 'amount', event.target.value)} /></td>
                  <td className={tableCellClass}>
                    <select className={inputClass} value={row.gst} onChange={(event) => updateProductRow(row.id, 'gst', event.target.value as '5' | '18')}>
                      <option value="5">5%</option>
                      <option value="18">18%</option>
                    </select>
                  </td>
                  <td className={tableCellClass}><input className={inputClass} type="number" min="0" step="0.01" value={row.mrp} onChange={(event) => updateProductRow(row.id, 'mrp', event.target.value)} /></td>
                  <td className={tableCellClass}><input className={inputClass} type="number" min="0" step="1" value={row.freeQty} onChange={(event) => updateProductRow(row.id, 'freeQty', event.target.value)} /></td>
                  <td className={tableCellClass}><input className={inputClass} type="number" min="0" step="1" value={row.minimumStockLevel} onChange={(event) => updateProductRow(row.id, 'minimumStockLevel', event.target.value)} /></td>
                  <td className={tableCellClass}><input className={inputClass} type="date" value={row.expiryDate} onChange={(event) => updateProductRow(row.id, 'expiryDate', event.target.value)} /></td>
                  <td className={tableCellClass}>
                    <button onClick={() => removeProductRow(row.id)} className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"><X className="h-4 w-4" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button onClick={addProductRow} className="inline-flex items-center gap-2 rounded-xl border border-[var(--theme-accent)]/20 px-4 py-2.5 text-sm text-[var(--theme-text)] hover:bg-[var(--theme-bg)]">
          <Plus className="h-4 w-4" />Add Product Row
        </button>
        <button onClick={() => void submit()} disabled={submitting} className="rounded-xl bg-[var(--theme-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--theme-bg)] disabled:opacity-60">
          {submitting ? 'Saving Invoice...' : 'Save Inventory Invoice'}
        </button>
      </div>
    </SectionCard>
  );
}