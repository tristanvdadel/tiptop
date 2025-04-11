
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

    // Set up auth state listener FIRST to catch all auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      console.log('Auth state changed:', _event, newSession ? 'User logged in' : 'No session');
      
      if (mounted) {
        setSession(newSession);
        setIsLoading(false);
      }
    });

    // THEN check for existing session, but only set state if we don't already have a session
    const getInitialSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        console.log('Initial session check:', data.session ? 'Session found' : 'No session found');
        
        // Only update if mounted and we don't have a session yet (avoid unnecessary rerenders)
        if (mounted && !session) {
          setSession(data.session);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error getting session:', error);
        if (mounted) setIsLoading(false);
      }
    };

    getInitialSession();

    // Set a shorter timeout as a fallback (2 seconds instead of 5)
    const timeoutId = setTimeout(() => {
      if (mounted && isLoading) {
        console.log('Forced loading state to end after timeout');
        setIsLoading(false);
      }
    }, 2000);

    return () => {
      mounted = false;
      subscription?.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  // Only show loading state for a maximum of 2 seconds
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
    navigate('/login');
    return null;
  }

  return <>{children}</>;
};

export default AuthGuard;
