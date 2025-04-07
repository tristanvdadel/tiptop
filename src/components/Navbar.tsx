
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, Users, BarChart, Zap, Settings, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const Navbar = () => {
  const location = useLocation();
  const [teamName, setTeamName] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchTeamName = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        // Fetch the team the user belongs to
        const { data: teamMembers, error: memberError } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', session.user.id)
          .single();
        
        if (memberError || !teamMembers) {
          console.error('Error fetching team membership:', memberError);
          return;
        }
        
        // Get the team name
        const { data: team, error: teamError } = await supabase
          .from('teams')
          .select('name')
          .eq('id', teamMembers.team_id)
          .single();
        
        if (teamError || !team) {
          console.error('Error fetching team:', teamError);
          return;
        }
        
        setTeamName(team.name);
      } catch (error) {
        console.error('Error fetching team data:', error);
      }
    };
    
    fetchTeamName();
  }, []);
  
  const navItems = [
    { to: '/', icon: <Home size={20} />, label: 'Home' },
    { to: '/periods', icon: <Calendar size={20} />, label: 'Periodes' },
    { to: '/team', icon: <Users size={20} />, label: 'Team' },
    { to: '/management', icon: <Shield size={20} />, label: 'Beheer' },
    { to: '/analytics', icon: <BarChart size={20} />, label: 'Analyse' },
    { to: '/settings', icon: <Settings size={20} />, label: 'Instellingen' },
  ];

  return (
    <header className="bg-background border-b">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold mr-2 bg-gradient-to-r from-amber-500 to-amber-400 bg-clip-text text-transparent">TipTop</h1>
          {teamName && (
            <span className="text-sm ml-1 font-medium text-muted-foreground">
              | {teamName}
            </span>
          )}
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
                  ? "text-amber-500 font-medium"
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
