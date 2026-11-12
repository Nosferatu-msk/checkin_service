import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import RoleBasedRoute from './components/RoleBasedRoute';
import Layout from './components/Layout/Layout';
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ObjectsPage from './pages/objects/ObjectsPage';
import ZonesPage from './pages/zones/ZonesPage';
import BeaconsPage from './pages/beacons/BeaconsPage';
import ContractsPage from './pages/contracts/ContractsPage';
import UsersPage from './pages/users/UsersPage';
import AttendancePage from './pages/attendance/AttendancePage';
import SLAPage from './pages/sla/SLAPage';
import FraudPage from './pages/fraud/FraudPage';
import ReportsPage from './pages/reports/ReportsPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import SettingsPage from './pages/settings/SettingsPage';
import ProfilePage from './pages/profile/ProfilePage';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route
          path="objects"
          element={
            <RoleBasedRoute allowedRoles={['admin', 'curator']}>
              <ObjectsPage />
            </RoleBasedRoute>
          }
        />
        <Route
          path="zones"
          element={
            <RoleBasedRoute allowedRoles={['admin', 'curator']}>
              <ZonesPage />
            </RoleBasedRoute>
          }
        />
        <Route
          path="beacons"
          element={
            <RoleBasedRoute allowedRoles={['admin', 'curator']}>
              <BeaconsPage />
            </RoleBasedRoute>
          }
        />
        <Route
          path="contracts"
          element={
            <RoleBasedRoute allowedRoles={['admin', 'curator']}>
              <ContractsPage />
            </RoleBasedRoute>
          }
        />
        <Route
          path="employees"
          element={
            <RoleBasedRoute allowedRoles={['admin', 'curator']}>
              <UsersPage />
            </RoleBasedRoute>
          }
        />
        <Route path="attendance" element={<AttendancePage />} />
        <Route
          path="sla"
          element={
            <RoleBasedRoute allowedRoles={['admin', 'curator']}>
              <SLAPage />
            </RoleBasedRoute>
          }
        />
        <Route
          path="fraud"
          element={
            <RoleBasedRoute allowedRoles={['admin']}>
              <FraudPage />
            </RoleBasedRoute>
          }
        />
        <Route
          path="reports"
          element={
            <RoleBasedRoute allowedRoles={['admin', 'curator']}>
              <ReportsPage />
            </RoleBasedRoute>
          }
        />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route
          path="settings"
          element={
            <RoleBasedRoute allowedRoles={['admin']}>
              <SettingsPage />
            </RoleBasedRoute>
          }
        />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="forbidden" element={<div>Доступ запрещен</div>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
