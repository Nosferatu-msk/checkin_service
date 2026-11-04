import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import RoleBasedRoute from './components/RoleBasedRoute';
import Layout from './components/Layout/Layout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ObjectsPage from './pages/objects/ObjectsPage';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
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
              <div>Zones Page (TODO)</div>
            </RoleBasedRoute>
          }
        />
        <Route
          path="beacons"
          element={
            <RoleBasedRoute allowedRoles={['admin', 'curator']}>
              <div>Beacons Page (TODO)</div>
            </RoleBasedRoute>
          }
        />
        <Route
          path="contracts"
          element={
            <RoleBasedRoute allowedRoles={['admin', 'curator']}>
              <div>Contracts Page (TODO)</div>
            </RoleBasedRoute>
          }
        />
        <Route
          path="employees"
          element={
            <RoleBasedRoute allowedRoles={['admin', 'curator']}>
              <div>Employees Page (TODO)</div>
            </RoleBasedRoute>
          }
        />
        <Route path="attendance" element={<div>Attendance Page (TODO)</div>} />
        <Route
          path="sla"
          element={
            <RoleBasedRoute allowedRoles={['admin', 'curator']}>
              <div>SLA Page (TODO)</div>
            </RoleBasedRoute>
          }
        />
        <Route
          path="fraud"
          element={
            <RoleBasedRoute allowedRoles={['admin']}>
              <div>Fraud Page (TODO)</div>
            </RoleBasedRoute>
          }
        />
        <Route path="notifications" element={<div>Notifications Page (TODO)</div>} />
        <Route
          path="settings"
          element={
            <RoleBasedRoute allowedRoles={['admin']}>
              <div>Settings Page (TODO)</div>
            </RoleBasedRoute>
          }
        />
        <Route path="profile" element={<div>Profile Page (TODO)</div>} />
        <Route path="forbidden" element={<div>Доступ запрещен</div>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
