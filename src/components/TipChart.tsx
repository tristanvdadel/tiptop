import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/contexts/AppContext';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { nl } from 'date-fns/locale';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useIsMobile } from '@/hooks/use-mobile';

const TipChart = () => {
  const { periods } = useApp();
  const isMobile = useIsMobile();

  const chartData = useMemo(() => {
    const today = new Date();
    const data = [];

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

      periods.forEach((period, index) => {
        const periodTips = period.tips.filter(tip => {
          const tipDate = new Date(tip.date);
          return tipDate >= dateStart && tipDate <= dateEnd;
        });
        const totalAmount = periodTips.reduce((sum, tip) => sum + tip.amount, 0);

        if (totalAmount > 0) {
          dayData[`period${index}`] = totalAmount;
          dayData[`periodId${index}`] = period.id;
        }
      });
      data.push(dayData);
    }
    return data;
  }, [periods]);

  const chartColors = ['#9b87f5', '#F97316', '#0EA5E9', '#D946EF', '#8B5CF6'];

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
    
    if (bars.length > 3) {
      return bars.slice(-3);
    }
    
    return bars;
  }, [chartData, periods, chartColors]);

  const hasTipsInLastWeek = chartData.some(day => 
    Object.keys(day).some(key => key.startsWith('period'))
  );

  return (
    <Card className="mb-4 w-full">
      <CardHeader className="pb-1 pt-3">
        <CardTitle className="text-lg">Afgelopen 7 dagen</CardTitle>
      </CardHeader>
      <CardContent className="p-2 sm:p-4">
        {hasTipsInLastWeek ? (
          <div className="h-48 relative">
            <ChartContainer config={chartConfig} className="h-full">
              <ResponsiveContainer width="99%" height="100%">
                <BarChart 
                  data={chartData} 
                  margin={{ 
                    top: 5, 
                    right: 0, 
                    bottom: 40,
                    left: 0 
                  }}
                >
                  <XAxis 
                    dataKey="name" 
                    fontSize={isMobile ? 9 : 11}
                    tick={{ fontSize: isMobile ? 9 : 11 }}
                    tickMargin={5}
                  />
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
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center" 
                    wrapperStyle={{ 
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '40px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      fontSize: isMobile ? '8px' : '10px',
                      overflow: 'hidden'
                    }}
                    formatter={(value, entry) => {
                      if (isMobile && value.length > 12) {
                        return `${value.substring(0, 10)}...`;
                      }
                      return value;
                    }}
                  />
                  {barComponents}
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground h-40 sm:h-48 flex items-center justify-center">
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
