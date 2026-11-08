import { Navigate } from 'react-router-dom';
import { useAppSelector } from '@/hooks/redux';
import { User } from '@/types/auth';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles: User['role'][];
}

const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
};

export default RoleBasedRoute;
