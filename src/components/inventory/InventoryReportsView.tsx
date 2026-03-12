import { formatCurrency, formatDate, SectionCard, tableCellClass, tableHeaderClass } from './inventoryShared';
import type { LensUsageReportResponse, PurchaseReportResponse, UsageReportResponse } from './inventoryTypes';

interface InventoryReportsViewProps {
  dailyUsage: UsageReportResponse;
  monthlyUsage: UsageReportResponse;
  yearlyUsage: UsageReportResponse;
  purchases: PurchaseReportResponse;
  lensUsage: LensUsageReportResponse;
}

function UsageSummaryTable({ title, report }: { title: string; report: UsageReportResponse }) {
  return (
    <SectionCard title={title}>
      <div className="overflow-x-auto rounded-xl border border-[var(--theme-accent)]/10">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="bg-[var(--theme-bg)]">
              {['Period', 'Total Quantity', 'Entries'].map((header) => (
                <th key={header} className={tableHeaderClass}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row) => (
              <tr key={row.label} className="border-b border-[var(--theme-accent)]/10 last:border-0">
                <td className={tableCellClass}>{row.label}</td>
                <td className={tableCellClass}>{row.totalQtyUsed}</td>
                <td className={tableCellClass}>{row.entries}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

export function InventoryReportsView({ dailyUsage, monthlyUsage, yearlyUsage, purchases, lensUsage }: InventoryReportsViewProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <UsageSummaryTable title="Daily Usage Report" report={dailyUsage} />
        <UsageSummaryTable title="Monthly Usage Report" report={monthlyUsage} />
        <UsageSummaryTable title="Yearly Usage Report" report={yearlyUsage} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard title="Purchase Report">
          <div className="mb-4 grid grid-cols-2 gap-4 text-sm text-[var(--theme-text)]">
            <div>Total Invoices: {purchases.totalInvoices}</div>
            <div>Total Purchase Value: {formatCurrency(purchases.totalPurchaseValue)}</div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-[var(--theme-accent)]/10">
            <table className="w-full min-w-[780px] border-collapse text-sm">
              <thead>
                <tr className="bg-[var(--theme-bg)]">
                  {['Invoice ID', 'Vendor', 'Invoice Number', 'Date', 'Value', 'User'].map((header) => (
                    <th key={header} className={tableHeaderClass}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {purchases.records.map((row) => (
                  <tr key={row.invoice_id} className="border-b border-[var(--theme-accent)]/10 last:border-0">
                    <td className={tableCellClass}>{row.invoice_id}</td>
                    <td className={tableCellClass}>{row.vendor}</td>
                    <td className={tableCellClass}>{row.invoice_number}</td>
                    <td className={tableCellClass}>{formatDate(row.invoice_date)}</td>
                    <td className={tableCellClass}>{formatCurrency(row.invoice_value)}</td>
                    <td className={tableCellClass}>{row.created_by || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Lens Serial Usage Report">
          <div className="mb-4 text-sm text-[var(--theme-text)]">Total Used: {lensUsage.totalUsed}</div>
          <div className="overflow-x-auto rounded-xl border border-[var(--theme-accent)]/10">
            <table className="w-full min-w-[780px] border-collapse text-sm">
              <thead>
                <tr className="bg-[var(--theme-bg)]">
                  {['Serial', 'Lens Model', 'Patient', 'Doctor', 'Eye', 'Date', 'User'].map((header) => (
                    <th key={header} className={tableHeaderClass}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lensUsage.records.map((row) => (
                  <tr key={row.serial_number} className="border-b border-[var(--theme-accent)]/10 last:border-0">
                    <td className={tableCellClass}>{row.serial_number}</td>
                    <td className={tableCellClass}>{row.lens_model || '--'}</td>
                    <td className={tableCellClass}>{row.patient_name}</td>
                    <td className={tableCellClass}>{row.doctor}</td>
                    <td className={tableCellClass}>{row.eye}</td>
                    <td className={tableCellClass}>{formatDate(row.surgery_date)}</td>
                    <td className={tableCellClass}>{row.user || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}