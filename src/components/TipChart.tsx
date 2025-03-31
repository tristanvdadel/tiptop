
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/contexts/AppContext';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { nl } from 'date-fns/locale';

const TipChart = () => {
  const { currentPeriod } = useApp();
  
  const chartData = useMemo(() => {
    if (!currentPeriod) return [];
    
    const today = new Date();
    const data = [];
    
    // Create data for last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStart = startOfDay(date);
      const dateEnd = endOfDay(date);
      
      // Filter tips for this day
      const dayTips = currentPeriod.tips.filter(tip => {
        const tipDate = new Date(tip.date);
        return tipDate >= dateStart && tipDate <= dateEnd;
      });
      
      // Sum up tips for the day
      const totalAmount = dayTips.reduce((sum, tip) => sum + tip.amount, 0);
      
      data.push({
        name: format(date, 'E', { locale: nl }),
        amount: totalAmount,
      });
    }
    
    return data;
  }, [currentPeriod]);
  
  if (!currentPeriod || chartData.every(day => day.amount === 0)) {
    return null;
  }
  
  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Afgelopen 7 dagen</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" />
              <Tooltip 
                formatter={(value: number) => [`€${value.toFixed(2)}`, 'Fooi']}
                labelFormatter={(label) => `${label}`}
              />
              <Bar dataKey="amount" fill="#FFD700" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default TipChart;
