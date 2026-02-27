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
