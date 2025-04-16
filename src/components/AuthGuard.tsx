
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const authCheckTimeout = useRef<number | null>(null);
  const maxAuthCheckTime = 200; // Reduced from 300ms to 200ms

  useEffect(() => {
    // For quick initial render, check if we have a cached token
    const cachedToken = localStorage.getItem('sb-auth-token-cached');
    const isCachedSessionLikely = !!cachedToken;
    
    let mounted = true;
    
    // Setup auth state listener for ALL auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('Auth state changed:', event, newSession ? 'User logged in' : 'No session');
      
      if (mounted) {
        setSession(newSession);
        setIsLoading(false);
        
        // If user logs out, clear the cached token
        if (event === 'SIGNED_OUT') {
          localStorage.removeItem('sb-auth-token-cached');
        }
        
        // If user logs in, set the cached token
        if (event === 'SIGNED_IN' && newSession?.access_token) {
          localStorage.setItem('sb-auth-token-cached', newSession.access_token);
        }
      }
    });

    // Perform fast session check
    const checkSession = async () => {
      try {
        // Go with fast session check
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) setIsLoading(false);
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
    
    // Set a shorter timeout for better user experience
    authCheckTimeout.current = window.setTimeout(() => {
      if (mounted && isLoading) {
        console.log('Session check timeout - forcing completion');
        // If we have a cached token, assume user is logged in for now
        // This gives a smoother UX while the full check completes
        if (isCachedSessionLikely) {
          setSession({ dummy: 'temporary' }); // Temporary session object
        } else {
          setSession(null);
        }
        setIsLoading(false);
      }
    }, maxAuthCheckTime);

    return () => {
      mounted = false;
      subscription?.unsubscribe();
      if (authCheckTimeout.current) {
        clearTimeout(authCheckTimeout.current);
      }
    };
  }, []);

  // Define public routes that don't require authentication
  const isPublicRoute = location.pathname === '/splash' || 
                        location.pathname === '/login' || 
                        location.pathname.startsWith('/fast-tip');
                        
  // Determine if redirect is needed
  const needsRedirect = !isLoading && !session && !isPublicRoute;

  // Handle redirect if needed - separate effect for redirects
  useEffect(() => {
    if (needsRedirect) {
      console.log('No session, redirecting to login from:', location.pathname);
      // Use replace instead of push for better history management
      navigate('/login', { replace: true });
    }
  }, [needsRedirect, navigate, location.pathname]);

  // Show minimal loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  // Don't render children during redirect
  if (needsRedirect) {
    return null;
  }

  return <>{children}</>;
};

export default AuthGuard;
