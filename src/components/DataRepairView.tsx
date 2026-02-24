import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { API_ENDPOINTS } from '../config/api';

interface DuplicateAppointment {
  name: string;
  ids: string[];
  count: number;
}

export function DataRepairView() {
  const [duplicates, setDuplicates] = useState<DuplicateAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    findDuplicates();
  }, []);

  const findDuplicates = () => {
    try {
      // Load appointments from backend
      // Note: this is synchronous wrapper; we call fetch and handle failures gracefully
      // Use an immediately-invoked async function to allow await
      (async () => {
        try {
          const resp = await fetch(API_ENDPOINTS.APPOINTMENTS);
          const data = resp.ok ? await resp.json() : { appointments: [] };
          const queuedAppointments = data.appointments || [];

          // Group by patient name
          const byName: Record<string, string[]> = {};
          queuedAppointments.forEach((apt: any) => {
            const name = apt.patientName?.toLowerCase() || '';
            if (!byName[name]) byName[name] = [];
            if (!byName[name].includes(apt.patientRegistrationId)) {
              byName[name].push(apt.patientRegistrationId);
            }
          });

          // Find duplicates
          const foundDuplicates = Object.entries(byName)
            .filter(([, ids]) => ids.length > 1)
            .map(([name, ids]) => ({
              name,
              ids,
              count: queuedAppointments.filter((apt: any) => apt.patientName?.toLowerCase() === name).length,
            }));

          setDuplicates(foundDuplicates);
        } catch (err) {
          console.error('Error fetching appointments for duplicate check:', err);
        }
      })();
    } catch (err) {
      console.error('Error finding duplicates:', err);
    }
  };

  const fixDuplicateAppointments = async () => {
    setLoading(true);
    try {
      // Load current appointments from backend
      const resp = await fetch(API_ENDPOINTS.APPOINTMENTS);
      const data = resp.ok ? await resp.json() : { appointments: [] };
      const queuedAppointments = data.appointments || [];

      // For each duplicate patient, get the correct ID from backend and update appointments
      let fixed = 0;
      let errors = 0;

      for (const dup of duplicates) {
        try {
          const response = await fetch(`${API_ENDPOINTS.PATIENTS_SEARCH}?q=${encodeURIComponent(dup.name)}`);
          if (!response.ok) continue;

          const pdata = await response.json();
          if (!pdata.results || pdata.results.length === 0) continue;

          const correctId = pdata.results[0].registrationId;

          // For all appointments with this name, update registrationId to correctId and cancel duplicates after the first per date
          // Group by date and keep first occurrence per date
          const byDate: Record<string, any[]> = {};
          const apptsForName = queuedAppointments.filter((apt: any) => apt.patientName?.toLowerCase() === dup.name);

          for (const apt of apptsForName) {
            const dateKey = apt.appointmentDate ? new Date(apt.appointmentDate).toISOString().split('T')[0] : 'unknown';
            if (!byDate[dateKey]) byDate[dateKey] = [];
            byDate[dateKey].push(apt);
          }

          for (const dateKey of Object.keys(byDate)) {
            const list = byDate[dateKey];
            // First one: ensure registrationId is correct
            if (list.length > 0) {
              const first = list[0];
              const idToUpdate = first._id || first.id || first.appointmentId;
              try {
                await fetch(API_ENDPOINTS.APPOINTMENT(idToUpdate), {
                  method: 'PUT', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ patientRegistrationId: correctId })
                });
              } catch (e) {
                console.warn('Failed to update appointment registrationId:', e);
              }
            }

            // Remaining are duplicates for same date: mark as cancelled
            for (let i = 1; i < list.length; i++) {
              const dupApt = list[i];
              const idToCancel = dupApt._id || dupApt.id || dupApt.appointmentId;
              try {
                await fetch(API_ENDPOINTS.APPOINTMENT(idToCancel), {
                  method: 'PUT', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'cancelled' })
                });
              } catch (e) {
                console.warn('Failed to cancel duplicate appointment:', e);
                errors++;
              }
            }
          }

          fixed++;
        } catch (err) {
          console.error(`Error fixing ${dup.name}:`, err);
          errors++;
        }
      }

      setMessage({
        type: errors === 0 ? 'success' : 'error',
        text: `Fixed ${fixed} patients${errors > 0 ? ` (${errors} errors)` : ''}`,
      });

      // Refresh the list
      findDuplicates();
      // Notify other components
      window.dispatchEvent(new Event('appointmentsUpdated'));
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to fix duplicates' });
    } finally {
      setLoading(false);
    }
  };

  const removeAppointment = (patientName: string, registrationId: string) => {
    try {
      (async () => {
        try {
          const resp = await fetch(API_ENDPOINTS.APPOINTMENTS);
          const data = resp.ok ? await resp.json() : { appointments: [] };
          const queuedAppointments = data.appointments || [];

          const toRemove = queuedAppointments.filter((apt: any) => (
            (apt.patientName || '').toLowerCase() === patientName.toLowerCase() &&
            (apt.patientRegistrationId || '') === registrationId
          ));

          for (const apt of toRemove) {
            const id = apt._id || apt.id || apt.appointmentId;
            try {
              await fetch(API_ENDPOINTS.APPOINTMENT(id), {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'cancelled' })
              });
            } catch (e) {
              console.warn('Failed to cancel appointment:', e);
            }
          }

          setMessage({ type: 'success', text: `Removed appointments for ${patientName} with ID ${registrationId}` });
          findDuplicates();
          window.dispatchEvent(new Event('appointmentsUpdated'));
        } catch (err) {
          setMessage({ type: 'error', text: 'Failed to remove appointments' });
        }
      })();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to remove appointments' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8 ml-16">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-light tracking-tight mb-2">Data Repair & Maintenance</h1>
          <p className="text-[#8B8B8B]">Fix duplicate appointments and ensure data consistency</p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border flex items-start gap-3 ${
              message.type === 'success'
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            {message.type === 'success' ? <CheckCircle className="w-5 h-5 mt-0.5" /> : <AlertCircle className="w-5 h-5 mt-0.5" />}
            <p>{message.text}</p>
          </div>
        )}

        {/* Duplicates Found */}
        {duplicates.length > 0 ? (
          <div className="space-y-6">
            <Card className="bg-[#0f0f0f] border border-[#D4A574] p-6">
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                Found {duplicates.length} Patient(s) with Multiple IDs
              </h2>

              <div className="space-y-4">
                {duplicates.map((dup) => (
                  <div key={dup.name} className="bg-[#0a0a0a] border border-[#D4A574] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium text-[#D4A574]">{dup.name}</p>
                        <p className="text-sm text-[#8B8B8B]">{dup.count} total appointments</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-[#8B8B8B] mb-1">Registration IDs:</p>
                        <div className="space-y-1">
                          {dup.ids.map((id) => (
                            <div key={id} className="flex items-center gap-2">
                              <code className="text-xs bg-[#1a1a1a] px-2 py-1 rounded text-[#D4A574]">{id}</code>
                              <button
                                onClick={() => removeAppointment(dup.name, id)}
                                className="p-1 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                                title={`Remove all appointments for ${dup.name} with this ID`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-[#8B8B8B] mb-3">
                      Keep only the correct registration ID from the backend and remove duplicates.
                    </p>
                  </div>
                ))}
              </div>

              <Button
                onClick={fixDuplicateAppointments}
                disabled={loading || duplicates.length === 0}
                className="w-full mt-6 bg-[#D4A574] hover:bg-[#C9955E] text-[#0a0a0a] font-semibold py-2 transition-all disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {loading ? 'Fixing...' : 'Auto-Fix All Duplicates'}
              </Button>
            </Card>
          </div>
        ) : (
          <Card className="bg-[#0f0f0f] border border-[#D4A574] p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">No Duplicates Found</p>
            <p className="text-[#8B8B8B]">Your appointment data is clean and consistent.</p>
            <Button
              onClick={findDuplicates}
              variant="outline"
              className="mt-4"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Check
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
