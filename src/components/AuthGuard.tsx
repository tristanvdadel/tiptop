
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    let initialCheckComplete = false;

    // Set up auth state listener FIRST to catch all auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      console.log('Auth state changed:', _event, newSession ? 'User logged in' : 'No session');
      
      if (mounted) {
        setSession(newSession);
        setIsLoading(false);
        initialCheckComplete = true; // Mark initial check as complete
      }
    });

    // THEN check for existing session, but only set state if we don't already have a session
    const getInitialSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        console.log('Initial session check:', data.session ? 'Session found' : 'No session found');
        
        // Only update if mounted and initial check from auth change event hasn't completed
        if (mounted && !initialCheckComplete) {
          setSession(data.session);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error getting session:', error);
        if (mounted) setIsLoading(false);
      }
    };

    // Start initial session check
    getInitialSession();
    
    // Set a shorter timeout as a fallback (1 second instead of 2)
    const timeoutId = setTimeout(() => {
      if (mounted && isLoading) {
        console.log('Forced loading state to end after timeout');
        setIsLoading(false);
      }
    }, 1000);

    return () => {
      mounted = false;
      subscription?.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  // Only show loading state for a maximum of 1 second
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  // Use session check for protecting routes
  if (!session && location.pathname !== '/splash' && location.pathname !== '/login' && !location.pathname.startsWith('/fast-tip')) {
    console.log('No session, redirecting to login from:', location.pathname);
    navigate('/login', { replace: true }); // Use replace to prevent history stacking
    return null;
  }

  return <>{children}</>;
};

export default AuthGuard;
