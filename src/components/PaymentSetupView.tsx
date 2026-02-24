import { useState } from 'react';
import { CreditCard, CheckCircle, AlertCircle, Plus, Trash2 } from 'lucide-react';
import API_ENDPOINTS from '../config/api';

interface Plan {
  id: string;
  name: string;
  price: number;
  users: number;
  storage: string;
  features: string[];
}

interface CreatedUser {
  id: string;
  email: string;
  role: 'receptionist' | 'opd' | 'doctor';
  status: string;
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 99,
    users: 5,
    storage: '1GB',
    features: ['5 Users', '1GB Storage', 'Basic Reports', 'Email Support']
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 299,
    users: 20,
    storage: '10GB',
    features: ['20 Users', '10GB Storage', 'Advanced Analytics', 'Priority Support']
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 999,
    users: 100,
    storage: '100GB',
    features: ['Unlimited Users', '100GB Storage', 'Custom Analytics', '24/7 Support']
  }
];

export function PaymentSetupView() {
  const [step, setStep] = useState<'plans' | 'checkout' | 'organization' | 'users' | 'success'>('plans');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  
  // Organization Setup
  const [organizationName, setOrganizationName] = useState('');
  const [organizationEmail, setOrganizationEmail] = useState('');
  const [organizationPhone, setOrganizationPhone] = useState('');
  
  // Payment/Checkout
  const [cardNumber, setCardNumber] = useState('4111111111111111');
  const [cardName, setCardName] = useState('Test Card');
  const [expiry, setExpiry] = useState('12/25');
  const [cvv, setCvv] = useState('123');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  
  // Users Setup
  const [createdUsers, setCreatedUsers] = useState<CreatedUser[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'receptionist' | 'opd' | 'doctor'>('receptionist');
  const [organizationId, setOrganizationId] = useState('');
  const [databaseName, setDatabaseName] = useState('');

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setStep('organization');
  };

  const handleOrganizationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (organizationName && organizationEmail && organizationPhone) {
      setStep('checkout');
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentStatus('processing');

    try {
      // Step 1: Call backend signup endpoint
      const signupResponse = await fetch(API_ENDPOINTS.SAAS.SIGNUP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_name: organizationName,
          organization_email: organizationEmail,
          organization_phone: organizationPhone,
          plan: {
            plan_id: selectedPlan?.id,
            name: selectedPlan?.name,
            price: selectedPlan?.price,
            max_users: selectedPlan?.users
          }
        })
      });

      const signupData = await signupResponse.json();

      if (signupData.status !== 'success') {
        setPaymentStatus('error');
        return;
      }

      const orgId = signupData.organization_id;
      setOrganizationId(orgId);
      setDatabaseName(signupData.database_name);
      // Step 2: Process payment
      const paymentResponse = await fetch(API_ENDPOINTS.SAAS.PROCESS_PAYMENT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: orgId,
          card_number: cardNumber,
          amount: selectedPlan?.price,
          currency: 'USD'
        })
      });

      const paymentData = await paymentResponse.json();

      if (paymentData.status === 'success') {
        setPaymentStatus('success');

        // Save to localStorage
        localStorage.setItem('currentOrganization', JSON.stringify({
          organizationId: orgId,
          organizationName,
          organizationEmail,
          plan: selectedPlan?.id,
          databaseName: paymentData.database_name,
          createdAt: new Date().toISOString(),
          mongodbConnection: paymentData.mongodb_connection_string,
          clusterId: paymentData.cluster_id
        }));

        setTimeout(() => {
          setStep('users');
        }, 2000);
      } else {
        setPaymentStatus('error');
      }
    } catch (error) {
      console.error('Signup/Payment failed:', error);
      setPaymentStatus('error');
    }
  };

  const handleAddUser = async () => {
    if (newUserEmail && organizationId) {
      try {
        const addUserResponse = await fetch(API_ENDPOINTS.SAAS.ADD_USER, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organization_id: organizationId,
            email: newUserEmail,
            role: newUserRole,
            password: `temp_${Date.now()}`
          })
        });

        const userData = await addUserResponse.json();

        if (userData.status === 'success') {
          const newUser: CreatedUser = {
            id: userData.user_id || `user_${Date.now()}`,
            email: newUserEmail,
            role: newUserRole,
            status: 'Active'
          };
          setCreatedUsers([...createdUsers, newUser]);
          setNewUserEmail('');
        }
      } catch (error) {
        console.error('Add user failed:', error);
      }
    }
  };

  const handleRemoveUser = (userId: string) => {
    setCreatedUsers(createdUsers.filter(u => u.id !== userId));
  };

  const handleCompleteSetup = () => {
    // Save all setup data
    localStorage.setItem('organizationSetupComplete', 'true');
    setStep('success');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Chakravue AI - Healthcare Dashboard</h1>
          <p className="text-[#8B8B8B]">Get your own secure hospital database instantly</p>
        </div>

        {/* Step Indicator */}
        <div className="mb-8 flex justify-between items-center">
          <div className={`flex items-center gap-2 ${step === 'plans' ? 'text-[#D4A574]' : 'text-[#4a4a4a]'}`}>
            <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center">1</div>
            <span>Select Plan</span>
          </div>
          <div className={`flex-1 h-1 mx-4 ${['checkout', 'organization', 'users', 'success'].includes(step) ? 'bg-[#D4A574]' : 'bg-[#2a2a2a]'}`}></div>
          
          <div className={`flex items-center gap-2 ${['organization', 'checkout', 'users', 'success'].includes(step) ? 'text-[#D4A574]' : 'text-[#4a4a4a]'}`}>
            <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center">2</div>
            <span>Organization</span>
          </div>
          <div className={`flex-1 h-1 mx-4 ${['checkout', 'users', 'success'].includes(step) ? 'bg-[#D4A574]' : 'bg-[#2a2a2a]'}`}></div>
          
          <div className={`flex items-center gap-2 ${['checkout', 'users', 'success'].includes(step) ? 'text-[#D4A574]' : 'text-[#4a4a4a]'}`}>
            <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center">3</div>
            <span>Payment</span>
          </div>
          <div className={`flex-1 h-1 mx-4 ${['users', 'success'].includes(step) ? 'bg-[#D4A574]' : 'bg-[#2a2a2a]'}`}></div>
          
          <div className={`flex items-center gap-2 ${['users', 'success'].includes(step) ? 'text-[#D4A574]' : 'text-[#4a4a4a]'}`}>
            <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center">4</div>
            <span>Setup Users</span>
          </div>
        </div>

        {/* Plans Selection */}
        {step === 'plans' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map(plan => (
              <div key={plan.id} className="bg-[#121212] border border-[#D4A574] rounded-lg p-8 hover:border-[#D4A574] transition-all cursor-pointer" onClick={() => handleSelectPlan(plan)}>
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="text-4xl font-bold text-[#D4A574] mb-1">${plan.price}<span className="text-sm text-[#8B8B8B]">/month</span></div>
                <p className="text-[#8B8B8B] text-sm mb-6">Perfect for {plan.users} users</p>
                
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-[#D4A574]" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button className="w-full bg-[#D4A574] text-[#0a0a0a] py-2 rounded-lg font-semibold hover:bg-[#C9955E] transition-colors">
                  Choose {plan.name}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Organization Details */}
        {step === 'organization' && selectedPlan && (
          <div className="max-w-2xl mx-auto bg-[#121212] border border-[#D4A574] rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-6">Hospital Information</h2>
            
            <form onSubmit={handleOrganizationSubmit} className="space-y-6">
              <div>
                <label className="block text-sm mb-2">Hospital/Organization Name</label>
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#D4A574] rounded-lg px-4 py-2 text-white focus:border-[#D4A574] outline-none"
                  placeholder="e.g., St. Mary's Hospital"
                  required
                />
              </div>

              <div>
                <label className="block text-sm mb-2">Admin Email</label>
                <input
                  type="email"
                  value={organizationEmail}
                  onChange={(e) => setOrganizationEmail(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#D4A574] rounded-lg px-4 py-2 text-white focus:border-[#D4A574] outline-none"
                  placeholder="admin@hospital.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm mb-2">Phone</label>
                <input
                  type="tel"
                  value={organizationPhone}
                  onChange={(e) => setOrganizationPhone(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#D4A574] rounded-lg px-4 py-2 text-white focus:border-[#D4A574] outline-none"
                  placeholder="+1-555-0000"
                  required
                />
              </div>

              <div className="bg-[#0a0a0a] border border-[#D4A574] rounded-lg p-4">
                <p className="text-sm"><span className="text-[#D4A574]">Plan Selected:</span> {selectedPlan.name} - ${selectedPlan.price}/month</p>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep('plans')}
                  className="flex-1 border border-[#D4A574] py-2 rounded-lg hover:border-[#D4A574] transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#D4A574] text-[#0a0a0a] py-2 rounded-lg font-semibold hover:bg-[#C9955E] transition-colors"
                >
                  Continue to Payment
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Payment */}
        {step === 'checkout' && selectedPlan && (
          <div className="max-w-2xl mx-auto bg-[#121212] border border-[#D4A574] rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-6">Payment Details</h2>
            
            <form onSubmit={handlePaymentSubmit} className="space-y-6">
              <div className="bg-[#0a0a0a] border border-[#D4A574] rounded-lg p-4 mb-6">
                <p className="text-sm mb-2"><span className="text-[#D4A574]">Hospital:</span> {organizationName}</p>
                <p className="text-sm"><span className="text-[#D4A574]">Amount:</span> ${selectedPlan.price}/month</p>
              </div>

              <div>
                <label className="block text-sm mb-2">Card Number</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#D4A574] rounded-lg px-4 py-2 text-white focus:border-[#D4A574] outline-none"
                  placeholder="4111 1111 1111 1111"
                />
                <p className="text-xs text-[#8B8B8B] mt-1">Test: 4111111111111111</p>
              </div>

              <div>
                <label className="block text-sm mb-2">Cardholder Name</label>
                <input
                  type="text"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#D4A574] rounded-lg px-4 py-2 text-white focus:border-[#D4A574] outline-none"
                  placeholder="John Doe"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">Expiry Date</label>
                  <input
                    type="text"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#D4A574] rounded-lg px-4 py-2 text-white focus:border-[#D4A574] outline-none"
                    placeholder="MM/YY"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">CVV</label>
                  <input
                    type="text"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#D4A574] rounded-lg px-4 py-2 text-white focus:border-[#D4A574] outline-none"
                    placeholder="123"
                  />
                  <p className="text-xs text-[#8B8B8B] mt-1">Test: 123</p>
                </div>
              </div>

              {paymentStatus === 'error' && (
                <div className="bg-red-500 bg-opacity-20 border border-red-500 rounded-lg p-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-sm text-red-400">Payment failed. Please check your details.</span>
                </div>
              )}

              {paymentStatus === 'success' && (
                <div className="bg-green-500 bg-opacity-20 border border-green-500 rounded-lg p-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-sm text-green-400">Payment successful! Creating your database...</span>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep('organization')}
                  disabled={paymentStatus === 'processing'}
                  className="flex-1 border border-[#D4A574] py-2 rounded-lg hover:border-[#D4A574] transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={paymentStatus === 'processing' || paymentStatus === 'success'}
                  className="flex-1 bg-[#D4A574] text-[#0a0a0a] py-2 rounded-lg font-semibold hover:bg-[#C9955E] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  {paymentStatus === 'processing' ? 'Processing...' : 'Pay Now'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* User Setup */}
        {step === 'users' && (
          <div className="max-w-4xl mx-auto bg-[#121212] border border-[#D4A574] rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-6">Create Your Team</h2>
            
            <div className="bg-[#0a0a0a] border border-[#D4A574] rounded-lg p-4 mb-6">
              <p className="text-sm"><span className="text-[#D4A574]">Organization:</span> {organizationName}</p>
              <p className="text-sm"><span className="text-[#D4A574]">Database:</span> {databaseName}</p>
              <p className="text-sm"><span className="text-[#D4A574]">Organization ID:</span> {organizationId}</p>
            </div>

            <div className="mb-6 p-6 bg-[#0a0a0a] border border-[#D4A574] rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Add Users</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">Email</label>
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full bg-[#121212] border border-[#D4A574] rounded-lg px-4 py-2 text-white focus:border-[#D4A574] outline-none"
                    placeholder="doctor@hospital.com"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2">Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as any)}
                    className="w-full bg-[#121212] border border-[#D4A574] rounded-lg px-4 py-2 text-white focus:border-[#D4A574] outline-none"
                  >
                    <option value="receptionist">Receptionist</option>
                    <option value="opd">OPD</option>
                    <option value="doctor">Doctor</option>
                  </select>
                </div>

                <button
                  onClick={handleAddUser}
                  className="w-full bg-[#D4A574] text-[#0a0a0a] py-2 rounded-lg font-semibold hover:bg-[#C9955E] transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add User
                </button>
              </div>
            </div>

            {/* Users List */}
            {createdUsers.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Created Users</h3>
                <div className="space-y-2">
                  {createdUsers.map(user => (
                    <div key={user.id} className="bg-[#0a0a0a] border border-[#D4A574] rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{user.email}</p>
                        <p className="text-xs text-[#8B8B8B]">Role: <span className="text-[#D4A574]">{user.role.toUpperCase()}</span></p>
                      </div>
                      <button
                        onClick={() => handleRemoveUser(user.id)}
                        className="p-2 hover:bg-red-500 hover:bg-opacity-20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => setStep('checkout')}
                className="flex-1 border border-[#D4A574] py-2 rounded-lg hover:border-[#D4A574] transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleCompleteSetup}
                disabled={createdUsers.length === 0}
                className="flex-1 bg-[#D4A574] text-[#0a0a0a] py-2 rounded-lg font-semibold hover:bg-[#C9955E] transition-colors disabled:opacity-50"
              >
                Complete Setup
              </button>
            </div>
          </div>
        )}

        {/* Success */}
        {step === 'success' && (
          <div className="max-w-2xl mx-auto bg-[#121212] border border-[#D4A574] rounded-lg p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-6" />
            
            <h2 className="text-3xl font-bold mb-4">Setup Complete! ðŸŽ‰</h2>
            
            <div className="bg-[#0a0a0a] border border-[#D4A574] rounded-lg p-6 mb-6 text-left">
              <h3 className="text-lg font-semibold mb-4">Your Hospital Dashboard:</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-[#8B8B8B]">Organization:</span>
                  <span className="font-medium">{organizationName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B8B8B]">Plan:</span>
                  <span className="font-medium">{selectedPlan?.name} (${selectedPlan?.price}/month)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B8B8B]">Database Name:</span>
                  <span className="font-medium">{databaseName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B8B8B]">Organization ID:</span>
                  <span className="font-medium text-xs">{organizationId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B8B8B]">Users Created:</span>
                  <span className="font-medium">{createdUsers.length}</span>
                </div>
              </div>
            </div>

            <p className="text-[#8B8B8B] mb-6">
              Your hospital database has been created and all users have been added. You can now login and start using Chakravue AI.
            </p>

            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-[#D4A574] text-[#0a0a0a] py-3 rounded-lg font-semibold hover:bg-[#C9955E] transition-colors"
            >
              Go to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
