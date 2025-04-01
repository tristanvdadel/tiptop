
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/contexts/AppContext';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

const PeriodSummary = () => {
  const { currentPeriod, calculateAverageTipPerHour } = useApp();
  
  const totalTip = useMemo(() => {
    if (!currentPeriod) return 0;
    return currentPeriod.tips.reduce((sum, tip) => sum + tip.amount, 0);
  }, [currentPeriod]);
  
  const averageTipPerHour = useMemo(() => {
    // Calculate average tip per hour for all periods
    return calculateAverageTipPerHour();
  }, [calculateAverageTipPerHour]);
  
  if (!currentPeriod) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p>Geen actieve periode</p>
        </CardContent>
      </Card>
    );
  }

  const startDate = format(new Date(currentPeriod.startDate), 'd MMMM yyyy', { locale: nl });
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Huidige periode</span>
          <span className="text-sm font-normal text-muted-foreground">Gestart: {startDate}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div>
          <h3 className="text-lg font-medium mb-2">Totaal fooi: €{totalTip.toFixed(2)}</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {currentPeriod.tips.length} fooi invoer(en) in deze periode
          </p>
          
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium">Gemiddelde fooi per uur (all-time)</h4>
            </div>
            <div className="bg-muted/50 p-3 rounded-md">
              <span className="font-medium text-xl">€{averageTipPerHour.toFixed(2)}</span>
              <span className="text-muted-foreground text-sm"> / uur</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PeriodSummary;
