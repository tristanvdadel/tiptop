
import React from 'react';
import { TeamMember } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Receipt } from 'lucide-react';

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
  if (distribution.length === 0) {
    return null;
  }

  const getBalanceClass = (balance?: number): string => {
    if (balance === undefined || balance === 0) return '';
    return balance > 0 ? 'text-green-600' : 'text-red-600';
  };

  const formatBalance = (balance?: number): string => {
    if (balance === undefined || balance === 0) return '€0.00';
    return balance > 0 ? `+€${balance.toFixed(2)}` : `-€${Math.abs(balance).toFixed(2)}`;
  };

  return (
    <div className="mb-6">
      <h2 className="text-lg font-medium mb-2 flex items-center">
        <Receipt className="h-5 w-5 mr-2" />
        Fooi verdeling
      </h2>
      <Card>
        <CardHeader className="pb-2 border-b">
          <CardTitle className="flex justify-between text-sm font-medium text-muted-foreground">
            <span>Overzicht</span>
            <span>Totaal: €{totalTips.toFixed(2)} | Uren: {totalHours.toFixed(1)}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {distribution.length > 0 ? (
            <div className="space-y-4">
              <div className="flex justify-between text-xs text-muted-foreground border-b pb-2">
                <div>Teamlid</div>
                <div className="flex space-x-6">
                  <div className="w-16 text-right">Uren</div>
                  <div className="w-16 text-right">Saldo</div>
                  <div className="w-20 text-right">Uitbetaling</div>
                </div>
              </div>
              
              <ul className="space-y-2">
                {distribution.map(member => (
                  <li key={member.id} className="flex justify-between items-center py-1">
                    <div className="font-medium">{member.name}</div>
                    <div className="flex space-x-6">
                      <div className="w-16 text-right text-gray-600">{member.hours.toFixed(1)}</div>
                      <div className={`w-16 text-right ${getBalanceClass(member.balance)}`}>
                        {member.balance !== undefined && member.balance !== 0 ? formatBalance(member.balance) : '€0.00'}
                      </div>
                      <div className="w-20 text-right font-medium">
                        €{member.tipAmount?.toFixed(2) || '0.00'}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between font-medium">
                  <span>Fooi per uur</span>
                  <span>€{totalHours > 0 ? (totalTips / totalHours).toFixed(2) : '0.00'}</span>
                </div>
                <div className="flex justify-between font-medium text-lg mt-2">
                  <span>Totaal</span>
                  <span>€{distribution.reduce((sum, member) => sum + (member.tipAmount || 0), 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ) : (
            <p>
              {distribution.length === 0 ? "Geen teamleden gevonden." : "Geen uren ingesteld om verdeling te berekenen. Een gelijke verdeling zal worden toegepast."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TipDistribution;
