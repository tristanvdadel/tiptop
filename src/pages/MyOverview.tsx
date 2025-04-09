
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Clock, User, DollarSign, PiggyBank } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const MyOverview = () => {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [hourRegistrations, setHourRegistrations] = useState<any[]>([]);
  const [tipAmount, setTipAmount] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching profile:', profileError);
        }

        // Get team memberships
        const { data: memberships, error: membershipError } = await supabase
          .from('team_members')
          .select('*')
          .eq('user_id', user.id);

        if (membershipError) {
          console.error('Error fetching team memberships:', membershipError);
        }

        // For now, we'll use mock data for tip amounts and hours
        // In a real implementation, these would come from your database

        setUserData({
          profile,
          user,
          memberships: memberships || []
        });

        // Mock data for hour registrations - in real implementation, fetch from DB
        setHourRegistrations([
          { id: "1", hours: 4, date: new Date().toISOString() },
          { id: "2", hours: 6, date: new Date(Date.now() - 86400000).toISOString() }
        ]);
        
        setTipAmount(120); // Mock tip amount
        setTotalHours(10); // Mock total hours
        
      } catch (error: any) {
        console.error('Error fetching user data:', error);
        toast({
          title: "Fout bij ophalen gegevens",
          description: error.message,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [toast]);

  // Format the registration date
  const formatDate = (dateString: string): string => {
    return format(new Date(dateString), 'd MMM yyyy', {
      locale: nl
    });
  };

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

  if (!userData) {
    return <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mijn Overzicht</h1>
      <Card>
        <CardContent className="p-6 text-center">
          <p>Log in om je gegevens te bekijken</p>
        </CardContent>
      </Card>
    </div>;
  }

  const displayName = userData.profile?.first_name 
    ? `${userData.profile.first_name} ${userData.profile.last_name || ''}` 
    : userData.user.email;

  return <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mijn Overzicht</h1>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User size={20} /> 
            {displayName}
          </CardTitle>
          <CardDescription>
            {userData.user.email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <PiggyBank size={20} className="text-amber-500" />
              <div>
                <div className="text-sm text-muted-foreground">Totaal fooi</div>
                <div className="font-medium">€{tipAmount.toFixed(2)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={20} className="text-blue-500" />
              <div>
                <div className="text-sm text-muted-foreground">Totaal uren</div>
                <div className="font-medium">{totalHours} uur</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {hourRegistrations && hourRegistrations.length > 0 && <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock size={16} className="mr-2" />
              Recente urenregistraties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-2">
                {hourRegistrations.map((registration: any) => <div key={registration.id} className="flex justify-between items-center py-2 border-b last:border-0">
                    <span>{registration.hours} uur</span>
                    <span className="text-sm text-muted-foreground">{formatDate(registration.date)}</span>
                  </div>)}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>}
      
      <div className="mt-6">
        <Link to="/analytics">
          <Button variant="outline" className="w-full">
            <BarChart size={16} className="mr-2" />
            Bekijk Analyses
          </Button>
        </Link>
      </div>
    </div>;
};

export default MyOverview;
