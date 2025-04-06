
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useMemo } from 'react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import TipChart from '@/components/TipChart';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const Analytics = () => {
  const {
    periods,
    calculateAverageTipPerHour,
    teamMembers,
    payouts
  } = useApp();

  // Calculate all-time average tip per hour, include paid periods
  const averageTipPerHour = useMemo(() => {
    return calculateAverageTipPerHour();
  }, [calculateAverageTipPerHour]);

  // Create period data for charts, including all periods (active, inactive, and paid)
  const periodData = useMemo(() => {
    return periods
      .map(period => {
        const totalTips = period.tips.reduce((sum, tip) => sum + tip.amount, 0);
        const startDate = format(new Date(period.startDate), 'd MMM', {
          locale: nl
        });
        const endDate = period.endDate ? format(new Date(period.endDate), 'd MMM', {
          locale: nl
        }) : 'Actief';

        // Always calculate average tip per hour for all periods, including paid ones
        const averageTipPerHour = calculateAverageTipPerHour(period.id);
        
        // Add timestamp for sorting
        const timestamp = new Date(period.startDate).getTime();
        
        return {
          name: `${startDate} - ${endDate}`,
          total: totalTips,
          average: averageTipPerHour,
          id: period.id,
          isPaid: period.isPaid,
          timestamp: timestamp
        };
      })
      // Sort periods by start date
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [periods, calculateAverageTipPerHour]);

  // Determine the empty state message
  const getEmptyStateMessage = () => {
    const allPeriods = periods;
    const periodsWithTips = allPeriods.some(period => period.tips.length > 0);
    const teamHasHours = teamMembers.some(member => member.hours > 0);
    if (!periodsWithTips && !teamHasHours) {
      return "Er ontbreken uur gegevens en fooi gegevens. Voeg ze toe om een gemiddelde te zien.";
    } else if (!periodsWithTips) {
      return "Er ontbreken fooi gegevens. Voeg ze toe om een gemiddelde te zien.";
    } else if (!teamHasHours) {
      return "Er ontbreken uur gegevens. Voeg ze toe om een gemiddelde te zien.";
    }
    return ""; // Fallback, should not happen
  };

  // Create the average tip per hour card component with dynamic empty state
  const AverageTipCard = () => <Card className="mb-4">
      <CardContent className="p-4">
        {averageTipPerHour > 0 ? <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">Gemiddelde fooi per uur</h3>
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <Info size={16} className="text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Gemiddelde berekend over alle periodes (incl. uitbetaald)</p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </div>
            <span className="font-medium">€{averageTipPerHour.toFixed(2)} / uur</span>
          </div> : <div className="text-center py-2 text-muted-foreground">
            <p>{getEmptyStateMessage()}</p>
          </div>}
      </CardContent>
    </Card>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Analyse</h1>
      
      {/* Always display the average tip per hour at the top, even for empty state */}
      <AverageTipCard />
      
      <TipChart />
      
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-lg">Verloop van fooi per uur</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <p className="text-muted-foreground mb-2 text-sm">
            Deze grafiek toont het verloop van de gemiddelde fooi per uur over verschillende periodes, inclusief uitbetaalde periodes.
          </p>
          {periodData.filter(period => period.average > 0).length > 0 ? (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={periodData.filter(period => period.average > 0)} margin={{
                  top: 10,
                  right: 20,
                  left: 20,
                  bottom: 5
                }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [`€${value.toFixed(2)}`, 'Gem. fooi per uur']} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="average" 
                    name="Gem. fooi per uur" 
                    stroke="#33C3F0" 
                    strokeWidth={2} 
                    dot={{r: 5}} 
                    activeDot={{r: 8}}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <p>Er zijn nog geen periodes met voldoende gegevens om een gemiddelde te berekenen.</p>
              <p className="mt-1">Zorg dat er voor elke periode zowel uren als fooien zijn ingevoerd.</p>
            </div>
          )}
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
          {periodData.filter(period => period.average > 0).length > 0 ? (
            <div className="space-y-2">
              {periodData.filter(period => period.average > 0)
                // Reverse the array to show the latest period at the top
                .reverse()
                .map(period => (
                  <div key={period.id} className="flex justify-between p-2 border rounded-md">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{period.name}</span>
                      {period.isPaid && (
                        <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">
                          Uitbetaald
                        </span>
                      )}
                    </div>
                    <div className="font-medium text-sm">€{period.average.toFixed(2)}/uur</div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <p>Er zijn nog geen periodes met voldoende gegevens om een gemiddelde te berekenen.</p>
              <p className="mt-1">Zorg dat er voor elke periode zowel uren als fooien zijn ingevoerd.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
