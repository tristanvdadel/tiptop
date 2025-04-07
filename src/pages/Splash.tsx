
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
    
    // Listen for auth changes
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-100/20 via-pink-100/30 to-cyan-100/20 relative overflow-hidden">
        {/* Background Sparkles */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-50">
          <Sparkles className="absolute top-12 left-24 text-purple-300 animate-pulse" size={24} />
          <Sparkles className="absolute bottom-24 right-12 text-amber-300 animate-pulse delay-500" size={32} />
          <Sparkles className="absolute top-1/3 right-1/4 text-cyan-200 animate-pulse delay-300" size={20} />
        </div>

        <div className="relative flex flex-col items-center z-10">
          <div className="flex items-center gap-2 mb-6">
            <Coins className="h-10 w-10 text-amber-500 animate-bounce" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent animate-pulse">TipTop</h1>
          </div>
          
          <div className="text-center mb-8">
            <p className="text-muted-foreground">Beheer en verdeel fooi voor teams</p>
          </div>
          
          <div className="bg-white/30 backdrop-blur-lg border border-border/20 rounded-xl p-6 shadow-lg w-64 flex flex-col items-center hover:shadow-purple-300/30 transition-shadow">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-4" />
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
