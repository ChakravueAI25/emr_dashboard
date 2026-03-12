import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Building2, Users, IndianRupee, TrendingUp, RefreshCw, Database, Boxes } from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';

interface Organization {
  organization_id: string;
  organization_name: string;
  organization_email: string;
  plan_name: string;
  plan_price: number;
  max_users: number;
  status: string;
  created_at: string;
  payment_date: string | null;
  user_count?: number;
}

type NavigationCallback = (view: any) => void;

export function AdminDashboardView({ onNavigate }: { onNavigate?: NavigationCallback }) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [orgUsers, setOrgUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalOrganizations: 0,
    totalRevenue: 0,
    activeSubscriptions: 0,
    totalUsers: 0
  });

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.MASTER_ADMIN.ALL_ORGANIZATIONS);
      const data = await response.json();

      if (data.status === 'success') {
        setOrganizations(data.organizations);

        // Calculate stats
        const totalOrgs = data.organizations.length;
        const activeOrgs = data.organizations.filter((o: any) => o.status === 'active').length;
        const totalRev = data.organizations.reduce((sum: number, o: any) => sum + (o.plan_price || 0), 0);

        setStats({
          totalOrganizations: totalOrgs,
          totalRevenue: totalRev,
          activeSubscriptions: activeOrgs,
          totalUsers: 0
        });
      }
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
    }
    setLoading(false);
  };

  const fetchOrgUsers = async (orgId: string) => {
    try {
      const response = await fetch(API_ENDPOINTS.MASTER_ADMIN.ORG_USERS(orgId));
      const data = await response.json();

      if (data.status === 'success') {
        setOrgUsers(data.users);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const handleSelectOrg = (org: Organization) => {
    setSelectedOrg(org);
    fetchOrgUsers(org.organization_id);
  };

  // Prepare chart data
  const planDistribution = organizations.reduce((acc: any, org) => {
    const existing = acc.find((p: any) => p.name === org.plan_name);
    if (existing) {
      existing.count++;
      existing.revenue += org.plan_price;
    } else {
      acc.push({ name: org.plan_name, count: 1, revenue: org.plan_price });
    }
    return acc;
  }, []);

  const revenueData = [
    { month: 'Jan', revenue: 0 },
    { month: 'Feb', revenue: 0 },
    { month: 'Mar', revenue: 0 },
    { month: 'Apr', revenue: 0 },
    { month: 'May', revenue: 0 },
    { month: 'Jun', revenue: stats.totalRevenue }
  ];

  const usersByRole = orgUsers.reduce((acc: any, user) => {
    const existing = acc.find((r: any) => r.name === user.role);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ name: user.role, count: 1 });
    }
    return acc;
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-[#8B8B8B]">Manage all organizations and subscriptions</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => onNavigate?.('inventory')}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <Boxes className="w-4 h-4" />
              Inventory
            </button>
            <button
              onClick={() => onNavigate?.('admin-data-management')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              <Database className="w-4 h-4" />
              Database Management
            </button>
            <button
              onClick={fetchOrganizations}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-[#D4A574] text-[#0a0a0a] rounded-lg font-semibold hover:bg-[#C9955E] transition-colors disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#121212] border border-[#D4A574] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <Building2 className="w-8 h-8 text-[#D4A574]" />
              <span className="text-2xl font-bold">{stats.totalOrganizations}</span>
            </div>
            <p className="text-[#8B8B8B]">Total Organizations</p>
          </div>

          <div className="bg-[#121212] border border-[#D4A574] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-green-400" />
              <span className="text-2xl font-bold">{stats.activeSubscriptions}</span>
            </div>
            <p className="text-[#8B8B8B]">Active Subscriptions</p>
          </div>

          <div className="bg-[#121212] border border-[#D4A574] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <IndianRupee className="w-8 h-8 text-yellow-400" />
              <span className="text-2xl font-bold">₹{stats.totalRevenue}</span>
            </div>
            <p className="text-[#8B8B8B]">Monthly Revenue (MRR)</p>
          </div>

          <div className="bg-[#121212] border border-[#D4A574] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-blue-400" />
              <span className="text-2xl font-bold">{orgUsers.length}</span>
            </div>
            <p className="text-[#8B8B8B]">Users (Selected Org)</p>
          </div>
        </div>

        {/* Charts and Organizations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Plan Distribution */}
          <div className="lg:col-span-1 bg-[#121212] border border-[#D4A574] rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">Plan Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={planDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="name" stroke="#8B8B8B" />
                <YAxis stroke="#8B8B8B" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#121212', border: '1px solid #2a2a2a', borderRadius: '8px' }}
                  labelStyle={{ color: '#D4A574' }}
                />
                <Bar dataKey="count" fill="#D4A574" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue Trend */}
          <div className="lg:col-span-2 bg-[#121212] border border-[#D4A574] rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="month" stroke="#8B8B8B" />
                <YAxis stroke="#8B8B8B" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#121212', border: '1px solid #2a2a2a', borderRadius: '8px' }}
                  labelStyle={{ color: '#D4A574' }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#D4A574" strokeWidth={2} dot={{ fill: '#D4A574' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Organizations List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Organizations */}
          <div className="bg-[#121212] border border-[#D4A574] rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">All Organizations</h3>

            {loading ? (
              <p className="text-[#8B8B8B]">Loading...</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {organizations.map(org => (
                  <button
                    key={org.organization_id}
                    onClick={() => handleSelectOrg(org)}
                    className={`w-full p-4 rounded-lg text-left transition-all border ${selectedOrg?.organization_id === org.organization_id
                      ? 'border-[#D4A574] bg-[#D4A574] bg-opacity-10'
                      : 'border-[#D4A574] hover:border-[#D4A574]'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold">{org.organization_name}</p>
                      <span className={`text-xs px-2 py-1 rounded ${org.status === 'active'
                        ? 'bg-green-500 bg-opacity-20 text-green-400'
                        : 'bg-yellow-500 bg-opacity-20 text-yellow-400'
                        }`}>
                        {org.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-[#8B8B8B] mb-1">{org.organization_email}</p>
                    <div className="flex justify-between text-xs text-[#8B8B8B]">
                      <span>{org.plan_name} Plan</span>
                      <span>₹{org.plan_price}/mo</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Organization Details */}
          {selectedOrg && (
            <div className="bg-[#121212] border border-[#D4A574] rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">Organization Details</h3>

              <div className="space-y-4 mb-6">
                <div className="bg-[#0a0a0a] border border-[#D4A574] rounded-lg p-4">
                  <p className="text-xs text-[#8B8B8B] mb-1">Name</p>
                  <p className="font-semibold">{selectedOrg.organization_name}</p>
                </div>

                <div className="bg-[#0a0a0a] border border-[#D4A574] rounded-lg p-4">
                  <p className="text-xs text-[#8B8B8B] mb-1">Email</p>
                  <p className="font-semibold">{selectedOrg.organization_email}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#0a0a0a] border border-[#D4A574] rounded-lg p-4">
                    <p className="text-xs text-[#8B8B8B] mb-1">Plan</p>
                    <p className="font-semibold">{selectedOrg.plan_name}</p>
                  </div>

                  <div className="bg-[#0a0a0a] border border-[#D4A574] rounded-lg p-4">
                    <p className="text-xs text-[#8B8B8B] mb-1">Price</p>
                    <p className="font-semibold">₹{selectedOrg.plan_price}/mo</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#0a0a0a] border border-[#D4A574] rounded-lg p-4">
                    <p className="text-xs text-[#8B8B8B] mb-1">Max Users</p>
                    <p className="font-semibold">{selectedOrg.max_users}</p>
                  </div>

                  <div className="bg-[#0a0a0a] border border-[#D4A574] rounded-lg p-4">
                    <p className="text-xs text-[#8B8B8B] mb-1">Current Users</p>
                    <p className="font-semibold">{orgUsers.length}</p>
                  </div>
                </div>

                <div className="bg-[#0a0a0a] border border-[#D4A574] rounded-lg p-4">
                  <p className="text-xs text-[#8B8B8B] mb-1">Created</p>
                  <p className="font-semibold">{new Date(selectedOrg.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="border-t border-[#D4A574] pt-6">
                <h4 className="font-semibold mb-3">Users by Role</h4>
                <div className="space-y-2">
                  {usersByRole.map((role: any) => (
                    <div key={role.name} className="flex items-center justify-between p-2 bg-[#0a0a0a] rounded-lg">
                      <span className="text-sm">{role.name}</span>
                      <span className="text-[#D4A574] font-semibold">{role.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
