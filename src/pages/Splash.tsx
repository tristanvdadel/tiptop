import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase, isLoggedIn } from "@/integrations/supabase/client";
import { Loader2, Coins, Sparkles } from 'lucide-react';

const Splash = () => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  
  useEffect(() => {
    const checkAuth = async () => {
      const loggedIn = await isLoggedIn();
      setAuthenticated(loggedIn);
      setLoading(false);
    };
    
    checkAuth();
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setAuthenticated(!!session);
        setLoading(false);
      }
    );
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-secondary/20 to-accent/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-50">
          <Sparkles className="absolute top-12 left-24 text-primary/50 animate-pulse" size={24} />
          <Sparkles className="absolute bottom-24 right-12 text-secondary/50 animate-pulse delay-500" size={32} />
          <Sparkles className="absolute top-1/3 right-1/4 text-accent/50 animate-pulse delay-300" size={20} />
        </div>

        <div className="relative flex flex-col items-center z-10">
          <div className="flex items-center gap-2 mb-6">
            <Coins className="h-10 w-10 text-primary animate-bounce" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent animate-pulse">TipTop</h1>
          </div>
          
          <div className="text-center mb-8">
            <p className="text-muted-foreground">Beheer en verdeel fooi voor teams</p>
          </div>
          
          <div className="bg-white/30 backdrop-blur-lg border border-border/20 rounded-xl p-6 shadow-lg w-64 flex flex-col items-center hover:shadow-secondary/30 transition-shadow">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Inloggen...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (authenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <Navigate to="/login" replace />;
};

export default Splash;
