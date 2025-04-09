
import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
  requiredPermission?: string;
}

const AuthGuard = ({ children, requiredPermission }: AuthGuardProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(true);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser();
      const isAuthed = !!data.user;
      setIsAuthenticated(isAuthed);
      
      // If we need to check permissions and the user is authenticated
      if (requiredPermission && isAuthed && data.user) {
        try {
          // Get the team member record to check permissions
          const { data: teamMember, error } = await supabase
            .from('team_members')
            .select('permissions, role')
            .eq('user_id', data.user.id)
            .single();
            
          if (error && error.code !== 'PGRST116') {
            console.error('Error checking permissions:', error);
            setHasPermission(false);
            return;
          }
          
          // Admin role has all permissions
          if (teamMember?.role === 'admin') {
            setHasPermission(true);
            return;
          }
          
          // Check if the user has the required permission
          const hasRequiredPermission = teamMember?.permissions 
            ? !!teamMember.permissions[requiredPermission as keyof typeof teamMember.permissions]
            : false;
            
          setHasPermission(hasRequiredPermission);
        } catch (error) {
          console.error('Error in permission check:', error);
          setHasPermission(false);
        }
      }
    };
    
    checkAuth();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [requiredPermission]);

  if (isAuthenticated === null) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/splash" state={{ from: location }} replace />;
  }
  
  if (requiredPermission && !hasPermission) {
    return <Navigate to="/" state={{ from: location, permissionDenied: true }} replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;
