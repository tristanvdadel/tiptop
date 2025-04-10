
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Clock, UserRound } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

const MyOverview = () => {
  const {
    teamMembers,
    periods,
    calculateTipDistribution,
    isLoading,
    refreshTeamData
  } = useApp();
  
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  // Fetch current user data
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setUserData(user);
        }
        
        // Ensure team data is refreshed
        if (!isLoading) {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    
    getCurrentUser();
  }, [isLoading]);
  
  // Effect to set loading state based on app loading
  useEffect(() => {
    if (!isLoading) {
      // Short timeout to ensure UI updates
      const timer = setTimeout(() => {
        setLoading(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Find the current user in team members
  const getCurrentTeamMember = () => {
    if (!userData || !teamMembers.length) return null;
    
    // Try to find the team member by user_id
    return teamMembers.find(member => member.user_id === userData.id) || teamMembers[0];
  };
  
  const currentUser = getCurrentTeamMember();

  // Show loading skeleton while data is loading
  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Mijn Overzicht</h1>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If no team members, show message
  if (!currentUser) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Mijn Overzicht</h1>
        <Card>
          <CardContent className="p-6 text-center">
            <UserRound className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p>Voeg eerst teamleden toe of wacht tot je wordt toegevoegd aan een team</p>
            <Button className="mt-4" onClick={() => refreshTeamData()}>
              Gegevens verversen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate total tips for current user across all periods
  const totalTip = periods.reduce((total, period) => {
    const distribution = calculateTipDistribution();
    const userTip = distribution.find(member => member.id === currentUser.id)?.tipAmount || 0;
    return total + userTip;
  }, 0);

  // Calculate total hours
  const totalHours = currentUser.hours || 0;

  // Format the registration date
  const formatDate = (dateString: string): string => {
    return format(new Date(dateString), 'd MMM yyyy', {
      locale: nl
    });
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mijn Overzicht</h1>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Mijn gegevens</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Naam</span>
              <span className="font-medium">{currentUser.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Totaal gewerkte uren</span>
              <span className="font-medium">{totalHours} uur</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Totaal ontvangen fooi</span>
              <span className="font-medium">€{totalTip.toFixed(2)}</span>
            </div>
            {currentUser.balance !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Openstaand saldo</span>
                <span className="font-medium">€{currentUser.balance.toFixed(2)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {currentUser.hourRegistrations && currentUser.hourRegistrations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock size={16} className="mr-2" />
              Recente urenregistraties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-2">
                {currentUser.hourRegistrations.map(registration => (
                  <div key={registration.id} className="flex justify-between items-center py-2 border-b last:border-0">
                    <span>{registration.hours} uur</span>
                    <span className="text-sm text-muted-foreground">{formatDate(registration.date)}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
      
      <div className="mt-6">
        <Link to="/analytics">
          <Button className="w-full" variant="outline">
            <BarChart size={16} className="mr-2" />
            Meer statistieken bekijken
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default MyOverview;
