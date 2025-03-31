
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, BarChart } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { 
  Chart,
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from '@/components/ui/chart';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useMemo } from 'react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

const Analytics = () => {
  const { periods, tier, calculateAverageTipPerHour } = useApp();
  
  const periodData = useMemo(() => {
    return periods.map(period => {
      const totalTips = period.tips.reduce((sum, tip) => sum + tip.amount, 0);
      const startDate = format(new Date(period.startDate), 'd MMM', { locale: nl });
      const endDate = period.endDate 
        ? format(new Date(period.endDate), 'd MMM', { locale: nl })
        : 'Actief';
        
      return {
        name: `${startDate} - ${endDate}`,
        total: totalTips,
        average: period.isActive ? 0 : calculateAverageTipPerHour(period.id),
        id: period.id
      };
    });
  }, [periods, calculateAverageTipPerHour]);
  
  if (tier !== 'pro') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        
        <Card className="border-tier-pro">
          <CardContent className="p-6 text-center">
            <Crown size={48} className="mx-auto mb-4 text-tier-pro" />
            <h2 className="text-xl font-medium mb-2">PRO-functie</h2>
            <p className="text-muted-foreground mb-6">
              Analytics is beschikbaar in de PRO-versie. Upgrade om toegang te krijgen tot geavanceerde statistieken, grafieken en exports.
            </p>
            <Button className="bg-tier-pro hover:bg-tier-pro/90 text-white">
              Upgraden naar PRO
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Fooi per periode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart
                data={periodData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => [`€${value.toFixed(2)}`, '']} />
                <Legend />
                <Bar dataKey="total" name="Totaal fooi" fill="#9b87f5" />
                <Bar dataKey="average" name="Gem. per uur" fill="#33C3F0" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Gemiddeld fooi per uur</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Het gemiddelde fooi per uur wordt berekend op basis van de totale fooi en de gewerkte uren van het team.
          </p>
          <div className="space-y-3">
            {periodData
              .filter(period => period.average > 0)
              .map(period => (
                <div key={period.id} className="flex justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-medium">{period.name}</p>
                  </div>
                  <div className="font-medium">€{period.average.toFixed(2)}/uur</div>
                </div>
              ))
            }
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
