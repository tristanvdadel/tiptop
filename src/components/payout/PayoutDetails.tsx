
import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TeamMember } from '@/contexts/AppContext';
import { formatCurrency } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';

interface PayoutDetailItem {
  memberId: string;
  amount: number;
  actualAmount?: number;
  balance?: number;
  hours?: number; // Property to store hours
}

export interface PayoutData {
  id: string;
  date: string;
  payerName?: string;
  payoutTime?: string;
  totalAmount?: number; // Made optional so it works with Payout interface too
  totalHours?: number;
  distribution: PayoutDetailItem[];
  periodIds?: string[];
}

interface PayoutDetailsProps {
  distribution?: TeamMember[];
  totalTips?: number;
  totalHours?: number;
  payout?: PayoutData;
}

const PayoutDetails = ({ distribution, totalTips, totalHours, payout }: PayoutDetailsProps) => {
  const [hourlyRate, setHourlyRate] = useState<number>(0);
  const { teamMembers } = useApp();
  
  useEffect(() => {
    // Calculate the average tip per hour
    if (totalHours && totalHours > 0 && totalTips && totalTips > 0) {
      setHourlyRate(totalTips / totalHours);
    } else if (payout?.totalHours && payout.totalHours > 0 && payout?.totalAmount) {
      // If we're using a payout and it has hours, calculate from that
      setHourlyRate(payout.totalAmount / payout.totalHours);
    } else {
      setHourlyRate(0);
    }
  }, [totalTips, totalHours, payout]);

  // Convert payout data to the format needed for rendering if payout is provided
  const displayDistribution = distribution || 
    (payout?.distribution.map(item => {
      // Find the team member by ID to get their name
      const teamMember = teamMembers.find(m => m.id === item.memberId);
      
      return {
        id: item.memberId,
        name: teamMember?.name || 'Onbekend lid',
        hours: item.hours || 0, // Use hours from the payout if available
        tipAmount: item.amount,
        balance: item.balance || 0
      } as TeamMember;
    }) || []);

  const showBalance = displayDistribution.some(member => (member.balance || 0) !== 0);
  const effectiveTotalHours = totalHours || payout?.totalHours || 0;

  return (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <div className="text-sm font-medium mb-2">Overzicht fooi verdeling</div>
        
        <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
          <div>Totale fooi:</div>
          <div className="text-right font-medium">
            {formatCurrency(totalTips || payout?.totalAmount || 0)}
          </div>
          
          {(effectiveTotalHours > 0) && (
            <>
              <div>Totale uren:</div>
              <div className="text-right font-medium">{effectiveTotalHours.toFixed(1)}</div>
              
              <div>Fooi per uur:</div>
              <div className="text-right font-medium">{formatCurrency(hourlyRate)}</div>
            </>
          )}
        </div>
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Naam</TableHead>
              {effectiveTotalHours > 0 && (
                <TableHead className="text-right">Uren</TableHead>
              )}
              <TableHead className="text-right">Fooi</TableHead>
              {showBalance && (
                <TableHead className="text-right">Balans</TableHead>
              )}
              {showBalance && (
                <TableHead className="text-right">Totaal</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayDistribution.map((member) => (
              <TableRow key={member.id}>
                <TableCell>{member.name}</TableCell>
                {effectiveTotalHours > 0 && (
                  <TableCell className="text-right">{member.hours.toFixed(1)}</TableCell>
                )}
                <TableCell className="text-right">{formatCurrency(member.tipAmount || 0)}</TableCell>
                {showBalance && (
                  <TableCell className="text-right">{formatCurrency(member.balance || 0)}</TableCell>
                )}
                {showBalance && (
                  <TableCell className="text-right font-medium">
                    {formatCurrency((member.tipAmount || 0) + (member.balance || 0))}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default PayoutDetails;
