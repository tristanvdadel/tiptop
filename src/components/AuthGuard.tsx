
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
  // Gereduceerd naar 100ms voor snellere respons
  const maxAuthCheckTime = 100;

  useEffect(() => {
    // Voor snelle initiële render, controleer of we een gecachte token hebben
    const cachedToken = localStorage.getItem('sb-auth-token-cached');
    const isCachedSessionLikely = !!cachedToken;
    const loginAttemptTime = localStorage.getItem('login_attempt_time');
    const recentLoginAttempt = loginAttemptTime && (Date.now() - parseInt(loginAttemptTime)) < 10000;
    
    let mounted = true;
    
    // Stel een kortere timeout in voor betere gebruikerservaring
    authCheckTimeout.current = window.setTimeout(() => {
      if (mounted && isLoading) {
        console.log('Session check timeout - forcing completion');
        // Als we een gecachte token hebben, nemen we aan dat de gebruiker is ingelogd
        if (isCachedSessionLikely) {
          setSession({ dummy: 'temporary' }); // Tijdelijk sessie-object
        } else {
          setSession(null);
        }
        setIsLoading(false);
      }
    }, maxAuthCheckTime);
    
    // Snelle sessiecontrole met prioriteit voor gecachte gegevens
    const checkSession = async () => {
      try {
        // Bij een recente inlogpoging gebruiken we eerst de cache
        if (recentLoginAttempt && isCachedSessionLikely && mounted) {
          console.log('Recent login detected, using cached session first');
          setSession({ dummy: 'temporary' }); // Tijdelijke sessie uit cache
          setIsLoading(false);
        }
        
        // Toch nog de volledige controle op de achtergrond uitvoeren
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            setIsLoading(false);
            // Als er een error is bij het ophalen van de sessie, verwijder dan de gecachte token
            localStorage.removeItem('sb-auth-token-cached');
          }
          return;
        }
        
        if (mounted) {
          setSession(data.session);
          setIsLoading(false);
          
          // Sla token op in cache voor snellere laden volgende keer
          if (data.session?.access_token) {
            localStorage.setItem('sb-auth-token-cached', data.session.access_token);
          }
          
          // Verwijder de login-pogingtijd na succesvolle authenticatie
          if (data.session) {
            localStorage.removeItem('login_attempt_time');
          }
        }
      } catch (error) {
        console.error('Unexpected error in session check:', error);
        if (mounted) setIsLoading(false);
      }
    };
    
    // Setup auth state listener voor ALLE auth-events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('Auth state changed:', event, newSession ? 'User logged in' : 'No session');
      
      if (mounted) {
        setSession(newSession);
        setIsLoading(false);
        
        // Als de gebruiker uitlogt, verwijder dan de gecachte token
        if (event === 'SIGNED_OUT') {
          localStorage.removeItem('sb-auth-token-cached');
          localStorage.removeItem('login_attempt_time');
          // Ook team-specifieke gegevens wissen
          localStorage.removeItem('last_team_id');
          localStorage.removeItem('analytics_last_refresh');
          
          const teamIds = Object.keys(localStorage).filter(key => key.startsWith('team_data_refresh_'));
          teamIds.forEach(key => localStorage.removeItem(key));
        }
        
        // Als de gebruiker inlogt, sla de token op in de cache
        if (event === 'SIGNED_IN' && newSession?.access_token) {
          localStorage.setItem('sb-auth-token-cached', newSession.access_token);
          localStorage.removeItem('login_attempt_time');
        }
      }
    });

    // Start sessiecontrole onmiddellijk
    checkSession();

    return () => {
      mounted = false;
      subscription?.unsubscribe();
      if (authCheckTimeout.current) {
        clearTimeout(authCheckTimeout.current);
      }
    };
  }, []);

  // Definieer openbare routes die geen authenticatie vereisen
  const isPublicRoute = location.pathname === '/splash' || 
                        location.pathname === '/login' || 
                        location.pathname.startsWith('/fast-tip');
                        
  // Controleer of redirect nodig is
  const needsRedirect = !isLoading && !session && !isPublicRoute;

  // Handle redirect indien nodig - aparte effect voor redirects
  useEffect(() => {
    if (needsRedirect) {
      console.log('No session, redirecting to login from:', location.pathname);
      
      // Check of er een recursie-error was
      const urlParams = new URLSearchParams(location.search);
      const hasRecursionError = urlParams.get('error') === 'recursion';
      
      // Bij een recursie-error tonen we een bericht
      if (hasRecursionError) {
        navigate('/login', { 
          replace: true, 
          state: { 
            message: "Je bent uitgelogd vanwege een database synchronisatie probleem. Inloggen zou dit probleem moeten oplossen."
          } 
        });
      } else {
        // Gebruik replace in plaats van push voor betere geschiedenisbeheer
        navigate('/login', { replace: true });
      }
    }
  }, [needsRedirect, navigate, location.pathname, location.search]);

  // Toon minimale laadstatus
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  // Render geen children tijdens redirect
  if (needsRedirect) {
    return null;
  }

  return <>{children}</>;
};

export default AuthGuard;
