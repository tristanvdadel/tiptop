
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/contexts/AppContext';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { nl } from 'date-fns/locale';

const TipChart = () => {
  const {
    periods
  } = useApp();

  // Chart data calculation
  const chartData = useMemo(() => {
    // Get periods data from the last 7 days, including paid periods
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

      // Add data for each period, including paid periods
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

  const chartColors = ['#9b87f5', '#F97316', '#0EA5E9', '#D946EF', '#8B5CF6'];

  // Create bar components for each period
  const barComponents = useMemo(() => {
    const bars = [];
    periods.forEach((period, index) => {
      if (chartData.some(day => day[`period${index}`] !== undefined)) {
        let periodName = 'Periode';
        if (period.isActive) {
          periodName = 'Actieve periode';
        } else if (period.isPaid) {
          periodName = `Uitbetaalde periode (${format(new Date(period.startDate), 'd MMM', { locale: nl })})`;
        } else {
          periodName = `Periode ${format(new Date(period.startDate), 'd MMM', { locale: nl })}`;
        }
            
        bars.push(
          <Bar 
            key={period.id} 
            dataKey={`period${index}`} 
            name={periodName} 
            fill={chartColors[index % chartColors.length]} 
          />
        );
      }
    });
    return bars;
  }, [chartData, periods, chartColors]);

  // Only hide the chart if there's absolutely no data to show
  const hasAnyPeriodWithTips = periods.some(period => period.tips.length > 0);
  
  // Check if there's any tip data in the last 7 days
  const hasTipsInLastWeek = chartData.some(day => 
    Object.keys(day).some(key => key.startsWith('period'))
  );

  if (!hasAnyPeriodWithTips) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Afgelopen 7 dagen</CardTitle>
      </CardHeader>
      <CardContent>
        {hasTipsInLastWeek ? (
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
        ) : (
          <div className="text-center py-4 text-muted-foreground h-48 flex items-center justify-center">
            <div>
              <p>Geen fooien in de afgelopen 7 dagen.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TipChart;
