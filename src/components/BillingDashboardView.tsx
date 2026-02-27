// import { useState, useEffect } from 'react';
// import { 
//   Search, 
//   Filter, 
//   MoreVertical, 
//   Eye, 
//   Edit, 
//   Trash2, 
//   DollarSign, 
//   Clock, 
//   User, 
//   Phone, 
//   Calendar,
//   CheckCircle2,
//   AlertCircle,
//   ChevronRight,
//   ArrowRight,
//   Printer,
//   Download,
//   Plus
// } from 'lucide-react';
// import { Card } from './ui/card';
// import { Button } from './ui/button';
// import { Input } from './ui/input';
// import API_ENDPOINTS from '../config/api';

// interface BillingRecord {
//   id: string;
//   type: 'OPD' | 'Pharmacy' | 'Lab' | 'Surgery';
//   checkInTime: string;
//   patientName: string;
//   registrationId: string;
//   age: string;
//   sex: string;
//   phone: string;
//   refDoctor: string;
//   visitType: 'New' | 'Follow-up' | 'Review';
//   visitReason: string;
//   doctorName: string;
//   optomName: string;
//   followUpDate: string;
//   waitingTime: string;
//   status: 'Waiting' | 'Processing' | 'Completed' | 'Cancelled';
//   paymentStatus?: 'unpaid' | 'partially_paid' | 'paid';
//   insuranceStatus?: 'none' | 'pending' | 'claimed' | 'received';
//   notes: string;
//   dilationStatus: 'Not Started' | 'In Progress' | 'Completed';
// }

// interface BillingDashboardViewProps {
//   onBillingClick?: (registrationId: string) => void;
// }

// export function BillingDashboardView({ onBillingClick }: BillingDashboardViewProps) {
//   const [records, setRecords] = useState<BillingRecord[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [dashboardStats, setDashboardStats] = useState({
//     totalRevenue: 0,
//     pendingBills: 0,
//     completedToday: 0,
//     refunds: 0,
//     totalRecords: 0
//   });

//   useEffect(() => {
//     fetchBillingRecords();
//   }, []);

//   const fetchBillingRecords = async () => {
//     try {
//       setLoading(true);
//       // Fetch aggregated billing stats from new backend endpoint
//       const response = await fetch(API_ENDPOINTS.BILLING_DASHBOARD.STATS);
//       if (!response.ok) throw new Error('Failed to fetch billing stats');
//       const data = await response.json();

//       if (data.status === 'success') {
//         setDashboardStats({
//           totalRevenue: data.totalRevenue || 0,
//           pendingBills: data.pendingBills || 0,
//           completedToday: data.completedToday || 0,
//           refunds: data.refunds || 0,
//           totalRecords: data.totalRecords || 0
//         });
//         setRecords(data.records || []);
//       }
//     } catch (err) {
//       console.error('Error fetching billing records:', err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const filteredRecords = records.filter(r => 
//     r.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
//     r.registrationId.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   const getStatusColor = (status: string) => {
//     switch (status) {
//       case 'Completed': return 'bg-green-500/20 text-green-500 border-green-500/30';
//       case 'Processing': return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
//       case 'Waiting': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
//       default: return 'bg-gray-500/20 text-gray-500 border-gray-500/30';
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center h-screen bg-[#0a0a0a]">
//         <div className="w-12 h-12 rounded-full border-2 border-[#D4A574] border-t-transparent animate-spin"></div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-[#0a0a0a] text-white p-6 ml-16">
//       {/* Header */}
//       <div className="flex items-center justify-between mb-8">
//         <div>
//           <h1 className="text-7xl font-light tracking-tight">Billing Dashboard</h1>
//           <p className="text-[#8B8B8B] text-lg mt-1">Manage all patient billing and transactions</p>
//         </div>
//         <div className="flex items-center gap-3">
//           <Button 
//             onClick={fetchBillingRecords}
//             disabled={loading}
//             className="bg-[#1a1a1a] border border-[#D4A574] text-[#D4A574] hover:bg-[#2a2a2a]"
//           >
//             <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
//             </svg>
//             Refresh
//           </Button>
//           <Button className="bg-[#1a1a1a] border border-[#D4A574] text-[#D4A574] hover:bg-[#2a2a2a]">
//             <Printer className="w-4 h-4 mr-2" />
//             Print Report
//           </Button>
//           <Button className="bg-[#D4A574] text-[#0a0a0a] hover:bg-[#C9955E]">
//             <Plus className="w-4 h-4 mr-2" />
//             New Transaction
//           </Button>
//         </div>
//       </div>

//       {/* Stats */}
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
//         {[
//           { label: 'Total Revenue', value: `₹${dashboardStats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-green-500' },
//           { label: 'Pending Bills', value: dashboardStats.pendingBills, icon: Clock, color: 'text-yellow-500' },
//           { label: 'Completed Today', value: dashboardStats.completedToday, icon: CheckCircle2, color: 'text-blue-500' },
//           { label: 'Refunds', value: `₹${dashboardStats.refunds.toLocaleString()}`, icon: AlertCircle, color: 'text-red-500' },
//         ].map((stat, i) => (
//           <Card key={i} className="bg-[#0f0f0f] border-[#D4A574] p-4">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-base text-[#8B8B8B] uppercase tracking-wider">{stat.label}</p>
//                 <p className="text-5xl font-semibold mt-1">{stat.value}</p>
//               </div>
//               <div className={`p-2 rounded-lg bg-[#1a1a1a] ${stat.color}`}>
//                 <stat.icon className="w-5 h-5" />
//               </div>
//             </div>
//           </Card>
//         ))}
//       </div>

//       {/* Filters */}
//       <div className="bg-[#0f0f0f] border border-[#D4A574] rounded-xl p-4 mb-6 flex flex-wrap items-center gap-4">
//         <div className="relative flex-1 min-w-[300px]">
//           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a5a]" />
//           <Input 
//             placeholder="Search by patient name or ID..." 
//             className="pl-10 bg-[#0a0a0a] border-[#D4A574] text-lg focus:border-[#D4A574] transition-colors"
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//           />
//         </div>
//         <div className="flex items-center gap-2">
//           <select className="bg-[#0a0a0a] border border-[#D4A574] rounded-lg px-3 py-2 text-lg text-[#8B8B8B] outline-none focus:border-[#D4A574]">
//             <option>All Types</option>
//             <option>OPD</option>
//             <option>Pharmacy</option>
//             <option>Lab</option>
//           </select>
//           <select className="bg-[#0a0a0a] border border-[#D4A574] rounded-lg px-3 py-2 text-lg text-[#8B8B8B] outline-none focus:border-[#D4A574]">
//             <option>All Status</option>
//             <option>Waiting</option>
//             <option>Processing</option>
//             <option>Completed</option>
//           </select>
//           <Button variant="outline" className="border-[#D4A574] text-[#8B8B8B] hover:bg-[#1a1a1a]">
//             <Filter className="w-4 h-4 mr-2" />
//             More Filters
//           </Button>
//         </div>
//       </div>

//       {/* Table */}
//       <div className="bg-[#0f0f0f] border border-[#D4A574] rounded-xl overflow-hidden">
//         <div className="overflow-x-auto">
//           <table className="w-full text-left border-collapse">
//             <thead>
//               <tr className="bg-[#151515] border-b border-[#D4A574]">
//                 <th className="p-4 text-base font-semibold text-[#8B8B8B] uppercase tracking-wider">Type</th>
//                 <th className="p-4 text-base font-semibold text-[#8B8B8B] uppercase tracking-wider">Check IN</th>
//                 <th className="p-4 text-base font-semibold text-[#8B8B8B] uppercase tracking-wider">Patient Details</th>
//                 <th className="p-4 text-base font-semibold text-[#8B8B8B] uppercase tracking-wider">Mob. & Ref..</th>
//                 <th className="p-4 text-base font-semibold text-[#8B8B8B] uppercase tracking-wider">Visit Type</th>
//                 <th className="p-4 text-base font-semibold text-[#8B8B8B] uppercase tracking-wider">Visit Reason</th>
//                 <th className="p-4 text-base font-semibold text-[#8B8B8B] uppercase tracking-wider">Doc. & Optom</th>
//                 <th className="p-4 text-base font-semibold text-[#8B8B8B] uppercase tracking-wider">Follow Up</th>
//                 <th className="p-4 text-base font-semibold text-[#8B8B8B] uppercase tracking-wider">Waiting</th>
//                 <th className="p-4 text-base font-semibold text-[#8B8B8B] uppercase tracking-wider">Status/Notes</th>
//                 <th className="p-4 text-base font-semibold text-[#8B8B8B] uppercase tracking-wider">Action</th>
//                 <th className="p-4 text-base font-semibold text-[#8B8B8B] uppercase tracking-wider">Dilation</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-[#D4A574]">
//               {filteredRecords.map((record) => (
//                 <tr key={record.id} className="hover:bg-[#151515] transition-colors group">
//                   <td className="p-4">
//                     <div className="flex items-center gap-2">
//                       <div className={`w-2 h-2 rounded-full ${record.type === 'OPD' ? 'bg-blue-500' : (record.type === 'Pharmacy' ? 'bg-green-500' : 'bg-purple-500')}`}></div>
//                       <span className="text-lg font-medium">{record.type}</span>
//                     </div>
//                   </td>
//                   <td className="p-4">
//                     <div className="flex items-center gap-2 text-[#8B8B8B]">
//                       <Clock className="w-3 h-3" />
//                       <span className="text-lg">{record.checkInTime}</span>
//                     </div>
//                   </td>
//                   <td className="p-4">
//                     <div>
//                       <p className="text-lg font-semibold text-white group-hover:text-[#D4A574] transition-colors">{record.patientName}</p>
//                       <p className="text-base text-[#5a5a5a] font-mono mt-0.5">{record.registrationId}</p>
//                       <p className="text-base text-[#8B8B8B] mt-0.5">{record.age} / {record.sex}</p>
//                     </div>
//                   </td>
//                   <td className="p-4">
//                     <div>
//                       <div className="flex items-center gap-1 text-base text-[#8B8B8B]">
//                         <Phone className="w-3 h-3" />
//                         {record.phone}
//                       </div>
//                       <p className="text-base text-[#5a5a5a] mt-1">Ref: {record.refDoctor}</p>
//                     </div>
//                   </td>
//                   <td className="p-4">
//                     <span className={`text-base px-2 py-1 rounded-full border ${record.visitType === 'New' ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' : 'border-purple-500/30 text-purple-400 bg-purple-500/10'}`}>
//                       {record.visitType}
//                     </span>
//                   </td>
//                   <td className="p-4">
//                     <p className="text-base text-[#8B8B8B] line-clamp-1">{record.visitReason}</p>
//                   </td>
//                   <td className="p-4">
//                     <div>
//                       <p className="text-base text-white font-medium">{record.doctorName || 'Not Assigned'}</p>
//                       <p className="text-sm text-[#5a5a5a] mt-0.5">{record.optomName}</p>
//                     </div>
//                   </td>
//                   <td className="p-4">
//                     <div className="flex items-center gap-1 text-base text-[#8B8B8B]">
//                       <Calendar className="w-3 h-3" />
//                       {record.followUpDate}
//                     </div>
//                   </td>
//                   <td className="p-4">
//                     <span className="text-base font-mono text-[#D4A574]">{record.waitingTime}</span>
//                   </td>
//                   <td className="p-4">
//                     <div className="space-y-1.5">
//                       <div className="flex flex-wrap gap-1">
//                         <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold ${getStatusColor(record.status)}`}>
//                           {record.status}
//                         </span>
//                         {record.paymentStatus && (
//                           <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold ${
//                             record.paymentStatus === 'paid' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
//                             (record.paymentStatus === 'partially_paid' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20')
//                           }`}>
//                             {record.paymentStatus.replace('_', ' ')}
//                           </span>
//                         )}
//                         {record.insuranceStatus && record.insuranceStatus !== 'none' && (
//                           <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold ${
//                             record.insuranceStatus === 'received' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-400/20 animate-pulse'
//                           }`}>
//                             INS: {record.insuranceStatus}
//                           </span>
//                         )}
//                       </div>
//                       <p className="text-xs text-[#5a5a5a] truncate max-w-[120px]">{record.notes}</p>
//                     </div>
//                   </td>
//                   <td className="p-4">
//                     <Button 
//                       size="sm" 
//                       className="h-7 px-2 bg-[#D4A574] text-[#0a0a0a] hover:bg-[#C9955E] text-[9px] font-bold"
//                       onClick={() => onBillingClick?.(record.registrationId)}
//                     >
//                       BILLING
//                     </Button>
//                   </td>
//                   <td className="p-4">
//                     <div className="flex items-center gap-2">
//                       <div className={`w-2 h-2 rounded-full ${record.dilationStatus === 'Completed' ? 'bg-green-500' : 'bg-gray-600'}`}></div>
//                       <span className="text-sm text-[#8B8B8B]">{record.dilationStatus}</span>
//                     </div>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* Pagination */}
//       <div className="mt-6 flex items-center justify-between text-[#8B8B8B] text-lg">
//         <p>Showing 1 to {filteredRecords.length} of {records.length} entries</p>
//         <div className="flex items-center gap-2">
//           <Button variant="outline" className="border-[#D4A574] hover:bg-[#1a1a1a] h-8 px-3">Previous</Button>
//           <Button variant="outline" className="bg-[#D4A574] text-[#0a0a0a] border-[#D4A574] h-8 px-3">1</Button>
//           <Button variant="outline" className="border-[#D4A574] hover:bg-[#1a1a1a] h-8 px-3">2</Button>
//           <Button variant="outline" className="border-[#D4A574] hover:bg-[#1a1a1a] h-8 px-3">Next</Button>
//         </div>
//       </div>
//     </div>
//   );
// }
import React, { useState, useEffect, Fragment } from 'react';
import {
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  IndianRupee,
  Clock,
  User,
  Phone,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import API_ENDPOINTS from '../config/api';
import { BillingAnalyticsView } from './BillingAnalyticsView';

interface BillingRecord {
  id: string;
  type: 'OPD' | 'Pharmacy' | 'Lab' | 'Surgery';
  checkInTime: string;
  patientName: string;
  registrationId: string;
  age: string;
  sex: string;
  phone: string;
  refDoctor: string;
  visitType: 'New' | 'Follow-up' | 'Review';
  visitReason: string;
  doctorName: string;
  optomName: string;
  followUpDate: string;
  waitingTime: string;
  status: 'Waiting' | 'Processing' | 'Completed' | 'Cancelled';
  paymentStatus?: 'unpaid' | 'partially_paid' | 'paid';
  insuranceStatus?: 'none' | 'pending' | 'claimed' | 'received';
  notes: string;
  dilationStatus: 'Not Started' | 'In Progress' | 'Completed';
}

interface BillingDashboardViewProps {
  onBillingClick?: (registrationId: string) => void;
}

export function BillingDashboardView({ onBillingClick }: BillingDashboardViewProps) {
  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [dashboardStats, setDashboardStats] = useState({
    totalRevenue: 0,
    settledRevenue: 0,
    unsettledRevenue: 0,
    pendingBills: 0,
    pendingBillsList: [] as any[],
    completedToday: 0,
    totalRecords: 0
  });
  const [viewMode, setViewMode] = useState<'transactions' | 'analytics'>('transactions');

  useEffect(() => {
    fetchBillingRecords();
  }, []);

  const fetchBillingRecords = async () => {
    try {
      setLoading(true);
      // Fetch aggregated billing stats from new backend endpoint
      const response = await fetch(API_ENDPOINTS.BILLING_DASHBOARD.STATS);
      if (!response.ok) throw new Error('Failed to fetch billing stats');
      const data = await response.json();

      if (data.status === 'success') {
        setDashboardStats({
          totalRevenue: data.totalRevenue || 0,
          settledRevenue: data.settledRevenue || 0,
          unsettledRevenue: data.unsettledRevenue || 0,
          pendingBills: data.pendingBills || 0,
          pendingBillsList: data.pendingBillsList || [],
          completedToday: data.completedToday || 0,
          totalRecords: data.totalRecords || 0
        });
        setRecords(data.records || []);
      }
    } catch (err) {
      console.error('Error fetching billing records:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch =
      r.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.registrationId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'All Types' || r.type === typeFilter;
    const matchesStatus = statusFilter === 'All Status' || r.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredRecords.length / entriesPerPage);
  const indexOfLastRecord = currentPage * entriesPerPage;
  const indexOfFirstRecord = indexOfLastRecord - entriesPerPage;
  const currentRecords = filteredRecords.slice(indexOfFirstRecord, indexOfLastRecord);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handlePrevious = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'Processing': return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      case 'Waiting': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-500 border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0a]">
        <div className="w-12 h-12 rounded-full border-2 border-[#D4A574] border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (viewMode === 'analytics') {
    return <BillingAnalyticsView onBack={() => setViewMode('transactions')} />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 ml-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-light tracking-tight">Billing Dashboard</h1>
          <p className="text-[#8B8B8B] text-sm mt-1">Manage all patient billing and transactions</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setViewMode('analytics')}
            className="bg-[#1a1a1a] border border-[#D4A574] text-[#D4A574] hover:bg-[#2a2a2a]"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            View Analytics
          </Button>
          <Button
            onClick={fetchBillingRecords}
            disabled={loading}
            className="bg-[#D4A574] text-[#0a0a0a] hover:bg-[#C9955E] font-bold"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-8">
        {[
          { 
            label: 'Total Revenue', 
            value: `₹${dashboardStats.totalRevenue.toLocaleString()}`, 
            icon: IndianRupee, 
            color: 'text-green-500',
            details: {
              settled: dashboardStats.settledRevenue,
              unsettled: dashboardStats.unsettledRevenue
            }
          },
          { 
            label: 'Pending Bills', 
            value: dashboardStats.pendingBills, 
            icon: Clock, 
            color: 'text-yellow-500',
            type: 'list',
            list: dashboardStats.pendingBillsList // Access directly from state
          },
          { label: 'Completed Today', value: dashboardStats.completedToday, icon: CheckCircle2, color: 'text-blue-500' },
        ].map((stat, i) => (
          <Card key={i} className="group relative bg-[#0f0f0f] border-[#D4A574] p-4 flex-1 hover:h-auto transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#8B8B8B] uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-semibold mt-1">{stat.value}</p>
              </div>
              <div className={`p-2 rounded-lg bg-[#1a1a1a] ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            
            {/* Total Revenue Breakdown */}
            {stat.details && (
              <div className="mt-0 h-0 opacity-0 overflow-hidden group-hover:h-auto group-hover:mt-4 group-hover:opacity-100 transition-all duration-300">
                  <div className="pt-4 border-t border-[#D4A574]/20 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[#8B8B8B]">Settled</span>
                      <span className="text-green-500 font-medium">₹{stat.details.settled?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[#8B8B8B]">Unsettled</span>
                      <span className="text-yellow-500 font-medium">₹{stat.details.unsettled?.toLocaleString() || 0}</span>
                    </div>
                  </div>
              </div>
            )}
            
            {/* Pending Bills List */}
            {stat.type === 'list' && stat.list && (
               <div className="mt-0 h-0 opacity-0 overflow-hidden group-hover:h-auto group-hover:mt-4 group-hover:opacity-100 transition-all duration-300">
                  <div className="pt-4 border-t border-[#D4A574]/20 space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                    {stat.list.length > 0 ? (
                      stat.list.map((bill: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-xs pb-1 border-b border-[#333] last:border-0 last:pb-0">
                          <div className="flex flex-col">
                             <span className="text-white truncate max-w-[120px] font-medium" title={bill.patientName}>{bill.patientName}</span>
                             <span className="text-[#8B8B8B] text-[10px]">{bill.type}</span>
                          </div>
                          <span className="text-yellow-500 font-medium whitespace-nowrap">₹{bill.amount.toLocaleString()}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-[#8B8B8B] text-center italic">No pending bills</div>
                    )}
                  </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-[#0f0f0f] border border-[#D4A574] rounded-xl p-4 mb-6 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a5a]" />
          <Input
            placeholder="Search by patient name or ID..."
            className="pl-10 bg-[#0a0a0a] border-[#D4A574] text-base focus:border-[#D4A574] transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            className="bg-[#0a0a0a] border border-[#D4A574] rounded-lg px-3 py-2 text-sm text-[#8B8B8B] outline-none focus:border-[#D4A574]"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option>All Types</option>
            <option>OPD</option>
            <option>Pharmacy</option>
            <option>Lab</option>
            <option>Surgery</option>
          </select>
          <select
            className="bg-[#0a0a0a] border border-[#D4A574] rounded-lg px-3 py-2 text-sm text-[#8B8B8B] outline-none focus:border-[#D4A574]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>All Status</option>
            <option>Waiting</option>
            <option>Processing</option>
            <option>Completed</option>
            <option>Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0f0f0f] border border-[#D4A574] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#151515] border-b border-[#D4A574]">
                <th className="p-4 text-xs font-semibold text-[#8B8B8B] uppercase tracking-wider">Type</th>
                <th className="p-4 text-xs font-semibold text-[#8B8B8B] uppercase tracking-wider">Check IN</th>
                <th className="p-4 text-xs font-semibold text-[#8B8B8B] uppercase tracking-wider">Patient Details</th>
                <th className="p-4 text-xs font-semibold text-[#8B8B8B] uppercase tracking-wider">Mob. & Ref..</th>
                <th className="p-4 text-xs font-semibold text-[#8B8B8B] uppercase tracking-wider">Visit Type</th>
                <th className="p-4 text-xs font-semibold text-[#8B8B8B] uppercase tracking-wider">Visit Reason</th>
                <th className="p-4 text-xs font-semibold text-[#8B8B8B] uppercase tracking-wider">Doc. & Optom</th>
                <th className="p-4 text-xs font-semibold text-[#8B8B8B] uppercase tracking-wider">Follow Up</th>
                <th className="p-4 text-xs font-semibold text-[#8B8B8B] uppercase tracking-wider">Waiting</th>
                <th className="p-4 text-xs font-semibold text-[#8B8B8B] uppercase tracking-wider">Status/Notes</th>
                <th className="p-4 text-xs font-semibold text-[#8B8B8B] uppercase tracking-wider">Action</th>
                <th className="p-4 text-xs font-semibold text-[#8B8B8B] uppercase tracking-wider">Dilation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4A574]">
              {currentRecords.map((record) => (
                <tr key={record.id} className="hover:bg-[#151515] transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${record.type === 'OPD' ? 'bg-blue-500' : (record.type === 'Pharmacy' ? 'bg-green-500' : 'bg-purple-500')}`}></div>
                      <span className="text-sm font-medium">{record.type}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-[#8B8B8B]">
                      <Clock className="w-3 h-3" />
                      <span className="text-sm">{record.checkInTime}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="text-sm font-semibold text-white group-hover:text-[#D4A574] transition-colors">{record.patientName}</p>
                      <p className="text-xs text-[#5a5a5a] font-mono mt-0.5">{record.registrationId}</p>
                      <p className="text-xs text-[#8B8B8B] mt-0.5">{record.age} / {record.sex}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <div className="flex items-center gap-1 text-xs text-[#8B8B8B]">
                        <Phone className="w-3 h-3" />
                        {record.phone}
                      </div>
                      <p className="text-xs text-[#5a5a5a] mt-1">Ref: {record.refDoctor}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded-full border ${record.visitType === 'New' ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' : 'border-purple-500/30 text-purple-400 bg-purple-500/10'}`}>
                      {record.visitType}
                    </span>
                  </td>
                  <td className="p-4">
                    <p className="text-xs text-[#8B8B8B] line-clamp-1">{record.visitReason}</p>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="text-sm text-white font-medium">{record.doctorName || 'Not Assigned'}</p>
                      <p className="text-xs text-[#5a5a5a] mt-0.5">{record.optomName}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1 text-xs text-[#8B8B8B]">
                      <Calendar className="w-3 h-3" />
                      {record.followUpDate}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm font-mono text-[#D4A574]">{record.waitingTime}</span>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap gap-1">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold ${getStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                        {record.paymentStatus && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold ${record.paymentStatus === 'paid' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                            (record.paymentStatus === 'partially_paid' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20')
                            }`}>
                            {record.paymentStatus.replace('_', ' ')}
                          </span>
                        )}
                        {record.insuranceStatus && record.insuranceStatus !== 'none' && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold ${record.insuranceStatus === 'received' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-400/20 animate-pulse'
                            }`}>
                            INS: {record.insuranceStatus}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#5a5a5a] truncate max-w-[120px]">{record.notes}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <Button
                      size="sm"
                      className="h-7 px-2 bg-[#D4A574] text-[#0a0a0a] hover:bg-[#C9955E] text-[9px] font-bold"
                      onClick={() => onBillingClick?.(record.registrationId)}
                    >
                      BILLING
                    </Button>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${record.dilationStatus === 'Completed' ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                      <span className="text-sm text-[#8B8B8B]">{record.dilationStatus}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-between text-[#8B8B8B] text-base">
        <p>
          Showing {filteredRecords.length > 0 ? indexOfFirstRecord + 1 : 0} to {Math.min(indexOfLastRecord, filteredRecords.length)} of {filteredRecords.length} entries
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentPage === 1}
            className="bg-[#0f0f0f] border border-[#D4A574] text-[#8B8B8B] hover:text-white hover:bg-[#1a1a1a] h-10 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </Button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(page => {
              // Show current page, first, last, and one around current
              return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
            })
            .map((page, index, array) => (
              <Fragment key={page}>
                {index > 0 && array[index - 1] !== page - 1 && (
                  <span className="text-[#5a5a5a]">...</span>
                )}
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(page)}
                  className={`h-10 w-10 flex items-center justify-center rounded-xl font-bold transition-all ${currentPage === page
                    ? 'bg-[#D4A574] text-[#0a0a0a] border border-[#D4A574] shadow-lg shadow-[#D4A574]/20'
                    : 'bg-[#0f0f0f] border border-[#D4A574] text-[#8B8B8B] hover:text-white hover:bg-[#1a1a1a]'
                    }`}
                >
                  {page}
                </Button>
              </Fragment>
            ))}

          <Button
            variant="outline"
            onClick={handleNext}
            disabled={currentPage === totalPages || totalPages === 0}
            className="bg-[#0f0f0f] border border-[#D4A574] text-[#8B8B8B] hover:text-white hover:bg-[#1a1a1a] h-10 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
