
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
        
        // Only end loading here if we actually got a definitive answer
        if (_event === 'SIGNED_IN' || _event === 'SIGNED_OUT' || _event === 'TOKEN_REFRESHED') {
          setIsLoading(false);
          initialCheckComplete = true;
        }
      }
    });

    // THEN check for existing session, but only set state if we don't already have a session
    const getInitialSession = async () => {
      try {
        console.log('Performing fast session check');
        const { data, error } = await supabase.auth.getSession();
        console.log('Initial session check:', data.session ? 'Session found' : 'No session found');
        
        if (error) {
          console.error('Error getting session:', error);
        }
        
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
    
    // Set a shorter timeout as a fallback - reduce from 800ms to 500ms
    const timeoutId = setTimeout(() => {
      if (mounted && isLoading) {
        console.log('Session check timeout - forcing completion');
        setIsLoading(false);
      }
    }, 500); // Reduced from 800ms to 500ms for faster fallback

    return () => {
      mounted = false;
      subscription?.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  // Avoid updating state during render - use local variables instead
  const isPublicRoute = location.pathname === '/splash' || 
                        location.pathname === '/login' || 
                        location.pathname.startsWith('/fast-tip');
                        
  const needsRedirect = !isLoading && !session && !isPublicRoute;

  // Handle redirect if needed
  useEffect(() => {
    if (needsRedirect) {
      console.log('No session, redirecting to login from:', location.pathname);
      navigate('/login', { replace: true });
    }
  }, [needsRedirect, navigate, location.pathname]);

  // Only show loading state for a maximum of 500 milliseconds
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  // Don't return children until we've redirected if needed
  if (needsRedirect) {
    return null;
  }

  return <>{children}</>;
};

export default AuthGuard;
