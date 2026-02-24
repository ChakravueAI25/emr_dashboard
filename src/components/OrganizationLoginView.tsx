import { useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import API_ENDPOINTS from '../config/api';

export function OrganizationLoginView({ onLoginSuccess }: { onLoginSuccess: (data: any) => void }) {
  const [step, setStep] = useState<'select' | 'login'>('select');
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Organization selection
  const [selectedOrg, setSelectedOrg] = useState<string>('');

  // Login form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginSuccess, setLoginSuccess] = useState(false);

  // Fetch available organizations
  const handleFetchOrganizations = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(API_ENDPOINTS.ORGANIZATION.ALL);
      const data = await response.json();

      if (data.status === 'success') {
        const activeOrgs = data.organizations.filter((org: any) => org.status === 'active');
        setOrganizations(activeOrgs);
        if (activeOrgs.length > 0) {
          setSelectedOrg(activeOrgs[0].organization_id);
        }
      } else {
        setError('Failed to load organizations');
      }
    } catch (err) {
      setError('Connection error. Make sure backend is running.');
    }

    setLoading(false);
  };

  const handleSelectOrg = () => {
    if (selectedOrg) {
      setStep('login');
      setLoginError('');
      setEmail('');
      setPassword('');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const response = await fetch(API_ENDPOINTS.ORGANIZATION.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          organization_id: selectedOrg
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        setLoginSuccess(true);

        // Store organization context
        localStorage.setItem('organizationContext', JSON.stringify({
          organizationId: selectedOrg,
          organizationName: data.user.organization_name,
          userId: data.user.user_id,
          email: data.user.email,
          role: data.user.role,
          token: data.token
        }));

        setTimeout(() => {
          onLoginSuccess(data.user);
        }, 1500);
      } else {
        setLoginError(data.detail || 'Login failed');
      }
    } catch (err) {
      setLoginError('Connection error');
    }

    setLoginLoading(false);
  };

  const selectedOrgData = organizations.find(o => o.organization_id === selectedOrg);

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#D4A574] to-[#8B7355] flex items-center justify-center mx-auto mb-3 shadow-lg">
            <span className="text-xl font-bold">â™€</span>
          </div>
          <h1 className="text-2xl font-bold mb-1">Chakravue AI</h1>
          <p className="text-[#8B8B8B] text-sm">Healthcare Dashboard</p>
        </div>

        {step === 'select' && (
          <div className="bg-[#121212] border border-[#D4A574] rounded-lg p-6">
            <h2 className="text-lg font-bold mb-4">Select Your Hospital</h2>

            {error && (
              <div className="bg-red-500 bg-opacity-20 border border-red-500 rounded-lg p-4 mb-6 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-sm text-red-400">{error}</span>
              </div>
            )}

            {organizations.length === 0 ? (
              <button
                onClick={handleFetchOrganizations}
                disabled={loading}
                className="w-full bg-[#D4A574] text-[#0a0a0a] py-2 rounded-lg font-semibold hover:bg-[#C9955E] transition-colors disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load Hospitals'}
              </button>
            ) : (
              <>
                <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                  {organizations.map(org => (
                    <button
                      key={org.organization_id}
                      onClick={() => setSelectedOrg(org.organization_id)}
                      className={`w-full p-4 rounded-lg text-left transition-all border ${selectedOrg === org.organization_id
                        ? 'border-[#D4A574] bg-[#D4A574] bg-opacity-10'
                        : 'border-[#D4A574] hover:border-[#D4A574]'
                        }`}
                    >
                      <p className="font-semibold mb-1">{org.organization_name}</p>
                      <p className="text-xs text-[#8B8B8B]">{org.plan_name} Plan • {org.organization_email}</p>
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleFetchOrganizations}
                    className="flex-1 border border-[#D4A574] py-2 rounded-lg hover:border-[#D4A574] transition-colors"
                  >
                    Refresh
                  </button>
                  <button
                    onClick={handleSelectOrg}
                    className="flex-1 bg-[#D4A574] text-[#0a0a0a] py-2 rounded-lg font-semibold hover:bg-[#C9955E] transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            <div className="mt-4 pt-4 border-t border-[#D4A574]">
              <p className="text-xs text-[#8B8B8B] text-center">New Hospital? <span className="text-[#D4A574] cursor-pointer hover:underline">Sign up here</span></p>
            </div>
          </div>
        )}

        {step === 'login' && selectedOrgData && (
          <div className="bg-[#121212] border border-[#D4A574] rounded-lg p-6">
            <div className="mb-4 p-3 bg-[#0a0a0a] border border-[#D4A574] rounded-lg">
              <p className="text-xs text-[#8B8B8B] mb-1">Logging in to:</p>
              <p className="font-semibold text-sm">{selectedOrgData.organization_name}</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block text-sm mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#D4A574] rounded-lg px-4 py-2 text-white focus:border-[#D4A574] outline-none"
                  placeholder="your.email@hospital.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#D4A574] rounded-lg px-4 py-2 text-white focus:border-[#D4A574] outline-none"
                  placeholder="Enter your password"
                  required
                />
              </div>

              {loginError && (
                <div className="bg-red-500 bg-opacity-20 border border-red-500 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span className="text-xs text-red-400">{loginError}</span>
                </div>
              )}

              {loginSuccess && (
                <div className="bg-green-500 bg-opacity-20 border border-green-500 rounded-lg p-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-green-400">Login successful! Redirecting...</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading || loginSuccess}
                className="w-full bg-[#D4A574] text-[#0a0a0a] py-2 rounded-lg font-semibold hover:bg-[#C9955E] transition-colors disabled:opacity-50"
              >
                {loginLoading ? 'Signing in...' : 'Sign In'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('select');
                  setLoginError('');
                }}
                className="w-full border border-[#D4A574] py-2 rounded-lg hover:border-[#D4A574] transition-colors"
              >
                Back to Hospital List
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-[#D4A574]">
              <p className="text-xs text-[#8B8B8B] text-center">Demo Credentials:<br />Email: doctor@hospital.com<br />Password: default_password_123</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
