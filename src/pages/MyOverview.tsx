
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

const MyOverview = () => {
  const { teamMembers, periods, calculateTipDistribution, tier } = useApp();
  
  // For simplicity, we'll assume the first team member is the current user
  const currentUser = teamMembers[0];
  
  if (!currentUser) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Mijn Overzicht</h1>
        <Card>
          <CardContent className="p-6 text-center">
            <p>Voeg eerst teamleden toe</p>
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
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mijn Overzicht</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Hallo, {currentUser.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Totaal verdiend</span>
              <span className="text-xl font-medium">€{totalTip.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Gewerkte uren</span>
              <span>{totalHours} uur</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-tier-pro">
        <CardContent className="p-4">
          <div className="flex items-center">
            <Crown size={20} className="text-tier-pro mr-2" />
            <p className="text-sm">
              Upgrade naar <span className="font-medium text-tier-pro">PRO</span> om je saldo bij te houden en meer gedetailleerde statistieken te zien.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyOverview;
