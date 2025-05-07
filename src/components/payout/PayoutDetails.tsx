
import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TeamMember, PayoutDistribution } from '@/types/models';
import { formatCurrency } from '@/lib/utils';

interface PayoutDetailItem {
  memberId: string;
  amount: number;
  actualAmount?: number;
  balance?: number;
  hours?: number;
}

// Extended TeamMember type for display purposes
interface DisplayTeamMember extends TeamMember {
  actualAmount?: number;
}

export interface PayoutData {
  id: string;
  date: string;
  totalAmount: number;
  distribution: PayoutDetailItem[];
}

interface PayoutDetailsProps {
  distribution?: DisplayTeamMember[];
  totalTips?: number;
  totalHours?: number;
  payout?: PayoutData;
}

const PayoutDetails = ({ distribution, totalTips, totalHours, payout }: PayoutDetailsProps) => {
  const [hourlyRate, setHourlyRate] = useState<number>(0);
  
  useEffect(() => {
    if (totalHours && totalHours > 0 && totalTips && totalTips > 0) {
      setHourlyRate(totalTips / totalHours);
    } else {
      setHourlyRate(0);
    }
  }, [totalTips, totalHours]);

  // Convert payout data to the format needed for rendering if payout is provided
  const displayDistribution = distribution || 
    (payout?.distribution.map(item => {
      const member = {
        id: item.memberId,
        name: '', // This will be filled by TeamMember lookup in the parent component
        hours: item.hours || 0,
        tipAmount: item.amount,
        balance: item.balance || 0,
        actualAmount: item.actualAmount,
        team_id: '' // Required by TeamMember type
      } as DisplayTeamMember;
      return member;
    }) || []);

  const showBalance = displayDistribution.some(member => member.balance !== 0);
  const showActualAmount = displayDistribution.some(member => member.actualAmount !== undefined && member.actualAmount !== member.tipAmount);

  return (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <div className="text-sm font-medium mb-2">Overzicht fooi verdeling</div>
        
        <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
          <div>Totale fooi:</div>
          <div className="text-right font-medium">
            {formatCurrency(totalTips || payout?.totalAmount || 0)}
          </div>
          
          {(totalHours !== undefined) && (
            <>
              <div>Totale uren:</div>
              <div className="text-right font-medium">{totalHours.toFixed(1)}</div>
              
              <div>Fooi per uur:</div>
              <div className="text-right font-medium">{formatCurrency(hourlyRate)}</div>
            </>
          )}
        </div>
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Naam</TableHead>
              <TableHead className="text-right">Uren</TableHead>
              <TableHead className="text-right">Fooi</TableHead>
              {showBalance && (
                <TableHead className="text-right">Balans</TableHead>
              )}
              {showActualAmount && (
                <TableHead className="text-right">Uitbetaald</TableHead>
              )}
              {(showBalance || showActualAmount) && (
                <TableHead className="text-right">Nieuw saldo</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayDistribution.map((member) => {
              const tipAmount = member.tipAmount || 0;
              const balance = member.balance || 0;
              const actualAmount = member.actualAmount !== undefined ? member.actualAmount : tipAmount;
              const newBalance = balance + (tipAmount - actualAmount);
              
              return (
                <TableRow key={member.id}>
                  <TableCell>{member.name}</TableCell>
                  <TableCell className="text-right">{member.hours.toFixed(1)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(tipAmount)}</TableCell>
                  {showBalance && (
                    <TableCell className="text-right">{formatCurrency(balance)}</TableCell>
                  )}
                  {showActualAmount && (
                    <TableCell className={`text-right ${tipAmount !== actualAmount ? 'font-medium text-yellow-700' : ''}`}>
                      {formatCurrency(actualAmount)}
                    </TableCell>
                  )}
                  {(showBalance || showActualAmount) && (
                    <TableCell className="text-right font-medium">
                      {formatCurrency(newBalance)}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default PayoutDetails;
