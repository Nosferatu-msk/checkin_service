// Object types
export interface Object {
  id: string;
  name: string;
  address: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ObjectCreateRequest {
  name: string;
  address: string;
  description?: string;
}

export interface ObjectUpdateRequest extends Partial<ObjectCreateRequest> {
  is_active?: boolean;
}

// Zone types
export interface Zone {
  id: string;
  object_id: string;
  name: string;
  type: 'entry' | 'exit' | 'work' | 'restricted';
  geometry?: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ZoneCreateRequest {
  object_id: string;
  name: string;
  type: 'entry' | 'exit' | 'work' | 'restricted';
  geometry?: any;
}

export interface ZoneUpdateRequest extends Partial<ZoneCreateRequest> {
  is_active?: boolean;
}

// Beacon types
export interface Beacon {
  id: string;
  zone_id: string;
  name: string;
  uuid: string;
  major: number;
  minor: number;
  battery_level?: number;
  is_active: boolean;
  last_seen_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BeaconCreateRequest {
  zone_id: string;
  name: string;
  uuid: string;
  major: number;
  minor: number;
}

export interface BeaconUpdateRequest extends Partial<BeaconCreateRequest> {
  is_active?: boolean;
}

// Contract types
export interface Contract {
  id: string;
  object_id: string;
  contractor_name: string;
  contract_number: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'terminated';
  created_at: string;
  updated_at: string;
}

export interface ContractCreateRequest {
  object_id: string;
  contractor_name: string;
  contract_number: string;
  start_date: string;
  end_date: string;
}

export interface ContractUpdateRequest extends Partial<ContractCreateRequest> {
  status?: 'active' | 'expired' | 'terminated';
}

// User types (extends auth User)
export interface UserExtended {
  id: string;
  login: string;
  email: string;
  full_name: string;
  role: 'admin' | 'curator' | 'employee';
  is_active: boolean;
  phone?: string;
  position?: string;
  created_at: string;
  updated_at: string;
}

export interface UserCreateRequest {
  login: string;
  email: string;
  full_name: string;
  role: 'admin' | 'curator' | 'employee';
  password: string;
  phone?: string;
  position?: string;
}

export interface UserUpdateRequest {
  email?: string;
  full_name?: string;
  role?: 'admin' | 'curator' | 'employee';
  phone?: string;
  position?: string;
  is_active?: boolean;
}

// Attendance types
export interface Attendance {
  id: string;
  user_id: string;
  object_id: string;
  zone_id?: string;
  check_in_time: string;
  check_out_time?: string;
  status: 'present' | 'late' | 'absent' | 'left_early';
  verification_method: 'beacon' | 'manual' | 'qrcode';
  created_at: string;
  updated_at: string;
}

export interface AttendanceFilters {
  object_id?: string;
  user_id?: string;
  date_from?: string;
  date_to?: string;
  status?: string;
}

// SLA types
export interface SLAViolation {
  id: string;
  object_id: string;
  user_id: string;
  violation_type: 'late' | 'absent' | 'left_early' | 'unauthorized';
  occurred_at: string;
  severity: 'low' | 'medium' | 'high';
  status: 'pending' | 'reviewed' | 'resolved';
  reviewed_by?: string;
  reviewed_at?: string;
  notes?: string;
  created_at: string;
}

export interface SLARequirement {
  id: string;
  object_id: string;
  name: string;
  description: string;
  threshold: number;
  metric_type: 'attendance_rate' | 'punctuality' | 'work_hours';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Fraud types
export interface FraudAlert {
  id: string;
  user_id: string;
  object_id: string;
  alert_type: 'location_mismatch' | 'time_anomaly' | 'device_mismatch' | 'buddy_punching';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'investigating' | 'resolved' | 'dismissed';
  details: any;
  reviewed_by?: string;
  reviewed_at?: string;
  resolution_notes?: string;
  created_at: string;
}

export interface FraudReviewRequest {
  status: 'investigating' | 'resolved' | 'dismissed';
  resolution_notes?: string;
}

// Notification types
export interface Notification {
  id: string;
  user_id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  body: string;
  is_read: boolean;
  link?: string;
  created_at: string;
}
