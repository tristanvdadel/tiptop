import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Clock } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
const MyOverview = () => {
  const {
    teamMembers,
    periods,
    calculateTipDistribution
  } = useApp();

  // For simplicity, we'll assume the first team member is the current user
  const currentUser = teamMembers[0];
  if (!currentUser) {
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
  return <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mijn Overzicht</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Hallo, {currentUser.name}</CardTitle>
        </CardHeader>
        
      </Card>
      
      {currentUser.hourRegistrations && currentUser.hourRegistrations.length > 0 && <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock size={16} className="mr-2" />
              Recente urenregistraties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-2">
                {currentUser.hourRegistrations.map(registration => <div key={registration.id} className="flex justify-between items-center py-2 border-b last:border-0">
                    <span>{registration.hours} uur</span>
                    <span className="text-sm text-muted-foreground">{formatDate(registration.date)}</span>
                  </div>)}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>}
      
      <div className="mt-6">
        <Link to="/analytics">
          
        </Link>
      </div>
    </div>;
};
export default MyOverview;