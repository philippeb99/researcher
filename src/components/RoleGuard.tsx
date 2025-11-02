import { ReactNode } from 'react';
import { useUserRole, UserRole } from '@/hooks/useUserRole';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  fallback?: ReactNode;
  mode?: 'alert' | 'hide' | 'disable';
}

const RoleGuard = ({ children, allowedRoles, fallback, mode = 'alert' }: RoleGuardProps) => {
  const { role, loading } = useUserRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!role || !allowedRoles.includes(role)) {
    if (mode === 'hide') {
      return null;
    }
    
    if (mode === 'disable') {
      return (
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
      );
    }
    
    // mode === 'alert' (default)
    return fallback || (
      <Alert variant="destructive" className="m-4">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to access this resource.
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
};

export default RoleGuard;