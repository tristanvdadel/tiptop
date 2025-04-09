
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Clock, Trophy, UserRound } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

const MyOverview = () => {
  const { teamMembers, periods, calculateTipDistribution } = useApp();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        // Get the current authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }
        
        // Get the team member data for the current user
        const { data: teamMember, error } = await supabase
          .from('team_members')
          .select(`
            id,
            user_id,
            team_id,
            role,
            permissions
          `)
          .eq('user_id', user.id)
          .single();
          
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching team member:', error);
          setLoading(false);
          return;
        }
        
        // Get the profile data for the current user
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select(`
            id,
            first_name,
            last_name,
            avatar_url
          `)
          .eq('id', user.id)
          .single();
          
        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching profile:', profileError);
        }
        
        // If we have data, combine it into a user object
        if (teamMember) {
          setCurrentUser({
            id: teamMember.id,
            userId: user.id,
            teamId: teamMember.team_id,
            role: teamMember.role,
            permissions: teamMember.permissions,
            name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Gebruiker' : 'Gebruiker',
            hours: 0, // We'll keep the local app data for hours until we implement them in the database
            hourRegistrations: [] // Will be populated from local data for now
          });
        } else {
          // Fallback to the first local team member if no db data (temporary)
          setCurrentUser(teamMembers[0]);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error in fetchCurrentUser:', error);
        // Fallback to local data
        setCurrentUser(teamMembers[0]);
        setLoading(false);
      }
    };
    
    fetchCurrentUser();
  }, [teamMembers]);

  // For now, if we don't have a current user yet, try to use the first team member from local data
  const user = currentUser || teamMembers[0];
  
  if (loading) {
    return <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mijn Overzicht</h1>
      <Card>
        <CardContent className="p-6 text-center">
          <p>Laden...</p>
        </CardContent>
      </Card>
    </div>;
  }
  
  if (!user) {
    return <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mijn Overzicht</h1>
      <Card>
        <CardContent className="p-6 text-center">
          <p>Voeg eerst teamleden toe</p>
        </CardContent>
      </Card>
    </div>;
  }

  // Calculate total tips for current user across all periods
  const totalTip = periods.reduce((total, period) => {
    const distribution = calculateTipDistribution();
    const userTip = distribution.find(member => member.id === user.id)?.tipAmount || 0;
    return total + userTip;
  }, 0);

  // Calculate total hours
  const totalHours = user.hours || 0;

  // Format the registration date
  const formatDate = (dateString: string): string => {
    return format(new Date(dateString), 'd MMM yyyy', {
      locale: nl
    });
  };
  
  return <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mijn Overzicht</h1>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <UserRound size={16} className="mr-2" />
            Gebruiker informatie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Naam</span>
              <span className="font-medium">{user.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Uren gewerkt</span>
              <span className="font-medium">{totalHours} uur</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Totale fooi</span>
              <span className="font-medium">€{totalTip.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Rol</span>
              <span className="font-medium capitalize">{user.role || 'Lid'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {user.hourRegistrations && user.hourRegistrations.length > 0 && <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock size={16} className="mr-2" />
              Recente urenregistraties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-2">
                {user.hourRegistrations.map(registration => <div key={registration.id} className="flex justify-between items-center py-2 border-b last:border-0">
                    <span>{registration.hours} uur</span>
                    <span className="text-sm text-muted-foreground">{formatDate(registration.date)}</span>
                  </div>)}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>}
      
      <div className="mt-6">
        <Link to="/analytics">
          <Button variant="outline" className="w-full flex items-center gap-2">
            <BarChart size={16} />
            Bekijk statistieken
          </Button>
        </Link>
      </div>
    </div>;
};
export default MyOverview;
