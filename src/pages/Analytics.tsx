
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, BarChart } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { 
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

  const renderProOverlay = () => (
    <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/60 backdrop-blur-sm rounded-lg">
      <div className="text-center p-4">
        <Crown size={36} className="mx-auto mb-2 text-tier-pro" />
        <h2 className="text-lg font-medium mb-1">PRO-functie</h2>
        <p className="text-muted-foreground mb-3 text-sm max-w-md">
          Upgrade om toegang te krijgen tot geavanceerde statistieken en grafieken.
        </p>
        <Button className="bg-tier-pro hover:bg-tier-pro/90 text-white text-sm h-8 px-3">
          Upgraden naar PRO
        </Button>
      </div>
    </div>
  );
  
  if (tier !== 'pro') {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Analytics</h1>
        
        <div className="relative">
          <Card className="filter blur-[2px]">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-lg">Fooi per periode</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart
                    data={periodData}
                    margin={{
                      top: 10,
                      right: 20,
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
          {renderProOverlay()}
        </div>
        
        <div className="relative">
          <Card className="filter blur-[2px]">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-lg">Gemiddeld fooi per uur</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-muted-foreground mb-2 text-sm">
                Het gemiddelde fooi per uur wordt berekend op basis van de totale fooi en de gewerkte uren.
              </p>
              <div className="space-y-2">
                {periodData
                  .filter(period => period.average > 0)
                  .slice(0, 3) // Limit to 3 periods to save space
                  .map(period => (
                    <div key={period.id} className="flex justify-between p-2 border rounded-md">
                      <div>
                        <p className="font-medium text-sm">{period.name}</p>
                      </div>
                      <div className="font-medium text-sm">€{period.average.toFixed(2)}/uur</div>
                    </div>
                  ))
                }
              </div>
            </CardContent>
          </Card>
          {renderProOverlay()}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Analytics</h1>
      
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-lg">Fooi per periode</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart
                data={periodData}
                margin={{
                  top: 10,
                  right: 20,
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
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-lg">Gemiddeld fooi per uur</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <p className="text-muted-foreground mb-2 text-sm">
            Het gemiddelde fooi per uur wordt berekend op basis van de totale fooi en de gewerkte uren van het team.
          </p>
          <div className="space-y-2">
            {periodData
              .filter(period => period.average > 0)
              .map(period => (
                <div key={period.id} className="flex justify-between p-2 border rounded-md">
                  <div>
                    <p className="font-medium text-sm">{period.name}</p>
                  </div>
                  <div className="font-medium text-sm">€{period.average.toFixed(2)}/uur</div>
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
