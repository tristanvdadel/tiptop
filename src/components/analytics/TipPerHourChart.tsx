
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useIsMobile } from '@/hooks/use-mobile';

interface PeriodChartData {
  name: string;
  total: number;
  average: number;
  id: string;
  isPaid: boolean;
  timestamp: number;
  isHistorical?: boolean;
}

interface TipPerHourChartProps {
  lineChartData: PeriodChartData[];
  periodData: PeriodChartData[];
  chartConfig: {
    average: {
      label: string;
      color: string;
    };
  };
}

const TipPerHourChart: React.FC<TipPerHourChartProps> = ({ 
  lineChartData, 
  periodData, 
  chartConfig 
}) => {
  const isMobile = useIsMobile();
  const hasAnyPeriodWithTips = periodData.some(period => period.total > 0);

  return (
    <Card className="w-full">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-lg">Verloop van fooi per uur</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <p className="text-muted-foreground mb-2 text-sm">
          Deze grafiek toont het verloop van de gemiddelde fooi per uur over verschillende periodes, inclusief uitbetaalde periodes.
          {lineChartData.length < periodData.filter(period => period.total > 0).length && 
            ` (Laatste ${lineChartData.length} periodes weergegeven)`}
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
  );
};

export default TipPerHourChart;
