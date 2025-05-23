
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, Users, BarChart, Zap, Settings, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getUserTeamsSafe } from '@/services/teamService';

interface NavbarProps {
  disabled?: boolean;
  onDisabledClick?: (e: React.MouseEvent) => void;
}

const Navbar = ({ disabled = false, onDisabledClick }: NavbarProps) => {
  const location = useLocation();
  const [teamName, setTeamName] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchTeamName = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        // Use the safe function to fetch teams
        const teams = await getUserTeamsSafe(session.user.id);
        
        if (teams && teams.length > 0) {
          setTeamName(teams[0].name);
        }
      } catch (error) {
        console.error('Error fetching team data:', error);
      }
    };
    
    fetchTeamName();
  }, []);
  
  const navItems = [
    { to: '/', icon: <Home size={20} className="text-black" />, label: 'Home' },
    { to: '/periods', icon: <Calendar size={20} className="text-black" />, label: 'Periodes' },
    { to: '/team', icon: <Users size={20} className="text-black" />, label: 'Team' },
    { to: '/management', icon: <Shield size={20} className="text-black" />, label: 'Beheer' },
    { to: '/analytics', icon: <BarChart size={20} className="text-black" />, label: 'Analyse' },
    { to: '/settings', icon: <Settings size={20} className="text-black" />, label: 'Instellingen' },
  ];

  const handleNavClick = (e: React.MouseEvent) => {
    if (disabled && onDisabledClick) {
      onDisabledClick(e);
      return;
    }
  };

  return (
    <header className={cn(
      "bg-yellow-400 border-b border-yellow-500",
      disabled && "opacity-80"
    )}>
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold mr-2 text-black">TipTop</h1>
          {teamName && (
            <span className="text-sm ml-1 font-medium text-black/70">
              | {teamName}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {disabled ? (
            <Button 
              variant="default" 
              className="bg-yellow-500 text-black hover:bg-yellow-600 opacity-70 cursor-not-allowed"
              onClick={handleNavClick}
            >
              <Zap size={16} className="mr-1 text-black" /> 
              <span>FastTip</span>
            </Button>
          ) : (
            <Link to="/fast-tip">
              <Button 
                variant="default" 
                className="bg-yellow-500 text-black hover:bg-yellow-600"
              >
                <Zap size={16} className="mr-1 text-black" /> 
                <span>FastTip</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
      
      <nav className="fixed bottom-0 left-0 right-0 bg-yellow-400 border-t z-50">
        <div className="flex justify-around items-center">
          {navItems.map((item) => (
            disabled ? (
              <div
                key={item.to}
                className={cn(
                  "flex flex-col items-center py-2 px-4 text-xs w-1/6 cursor-not-allowed",
                  location.pathname === item.to
                    ? "bg-yellow-500 text-black font-medium opacity-60"
                    : "text-black/70 opacity-60"
                )}
                onClick={handleNavClick}
              >
                {item.icon}
                <span className="mt-1">{item.label}</span>
              </div>
            ) : (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center py-2 px-4 text-xs w-1/6",
                  location.pathname === item.to
                    ? "bg-yellow-500 text-black font-medium"
                    : "text-black/70"
                )}
              >
                {item.icon}
                <span className="mt-1">{item.label}</span>
              </Link>
            )
          ))}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
