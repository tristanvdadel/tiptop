
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TeamMember } from '@/contexts/types';

interface TipDistributionProps {
  distribution: TeamMember[];
  totalTips: number;
  totalHours: number;
}

const TipDistribution: React.FC<TipDistributionProps> = ({
  distribution,
  totalTips,
  totalHours
}) => {
  // Calculate the tip per hour
  const tipPerHour = totalHours > 0 ? totalTips / totalHours : 0;
  
  // Sort distribution by tip amount (highest first)
  const sortedDistribution = [...distribution]
    .filter(item => item.hours > 0)
    .sort((a, b) => (b.tipAmount || 0) - (a.tipAmount || 0));

  return (
    <Card className="mb-6 border-green-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Voorlopige verdeling</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm space-y-1 mb-4">
          <p>
            <span className="text-muted-foreground">Totale fooi: </span>
            <span className="font-medium">€{totalTips.toFixed(2)}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Totaal uren: </span>
            <span className="font-medium">{totalHours.toFixed(1)} uur</span>
          </p>
          <p>
            <span className="text-muted-foreground">Fooi per uur: </span>
            <span className="font-medium">€{tipPerHour.toFixed(2)}/uur</span>
          </p>
        </div>
        
        <div className="overflow-auto max-h-60">
          <table className="w-full">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="text-left font-medium py-2">Naam</th>
                <th className="text-right font-medium py-2">Uren</th>
                <th className="text-right font-medium py-2">Fooi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedDistribution.map(member => (
                <tr key={member.id} className="text-sm">
                  <td className="py-2">{member.name}</td>
                  <td className="text-right py-2">{member.hours.toFixed(1)}</td>
                  <td className="text-right font-medium py-2">€{(member.tipAmount || 0).toFixed(2)}</td>
                </tr>
              ))}
              {sortedDistribution.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-4 text-muted-foreground">
                    Geen teamleden met geregistreerde uren gevonden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default TipDistribution;
