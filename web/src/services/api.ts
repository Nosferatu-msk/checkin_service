import api from './authService';

// Objects API
export const objectsApi = {
  getAll: () => api.get('/admin/objects'),
  getById: (id: string) => api.get(`/admin/objects/${id}`),
  create: (data: any) => api.post('/admin/objects', data),
  update: (id: string, data: any) => api.put(`/admin/objects/${id}`, data),
  delete: (id: string) => api.delete(`/admin/objects/${id}`),
};

// Zones API
export const zonesApi = {
  getAll: (params?: any) => api.get('/admin/zones', { params }),
  getById: (id: string) => api.get(`/admin/zones/${id}`),
  create: (data: any) => api.post('/admin/zones', data),
  update: (id: string, data: any) => api.put(`/admin/zones/${id}`, data),
  delete: (id: string) => api.delete(`/admin/zones/${id}`),
};

// Beacons API
export const beaconsApi = {
  getAll: (params?: any) => api.get('/admin/beacons', { params }),
  getById: (id: string) => api.get(`/admin/beacons/${id}`),
  create: (data: any) => api.post('/admin/beacons', data),
  update: (id: string, data: any) => api.put(`/admin/beacons/${id}`, data),
  deactivate: (id: string) => api.post(`/admin/beacons/${id}/deactivate`),
};

// Contracts API
export const contractsApi = {
  getAll: () => api.get('/admin/contracts'),
  getById: (id: string) => api.get(`/admin/contracts/${id}`),
  create: (data: any) => api.post('/admin/contracts', data),
  update: (id: string, data: any) => api.put(`/admin/contracts/${id}`, data),
  delete: (id: string) => api.delete(`/admin/contracts/${id}`),
};

// Users API
export const usersApi = {
  getAll: (params?: any) => api.get('/admin/users', { params }),
  getById: (id: string) => api.get(`/admin/users/${id}`),
  create: (data: any) => api.post('/admin/users', data),
  update: (id: string, data: any) => api.put(`/admin/users/${id}`, data),
  deactivate: (id: string) => api.post(`/admin/users/${id}/deactivate`),
};

// Attendance API
export const attendanceApi = {
  getAll: (params?: any) => api.get('/admin/attendance', { params }),
  getMyAttendance: (params?: any) => api.get('/mobile/my-attendance', { params }),
};

// SLA API
export const slaApi = {
  getViolations: (params?: any) => api.get('/admin/sla/violations', { params }),
  getRequirements: (params?: any) => api.get('/admin/sla/requirements', { params }),
};

// Fraud API
export const fraudApi = {
  getAll: (params?: any) => api.get('/admin/fraud', { params }),
  review: (id: string, data: any) => api.post(`/admin/fraud/${id}/review`, data),
};

// Notifications API
export const notificationsApi = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/mark-all-read'),
  delete: (id: string) => api.delete(`/notifications/${id}`),
};
