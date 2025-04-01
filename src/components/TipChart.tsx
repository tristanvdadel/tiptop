
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/contexts/AppContext';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { Info } from 'lucide-react';
import { 
  Tooltip as UITooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

const TipChart = () => {
  const {
    periods,
    calculateAverageTipPerHour
  } = useApp();
  const navigate = useNavigate();
  const chartData = useMemo(() => {
    // Get periods data from the last 7 days, regardless of whether there is an active period
    const today = new Date();
    const data = [];

    // Create data for last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStart = startOfDay(date);
      const dateEnd = endOfDay(date);
      const dayData = {
        name: format(date, 'E', {
          locale: nl
        }),
        date: date.toISOString()
      };

      // Add data for each period
      periods.forEach((period, index) => {
        const periodTips = period.tips.filter(tip => {
          const tipDate = new Date(tip.date);
          return tipDate >= dateStart && tipDate <= dateEnd;
        });
        const totalAmount = periodTips.reduce((sum, tip) => sum + tip.amount, 0);

        // Add to chart data with the period id as the key
        if (totalAmount > 0) {
          dayData[`period${index}`] = totalAmount;
          // Store period id for reference
          dayData[`periodId${index}`] = period.id;
        }
      });
      data.push(dayData);
    }
    return data;
  }, [periods]);

  // Calculate all-time average tip per hour
  const averageTipPerHour = useMemo(() => {
    return calculateAverageTipPerHour();
  }, [calculateAverageTipPerHour]);
  const chartColors = ['#9b87f5', '#F97316', '#0EA5E9', '#D946EF', '#8B5CF6'];

  // Create bar components for each period
  const barComponents = useMemo(() => {
    const bars = [];
    periods.forEach((period, index) => {
      if (chartData.some(day => day[`period${index}`] !== undefined)) {
        bars.push(<Bar key={period.id} dataKey={`period${index}`} name={period.isActive ? 'Actieve periode' : `Periode ${format(new Date(period.startDate), 'd MMM', {
          locale: nl
        })}`} fill={chartColors[index % chartColors.length]} />);
      }
    });
    return bars;
  }, [chartData, periods, chartColors]);
  
  const handleAverageClick = () => {
    navigate('/analytics');
  };
  
  if (chartData.every(day => Object.keys(day).length <= 2)) {
    // Only has name and date props
    return null;
  }
  
  return <div className="space-y-4">
      {averageTipPerHour > 0 && (
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={handleAverageClick}>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">Gemiddelde fooi per uur</h3>
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                      >
                        <Info size={16} className="text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Bekijk gedetailleerde analytische gegevens</p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </div>
              <span className="font-medium">€{averageTipPerHour.toFixed(2)} / uur</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Afgelopen 7 dagen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" />
                <Tooltip formatter={(value: number, name: string) => [`€${value.toFixed(2)}`, name]} labelFormatter={label => `${label}`} />
                <Legend />
                {barComponents}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>;
};
export default TipChart;
