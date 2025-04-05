
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
      try {
        const { data } = await supabase.auth.getSession();
        const isAuthenticated = !!data.session;
        setAuthenticated(isAuthenticated);
        
        if (isAuthenticated && location.pathname !== '/management') {
          // We zorgen ervoor dat we geen query uitvoeren die een oneindige recursie kan veroorzaken
          // Door expliciet alleen de count op te halen zonder joins of referenties naar dezelfde tabel
          try {
            const { count, error } = await supabase
              .from('team_members')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', data.session?.user.id);
            
            if (error) {
              console.error('Error checking team membership:', error);
              setHasTeam(false);
            } else {
              // Count kan null zijn als er geen rijen zijn
              setHasTeam(count ? count > 0 : false);
            }
          } catch (err) {
            console.error('Error checking team:', err);
            setHasTeam(false);
          } finally {
            setCheckingTeam(false);
          }
        } else {
          setCheckingTeam(false);
        }
      } catch (err) {
        console.error('Error checking authentication:', err);
        setAuthenticated(false);
        setCheckingTeam(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthenticated(!!session);
      if (!session) {
        setLoading(false);
        setCheckingTeam(false);
      }
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
