
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Info, TrendingUp, ArrowRight } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import TipChart from '@/components/TipChart';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from '@/components/ui/scroll-area';

const Analytics = () => {
  const {
    periods,
    calculateAverageTipPerHour,
    teamMembers,
    payouts
  } = useApp();
  
  const isMobile = useIsMobile();
  
  const averageTipPerHour = useMemo(() => {
    return calculateAverageTipPerHour();
  }, [calculateAverageTipPerHour]);
  
  const periodData = useMemo(() => {
    return periods.map(period => {
      // Use stored average tip per hour if available (especially for paid periods)
      let avgTipPerHour = period.averageTipPerHour;
      
      // If not available, calculate it
      if (avgTipPerHour === undefined || avgTipPerHour === null) {
        avgTipPerHour = calculateAverageTipPerHour(period.id);
      }
      
      const totalTips = period.tips.reduce((sum, tip) => sum + tip.amount, 0);
      const startDate = format(new Date(period.startDate), 'd MMM', {
        locale: nl
      });
      const endDate = period.endDate ? format(new Date(period.endDate), 'd MMM', {
        locale: nl
      }) : 'Actief';
      
      const timestamp = new Date(period.startDate).getTime();
      return {
        name: `${startDate} - ${endDate}`,
        total: totalTips,
        average: avgTipPerHour || 0,
        id: period.id,
        isPaid: period.isPaid,
        timestamp: timestamp
      };
    }).sort((a, b) => a.timestamp - b.timestamp);
  }, [periods, calculateAverageTipPerHour]);
  
  const lineChartData = useMemo(() => {
    const filteredData = periodData.filter(period => period.average > 0 || period.total > 0);
    if (filteredData.length > 10) {
      return filteredData.slice(-10);
    }
    return filteredData;
  }, [periodData]);
  
  const chartConfig = useMemo(() => {
    return {
      average: {
        label: 'Gem. fooi per uur',
        color: '#33C3F0'
      }
    };
  }, []);
  
  const getEmptyStateMessage = () => {
    const allPeriods = periods;
    const periodsWithTips = allPeriods.some(period => period.tips.length > 0);
    const teamHasHours = teamMembers.some(member => member.hours > 0 || member.hourRegistrations && member.hourRegistrations.length > 0);
    if (!periodsWithTips && !teamHasHours) {
      return "Er ontbreken uur gegevens en fooi gegevens. Voeg ze toe om een gemiddelde te zien.";
    } else if (!periodsWithTips) {
      return "Er ontbreken fooi gegevens. Voeg ze toe om een gemiddelde te zien.";
    } else if (!teamHasHours) {
      return "Er ontbreken uur gegevens. Voeg ze toe om een gemiddelde te zien.";
    }
    return ""; // Fallback, should not happen
  };
  
  const AverageTipCard = () => <Card className="mb-4 w-full">
      <CardContent className="p-4">
        {averageTipPerHour > 0 ? <div className="flex justify-between items-center bg-gradient-to-r from-[#9b87f5]/10 to-[#7E69AB]/5 border-[#9b87f5]/20 rounded-md p-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={20} className="text-[#9b87f5]" />
              <div>
                <h3 className="text-sm font-medium">Gemiddelde fooi per uur</h3>
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs text-muted-foreground">Gemiddelde over alle periodes</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Gemiddelde berekend over alle periodes (incl. uitbetaald)</p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </div>
            </div>
            <span className="font-bold text-[#9b87f5]">€{averageTipPerHour.toFixed(2)} / uur</span>
          </div> : <div className="text-center py-2 text-muted-foreground">
            <p>{getEmptyStateMessage()}</p>
          </div>}
      </CardContent>
    </Card>;
  
  const hasAnyPeriodWithTips = periods.some(period => period.tips.length > 0);
  
  return <div className="space-y-4 w-full max-w-full px-1 sm:px-4">
      <h1 className="text-xl font-bold">Analyse</h1>
      
      <AverageTipCard />
      
      <TipChart />
      
      <Card className="w-full">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-lg">Verloop van fooi per uur</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <p className="text-muted-foreground mb-2 text-sm">
            Deze grafiek toont het verloop van de gemiddelde fooi per uur over verschillende periodes, inclusief uitbetaalde periodes.
            {lineChartData.length < periodData.filter(period => period.total > 0).length && ` (Laatste ${lineChartData.length} periodes weergegeven)`}
          </p>
          {hasAnyPeriodWithTips ? (
            <div className="h-[300px] sm:h-[350px] md:h-[400px] w-full">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={lineChartData} 
                    margin={{
                      top: 10,
                      right: isMobile ? 5 : 20,
                      left: isMobile ? 5 : 20,
                      bottom: isMobile ? 70 : 40
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      tickMargin={5} 
                      height={60} 
                      tick={{
                        fontSize: isMobile ? 8 : 10
                      }} 
                      interval={0} 
                      angle={-45} 
                      textAnchor="end" 
                    />
                    <YAxis 
                      width={isMobile ? 30 : 40} 
                      tick={{
                        fontSize: isMobile ? 10 : 12
                      }} 
                    />
                    <ChartTooltip 
                      content={({active, payload}) => {
                        if (active && payload && payload.length) {
                          return <ChartTooltipContent formatter={(value: number) => [`€${value.toFixed(2)}`, 'Gem. fooi per uur']} />;
                        }
                        return null;
                      }} 
                    />
                    <Legend 
                      wrapperStyle={{
                        fontSize: isMobile ? '10px' : '12px',
                        marginTop: isMobile ? '10px' : '5px'
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="average" 
                      name="Gem. fooi per uur" 
                      stroke="#33C3F0" 
                      strokeWidth={2} 
                      dot={{
                        r: isMobile ? 3 : 5
                      }} 
                      activeDot={{
                        r: isMobile ? 5 : 8
                      }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground h-[300px] sm:h-[350px] md:h-[400px] flex items-center justify-center">
              <p>Er zijn nog geen periodes met fooi gegevens.</p>
              <p className="mt-1">Voeg fooi toe aan een periode om deze grafiek te zien.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="w-full mb-6">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-lg">Gemiddeld fooi per uur</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <p className="text-muted-foreground mb-2 text-sm">
            Het gemiddelde fooi per uur wordt berekend op basis van de totale fooi en de gewerkte uren van het team.
          </p>
          {hasAnyPeriodWithTips ? (
            <ScrollArea className="h-64 w-full">
              <div className="space-y-2 pr-2">
                {periodData.filter(period => period.average > 0 || period.total > 0).reverse().map(period => (
                  <div key={period.id} className="flex justify-between p-2 border rounded-md">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{period.name}</span>
                      {period.isPaid && (
                        <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">
                          Uitbetaald
                        </span>
                      )}
                    </div>
                    <div className="font-medium text-sm">
                      €{period.average.toFixed(2)}/uur
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <p>Er zijn nog geen periodes met fooi gegevens.</p>
              <p className="mt-1">Voeg fooi toe aan een periode om deze lijst te zien.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>;
};

export default Analytics;
