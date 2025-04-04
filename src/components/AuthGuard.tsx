
import { useEffect, useState, ReactNode } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuthGuardProps {
  children: ReactNode;
}

const AuthGuard = ({ children }: AuthGuardProps) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [hasTeam, setHasTeam] = useState(true); // Assume they have a team initially
  const [checkingTeam, setCheckingTeam] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      const isAuthenticated = !!data.session;
      setAuthenticated(isAuthenticated);
      
      if (isAuthenticated) {
        // Check if user is in a team (only for protected pages, not Management)
        if (location.pathname !== '/management') {
          try {
            // Using direct selection instead of joins to avoid recursion
            const { data: teamMembers, error } = await supabase
              .from('team_members')
              .select('id') // Just need to know if any records exist
              .eq('user_id', data.session?.user.id)
              .limit(1);
            
            if (error) {
              console.error('Error checking team membership:', error);
            } else {
              setHasTeam(teamMembers && teamMembers.length > 0);
            }
          } catch (err) {
            console.error('Error checking team:', err);
          }
        }
      }
      
      setCheckingTeam(false);
      setLoading(false);
    };
    
    checkAuth();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthenticated(!!session);
      setLoading(false);
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [location.pathname]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // If we checked team status and there's no team, and we're not on the management page
  if (!checkingTeam && !hasTeam && location.pathname !== '/management') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Alert variant="destructive" className="max-w-md mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Je moet eerst een team aanmaken</AlertTitle>
          <AlertDescription>
            Voordat je fooi en uren kunt registreren, moet je eerst een team aanmaken of lid worden van een team.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/management')}>
          Naar Teambeheer
        </Button>
      </div>
    );
  }
  
  return <>{children}</>;
};

export default AuthGuard;
