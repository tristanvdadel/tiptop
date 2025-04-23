
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Define public routes that don't require authentication
  const isPublicRoute = location.pathname === '/splash' || 
                        location.pathname === '/login' || 
                        location.pathname.startsWith('/fast-tip');
                      
  useEffect(() => {
    let mounted = true;
    
    // Setup auth state listener for all auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('Auth state changed:', event);
      
      if (mounted) {
        setSession(newSession);
        setIsLoading(false);
        
        // Handle logout events
        if (event === 'SIGNED_OUT') {
          // Clear all cached data
          localStorage.removeItem('sb-auth-token-cached');
          localStorage.removeItem('login_attempt_time');
          localStorage.removeItem('last_team_id');
          
          const teamIds = Object.keys(localStorage).filter(key => key.startsWith('team_data_'));
          teamIds.forEach(key => localStorage.removeItem(key));
        }
      }
    });

    // Initial session check
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            setIsLoading(false);
          }
          return;
        }
        
        if (mounted) {
          setSession(data.session);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Unexpected error in session check:', error);
        if (mounted) setIsLoading(false);
      }
    };
    
    // Start session check immediately
    checkSession();

    // Safety timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (mounted && isLoading) {
        console.log("Session check timeout - forcing completion");
        setIsLoading(false);
      }
    }, 2000);
    
    return () => {
      mounted = false;
      subscription?.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  // Handle redirect if needed
  useEffect(() => {
    // Only redirect if we're done loading and have no session
    if (!isLoading && !session && !isPublicRoute) {
      console.log('No session, redirecting to login from:', location.pathname);
      
      // Check for recursion error in URL params
      const urlParams = new URLSearchParams(location.search);
      const hasRecursionError = urlParams.get('error') === 'recursion';
      
      // Show toast for recursion errors
      if (hasRecursionError) {
        // Clear localStorage to prevent issues
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('team_data_') || 
              key.includes('analytics_') || 
              key.includes('sb-') ||
              key === 'last_team_id' ||
              key === 'login_attempt_time') {
            localStorage.removeItem(key);
          }
        });
        
        navigate('/login', { 
          replace: true, 
          state: { 
            message: "Je bent uitgelogd vanwege een database beveiligingsprobleem. Inloggen zou dit probleem moeten oplossen door een nieuwe sessie aan te maken."
          } 
        });
        
        toast({
          title: "Database beveiligingsprobleem gedetecteerd",
          description: "Probeer opnieuw in te loggen om het database beveiligingsprobleem op te lossen.",
          variant: "destructive",
          duration: 5000
        });
      } else {
        // Regular redirect
        navigate('/login', { replace: true });
      }
    }
  }, [isLoading, session, isPublicRoute, navigate, location.pathname, location.search, toast]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-amber-50/30 to-amber-100/30">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500 mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">Laden...</p>
        </div>
      </div>
    );
  }

  // Don't render children during redirect
  if (!isLoading && !session && !isPublicRoute) {
    return null;
  }

  return <>{children}</>;
};

export default AuthGuard;
