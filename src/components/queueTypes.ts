// Queue and Appointment Management System
// This handles the complete patient flow from appointment booking through discharge

export type AppointmentStatus = 'booked' | 'reception_pending' | 'reception_completed' | 'opd_pending' | 'opd_completed' | 'doctor_pending' | 'doctor_completed' | 'discharged';

export interface QueuedPatient {
  _id: string;
  appointmentId: string;
  patientName: string;
  patientRegistrationId: string;
  doctorId: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  status: AppointmentStatus;
  
  // Queue positions
  receptionQueuePosition?: number;
  opdQueuePosition?: number;
  doctorQueuePosition?: number;
  
  // Timestamps for tracking
  bookedAt: string;
  receivedByReceptionAt?: string;
  completedByReceptionAt?: string;
  receivedByOpdAt?: string;
  completedByOpdAt?: string;
  receivedByDoctorAt?: string;
  completedByDoctorAt?: string;
  dischargedAt?: string;
  
  // Data autofilled from previous stages
  receptionNotes?: string;
  opdFindings?: Record<string, any>;
  doctorFindings?: Record<string, any>;
  
  // Contact info
  phone?: string;
  email?: string;
}

export interface QueueMetrics {
  totalAppointments: number;
  receptionQueue: number;
  opdQueue: number;
  doctorQueue: number;
  completedToday: number;
  averageWaitTime: number;
}
