// Store
export { store } from './store';
export type { RootState, AppDispatch } from './store';

// API Slice - RTK Query
export { apiSlice } from './api/apiSlice';
export * from './api/apiSlice';

// Auth Slice
export { default as authReducer } from './slices/authSlice';
export * from './slices/authSlice';

// UI Slices - Reducers
export { default as notificationsReducer } from './slices/notificationsSlice';
export { default as objectsReducer } from './slices/objectsSlice';
export { default as zonesReducer } from './slices/zonesSlice';
export { default as beaconsReducer } from './slices/beaconsSlice';
export { default as contractsReducer } from './slices/contractsSlice';
export { default as usersReducer } from './slices/usersSlice';
export { default as attendanceReducer } from './slices/attendanceSlice';
export { default as slaReducer } from './slices/slaSlice';
export { default as fraudReducer } from './slices/fraudSlice';

// Notifications Slice Actions
export {
  setUnreadCount,
  updateFromNotifications,
  decrementUnreadCount,
  resetUnreadCount,
} from './slices/notificationsSlice';

// Objects Slice Actions
export {
  setSelectedObjectId,
  setFilters as setObjectsFilters,
  clearFilters as clearObjectsFilters,
  setSorting as setObjectsSorting,
} from './slices/objectsSlice';

// Zones Slice Actions
export {
  setSelectedZoneId,
  setFilters as setZonesFilters,
  clearFilters as clearZonesFilters,
  setSorting as setZonesSorting,
} from './slices/zonesSlice';

// Beacons Slice Actions
export {
  setSelectedBeaconId,
  setFilters as setBeaconsFilters,
  clearFilters as clearBeaconsFilters,
  setSorting as setBeaconsSorting,
} from './slices/beaconsSlice';

// Contracts Slice Actions
export {
  setSelectedContractId,
  setFilters as setContractsFilters,
  clearFilters as clearContractsFilters,
  setSorting as setContractsSorting,
} from './slices/contractsSlice';

// Users Slice Actions
export {
  setSelectedUserId,
  setFilters as setUsersFilters,
  clearFilters as clearUsersFilters,
  setSorting as setUsersSorting,
} from './slices/usersSlice';

// Attendance Slice Actions
export {
  setFilters as setAttendanceFilters,
  clearFilters as clearAttendanceFilters,
  setSorting as setAttendanceSorting,
  setViewMode,
} from './slices/attendanceSlice';

// SLA Slice Actions
export {
  setFilters as setSlaFilters,
  clearFilters as clearSlaFilters,
  setSorting as setSlaSorting,
  setActiveTab,
} from './slices/slaSlice';

// Fraud Slice Actions
export {
  setFilters as setFraudFilters,
  clearFilters as clearFraudFilters,
  setSorting as setFraudSorting,
  setSelectedAlertId,
} from './slices/fraudSlice';
