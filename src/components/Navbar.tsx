
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, Users, BarChart, Sparkles, Zap } from 'lucide-react';
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
  ];

  return (
    <header className="bg-background border-b backdrop-blur-sm sticky top-0 z-20">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold mr-2 bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">TipTop</h1>
          <span className="badge tier-free text-xs px-2 py-0.5 rounded border bg-blue-50">BASIC</span>
        </div>
        <Link to="/fast-tip">
          <Button 
            variant="goldGradient" 
            className="hover:scale-105 transition-transform duration-200 shadow-md"
          >
            <Zap size={16} className="mr-1 text-amber-700" /> 
            <span>FastTip</span>
          </Button>
        </Link>
      </div>
      
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t shadow-[0_-1px_10px_rgba(0,0,0,0.05)] z-10">
        <div className="flex justify-around items-center">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center py-3 px-4 text-xs relative group",
                location.pathname === item.to
                  ? "text-primary font-medium"
                  : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "absolute bottom-0 left-0 right-0 h-0.5 rounded-t-md transition-all duration-300 transform origin-bottom",
                location.pathname === item.to 
                  ? "bg-primary scale-x-100"
                  : "bg-transparent scale-x-0 group-hover:scale-x-50 group-hover:bg-primary/20"
              )} />
              <div className={cn(
                "p-1.5 rounded-full transition-colors",
                location.pathname === item.to
                  ? "bg-primary/10"
                  : "group-hover:bg-muted"
              )}>
                {item.icon}
              </div>
              <span className="mt-1">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
