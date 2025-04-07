
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase, isLoggedIn } from "@/integrations/supabase/client";
import { Loader2, Coins } from 'lucide-react';

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
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/20 via-secondary/30 to-amber-200/20 relative overflow-hidden">
        <div className="relative flex flex-col items-center z-10">
          <div className="flex items-center gap-2 mb-6">
            <Coins className="h-12 w-12 text-amber-500 animate-bounce" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">TipTop</h1>
          </div>
          
          <div className="text-center mb-8">
            <p className="text-amber-800">Beheer en verdeel fooi voor teams</p>
          </div>
          
          <div className="bg-white/50 backdrop-blur-lg border border-amber-500/20 rounded-xl p-6 shadow-lg w-64 flex flex-col items-center hover:shadow-amber-300/30 transition-shadow">
            <Loader2 className="h-8 w-8 animate-spin text-amber-600 mb-4" />
            <p className="text-sm text-amber-800">Inloggen...</p>
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
