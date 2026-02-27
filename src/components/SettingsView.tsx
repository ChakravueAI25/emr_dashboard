import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Shield, Edit2, Save, X } from 'lucide-react';
import { useIsLightTheme } from '../hooks/useTheme';

interface SettingsViewProps {
   username?: string;
   role?: string;
}

export function SettingsView({ username, role }: SettingsViewProps) {
   const isLight = useIsLightTheme();
   
   // Try to get organization context from localStorage
   const getOrgContext = () => {
      try {
         const stored = localStorage.getItem('organizationContext');
         return stored ? JSON.parse(stored) : null;
      } catch {
         return null;
      }
   };

   const orgContext = getOrgContext();
   
   const [profile, setProfile] = useState({
      fullName: username || orgContext?.email?.split('@')[0] || 'User',
      email: orgContext?.email || (username ? `${username.toLowerCase().replace(/\s+/g, '.')}@chakravue.ai` : 'user@chakravue.ai'),
      phone: '+91 98765 43210',
      role: role || orgContext?.role || 'Staff',
   });

   const [isEditing, setIsEditing] = useState(false);
   const [editedProfile, setEditedProfile] = useState(profile);

   // Update profile when props change
   useEffect(() => {
      const orgCtx = getOrgContext();
      setProfile({
         fullName: username || orgCtx?.email?.split('@')[0] || 'User',
         email: orgCtx?.email || (username ? `${username.toLowerCase().replace(/\s+/g, '.')}@chakravue.ai` : 'user@chakravue.ai'),
         phone: '+91 98765 43210',
         role: role || orgCtx?.role || 'Staff',
      });
   }, [username, role]);

   const handleEdit = () => {
      setEditedProfile(profile);
      setIsEditing(true);
   };

   const handleSave = () => {
      setProfile(editedProfile);
      setIsEditing(false);
      // TODO: Save to backend API
   };

   const handleCancel = () => {
      setEditedProfile(profile);
      setIsEditing(false);
   };

   const handleChange = (field: keyof typeof profile, value: string) => {
      setEditedProfile(prev => ({ ...prev, [field]: value }));
   };

   return (
      <div className="max-w-3xl mx-auto p-8 h-[calc(100vh-5rem)] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">
         {/* Header */}
         <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <div className="flex flex-col gap-1">
               <h1 className="text-3xl font-light text-[var(--theme-text)] tracking-tight">
                  Account <span className="font-bold text-[var(--theme-accent)]">Settings</span>
               </h1>
               <p className="text-[var(--theme-text-muted)] text-xs font-medium uppercase tracking-[0.2em] opacity-60">
                  Personal Information & Contact Details
               </p>
            </div>
            
            {!isEditing ? (
               <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white rounded-lg transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 text-sm"
               >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span className="font-medium">Edit Profile</span>
               </button>
            ) : (
               <div className="flex gap-2">
                  <button
                     onClick={handleCancel}
                     className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-secondary)] text-[var(--theme-text)] rounded-lg transition-all duration-300 border border-[var(--theme-border)] text-sm"
                  >
                     <X className="w-3.5 h-3.5" />
                     <span className="font-medium">Cancel</span>
                  </button>
                  <button
                     onClick={handleSave}
                     className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white rounded-lg transition-all duration-300 shadow-md hover:shadow-lg text-sm"
                  >
                     <Save className="w-3.5 h-3.5" />
                     <span className="font-medium">Save Changes</span>
                  </button>
               </div>
            )}
         </div>

         {/* User Information Cards Grid */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name Card */}
            <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/20 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
               <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center flex-shrink-0">
                     <User className="w-4.5 h-4.5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                     <h3 className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mb-1">
                        Full Name
                     </h3>
                     {isEditing ? (
                        <input
                           type="text"
                           value={editedProfile.fullName}
                           onChange={(e) => handleChange('fullName', e.target.value)}
                           className="w-full bg-[var(--theme-bg-input)] border border-[var(--theme-border)] rounded px-2 py-1 text-sm font-semibold text-[var(--theme-text)] focus:border-[var(--theme-accent)]/50 outline-none transition-all"
                        />
                     ) : (
                        <p className="text-sm font-semibold text-[var(--theme-text)] truncate">
                           {profile.fullName}
                        </p>
                     )}
                  </div>
               </div>
            </div>

            {/* Email Card */}
            <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/20 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
               <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center flex-shrink-0">
                     <Mail className="w-4.5 h-4.5 text-purple-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                     <h3 className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mb-1">
                        Email Address
                     </h3>
                     {isEditing ? (
                        <input
                           type="email"
                           value={editedProfile.email}
                           onChange={(e) => handleChange('email', e.target.value)}
                           className="w-full bg-[var(--theme-bg-input)] border border-[var(--theme-border)] rounded px-2 py-1 text-sm font-semibold text-[var(--theme-text)] focus:border-[var(--theme-accent)]/50 outline-none transition-all"
                        />
                     ) : (
                        <p className="text-sm font-semibold text-[var(--theme-text)] truncate">
                           {profile.email}
                        </p>
                     )}
                  </div>
               </div>
            </div>

            {/* Phone Card */}
            <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/20 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
               <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center flex-shrink-0">
                     <Phone className="w-4.5 h-4.5 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                     <h3 className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mb-1">
                        Mobile Number
                     </h3>
                     {isEditing ? (
                        <input
                           type="tel"
                           value={editedProfile.phone}
                           onChange={(e) => handleChange('phone', e.target.value)}
                           className="w-full bg-[var(--theme-bg-input)] border border-[var(--theme-border)] rounded px-2 py-1 text-sm font-semibold text-[var(--theme-text)] focus:border-[var(--theme-accent)]/50 outline-none transition-all"
                        />
                     ) : (
                        <p className="text-sm font-semibold text-[var(--theme-text)]">
                           {profile.phone}
                        </p>
                     )}
                  </div>
               </div>
            </div>

            {/* Role Card */}
            <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent)]/20 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
               <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center flex-shrink-0">
                     <Shield className="w-4.5 h-4.5 text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                     <h3 className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mb-1">
                        Occupation / Role
                     </h3>
                     <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[var(--theme-text)] capitalize">
                           {profile.role}
                        </p>
                        <span className="px-2 py-0.5 bg-[var(--theme-accent)]/10 text-[var(--theme-accent)] text-[10px] font-bold rounded-full uppercase tracking-wider">
                           {profile.role}
                        </span>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}
