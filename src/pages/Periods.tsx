
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Crown } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

const Periods = () => {
  const { periods, startNewPeriod, tier, currentPeriod } = useApp();
  
  // Sort periods by start date, most recent first
  const sortedPeriods = [...periods].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );

  const formatPeriodDate = (date: string) => {
    return format(new Date(date), 'd MMMM yyyy', { locale: nl });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Periodes</h1>
        <Button 
          onClick={startNewPeriod} 
          disabled={!!currentPeriod}
          className="gold-button"
        >
          <Plus size={16} className="mr-1" /> Nieuwe periode
        </Button>
      </div>
      
      {sortedPeriods.length > 0 ? (
        <div className="space-y-4">
          {tier === 'free' && sortedPeriods.length > 1 && (
            <Card className="border-tier-team">
              <CardContent className="p-4 flex items-center">
                <Crown size={20} className="text-tier-team mr-2" />
                <p className="text-sm">
                  Upgrade naar <span className="font-medium text-tier-team">TEAM</span> om toegang te krijgen tot historische periodes.
                </p>
              </CardContent>
            </Card>
          )}
          
          {sortedPeriods.map((period, index) => (
            <Card 
              key={period.id} 
              className={index > 0 && tier === 'free' ? 'opacity-40' : ''}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex justify-between items-center text-base">
                  <span>
                    {period.isActive 
                      ? 'Actieve periode' 
                      : `Periode ${formatPeriodDate(period.startDate)}`}
                  </span>
                  {period.isActive && (
                    <span className="text-sm px-2 py-0.5 bg-tier-free/10 text-tier-free rounded-full">
                      Actief
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Startdatum</span>
                    <span>{formatPeriodDate(period.startDate)}</span>
                  </div>
                  
                  {period.endDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Einddatum</span>
                      <span>{formatPeriodDate(period.endDate)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Totaal fooi</span>
                    <span className="font-medium">
                      €{period.tips.reduce((sum, tip) => sum + tip.amount, 0).toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Aantal invoeren</span>
                    <span>{period.tips.length}</span>
                  </div>
                </div>
                
                {index > 0 && tier === 'free' && (
                  <div className="mt-4 flex justify-center">
                    <Button variant="outline" className="text-tier-team border-tier-team">
                      <Crown size={16} className="mr-1 text-tier-team" /> Upgraden naar TEAM
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Nog geen periodes gestart.</p>
            <Button 
              onClick={startNewPeriod} 
              className="mt-4 gold-button"
            >
              <Plus size={16} className="mr-1" /> Start eerste periode
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Periods;
