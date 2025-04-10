import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase, isLoggedIn } from "@/integrations/supabase/client";
import { Loader2, Coins, Sparkles, ArrowRight, Users, ChartBar } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-amber-100/20 via-amber-50/30 to-amber-100/20 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-50">
          <Sparkles className="absolute top-12 left-24 text-amber-300 animate-pulse" size={24} />
          <Sparkles className="absolute bottom-24 right-12 text-amber-300 animate-pulse delay-500" size={32} />
          <Sparkles className="absolute top-1/3 right-1/4 text-amber-200 animate-pulse delay-300" size={20} />
        </div>

        <div className="relative flex flex-col items-center z-10">
          <div className="flex items-center gap-2 mb-6">
            <Coins className="h-10 w-10 text-amber-500 animate-bounce" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-500 to-amber-400 bg-clip-text text-transparent animate-pulse">TipTop</h1>
          </div>
          
          <div className="text-center mb-8">
            <p className="text-muted-foreground">Beheer en verdeel fooi voor teams</p>
          </div>
          
          <div className="bg-white/30 backdrop-blur-lg border border-border/20 rounded-xl p-6 shadow-lg w-64 flex flex-col items-center hover:shadow-amber-300/30 transition-shadow">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500 mb-4" />
            <p className="text-sm text-muted-foreground">Inloggen...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (authenticated) {
    return <Navigate to="/" replace />;
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-amber-100/20 via-amber-50/30 to-amber-100/20 relative overflow-hidden p-4">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-50">
        <Sparkles className="absolute top-12 left-24 text-amber-300 animate-pulse" size={24} />
        <Sparkles className="absolute bottom-24 right-12 text-amber-300 animate-pulse delay-500" size={32} />
        <Sparkles className="absolute top-1/3 right-1/4 text-amber-200 animate-pulse delay-300" size={20} />
      </div>

      <div className="relative z-10 max-w-3xl w-full">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Coins className="h-12 w-12 text-amber-500 animate-bounce" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-amber-500 to-amber-400 bg-clip-text text-transparent">TipTop</h1>
          </div>
          <p className="text-xl text-muted-foreground">Beheer en verdeel fooi voor teams</p>
        </div>
        
        <div className="bg-white/50 backdrop-blur-lg border border-border/20 rounded-xl p-8 shadow-lg mb-8 hover:shadow-amber-300/30 transition-shadow">
          <h2 className="text-2xl font-semibold mb-4 text-amber-700">Hoe werkt TipTop?</h2>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-amber-100 p-3 rounded-full">
                <Coins className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-medium text-lg">Houd fooi eenvoudig bij</h3>
                <p className="text-muted-foreground">Voeg fooi toe met een paar klikken en houd alles netjes bij in periodes.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="bg-amber-100 p-3 rounded-full">
                <Users className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-medium text-lg">Maak of sluit aan bij een team</h3>
                <p className="text-muted-foreground">Werk samen met je collega's en verdeel de fooi eerlijk onder teamleden.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="bg-amber-100 p-3 rounded-full">
                <ChartBar className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-medium text-lg">Krijg overzichtelijke inzichten</h3>
                <p className="text-muted-foreground">Bekijk rapporten en statistieken om te zien hoe de fooi over tijd verdeeld wordt.</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild variant="goldGradient" size="lg" className="group">
            <Link to="/login?tab=register">
              Aanmelden
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
          
          <Button asChild variant="outline" size="lg">
            <Link to="/login">Inloggen als je al een account hebt</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Splash;
