import React, { useState } from 'react';
import { Camera, Save, User, Mail, Phone, Shield, Zap, CalendarPlus } from 'lucide-react';
import { Button } from './ui/button';
import { useIsLightTheme } from '../hooks/useTheme';
import { UnifiedOperationsHub } from './UnifiedOperationsHub';
import { AppointmentBookingView } from './AppointmentBookingView';

interface ProfileSettingsProps {
   username?: string;
   role?: string;
   onNavigateToDashboard?: () => void;
   onNavigateToBooking?: () => void;
   onPatientSelected?: (patient: any) => void;
}

type PortalView = 'dashboard' | 'booking';

export function ProfileSettings({ username, role, onNavigateToDashboard, onNavigateToBooking, onPatientSelected }: ProfileSettingsProps) {
      // Action bar toggle state
      const [activeBar, setActiveBar] = useState<'operations' | 'appointment'>('operations');
   const [profile, setProfile] = useState({
      fullName: username || 'Dr. Meeraa',
      email: username ? `${username.toLowerCase().replace(/\s+/g, '.')}@chakravue.ai` : 'meeraa@chakravue.ai',
      phone: '+91 98765 43210',
      role: role || 'Clinical Lead',
      department: role === 'doctor' ? 'Cardiology' : 'Operations'
   });

   const [activeTab, setActiveTab] = useState<PortalView>('dashboard');
   const isLight = useIsLightTheme();
   const activeCol = isLight ? '#753d3e' : 'var(--theme-accent)';
   const inactiveCol = isLight ? '#6c757d' : 'var(--theme-text-muted)';

   // Update profile when props change
   React.useEffect(() => {
      if (username || role) {
         setProfile(prev => ({
            ...prev,
            fullName: username || prev.fullName,
            email: username ? `${username.toLowerCase().replace(/\s+/g, '.')}@chakravue.ai` : prev.email,
            role: role || prev.role,
            department: role === 'doctor' ? 'Cardiology' : prev.department
         }));
      }
   }, [username, role]);

   const handleChange = (field: string, value: string) => {
      setProfile(prev => ({ ...prev, [field]: value }));
   };

   const navItems = [
      { id: 'dashboard' as PortalView, label: 'Operations Hub', icon: Zap, desc: 'Overview & Status' },
      { id: 'booking' as PortalView, label: 'Fix Appointment', icon: CalendarPlus, desc: 'New Patient Booking' },
   ];

   // DEBUG: Log role for troubleshooting
   console.log('ProfileSettings - Current role:', role, 'Username:', username);

   // Receptionist Portal - Show navigation header with dashboard/booking content
   if (role === 'receptionist') {
      return (
         <div className="flex flex-col bg-[#1a1a1a] min-h-screen">
            {/* Welcome/Action Bar - pixel perfect */}
            <div className="w-full flex items-center justify-between px-8 py-4 bg-[#1a1a1a] border-b border-[#D4A574]" style={{minHeight:'72px'}}>
                {/* Left Section */}
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#232323] flex items-center justify-center border border-[#D4A574]/30">
                        <User className="w-6 h-6 text-[#D4A574]" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#D4A574] mb-1">RECEPTIONIST VIEW</span>
                        <span className="text-lg font-bold text-white leading-none">Welcome, {username}</span>
                    </div>
                </div>
                {/* Right Section */}
                <div className="flex items-center gap-3">
                    {/* Operations Hub Button */}
                    <button
                        className={`flex flex-col items-start px-6 py-3 rounded-2xl border ${activeBar === 'operations' ? 'border-[#D4A574]' : 'border-transparent'} bg-[#232323] transition-all duration-300 min-w-[180px]`}
                        style={{boxShadow:activeBar==='operations'?'0 0 0 2px #D4A574':''}}
                        onClick={()=>setActiveBar('operations')}
                    >
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-8 h-8 rounded-xl bg-[#1a1a1a] flex items-center justify-center border border-[#D4A574]/30">
                                {/* Lightning bolt icon */}
                                <svg width="22" height="22" fill="none" stroke="#D4A574" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 9-12h-9l2-8z"/></svg>
                            </div>
                            <span className="text-base font-bold text-white">Operations Hub</span>
                        </div>
                        <span className="text-[11px] font-medium text-[#C2BAB1]">Overview & Status</span>
                    </button>
                    {/* Fix Appointment Button */}
                    <button
                        className={`flex flex-col items-start px-6 py-3 rounded-2xl border ${activeBar === 'appointment' ? 'border-[#D4A574]' : 'border-transparent'} bg-[#232323] transition-all duration-300 min-w-[180px]`}
                        style={{boxShadow:activeBar==='appointment'?'0 0 0 2px #D4A574':''}}
                        onClick={()=>setActiveBar('appointment')}
                    >
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-8 h-8 rounded-xl bg-[#1a1a1a] flex items-center justify-center border border-[#D4A574]/30">
                                {/* Calendar icon */}
                                <svg width="22" height="22" fill="none" stroke="#D4A574" strokeWidth="2.2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                            </div>
                            <span className="text-base font-bold text-white">Fix Appointment</span>
                        </div>
                        <span className="text-[11px] font-medium text-[#C2BAB1]">New Patient Booking</span>
                    </button>
                </div>
            </div>

            {/* Main Content Workspace */}
            <div className="flex-1 flex flex-col bg-gradient-to-br from-[var(--theme-bg-gradient-from)] to-[var(--theme-bg-gradient-to)] overflow-hidden">
               {/* Dynamic Content Area */}
               <div className={`flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#222] px-8 pb-8 pt-0 ${activeTab === 'dashboard' ? 'p-4' : ''}`}>
                  {activeTab === 'dashboard' && (
                     <UnifiedOperationsHub
                        username={username || ''}
                        userRole="receptionist"
                        onPatientSelected={onPatientSelected}
                        onNavigate={(tab: string) => { console.log('Navigation to', tab); }}
                     />
                  )}
                  {activeTab === 'booking' && (
                     <div className="h-full pt-6">
                        <AppointmentBookingView 
                           onNavigateToBilling={(registrationId, patientData) => {
                              console.log('📍 [ProfileSettings] AppointmentBooking callback invoked with:', { registrationId, patientData });
                              if (window && typeof window.dispatchEvent === 'function') {
                                 window.dispatchEvent(new CustomEvent('navigate-to-billing', {
                                    detail: { registrationId, patientData }
                                 }));
                              }
                           }}
                        />
                     </div>
                  )}
               </div>
            </div>
         </div>
      );
   }

   // Default Profile Settings for non-receptionist roles
   return (
      <div className="max-w-5xl mx-auto p-12 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
         {/* Header */}
         <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-light text-[var(--theme-text)] tracking-tight">
               Profile <span className="font-bold text-[var(--theme-accent)]">Settings</span>
            </h1>
            <p className="text-[var(--theme-text-muted)] text-sm font-medium uppercase tracking-[0.2em] opacity-60">
               Personal Information & Contact Details
            </p>
         </div>

         {/* Profile Card */}
         <div className="bg-[var(--theme-bg)] border border-[var(--theme-accent)] rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-5">
               <User className="w-64 h-64 text-[var(--theme-accent)]" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
               {/* Avatar Section */}
               <div className="flex flex-col items-center gap-4">
                  <div className="w-32 h-32 rounded-full bg-[var(--theme-bg-secondary)] border-2 border-[var(--theme-accent)]/20 flex items-center justify-center relative group cursor-pointer overflow-hidden">
                     <User className="w-16 h-16 text-[#444] group-hover:scale-110 transition-transform duration-300" />
                     <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-8 h-8 text-white" />
                     </div>
                  </div>
                  <button className="text-xs font-bold text-[var(--theme-accent)] uppercase tracking-widest hover:opacity-80 transition-colors">
                     Change Photo
                  </button>
               </div>

               {/* Form Section */}
               <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Full Name</label>
                     <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444] group-focus-within:text-[var(--theme-accent)] transition-colors" />
                        <input
                           type="text"
                           value={profile.fullName}
                           onChange={(e) => handleChange('fullName', e.target.value)}
                           className="w-full bg-[var(--theme-bg-input)] border border-[var(--theme-accent)] rounded-xl pl-12 pr-4 h-12 text-[var(--theme-text)] focus:border-[var(--theme-accent)]/50 outline-none transition-all"
                        />
                     </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Role</label>
                     <div className="relative">
                        <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444]" />
                        <input
                           type="text"
                           value={profile.role}
                           readOnly
                           className="w-full bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)] rounded-xl pl-12 pr-4 h-12 text-[var(--theme-text-muted)] outline-none cursor-not-allowed"
                        />
                     </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Email Address</label>
                     <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444] group-focus-within:text-[var(--theme-accent)] transition-colors" />
                        <input
                           type="email"
                           value={profile.email}
                           onChange={(e) => handleChange('email', e.target.value)}
                           className="w-full bg-[var(--theme-bg-input)] border border-[var(--theme-accent)] rounded-xl pl-12 pr-4 h-12 text-[var(--theme-text)] focus:border-[var(--theme-accent)]/50 outline-none transition-all"
                        />
                     </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Phone Number</label>
                     <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444] group-focus-within:text-[var(--theme-accent)] transition-colors" />
                        <input
                           type="tel"
                           value={profile.phone}
                           onChange={(e) => handleChange('phone', e.target.value)}
                           className="w-full bg-[var(--theme-bg-input)] border border-[var(--theme-accent)] rounded-xl pl-12 pr-4 h-12 text-[var(--theme-text)] focus:border-[var(--theme-accent)]/50 outline-none transition-all"
                        />
                     </div>
                  </div>
               </div>
            </div>

            <div className="mt-8 pt-8 border-t border-[var(--theme-accent)] flex justify-end gap-4">
               <Button className="bg-[var(--theme-bg-secondary)] hover:opacity-80 text-[var(--theme-text)] border border-[var(--theme-accent)]">Cancel</Button>
               <Button className="bg-[var(--theme-accent)] hover:opacity-90 text-[var(--theme-bg)] font-bold flex items-center gap-2 border-none">
                  <Save className="w-4 h-4" /> Save Changes
               </Button>
            </div>
         </div>
      </div>
   );
}
