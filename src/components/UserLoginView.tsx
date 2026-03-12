import { useState } from 'react';
import { User, Lock, Eye, EyeOff, LogIn, UserPlus, CreditCard, Building2, BarChart3 } from 'lucide-react';
import API_ENDPOINTS from '../config/api';
import { useTheme } from '../context/ThemeContext';

type AuthSuccess = (user: { username: string; role: string }) => void;
type NavigationCallback = (view: 'payment-setup' | 'organization-login' | 'admin-dashboard') => void;

export function UserLoginView({ onAuthSuccess, onNavigate }: { onAuthSuccess?: AuthSuccess; onNavigate?: NavigationCallback }) {
  const { isDark } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    role: 'admin'
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    (async () => {
      try {
        if (isLogin) {
          const res = await fetch(API_ENDPOINTS.AUTH_LOGIN, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: formData.username, password: formData.password, role: formData.role })
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Invalid Credentials.');
          }

          const data = await res.json();
          onAuthSuccess && onAuthSuccess({ username: data.username, role: (data.role || '').toLowerCase() });

        } else {
          if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match.');
            return;
          }

          const res = await fetch(API_ENDPOINTS.USERS_NEW, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: formData.username, full_name: formData.fullName, password: formData.password, role: formData.role })
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Failed to create account');
          }

          const data = await res.json();
          setSuccessMessage('Account created successfully. You can now sign in.');
          // alert('Account created successfully. You can now sign in.');
          onAuthSuccess && onAuthSuccess({ username: data.username, role: (data.role || '').toLowerCase() });
        }
      } catch (err: any) {
        const msg = err.message || 'An error occurred.';
        if (msg.toLowerCase().includes('role does not match') || msg.toLowerCase().includes('invalid credentials')) {
          setError('Invalid Credentials');
        } else if (msg.toLowerCase().includes('username and password required')) {
          setError('Username And Password Required');
        } else {
          setError(msg);
        }
      }
    })();
  };



  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div style={{ height: '100vh', backgroundColor: 'var(--theme-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflow: 'hidden' }}>
      <div className="main-container" style={{ width: '100%', maxWidth: '1440px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', margin: '0 auto' }}>
        {/* Left Side - Eye Animation */}
        {/* <div className="animation-container" style={{ 
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0,
          animation: 'fadeIn 1s ease-out 0.2s forwards'
        }}>
          <div style={{ width: '100%', maxWidth: '500px', transition: 'all 700ms' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            <DotLottieReact
              src="https://lottie.host/b5b7ed31-15c2-4330-8079-66bdb0953b6a/GSFYyjO0z4.json"
              loop
              autoplay
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </div> */}

        {/* Right Side - Login Form */}
        <div className="form-container" style={{ flex: 1, maxWidth: '28rem', width: '100%', opacity: 0, animation: 'fadeIn 1s ease-out 0.4s forwards' }}>
          {/* Logo/Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div
              style={{
                width: '4rem',
                height: '4rem',
                margin: '0 auto 1rem',
                borderRadius: '100%',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                // boxShadow: '0 25px 50px -12px rgba(212, 165, 116, 0.4)',
                transition: 'all 500ms',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(212, 165, 116, 0.6)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(212, 165, 116, 0.4)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <img
                src="/logo.jpeg"
                alt="Chakravue AI Logo"
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '100%',
                  objectFit: 'cover'
                }}
              />
            </div>
            <h1 style={{
              background: 'linear-gradient(to right, var(--theme-text), var(--theme-accent))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: '2rem',
              fontWeight: 900,
              marginBottom: '0.25rem',
              letterSpacing: '-0.05em'
            }}>
              Chakravue AI
            </h1>
            <p style={{ color: 'var(--theme-text-muted)', fontSize: '1rem' }}>
              {isLogin ? 'Welcome back, sign in to continue' : 'Join us and create your account'}
            </p>
          </div>

          {/* Login/Signup Card */}
          <div style={{
            backgroundColor: isDark ? 'var(--theme-bg-secondary)' : '#f8f9fa',
            backdropFilter: 'blur(24px)',
            border: `1px solid ${isDark ? 'var(--theme-border)' : '#dee2e6'}`,
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow: isDark ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
            transition: 'all 500ms'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>


              {/* Hidden dummy inputs to prevent browser autofill on real fields */}
              <input type="text" style={{ display: 'none' }} autoComplete="username" aria-hidden="true" tabIndex={-1} readOnly />
              <input type="password" style={{ display: 'none' }} autoComplete="current-password" aria-hidden="true" tabIndex={-1} readOnly />

              {/* Username */}
              <div style={{ transition: 'all 300ms' }}>
                <label style={{ color: 'var(--theme-text-muted)', display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 500 }}>
                  Username
                </label>
                <div style={{ position: 'relative' }}>
                  <User style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '1.25rem', height: '1.25rem', color: 'var(--theme-text-muted)', transition: 'color 300ms' }} />
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    autoComplete="new-password"
                    autoFocus
                    style={{
                      width: '100%',
                      paddingLeft: '2.5rem',
                      paddingRight: '1rem',
                      paddingTop: '0.6rem',
                      paddingBottom: '0.6rem',
                      backgroundColor: isDark ? 'var(--theme-bg-input)' : '#ffffff',
                      border: `1px solid ${isDark ? 'var(--theme-accent)' : '#753d3e'}`,
                      borderRadius: '0.75rem',
                      color: isDark ? '#ffffff' : '#1a1a1a',
                      transition: 'all 300ms',
                      outline: 'none'
                    }}
                    placeholder="Enter your username"
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--theme-accent)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(var(--theme-accent-rgb), 0.2)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--theme-border)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    onKeyDown={handleKeyDown}
                  />
                </div>
              </div>

              {/* Full Name - Only for signup */}
              {!isLogin && (
                <div style={{ transition: 'all 300ms', animation: 'slideIn 0.3s ease-out' }}>
                  <label style={{ color: 'var(--theme-text-muted)', display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 500 }}>
                    Full Name
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '1.25rem', height: '1.25rem', color: 'var(--theme-text-muted)' }} />
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      style={{
                        width: '100%',
                        paddingLeft: '2.5rem',
                        paddingRight: '1rem',
                        paddingTop: '0.6rem',
                        paddingBottom: '0.6rem',
                        backgroundColor: isDark ? 'var(--theme-bg-input)' : '#ffffff',
                        border: `1px solid ${isDark ? 'var(--theme-accent)' : '#753d3e'}`,
                        borderRadius: '0.75rem',
                        color: isDark ? '#ffffff' : '#1a1a1a',
                        transition: 'all 300ms',
                        outline: 'none'
                      }}
                      placeholder="Enter your full name"
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--theme-accent)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(var(--theme-accent-rgb), 0.2)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--theme-border)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      onKeyDown={handleKeyDown}
                    />
                  </div>
                </div>
              )}

              {/* Role - Only for signup */}
              {!isLogin && (
                <div style={{ transition: 'all 300ms', animation: 'slideIn 0.3s ease-out' }}>
                  <label style={{ color: 'var(--theme-text-muted)', display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 500 }}>
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.875rem 1rem',
                      backgroundColor: isDark ? 'var(--theme-bg-input)' : '#ffffff',
                      border: `1px solid ${isDark ? 'var(--theme-accent)' : '#753d3e'}`,
                      borderRadius: '0.75rem',
                      color: isDark ? '#ffffff' : '#1a1a1a',
                      transition: 'all 300ms',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--theme-accent)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(var(--theme-accent-rgb), 0.2)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--theme-border)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <option value="admin" style={{ backgroundColor: 'var(--theme-bg-input)' }}>Admin</option>
                    <option value="receptionist" style={{ backgroundColor: 'var(--theme-bg-input)' }}>Receptionist</option>
                    <option value="opd" style={{ backgroundColor: 'var(--theme-bg-input)' }}>OPD</option>
                    <option value="doctor" style={{ backgroundColor: 'var(--theme-bg-input)' }}>Doctor</option>
                  </select>
                </div>
              )}

              {/* Password */}
              <div style={{ transition: 'all 300ms' }}>
                <label style={{ color: 'var(--theme-text-muted)', display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 500 }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '1.25rem', height: '1.25rem', color: 'var(--theme-text-muted)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    autoComplete="new-password"
                    style={{
                      width: '100%',
                      paddingLeft: '2.5rem',
                      paddingRight: '3rem',
                      paddingTop: '0.6rem',
                      paddingBottom: '0.6rem',
                      backgroundColor: isDark ? 'var(--theme-bg-input)' : '#ffffff',
                      border: `1px solid ${isDark ? 'var(--theme-accent)' : '#753d3e'}`,
                      borderRadius: '0.75rem',
                      color: isDark ? '#ffffff' : '#1a1a1a',
                      transition: 'all 300ms',
                      outline: 'none'
                    }}
                    placeholder="Enter your password"
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--theme-accent)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(var(--theme-accent-rgb), 0.2)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--theme-border)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    onKeyDown={handleKeyDown}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--theme-text-muted)',
                      transition: 'all 300ms',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--theme-accent)';
                      e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--theme-text-muted)';
                      e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                    }}
                  >
                    {showPassword ? <EyeOff style={{ width: '1.25rem', height: '1.25rem' }} /> : <Eye style={{ width: '1.25rem', height: '1.25rem' }} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password - Only for signup */}
              {!isLogin && (
                <div style={{ transition: 'all 300ms', animation: 'slideIn 0.3s ease-out' }}>
                  <label style={{ color: 'var(--theme-text-muted)', display: 'block', marginBottom: '0.625rem', fontSize: '0.875rem', fontWeight: 500 }}>
                    Confirm Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '1.25rem', height: '1.25rem', color: 'var(--theme-text-muted)' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      style={{
                        width: '100%',
                        paddingLeft: '2.5rem',
                        paddingRight: '1rem',
                        paddingTop: '0.6rem',
                        paddingBottom: '0.6rem',
                        backgroundColor: isDark ? 'var(--theme-bg-input)' : '#ffffff',
                        border: `1px solid ${isDark ? 'var(--theme-accent)' : '#753d3e'}`,
                        borderRadius: '0.75rem',
                        color: isDark ? '#ffffff' : '#1a1a1a',
                        transition: 'all 300ms',
                        outline: 'none'
                      }}
                      placeholder="Confirm your password"
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--theme-accent)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(var(--theme-accent-rgb), 0.2)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--theme-border)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      onKeyDown={handleKeyDown}
                    />
                  </div>
                </div>
              )}

              {/* Role selector while logging in */}
              {isLogin && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '0.5rem' }}>
                  <div style={{ color: 'var(--theme-text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>Sign in as</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                    {[
                      { role: 'admin', label: 'Admin' },
                      { role: 'receptionist', label: 'Receptionist' },
                      { role: 'opd', label: 'OPD' },
                      { role: 'doctor', label: 'Doctor' }
                    ].map(({ role, label }) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setFormData({ ...formData, role })}
                        style={{
                          padding: '0.5rem',
                          borderRadius: '0.5rem',
                          transition: 'all 300ms',
                          cursor: 'pointer',
                          border: formData.role === role ? 'none' : `1px solid ${isDark ? 'var(--theme-border)' : '#dee2e6'}`,
                          background: formData.role === role ? 'var(--theme-accent)' : (isDark ? 'var(--theme-bg-input)' : '#ffffff'),
                          color: formData.role === role ? 'white' : 'var(--theme-text-muted)',
                          boxShadow: formData.role === role ? '0 10px 15px -3px rgba(var(--theme-accent-rgb), 0.3)' : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (formData.role !== role) {
                            e.currentTarget.style.backgroundColor = 'var(--theme-bg-tertiary)';
                          }
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <User style={{ width: '1.25rem', height: '1.25rem', margin: '0 auto 0.375rem' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 500, display: 'block' }}>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Error/Success Messages */}
              {error && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.5)', color: '#FCA5A5', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', textAlign: 'center' }}>
                  {error}
                </div>
              )}
              {successMessage && (
                <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.5)', color: '#86EFAC', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', textAlign: 'center' }}>
                  {successMessage}
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                style={{
                  width: '100%',
                  marginTop: '1.5rem',
                  padding: '0.75rem',
                  background: 'var(--theme-accent)',
                  color: 'var(--theme-bg)',
                  borderRadius: '0.75rem',
                  transition: 'all 300ms',
                  boxShadow: '0 10px 15px -3px rgba(var(--theme-accent-rgb), 0.4)',
                  fontWeight: 600,
                  fontSize: '1rem',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.625rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--theme-accent-hover)';
                  e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(var(--theme-accent-rgb), 0.6)';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--theme-accent)';
                  e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(var(--theme-accent-rgb), 0.4)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.98)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
              >
                {isLogin ? (
                  <>
                    <LogIn style={{ width: '1.25rem', height: '1.25rem' }} />
                    <span>Sign In</span>
                  </>
                ) : (
                  <>
                    <UserPlus style={{ width: '1.25rem', height: '1.25rem' }} />
                    <span>Create Account</span>
                  </>
                )}
              </button>
            </div>

            {/* Toggle Login/Signup */}
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--theme-text-muted)', fontSize: '0.875rem' }}>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  style={{
                    color: 'var(--theme-accent)',
                    transition: 'color 300ms',
                    fontWeight: 600,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--theme-accent-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--theme-accent)';
                  }}
                >
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--theme-text-muted)', fontSize: '0.7rem' }}>
              © 2025 Ophthalmology EMR System. All rights reserved.
            </p>

            {/* SaaS Options */}
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--theme-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <p style={{ color: 'var(--theme-text-muted)', fontSize: '0.75rem', fontWeight: 500 }}>Hospital & Organization Management</p>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => onNavigate?.('payment-setup')}
                  style={{
                    flex: 1,
                    padding: '0.625rem 0.75rem',
                    backgroundColor: 'var(--theme-bg-input)',
                    color: 'var(--theme-accent)',
                    border: '1px solid var(--theme-border)',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 300ms',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.375rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--theme-bg-tertiary)';
                    e.currentTarget.style.borderColor = 'var(--theme-accent)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--theme-bg-input)';
                    e.currentTarget.style.borderColor = 'var(--theme-border)';
                  }}
                >
                  <CreditCard style={{ width: '0.875rem', height: '0.875rem' }} />
                  <span>Create Hospital</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate?.('organization-login')}
                  style={{
                    flex: 1,
                    padding: '0.625rem 0.75rem',
                    backgroundColor: 'var(--theme-bg-input)',
                    color: 'var(--theme-accent)',
                    border: '1px solid var(--theme-border)',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 300ms',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.375rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--theme-bg-tertiary)';
                    e.currentTarget.style.borderColor = 'var(--theme-accent)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--theme-bg-input)';
                    e.currentTarget.style.borderColor = 'var(--theme-border)';
                  }}
                >
                  <Building2 style={{ width: '0.875rem', height: '0.875rem' }} />
                  <span>Hospital Staff</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate?.('admin-dashboard')}
                  style={{
                    flex: 1,
                    padding: '0.625rem 0.75rem',
                    backgroundColor: 'var(--theme-bg-input)',
                    color: 'var(--theme-accent)',
                    border: '1px solid var(--theme-border)',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 300ms',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.375rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--theme-bg-tertiary)';
                    e.currentTarget.style.borderColor = 'var(--theme-accent)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--theme-bg-input)';
                    e.currentTarget.style.borderColor = 'var(--theme-border)';
                  }}
                >
                  <BarChart3 style={{ width: '0.875rem', height: '0.875rem' }} />
                  <span>Admin Panel</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @media (max-width: 1024px) {
          .animation-container {
            display: none !important;
          }
          .main-container {
            justify-content: center !important;
          }
          .form-container {
            max-width: 100% !important;
          }
        }

        /* Theme-aware autofill and match focus style */
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 30px var(--theme-bg-input) inset !important;
            -webkit-text-fill-color: var(--theme-text) !important;
            color: var(--theme-text) !important;
            border-color: var(--theme-accent) !important;
            box-shadow: 0 0 0 30px var(--theme-bg-input) inset, 0 0 0 3px rgba(var(--theme-accent-rgb), 0.2) !important;
            caret-color: var(--theme-accent) !important;
            transition: background-color 5000s ease-in-out 0s;
        }

        /* Standard input resets */
        input {
          caret-color: var(--theme-accent);
          color: var(--theme-text) !important;
          background-color: var(--theme-bg-input) !important;
        }

        /* Ensure placeholder remains visible but muted */
        input::placeholder {
          color: var(--theme-text-muted) !important;
          opacity: 0.7 !important;
        }

        /* Light mode specific force-fixes for inputs and unselected buttons */
        .light input {
          background-color: #ffffff !important;
          color: #1a1a1a !important;
        }
        
        .light input:-webkit-autofill {
            -webkit-box-shadow: 0 0 0 30px #ffffff inset !important;
            -webkit-text-fill-color: #1a1a1a !important;
        }

        .light button[style*="var(--theme-bg-input)"] {
          background-color: #ffffff !important;
          color: #495057 !important;
          border-color: #dee2e6 !important;
        }
      `}</style>
    </div>
  );
}