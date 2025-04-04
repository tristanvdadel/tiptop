
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, Users, BarChart, Sparkles, Zap, Settings, LogOut, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const navItems = [
    { to: '/', icon: <Home size={20} />, label: 'Home' },
    { to: '/periods', icon: <Calendar size={20} />, label: 'Periodes' },
    { to: '/team', icon: <Users size={20} />, label: 'Team' },
    { to: '/management', icon: <Shield size={20} />, label: 'Beheer' },
    { 
      to: '/analytics', 
      icon: <BarChart size={20} />, 
      label: 'Analyse', 
      isPro: false
    },
    { to: '/settings', icon: <Settings size={20} />, label: 'Instellingen' },
  ];

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: 'Uitgelogd',
        description: 'Je bent succesvol uitgelogd.',
      });
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: 'Fout bij uitloggen',
        description: 'Er is een fout opgetreden bij het uitloggen.',
        variant: 'destructive',
      });
    }
  };

  return (
    <header className="bg-background border-b">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold mr-2">TipTop</h1>
          <span className="badge tier-free text-xs px-2 py-0.5 rounded border">BASIC</span>
        </div>
        <div className="flex gap-2">
          <Link to="/fast-tip">
            <Button 
              variant="goldGradient" 
            >
              <Zap size={16} className="mr-1 text-amber-700" /> 
              <span>FastTip</span>
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleSignOut}
            title="Uitloggen"
          >
            <LogOut size={18} />
          </Button>
        </div>
      </div>
      
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t z-50">
        <div className="flex justify-around items-center">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center py-2 px-4 text-xs w-1/6",
                location.pathname === item.to
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              )}
            >
              {item.icon}
              <span className="mt-1">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
