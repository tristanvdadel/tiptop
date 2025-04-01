
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, Users, BarChart, Sparkles, Zap, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const Navbar = () => {
  const location = useLocation();
  
  const navItems = [
    { to: '/', icon: <Home size={20} />, label: 'Home' },
    { to: '/periods', icon: <Calendar size={20} />, label: 'Periodes' },
    { to: '/team', icon: <Users size={20} />, label: 'Team' },
    { 
      to: '/analytics', 
      icon: <BarChart size={20} />, 
      label: 'Analyse', 
      isPro: false
    },
    { to: '/settings', icon: <Settings size={20} />, label: 'Instellingen' },
  ];

  return (
    <header className="bg-background border-b">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold mr-2">TipTop</h1>
          <span className="badge tier-free text-xs px-2 py-0.5 rounded border">BASIC</span>
        </div>
        <Link to="/fast-tip">
          <Button 
            variant="goldGradient" 
          >
            <Zap size={16} className="mr-1 text-amber-700" /> 
            <span>FastTip</span>
          </Button>
        </Link>
      </div>
      
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t z-10">
        <div className="flex justify-around items-center">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center py-2 px-4 text-xs",
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
