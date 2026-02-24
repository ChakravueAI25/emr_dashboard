import { useState, useEffect } from 'react';
import { Bell, Plus, Trash2, Check, Clock, AlertCircle, Info, CheckCircle, Zap } from 'lucide-react';
import API_ENDPOINTS from '../config/api';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  timestamp: string;
  eventTime?: string; // When the event actually happens
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  triggered?: boolean; // Whether the notification time has been reached
}

export function NotificationsView() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'info' as const,
    priority: 'medium' as const
  });

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Helper function to calculate time until event
  const getTimeUntilEvent = (eventTime: string): { minutes: number; hours: number; isApproaching: boolean; isTriggered: boolean } => {
    if (!eventTime) return { minutes: 0, hours: 0, isApproaching: false, isTriggered: false };
    
    const eventDate = new Date(eventTime);
    const now = new Date(currentTime);
    const diffMs = eventDate.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    
    // Show as approaching if within 1 hour
    const isApproaching = diffMinutes >= 0 && diffMinutes <= 60;
    // Show as triggered if time has passed
    const isTriggered = diffMinutes < 0;
    
    return { minutes: Math.abs(diffMinutes), hours: Math.abs(diffHours), isApproaching, isTriggered };
  };

  // Helper function to format countdown
  const getCountdownText = (eventTime: string): string => {
    const { minutes, hours, isTriggered } = getTimeUntilEvent(eventTime);
    
    if (isTriggered) return 'â° Time!';
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  // Update current time every second for real-time countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch and generate notifications on mount
  useEffect(() => {
    generateNotifications();
    // Refresh notifications every 30 seconds
    const interval = setInterval(generateNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const generateNotifications = async () => {
    try {
      setLoading(true);
      const generatedNotifications: Notification[] = [];

      // 1. Fetch upcoming appointments (today)
      try {
        const appointmentsRes = await fetch(API_ENDPOINTS.APPOINTMENTS);
        if (appointmentsRes.ok) {
          const appointmentData = await appointmentsRes.json();
          const today = new Date().toDateString();
          const todayAppointments = (appointmentData.appointments || []).filter((apt: any) => {
            const aptDate = new Date(apt.appointmentDate).toDateString();
            return aptDate === today && apt.status === 'booked';
          });

          todayAppointments.slice(0, 2).forEach((apt: any) => {
            // Parse appointment time to create event timestamp
            const aptDate = new Date(apt.appointmentDate);
            const [hours, minutes] = (apt.appointmentTime || '00:00').split(':').map(Number);
            const eventTime = new Date(aptDate);
            eventTime.setHours(hours, minutes, 0);

            const { isApproaching, isTriggered } = getTimeUntilEvent(eventTime.toISOString());

            generatedNotifications.push({
              id: `apt-${apt._id}`,
              title: 'Appointment Reminder',
              message: `Patient ${apt.patientName} has an appointment with Dr. ${apt.doctorName} at ${apt.appointmentTime}`,
              type: isTriggered ? 'alert' : isApproaching ? 'warning' : 'info',
              timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }),
              eventTime: eventTime.toISOString(),
              read: false,
              priority: isApproaching || isTriggered ? 'high' : 'high',
              triggered: isTriggered
            });
          });
        }
      } catch (e) {
        console.error('Error fetching appointments:', e);
      }

      // 2. Fetch recent patient registrations
      try {
        const patientsRes = await fetch(API_ENDPOINTS.PATIENTS_ALL);
        if (patientsRes.ok) {
          const patientData = await patientsRes.json();
          const now = new Date();
          const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
          
          const recentPatients = (patientData.patients || []).filter((patient: any) => {
            const createdDate = new Date(patient.created_at);
            return createdDate > oneHourAgo && createdDate.getFullYear() !== 1970;
          }).slice(0, 2);

          recentPatients.forEach((patient: any) => {
            generatedNotifications.push({
              id: `pat-${patient._id}`,
              title: 'New Patient Registration',
              message: `New patient ${patient.name} (ID: ${patient.registrationId}) has been registered`,
              type: 'info',
              timestamp: new Date(patient.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }),
              read: false,
              priority: 'medium'
            });
          });
        }
      } catch (e) {
        console.error('Error fetching patients:', e);
      }

      // 3. Fetch medicines with low stock
      try {
        const medicinesRes = await fetch(API_ENDPOINTS.PHARMACY.GET_MEDICINES);
        if (medicinesRes.ok) {
          const medicineData = await medicinesRes.json();
          const lowStockMedicines = (medicineData.medicines || [])
            .filter((med: any) => med.stock < 10 && med.stock > 0)
            .slice(0, 2);

          lowStockMedicines.forEach((med: any) => {
            generatedNotifications.push({
              id: `med-${med.id}`,
              title: 'Medicine Stock Alert',
              message: `${med.name} has low stock (${med.stock} units remaining)`,
              type: 'warning',
              timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }),
              read: false,
              priority: 'high'
            });
          });
        }
      } catch (e) {
        console.error('Error fetching medicines:', e);
      }

      // 4. Fetch Pending Bills from Billing Dashboard
      try {
        const billingRes = await fetch(API_ENDPOINTS.BILLING_DASHBOARD.STATS);
        if (billingRes.ok) {
          const billingData = await billingRes.json();
          if (billingData.status === 'success' && billingData.records) {
            const pendingBills = billingData.records.filter((r: any) => 
               r.paymentStatus === 'unpaid' || r.paymentStatus === 'partially_paid'
            ).slice(0, 3);

            pendingBills.forEach((bill: any) => {
              generatedNotifications.push({
                id: `bill-${bill.id || bill._id}`,
                title: 'Pending Payment',
                message: `Patient ${bill.patientName} has a pending ${bill.type} bill of ₹${bill.amount || '---'}`,
                type: 'alert',
                timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }),
                read: false,
                priority: 'high'
              });
            });
          }
        }
      } catch (e) {
        console.error('Error fetching pending bills:', e);
      }

      // 5. Fetch Admitted/Arrived Patients (Reception Queue)
      try {
        const queueRes = await fetch(API_ENDPOINTS.QUEUE_RECEPTION);
        if (queueRes.ok) {
          const queueData = await queueRes.json();
          const today = new Date().toISOString().split('T')[0];
          const arrivedPatients = (queueData.items || []).filter((p: any) => {
             const itemDate = p.appointmentDate || (p.receptionData && p.receptionData.appointmentDate);
             return p.status === 'waiting' && itemDate === today;
          }).slice(0, 3);
          
          arrivedPatients.forEach((patient: any) => {
             generatedNotifications.push({
               id: `adm-${patient._id || patient.id}`,
               title: 'Patient Arrived',
               message: `${patient.patientName} has arrived and is waiting at reception`,
               type: 'success',
               timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }),
               read: false,
               priority: 'medium'
             });
          });
        }
      } catch (e) {
        console.error('Error fetching queue:', e);
      }

      // 6. Add system alerts (example)
      const systemAlerts: Notification[] = [
        {
          id: 'sys-backup',
          title: 'System Backup Complete',
          message: 'Daily backup completed successfully at ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          type: 'success',
          timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }),
          read: true,
          priority: 'low'
        }
      ];

      // Combine all notifications, removing duplicates
      const allNotifications = [...generatedNotifications, ...systemAlerts];
      const uniqueNotifications = Array.from(new Map(allNotifications.map(n => [n.id, n])).values());
      setNotifications(uniqueNotifications);
    } catch (error) {
      console.error('Error generating notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'info':
        return <Info className="w-5 h-5 text-blue-400" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'alert':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Bell className="w-5 h-5 text-[#8B8B8B]" />;
    }
  };

  const getNotificationBorderColor = (type: string) => {
    switch (type) {
      case 'info':
        return 'border-l-blue-400';
      case 'warning':
        return 'border-l-yellow-400';
      case 'success':
        return 'border-l-green-400';
      case 'alert':
        return 'border-l-red-400';
      default:
        return 'border-l-[#2a2a2a]';
    }
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(notif => ({ ...notif, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(notif => notif.id !== id));
  };

  const handleAddNotification = (e: React.FormEvent) => {
    e.preventDefault();
    const notification: Notification = {
      id: Date.now().toString(),
      title: newNotification.title,
      message: newNotification.message,
      type: newNotification.type,
      priority: newNotification.priority,
      timestamp: new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }),
      read: false
    };
    setNotifications([notification, ...notifications]);
    setNewNotification({
      title: '',
      message: '',
      type: 'info',
      priority: 'medium'
    });
    setShowAddForm(false);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-white text-3xl mb-2">Notifications</h1>
          <p className="text-[#B8B8B8]">System notifications and alerts</p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              className="px-4 py-2 bg-[#1a1a1a] text-[#8B8B8B] border border-[#D4A574] rounded-lg hover:text-[#D4A574] hover:border-[#D4A574] transition-colors font-semibold"
            >
              Mark All Read
            </button>
          )}
          <button
            onClick={generateNotifications}
            disabled={loading}
            className="px-4 py-2 bg-[#1a1a1a] text-[#D4A574] border border-[#D4A574] rounded-lg hover:border-[#D4A574] transition-colors font-semibold disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-[#D4A574] text-[#0a0a0a] rounded-lg hover:bg-[#C9955E] transition-colors font-semibold flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Notification
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#121212] border border-[#D4A574] rounded-lg p-4 shadow-lg shadow-[#D4A574]/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#8B8B8B] text-xs mb-1">Total</p>
              <p className="text-white text-2xl">{notifications.length}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-[#D4A574] bg-opacity-20 flex items-center justify-center">
              <Bell className="w-6 h-6 text-[#D4A574]" />
            </div>
          </div>
        </div>

        <div className="bg-[#121212] border border-[#D4A574] rounded-lg p-4 shadow-lg shadow-blue-500/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#8B8B8B] text-xs mb-1">Unread</p>
              <p className="text-white text-2xl">{unreadCount}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-400 bg-opacity-20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-[#121212] border border-[#D4A574] rounded-lg p-4 shadow-lg shadow-green-500/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#8B8B8B] text-xs mb-1">Read</p>
              <p className="text-white text-2xl">{notifications.length - unreadCount}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-green-400 bg-opacity-20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-[#121212] border border-[#D4A574] rounded-lg p-4 shadow-lg shadow-red-500/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#8B8B8B] text-xs mb-1">High Priority</p>
              <p className="text-white text-2xl">{notifications.filter(n => n.priority === 'high').length}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-red-400 bg-opacity-20 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Add Notification Form */}
      {showAddForm && (
        <div className="bg-[#121212] border border-[#D4A574] rounded-lg p-6 mb-6 shadow-lg shadow-[#D4A574]/10">
          <h3 className="text-white mb-4">Create New Notification</h3>
          <form onSubmit={handleAddNotification} className="space-y-4">
            <div>
              <label className="text-[#B8B8B8] block mb-2 text-xs">Title</label>
              <input
                type="text"
                value={newNotification.title}
                onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#D4A574] rounded-lg text-white text-xs focus:border-[#D4A574] focus:ring-1 focus:ring-[#D4A574] transition-all"
                placeholder="Notification title"
                style={{ fontSize: '11px' }}
                required
              />
            </div>

            <div>
              <label className="text-[#B8B8B8] block mb-2 text-xs">Message</label>
              <textarea
                value={newNotification.message}
                onChange={(e) => setNewNotification({ ...newNotification, message: e.target.value })}
                className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#D4A574] rounded-lg text-white text-xs focus:border-[#D4A574] focus:ring-1 focus:ring-[#D4A574] transition-all resize-none"
                placeholder="Notification message"
                rows={3}
                style={{ fontSize: '11px' }}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[#B8B8B8] block mb-2 text-xs">Type</label>
                <select
                  value={newNotification.type}
                  onChange={(e) => setNewNotification({ ...newNotification, type: e.target.value as any })}
                  className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#D4A574] rounded-lg text-white text-xs focus:border-[#D4A574] focus:ring-1 focus:ring-[#D4A574] transition-all"
                  style={{ fontSize: '11px' }}
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="success">Success</option>
                  <option value="alert">Alert</option>
                </select>
              </div>

              <div>
                <label className="text-[#B8B8B8] block mb-2 text-xs">Priority</label>
                <select
                  value={newNotification.priority}
                  onChange={(e) => setNewNotification({ ...newNotification, priority: e.target.value as any })}
                  className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#D4A574] rounded-lg text-white text-xs focus:border-[#D4A574] focus:ring-1 focus:ring-[#D4A574] transition-all"
                  style={{ fontSize: '11px' }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-2 bg-[#D4A574] text-[#0a0a0a] rounded-lg hover:bg-[#C9955E] transition-colors font-semibold"
              >
                Create Notification
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-6 py-2 bg-[#1a1a1a] text-white border border-[#D4A574] rounded-lg hover:bg-[#2a2a2a] transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.map((notification) => {
          const { isApproaching, isTriggered } = notification.eventTime ? getTimeUntilEvent(notification.eventTime) : { isApproaching: false, isTriggered: false };
          const countdownText = notification.eventTime ? getCountdownText(notification.eventTime) : '';
          
          return (
            <div
              key={notification.id}
              className={`bg-[#121212] border border-[#D4A574] border-l-4 ${getNotificationBorderColor(notification.type)} rounded-lg p-4 shadow-lg transition-all ${
                isTriggered 
                  ? 'shadow-red-500/50 ring-1 ring-red-500 bg-red-500/5'
                  : isApproaching
                  ? 'shadow-yellow-500/50 ring-1 ring-yellow-500/50 bg-yellow-500/5'
                  : 'shadow-[#D4A574]/10'
              } ${!notification.read ? 'bg-opacity-100' : 'bg-opacity-50'}`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  {isTriggered ? (
                    <Zap className="w-5 h-5 text-red-500 animate-pulse" />
                  ) : isApproaching ? (
                    <AlertCircle className="w-5 h-5 text-yellow-500 animate-pulse" />
                  ) : (
                    getNotificationIcon(notification.type)
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className={`${!notification.read ? 'text-white' : 'text-[#B8B8B8]'} ${isTriggered ? 'text-red-400 font-bold' : isApproaching ? 'text-yellow-400 font-semibold' : ''}`}>
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <span className="w-2 h-2 rounded-full bg-[#D4A574] animate-pulse"></span>
                        )}
                        {isTriggered && (
                          <span className="text-xs px-2 py-0.5 rounded bg-red-500 text-white font-semibold animate-pulse">
                            NOW
                          </span>
                        )}
                        {isApproaching && (
                          <span className="text-xs px-2 py-0.5 rounded bg-yellow-500 text-black font-semibold">
                            Approaching
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          notification.priority === 'high' 
                            ? 'bg-red-400 bg-opacity-20 text-red-400'
                            : notification.priority === 'medium'
                            ? 'bg-yellow-400 bg-opacity-20 text-yellow-400'
                            : 'bg-[#8B8B8B] bg-opacity-20 text-[#8B8B8B]'
                        }`}>
                          {notification.priority}
                        </span>
                      </div>
                      <p className="text-[#B8B8B8] text-xs mb-2">{notification.message}</p>
                      <div className="flex items-center gap-4 text-[#8B8B8B] text-xs">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          <span>{notification.timestamp}</span>
                        </div>
                        {notification.eventTime && (
                          <div className={`flex items-center gap-2 font-semibold ${
                            isTriggered ? 'text-red-400' : isApproaching ? 'text-yellow-400' : 'text-[#8B8B8B]'
                          }`}>
                            <Zap className="w-3 h-3" />
                            <span>{countdownText}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-2 rounded hover:bg-green-500 hover:bg-opacity-20 transition-colors group"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4 text-[#8B8B8B] group-hover:text-green-400" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-2 rounded hover:bg-red-500 hover:bg-opacity-20 transition-colors group"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-[#8B8B8B] group-hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {notifications.length === 0 && (
        <div className="bg-[#121212] border border-[#D4A574] rounded-lg p-12 text-center shadow-lg shadow-[#D4A574]/10">
          <Bell className="w-16 h-16 text-[#8B8B8B] mx-auto mb-4" />
          <h3 className="text-white mb-2">No Notifications</h3>
          <p className="text-[#8B8B8B]">You're all caught up!</p>
        </div>
      )}
    </div>
  );
}
