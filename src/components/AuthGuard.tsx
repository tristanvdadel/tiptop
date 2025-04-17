
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
  // Reduced from 200ms to 150ms for even faster initial response
  const maxAuthCheckTime = 150;

  useEffect(() => {
    // For quick initial render, check if we have a cached token
    const cachedToken = localStorage.getItem('sb-auth-token-cached');
    const isCachedSessionLikely = !!cachedToken;
    const loginAttemptTime = localStorage.getItem('login_attempt_time');
    const recentLoginAttempt = loginAttemptTime && (Date.now() - parseInt(loginAttemptTime)) < 10000;
    
    let mounted = true;
    
    // Set a shorter timeout for better user experience
    authCheckTimeout.current = window.setTimeout(() => {
      if (mounted && isLoading) {
        console.log('Session check timeout - forcing completion');
        // If we have a cached token, assume user is logged in for now
        if (isCachedSessionLikely) {
          setSession({ dummy: 'temporary' }); // Temporary session object
        } else {
          setSession(null);
        }
        setIsLoading(false);
      }
    }, maxAuthCheckTime);
    
    // Fast session check with priority on cached data
    const checkSession = async () => {
      try {
        // If we have a recent login attempt, prioritize cache first
        if (recentLoginAttempt && isCachedSessionLikely && mounted) {
          console.log('Recent login detected, using cached session first');
          setSession({ dummy: 'temporary' }); // Temporary session from cache
          setIsLoading(false);
        }
        
        // Still do the full check in background
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) setIsLoading(false);
          return;
        }
        
        if (mounted) {
          setSession(data.session);
          setIsLoading(false);
          
          // Clear login attempt timestamp after successful auth
          if (data.session) {
            localStorage.removeItem('login_attempt_time');
          }
        }
      } catch (error) {
        console.error('Unexpected error in session check:', error);
        if (mounted) setIsLoading(false);
      }
    };
    
    // Setup auth state listener for ALL auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('Auth state changed:', event, newSession ? 'User logged in' : 'No session');
      
      if (mounted) {
        setSession(newSession);
        setIsLoading(false);
        
        // If user logs out, clear the cached token
        if (event === 'SIGNED_OUT') {
          localStorage.removeItem('sb-auth-token-cached');
          localStorage.removeItem('login_attempt_time');
        }
        
        // If user logs in, set the cached token
        if (event === 'SIGNED_IN' && newSession?.access_token) {
          localStorage.setItem('sb-auth-token-cached', newSession.access_token);
          localStorage.removeItem('login_attempt_time');
        }
      }
    });

    // Start session check immediately
    checkSession();

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
