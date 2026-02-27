
import { useState, useEffect } from 'react';
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
  ArrowLeft
} from 'lucide-react';
import API_ENDPOINTS from '../config/api';

interface AnalyticsData {
  daily: any[];
  monthly: any[];
  yearly: any[];
}

interface AnalyticsViewProps {
  onBack?: () => void;
}

export function BillingAnalyticsView({ onBack }: AnalyticsViewProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
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
      lab: acc.lab + curr.labAmount,
      surgery: acc.surgery + curr.surgeryAmount,
      pharmacy: acc.pharmacy + curr.pharmacyAmount,
      total: acc.total + curr.totalAmount
    }), { op: 0, lab: 0, surgery: 0, pharmacy: 0, total: 0 });
  };

  const renderContent = (dataset: any[], title: string, subtitle: string) => {
    const totals = calculateTotals(dataset);
    
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-[#0f0f0f] border-[#D4A574]/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#8B8B8B]">Total Revenue</CardTitle>
              <CreditCard className="h-4 w-4 text-[#D4A574]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">₹{totals.total.toLocaleString()}</div>
              <p className="text-xs text-[#8B8B8B] mt-1">{subtitle}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-[#0f0f0f] border-[#D4A574]/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#8B8B8B]">OP / Consultation</CardTitle>
              <User className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">₹{totals.op.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="bg-[#0f0f0f] border-[#D4A574]/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#8B8B8B]">Surgery</CardTitle>
              <Activity className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">₹{totals.surgery.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="bg-[#0f0f0f] border-[#D4A574]/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#8B8B8B]">Pharmacy</CardTitle>
              <Pill className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">₹{totals.pharmacy.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="bg-[#0f0f0f] border-[#D4A574]/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#8B8B8B]">Lab / Diag</CardTitle>
              <Microscope className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">₹{totals.lab.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
    <div className="bg-[#0a0a0a] text-white p-6">
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
          <Button variant="outline" className="border-[#D4A574] text-[#D4A574] hover:bg-[#1a1a1a]" onClick={fetchAnalytics}>
            <Calendar className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>

      <Tabs defaultValue="monthly" className="space-y-4">
        <TabsList className="bg-[#0f0f0f] border border-[#D4A574]/30 p-1">
          <TabsTrigger value="daily" className="data-[state=active]:bg-[#D4A574] data-[state=active]:text-black transition-colors rounded">Daily</TabsTrigger>
          <TabsTrigger value="monthly" className="data-[state=active]:bg-[#D4A574] data-[state=active]:text-black transition-colors rounded">Monthly</TabsTrigger>
          <TabsTrigger value="yearly" className="data-[state=active]:bg-[#D4A574] data-[state=active]:text-black transition-colors rounded">Yearly</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          {renderContent(dailyData.slice(-30), "Daily Trends", "Last 30 Days Summary")}
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4">
          {renderContent(monthlyData.slice(-12), "Monthly Trends", "Last 12 Months Summary")}
        </TabsContent>

        <TabsContent value="yearly" className="space-y-4">
          {renderContent(yearlyData, "Yearly Trends", "All Time Summary")}
        </TabsContent>
      </Tabs>
    </div>
  );
}
