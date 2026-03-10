
import { useState, useEffect, useRef } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { 
  Loader2, 
  TrendingUp, 
  CreditCard, 
  Activity, 
  Pill, 
  Microscope,
  Calendar,
  User,
  ArrowLeft,
  Printer,
  Building2,
  ShieldCheck,
  FileStack
} from 'lucide-react';
import API_ENDPOINTS from '../config/api';

interface InsuranceApprovedRecord {
  date: string;
  patientName: string;
  registrationId: string;
  insuranceCompany: string;
  amount: number;
  surgeryName?: string;
  billId?: string;
  claimReference?: string;
}

interface AnalyticsData {
  daily: any[];
  monthly: any[];
  yearly: any[];
  insuranceApprovedRecords: InsuranceApprovedRecord[];
  totalApprovedInsurance?: number;
}

interface AnalyticsViewProps {
  onBack?: () => void;
}

export function BillingAnalyticsView({ onBack }: AnalyticsViewProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<'daily' | 'monthly' | 'yearly'>('monthly');
  const [selectedInsuranceCompany, setSelectedInsuranceCompany] = useState<string | null>(null);
  const printContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(API_ENDPOINTS.BILLING_DASHBOARD.ANALYTICS);
      if (!response.ok) throw new Error('Failed to fetch analytics data');
      const result = await response.json();
      
      if (result.status === 'success') {
        setData(result);
      } else {
        throw new Error(result.detail || 'Unknown error');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const printViaIframe = (htmlContent: string) => {
    const existingFrame = document.getElementById('__analytics_print_frame__');
    if (existingFrame) existingFrame.remove();

    const iframe = document.createElement('iframe');
    iframe.id = '__analytics_print_frame__';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => iframe.remove(), 1500);
    };
  };

  const handlePrintAnalytics = () => {
    const content = printContainerRef.current;
    if (!content) return;

    const clonedContent = content.cloneNode(true) as HTMLElement;
    clonedContent.querySelectorAll('button').forEach(button => button.remove());

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>SPARK Revenue Analytics</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #111827;
              margin: 0;
              padding: 24px;
              background: #ffffff;
            }
            .print-shell {
              max-width: 1200px;
              margin: 0 auto;
            }
            .print-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #d4a574;
              padding-bottom: 16px;
              margin-bottom: 24px;
            }
            .print-brand {
              display: flex;
              align-items: center;
              gap: 16px;
            }
            .print-brand img {
              width: 72px;
              height: auto;
            }
            .print-brand-text h1 {
              margin: 0;
              font-size: 24px;
              color: #b97b2f;
            }
            .print-brand-text p {
              margin: 4px 0 0;
              color: #6b7280;
              font-size: 12px;
            }
            .print-meta {
              text-align: right;
              font-size: 12px;
              color: #6b7280;
            }
            .print-content {
              color: #111827;
            }
            .print-content * {
              color: inherit !important;
              background: transparent !important;
              box-shadow: none !important;
            }
            .print-content .bg-\[\#0a0a0a\],
            .print-content .bg-\[\#0f0f0f\],
            .print-content .bg-\[\#151515\] {
              background: #ffffff !important;
            }
            .print-content .border-\[\#D4A574\]\/30,
            .print-content .border-\[\#D4A574\]\/50,
            .print-content .border-\[\#D4A574\] {
              border-color: #d4a574 !important;
            }
            .print-content .text-white {
              color: #111827 !important;
            }
            .print-content .text-\[\#8B8B8B\],
            .print-content .text-\[\#5a5a5a\] {
              color: #6b7280 !important;
            }
            .print-content .grid {
              gap: 16px !important;
            }
            .print-content .custom-scrollbar {
              overflow: visible !important;
              max-height: none !important;
            }
            @media print {
              body { padding: 0; }
              .print-shell { max-width: none; padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="print-shell">
            <div class="print-header">
              <div class="print-brand">
                <img src="/Hospital.png" alt="SPARK Logo" onerror="this.style.display='none'" />
                <div class="print-brand-text">
                  <h1>SPARK Eye Care Hospital</h1>
                  <p>Revenue Analytics Report</p>
                </div>
              </div>
              <div class="print-meta">
                <div>Printed: ${new Date().toLocaleString('en-IN')}</div>
                <div>Period: ${currentTab.charAt(0).toUpperCase() + currentTab.slice(1)}</div>
              </div>
            </div>
            <div class="print-content">${clonedContent.outerHTML}</div>
          </div>
        </body>
      </html>
    `;

    printViaIframe(printContent);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 bg-[#0a0a0a]">
        <Loader2 className="w-8 h-8 text-[#D4A574] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-20 bg-[#0a0a0a] text-white">
        <p className="text-red-500 mb-4">Error: {error}</p>
        <Button onClick={fetchAnalytics} variant="outline" className="border-[#D4A574] text-[#D4A574]">
          Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  // Process data for charts
  const processData = (rawData: any[]) => {
    return rawData.map(item => ({
      name: item.date || item._id, // date/month/year key
      ...item,
      // Flattened for charts
      opAmount: item.op.amount,
      opCount: item.op.count,
      labAmount: item.lab.amount,
      labCount: item.lab.count,
      surgeryAmount: item.surgery.amount,
      surgeryCount: item.surgery.count,
      pharmacyAmount: item.pharmacy.amount,
      pharmacyCount: item.pharmacy.count,
      // Aggregates
      totalAmount: item.op.amount + item.lab.amount + item.surgery.amount + item.pharmacy.amount
    }));
  };

  const dailyData = processData(data.daily);
  const monthlyData = processData(data.monthly);
  const yearlyData = processData(data.yearly);

  const calculateTotals = (dataset: any[]) => {
    return dataset.reduce((acc, curr) => ({
      op: acc.op + curr.opAmount,
      opCount: acc.opCount + curr.opCount,
      lab: acc.lab + curr.labAmount,
      surgery: acc.surgery + curr.surgeryAmount,
      surgeryCount: acc.surgeryCount + curr.surgeryCount,
      pharmacy: acc.pharmacy + curr.pharmacyAmount,
      total: acc.total + curr.totalAmount
    }), { op: 0, opCount: 0, lab: 0, surgery: 0, surgeryCount: 0, pharmacy: 0, total: 0 });
  };

  const getInsurancePeriodKey = (date: string, period: 'daily' | 'monthly' | 'yearly') => {
    if (!date) return '';
    if (period === 'daily') return date.slice(0, 10);
    if (period === 'monthly') return date.slice(0, 7);
    return date.slice(0, 4);
  };

  const getInsuranceInsights = (dataset: any[], period: 'daily' | 'monthly' | 'yearly') => {
    const validPeriods = new Set(dataset.map(item => item.name));
    const filteredRecords = (data.insuranceApprovedRecords || [])
      .filter(record => validPeriods.has(getInsurancePeriodKey(record.date, period)))
      .sort((left, right) => right.amount - left.amount);

    const companiesMap = new Map<string, { company: string; totalAmount: number; patients: InsuranceApprovedRecord[] }>();

    for (const record of filteredRecords) {
      const companyName = record.insuranceCompany || 'Unknown';
      const existing = companiesMap.get(companyName) || { company: companyName, totalAmount: 0, patients: [] };
      existing.totalAmount += record.amount;
      existing.patients.push(record);
      companiesMap.set(companyName, existing);
    }

    const companies = Array.from(companiesMap.values()).sort((left, right) => right.totalAmount - left.totalAmount);
    const activeCompany = companies.find(item => item.company === selectedInsuranceCompany)?.company || companies[0]?.company || null;
    const activeCompanyDetails = companies.find(item => item.company === activeCompany) || null;

    return {
      totalApproved: filteredRecords.reduce((sum, item) => sum + item.amount, 0),
      companies,
      activeCompany,
      activeCompanyDetails,
    };
  };

  const renderContent = (dataset: any[], period: 'daily' | 'monthly' | 'yearly', subtitle: string) => {
    const totals = calculateTotals(dataset);
    const insurance = getInsuranceInsights(dataset, period);
    
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <Card className="bg-[#0f0f0f] border-[#D4A574]/50 min-h-[140px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#8B8B8B]">Total Revenue</CardTitle>
              <CreditCard className="h-4 w-4 text-[#D4A574]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">₹{totals.total.toLocaleString()}</div>
              <p className="text-xs text-[#8B8B8B] mt-1">{subtitle}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-[#0f0f0f] border-[#D4A574]/30 min-h-[140px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#8B8B8B]">OP / Consultation</CardTitle>
              <User className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">₹{totals.op.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="bg-[#0f0f0f] border-[#D4A574]/30 min-h-[140px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#8B8B8B]">Surgery</CardTitle>
              <Activity className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">₹{totals.surgery.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="bg-[#0f0f0f] border-[#D4A574]/30 min-h-[140px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#8B8B8B]">Pharmacy</CardTitle>
              <Pill className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">₹{totals.pharmacy.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="bg-[#0f0f0f] border-[#D4A574]/30 min-h-[140px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#8B8B8B]">Lab / Diag</CardTitle>
              <Microscope className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">₹{totals.lab.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="bg-[#0f0f0f] border-[#D4A574]/30 min-h-[140px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#8B8B8B]">Approved Insurance Receivable</CardTitle>
              <ShieldCheck className="h-4 w-4 text-cyan-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">₹{insurance.totalApproved.toLocaleString('en-IN')}</div>
              <p className="text-xs text-[#8B8B8B] mt-1">Approved insurer amounts only</p>
            </CardContent>
          </Card>

          <Card className="bg-[#0f0f0f] border-[#D4A574]/30 min-h-[140px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#8B8B8B]">OP Count</CardTitle>
              <User className="h-4 w-4 text-sky-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{totals.opCount.toLocaleString('en-IN')}</div>
              <p className="text-xs text-[#8B8B8B] mt-1">Consultations in selected period</p>
            </CardContent>
          </Card>

          <Card className="bg-[#0f0f0f] border-[#D4A574]/30 min-h-[140px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#8B8B8B]">Surgery Count</CardTitle>
              <Activity className="h-4 w-4 text-fuchsia-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{totals.surgeryCount.toLocaleString('en-IN')}</div>
              <p className="text-xs text-[#8B8B8B] mt-1">Surgeries in selected period</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-[#0f0f0f] border-[#D4A574]/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#D4A574]" />
                Insurance Companies
              </CardTitle>
              <CardDescription className="text-[#8B8B8B]">Approved amount to be received from each company</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
                {insurance.companies.length > 0 ? insurance.companies.map((company) => (
                  <button
                    key={company.company}
                    type="button"
                    onClick={() => setSelectedInsuranceCompany(company.company)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${insurance.activeCompany === company.company
                      ? 'border-[#D4A574] bg-[#D4A574]/10'
                      : 'border-[#D4A574]/20 hover:border-[#D4A574]/50 hover:bg-[#151515]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{company.company}</p>
                        <p className="text-xs text-[#8B8B8B]">{company.patients.length} patient{company.patients.length !== 1 ? 's' : ''}</p>
                      </div>
                      <p className="text-sm font-semibold text-cyan-400 whitespace-nowrap">₹{company.totalAmount.toLocaleString('en-IN')}</p>
                    </div>
                  </button>
                )) : (
                  <div className="text-sm text-[#8B8B8B] italic">No approved insurance amounts in this period.</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0f0f0f] border-[#D4A574]/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileStack className="w-4 h-4 text-[#D4A574]" />
                {insurance.activeCompany ? `${insurance.activeCompany} Patients` : 'Company Details'}
              </CardTitle>
              <CardDescription className="text-[#8B8B8B]">Patient-wise approved amount receivable from the selected company</CardDescription>
            </CardHeader>
            <CardContent>
              {insurance.activeCompanyDetails ? (
                <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
                  {insurance.activeCompanyDetails.patients
                    .slice()
                    .sort((left, right) => right.amount - left.amount)
                    .map((patient, index) => (
                      <div key={`${patient.billId}-${patient.registrationId}-${index}`} className="rounded-xl border border-[#D4A574]/20 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{patient.patientName}</p>
                            <p className="text-xs text-[#8B8B8B] mt-1">{patient.registrationId || 'No registration ID'}</p>
                            {patient.surgeryName && <p className="text-xs text-[#8B8B8B] mt-1 truncate">{patient.surgeryName}</p>}
                            {patient.claimReference && <p className="text-[11px] text-[#5a5a5a] mt-1 truncate">Claim Ref: {patient.claimReference}</p>}
                          </div>
                          <p className="text-sm font-semibold text-cyan-400 whitespace-nowrap">₹{patient.amount.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-sm text-[#8B8B8B] italic">Select a company to view patient-wise approved amounts.</div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-[#0f0f0f] border-[#D4A574]/30 col-span-2">
            <CardHeader>
              <CardTitle className="text-white">Revenue Trends</CardTitle>
              <CardDescription className="text-[#8B8B8B]">Revenue breakdown by category over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataset} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value: number) => `₹${value}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #D4A574', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: '#D4A574' }}
                    />
                    <Legend />
                    <Bar dataKey="opAmount" name="OP / Consult" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="surgeryAmount" name="Surgery" stackId="a" fill="#a855f7" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="pharmacyAmount" name="Pharmacy" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="labAmount" name="Lab" stackId="a" fill="#eab308" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0f0f0f] border-[#D4A574]/30 col-span-2">
            <CardHeader>
              <CardTitle className="text-white">Patient Count Trends</CardTitle>
              <CardDescription className="text-[#8B8B8B]">Number of patients served per category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dataset} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #D4A574', color: '#fff' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="opCount" name="OP" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="surgeryCount" name="Surgery" stroke="#a855f7" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="pharmacyCount" name="Pharmacy" stroke="#22c55e" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="labCount" name="Lab" stroke="#eab308" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div ref={printContainerRef} className="bg-[#0a0a0a] text-white p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-light tracking-tight text-[#D4A574]">Revenue Analytics</h2>
          <p className="text-[#8B8B8B] text-sm mt-1">Detailed revenue and performance breakdown</p>
        </div>
        <div className="flex gap-2">
          {onBack && (
            <Button variant="outline" className="border-[#D4A574] text-[#D4A574] hover:bg-[#1a1a1a]" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          <Button variant="outline" className="border-[#D4A574] text-[#D4A574] hover:bg-[#1a1a1a]" onClick={handlePrintAnalytics}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" className="border-[#D4A574] text-[#D4A574] hover:bg-[#1a1a1a]" onClick={fetchAnalytics}>
            <Calendar className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>

      <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as 'daily' | 'monthly' | 'yearly')} className="space-y-4">
        <TabsList className="bg-[#0f0f0f] border border-[#D4A574]/30 p-1">
          <TabsTrigger value="daily" className="data-[state=active]:bg-[#D4A574] data-[state=active]:text-black transition-colors rounded">Daily</TabsTrigger>
          <TabsTrigger value="monthly" className="data-[state=active]:bg-[#D4A574] data-[state=active]:text-black transition-colors rounded">Monthly</TabsTrigger>
          <TabsTrigger value="yearly" className="data-[state=active]:bg-[#D4A574] data-[state=active]:text-black transition-colors rounded">Yearly</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          {renderContent(dailyData.slice(-30), 'daily', 'Last 30 Days Summary')}
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4">
          {renderContent(monthlyData.slice(-12), 'monthly', 'Last 12 Months Summary')}
        </TabsContent>

        <TabsContent value="yearly" className="space-y-4">
          {renderContent(yearlyData, 'yearly', 'All Time Summary')}
        </TabsContent>
      </Tabs>
    </div>
  );
}
