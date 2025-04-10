
import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TeamMember } from '@/contexts/AppContext';
import { formatCurrency } from '@/lib/utils';

interface PayoutDetailsProps {
  distribution: TeamMember[];
  totalTips: number;
  totalHours: number;
}

const PayoutDetails = ({ distribution, totalTips, totalHours }: PayoutDetailsProps) => {
  const [hourlyRate, setHourlyRate] = useState<number>(0);
  
  useEffect(() => {
    if (totalHours > 0 && totalTips > 0) {
      setHourlyRate(totalTips / totalHours);
    } else {
      setHourlyRate(0);
    }
  }, [totalTips, totalHours]);

  return (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <div className="text-sm font-medium mb-2">Overzicht fooi verdeling</div>
        
        <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
          <div>Totale fooi:</div>
          <div className="text-right font-medium">{formatCurrency(totalTips)}</div>
          
          <div>Totale uren:</div>
          <div className="text-right font-medium">{totalHours.toFixed(1)}</div>
          
          <div>Fooi per uur:</div>
          <div className="text-right font-medium">{formatCurrency(hourlyRate)}</div>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Naam</TableHead>
              <TableHead className="text-right">Uren</TableHead>
              <TableHead className="text-right">Fooi</TableHead>
              {distribution.some(member => member.balance !== 0) && (
                <TableHead className="text-right">Balans</TableHead>
              )}
              {distribution.some(member => member.balance !== 0) && (
                <TableHead className="text-right">Totaal</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {distribution.map((member) => (
              <TableRow key={member.id}>
                <TableCell>{member.name}</TableCell>
                <TableCell className="text-right">{member.hours.toFixed(1)}</TableCell>
                <TableCell className="text-right">{formatCurrency(member.tipAmount || 0)}</TableCell>
                {distribution.some(m => m.balance !== 0) && (
                  <TableCell className="text-right">{formatCurrency(member.balance || 0)}</TableCell>
                )}
                {distribution.some(m => m.balance !== 0) && (
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
