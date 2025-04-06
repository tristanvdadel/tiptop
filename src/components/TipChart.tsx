
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/contexts/AppContext';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { nl } from 'date-fns/locale';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

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

  // Create chart config for each period
  const chartConfig = useMemo(() => {
    const config = {};
    periods.forEach((period, index) => {
      if (chartData.some(day => day[`period${index}`] !== undefined)) {
        let periodName = 'Periode';
        if (period.isActive) {
          periodName = 'Actieve periode';
        } else if (period.isPaid) {
          periodName = `Uitbetaald (${format(new Date(period.startDate), 'd MMM', { locale: nl })})`;
        } else {
          periodName = `Periode ${format(new Date(period.startDate), 'd MMM', { locale: nl })}`;
        }
            
        config[`period${index}`] = {
          label: periodName,
          color: chartColors[index % chartColors.length]
        };
      }
    });
    return config;
  }, [chartData, periods, chartColors]);

  // Create bar components for each period, limited to display most recent or active
  const barComponents = useMemo(() => {
    const bars = [];
    periods.forEach((period, index) => {
      if (chartData.some(day => day[`period${index}`] !== undefined)) {
        let periodName = 'Periode';
        if (period.isActive) {
          periodName = 'Actieve periode';
        } else if (period.isPaid) {
          periodName = `Uitbetaald (${format(new Date(period.startDate), 'd MMM', { locale: nl })})`;
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
    
    // Limit to 5 most recent periods if there are more than 5
    // The most recent periods are at the end of the array
    if (bars.length > 5) {
      return bars.slice(-5);
    }
    
    return bars;
  }, [chartData, periods, chartColors]);

  // Check if there's any tip data in the last 7 days
  const hasTipsInLastWeek = chartData.some(day => 
    Object.keys(day).some(key => key.startsWith('period'))
  );

  // Always show the chart, even if there's no data in the last 7 days
  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Afgelopen 7 dagen</CardTitle>
      </CardHeader>
      <CardContent>
        {hasTipsInLastWeek ? (
          <div className="h-48">
            <ChartContainer config={chartConfig} className="h-full">
              <BarChart data={chartData}>
                <XAxis dataKey="name" />
                <ChartTooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <ChartTooltipContent 
                          formatter={(value: number) => [`€${value.toFixed(2)}`, payload[0].name]}
                        />
                      );
                    }
                    return null;
                  }}
                />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ maxHeight: '50px', overflowY: 'auto' }} />
                {barComponents}
              </BarChart>
            </ChartContainer>
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
