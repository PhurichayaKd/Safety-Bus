// Student related types
export interface Student {
  id: number;
  name: string;
  grade?: string;
  // rfid_tag ถูกย้ายไปเก็บใน rfid_card_assignments และ rfid_cards แล้ว
  parent_phone?: string;
  student_phone?: string;
  pickup_location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  dropoff_location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  route_id?: number;
  distance?: number;
  rfid_card_assignments?: SupabaseRfidCardAssignment[];
}

export interface StudentWithGeo extends Student {
  pickup_location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  dropoff_location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  distance: number;
  // Additional properties for map compatibility
  lat?: number;
  lng?: number;
  student_number?: string;
}

// Boarding status types - Updated to match service interface
export interface BoardingStatus {
  student_id: string;
  student_name: string;
  phase: 'go' | 'return' | 'at_school';
  status: 'boarded' | 'not_boarded' | 'absent';
  boarding_time?: string;
  location?: string;
}

export interface BoardingStatusWithStudent extends BoardingStatus {
  student: Student;
}

// RFID Card related types
export interface RfidCard {
  card_id: number;
  rfid_code: string;
  is_active?: boolean;
  status?: string;
  created_at?: string;
  last_seen_at?: string;
}

export interface RfidCardAssignment {
  card_id: number;
  student_id: number;
  valid_from: string;
  valid_to?: string;
  assigned_by?: number;
  is_active: boolean;
  rfid_cards: RfidCard;
}

// Interface for nested Supabase query result
export interface SupabaseRfidCardAssignment {
  is_active: boolean;
  rfid_cards: {
    rfid_code: string;
  } | null;
}

// RFID scan event types - Updated to match service interface
export interface RFIDScanEvent {
  student_id: number;
  boarding_status: 'onboard' | 'offboard';
  phase: 'go' | 'return' | 'at_school';
  scan_time: string;
  rfid_code: string; // เปลี่ยนจาก rfid_tag เป็น rfid_code
  // Additional properties used in the code
  status: 'onboard' | 'offboard';
  timestamp: string;
  location?: string;
}

// PDD (Pickup/Dropoff/Destination) event types
export type PDDEventType = 'pickup' | 'dropoff' | 'destination';

export interface PDDEvent {
  id: string;
  student_id: number;
  event_type: PDDEventType;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  driver_id?: number;
  route_id?: number;
  notes?: string;
}

// Route related types
export interface Route {
  id: number;
  name: string;
  description?: string;
  driver_id?: number;
  vehicle_id?: number;
  start_time?: string;
  end_time?: string;
  status: 'active' | 'inactive' | 'completed';
  created_at: string;
  updated_at: string;
}

// Driver related types
export interface Driver {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  license_number?: string;
  vehicle_id?: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

// Vehicle related types
export interface Vehicle {
  id: number;
  license_plate: string;
  model?: string;
  capacity?: number;
  driver_id?: number;
  status: 'active' | 'maintenance' | 'inactive';
  created_at: string;
  updated_at: string;
}

// Location related types
export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  timestamp?: string;
}

export interface BusLocation extends Location {
  driver_id: number;
  route_id?: number;
  speed?: number;
  heading?: number;
}

// Notification types
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
  read: boolean;
  student_id?: number;
  driver_id?: number;
  route_id?: number;
}

// Leave request types
export interface LeaveRequest {
  id: number;
  student_id: number;
  date: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

// API response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Real-time subscription types
export interface SubscriptionPayload<T = any> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: T;
  schema: string;
  table: string;
  commit_timestamp: string;
}

// Map related types
export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  type: 'student' | 'bus' | 'pickup' | 'dropoff';
  status?: string;
}

// Statistics types
export interface StudentStatistics {
  total: number;
  boarded: number;
  not_boarded: number;
  absent: number;
  picked_up?: number;
  dropped_off?: number;
}

export interface RouteStatistics extends StudentStatistics {
  route_id: number;
  route_name: string;
  completion_percentage: number;
  estimated_time?: string;
  actual_time?: string;
}

// Form types
export interface StudentFormData {
  name: string;
  grade?: string;
  rfid_code?: string; // เปลี่ยนจาก rfid_tag เป็น rfid_code
  parent_phone?: string;
  student_phone?: string;
  pickup_address?: string;
  dropoff_address?: string;
  route_id?: number;
}

export interface DriverFormData {
  name: string;
  phone?: string;
  email?: string;
  license_number?: string;
  vehicle_id?: number;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// Settings types
export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  language: 'th' | 'en';
  notifications_enabled: boolean;
  location_tracking: boolean;
  auto_refresh_interval: number;
  map_zoom_level: number;
}

// Authentication types
export interface AuthUser {
  id: string;
  email: string;
  role: 'driver' | 'admin' | 'parent';
  profile?: {
    name: string;
    phone?: string;
    avatar_url?: string;
  };
}

export interface AuthSession {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}