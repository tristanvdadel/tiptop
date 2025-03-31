
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, Users, User, BarChart, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const Navbar = () => {
  const location = useLocation();
  
  const navItems = [
    { to: '/', icon: <Home size={20} />, label: 'Home' },
    { to: '/periods', icon: <Calendar size={20} />, label: 'Periodes' },
    { to: '/team', icon: <Users size={20} />, label: 'Team' },
    { to: '/my-overview', icon: <User size={20} />, label: 'Mijn Overzicht' },
    { to: '/analytics', icon: <BarChart size={20} />, label: 'Analytics', isPro: true },
  ];

  return (
    <header className="bg-background border-b">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold mr-2">TipTop</h1>
          <span className="badge tier-free text-xs px-2 py-0.5 rounded border">FREE</span>
        </div>
        <Link to="/fast-tip">
          <Button className="gold-button">
            <Plus size={16} className="mr-1" /> FastTip
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
                  : "text-muted-foreground",
                item.isPro && "opacity-50"
              )}
            >
              {item.icon}
              <span className="mt-1">{item.label}</span>
              {item.isPro && (
                <span className="text-gold text-[10px]">👑 PRO</span>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
