import { ReactNode } from 'react';
import { useAuth } from '../lib/auth';
import type { UserRole } from '../types/user';

interface CanAccessProps {
  roles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

const CanAccess = ({ roles, children, fallback = null }: CanAccessProps) => {
  const { user } = useAuth();

  // Se não tiver user ou role, bloqueia
  if (!user || !roles.includes(user.role)) {
    return <>{fallback}</>;
  }

  // Renderiza os filhos caso tenha permissão
  return <>{children}</>;
};

export default CanAccess;