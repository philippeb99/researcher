import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

const AuthGuard = ({ children, requireAuth = true }: AuthGuardProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (requireAuth && !user) {
        // User needs to be authenticated but isn't
        navigate("/auth");
      } else if (!requireAuth && user) {
        // User shouldn't be authenticated but is
        navigate("/");
      }
    }
  }, [user, loading, navigate, requireAuth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show content if auth requirements are met
  if (requireAuth && user) return <>{children}</>;
  if (!requireAuth && !user) return <>{children}</>;

  // Otherwise show loading while redirecting
  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
};

export default AuthGuard;
