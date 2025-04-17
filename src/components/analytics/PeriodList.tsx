
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PeriodChartData {
  name: string;
  total: number;
  average: number;
  id: string;
  isPaid: boolean;
  timestamp: number;
  isHistorical?: boolean;
}

interface PeriodListProps {
  periodData: PeriodChartData[];
}

const PeriodList: React.FC<PeriodListProps> = ({ periodData }) => {
  const hasAnyPeriodWithTips = periodData.some(period => period.total > 0);

  return (
    <Card className="w-full mb-6">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-lg">Gemiddeld fooi per uur</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <p className="text-muted-foreground mb-2 text-sm">
          Het gemiddelde fooi per uur wordt berekend op basis van de totale fooi en de gewerkte uren van het team.
          <span className="font-medium ml-1">Inclusief uitbetaalde periodes.</span>
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
                    {period.isHistorical && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                        Historisch
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
  );
};

export default PeriodList;
