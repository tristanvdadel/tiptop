
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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event, session ? 'User logged in' : 'No session');
      setSession(session);
      setIsLoading(false);
    });

    // THEN check for existing session
    const getInitialSession = async () => {
      try {
        setIsLoading(true);
        const { data } = await supabase.auth.getSession();
        console.log('Initial session check:', data.session ? 'Session found' : 'No session found');
        setSession(data.session);
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    return () => {
      subscription?.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    // Clear loading state after a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.log('Forced loading state to end after timeout');
        setIsLoading(false);
      }
    }, 5000); // 5 second timeout as a fallback

    return () => clearTimeout(timeoutId);
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!session && location.pathname !== '/splash' && location.pathname !== '/login' && !location.pathname.startsWith('/fast-tip')) {
    console.log('No session, redirecting to login from:', location.pathname);
    navigate('/login');
    return null;
  }

  return <>{children}</>;
};

export default AuthGuard;
