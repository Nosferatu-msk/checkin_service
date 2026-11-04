export interface User {
  id: string;
  login: string;
  email: string;
  full_name: string;
  role: 'admin' | 'curator' | 'employee';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  login: string;
  password: string;
  device_fingerprint: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}
