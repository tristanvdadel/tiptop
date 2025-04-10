
import React from 'react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TeamMember } from '@/contexts/types';

interface PayoutDetailWithEdits {
  memberId: string;
  amount: number;
  actualAmount: number;
  balance: number | undefined;
  isEdited: boolean;
}

interface DistributionTableProps {
  distribution: PayoutDetailWithEdits[];
  isEditing: boolean;
  findTeamMember: (id: string) => TeamMember | undefined;
  originalBalances: {[key: string]: number | undefined};
  handleAmountChange: (memberId: string, actualAmount: string) => void;
}

const DistributionTable = ({
  distribution,
  isEditing,
  findTeamMember,
  originalBalances,
  handleAmountChange
}: DistributionTableProps) => {
  return (
    <div className="border rounded-md overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Naam</TableHead>
            <TableHead className="text-right">Te ontvangen</TableHead>
            {isEditing && <TableHead className="text-right">Bedrag</TableHead>}
            <TableHead className="text-right">Nieuw saldo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {distribution.map(item => {
            const member = findTeamMember(item.memberId);
            const calculatedAmount = item.amount;
            const originalBalance = originalBalances[item.memberId] || 0;
            const totalToReceive = calculatedAmount + originalBalance;
            const actuallyPaid = item.actualAmount;
            const newBalance = totalToReceive - actuallyPaid;
            
            return (
              <TableRow key={item.memberId} className={item.isEdited ? "bg-green-50" : ""}>
                <TableCell className="font-medium">{member?.name || 'Onbekend'}</TableCell>
                <TableCell className="text-right">
                  €{calculatedAmount.toFixed(2)}
                  {originalBalance > 0 && (
                    <div className="text-xs text-muted-foreground">
                      + €{originalBalance.toFixed(2)} saldo = €{totalToReceive.toFixed(2)}
                    </div>
                  )}
                </TableCell>
                {isEditing ? (
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={actuallyPaid.toString()}
                      onChange={(e) => handleAmountChange(item.memberId, e.target.value)}
                      className="w-20 ml-auto text-right"
                    />
                  </TableCell>
                ) : null}
                <TableCell className={`text-right ${newBalance > 0 ? 'text-amber-600' : ''}`}>
                  €{newBalance.toFixed(2)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default DistributionTable;
