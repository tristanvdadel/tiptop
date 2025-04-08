
import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { TeamMember } from '@/contexts/AppContext';

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
  originalBalances: { [key: string]: number | undefined };
  handleAmountChange: (memberId: string, actualAmount: string) => void;
}

const DistributionTable: React.FC<DistributionTableProps> = ({
  distribution,
  isEditing,
  findTeamMember,
  originalBalances,
  handleAmountChange
}) => {
  return (
    <div className="border rounded-md overflow-hidden">
      <ScrollArea className="h-[300px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Naam</TableHead>
              <TableHead className="text-right">Berekend</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="text-right">Totaal</TableHead>
              <TableHead className="text-right">Uitbetaald</TableHead>
              <TableHead className="text-right">Nieuw saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {distribution.map((item, index) => {
              const member = findTeamMember(item.memberId);
              const calculatedAmount = item.amount;
              const originalBalance = originalBalances[item.memberId] || 0;
              const totalAmount = calculatedAmount + originalBalance;
              const actualAmount = isEditing ? item.actualAmount : item.actualAmount || totalAmount;
              const newBalance = isEditing ? item.balance : totalAmount - actualAmount;
              
              return (
                <TableRow key={index} className={isEditing && item.isEdited ? "bg-amber-50" : ""}>
                  <TableCell>{member ? member.name : 'Onbekend teamlid'}</TableCell>
                  <TableCell className="text-right">€{calculatedAmount.toFixed(2)}</TableCell>
                  <TableCell className={`text-right ${originalBalance > 0 ? 'text-green-600' : originalBalance < 0 ? 'text-red-600' : ''}`}>
                    {originalBalance !== 0 ? `€${Math.abs(originalBalance).toFixed(2)} ${originalBalance > 0 ? '+' : '-'}` : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    €{totalAmount.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {isEditing ? (
                      <Input 
                        type="number" 
                        value={actualAmount} 
                        onChange={e => handleAmountChange(item.memberId, e.target.value)} 
                        className="w-24 text-right inline-block h-8" 
                        min="0" 
                        step="0.01" 
                      />
                    ) : `€${actualAmount.toFixed(2)}`}
                  </TableCell>
                  <TableCell className={`text-right ${newBalance && newBalance > 0 ? 'text-green-600' : newBalance && newBalance < 0 ? 'text-red-600' : ''}`}>
                    {newBalance !== undefined && newBalance !== 0 ? `€${Math.abs(newBalance).toFixed(2)} ${newBalance > 0 ? '+' : '-'}` : '-'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
      
      <div className="p-2 border-t flex justify-between">
        <span className="font-medium">Totaal</span>
        <span className="font-medium">
          €{distribution.reduce((sum, item) => sum + item.actualAmount, 0).toFixed(2)}
        </span>
      </div>
    </div>
  );
};

export default DistributionTable;
