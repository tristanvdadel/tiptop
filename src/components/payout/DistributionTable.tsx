
import React, { useRef } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { TeamMember } from '@/types/models';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  
  const fixedColumnStyle = {
    position: 'sticky' as const,
    left: 0,
    backgroundColor: 'white',
    zIndex: 20,
    boxShadow: '2px 0 5px rgba(0, 0, 0, 0.05)'
  };
  
  return (
    <div className="border rounded-md overflow-hidden relative bg-white">
      <ScrollArea className="h-full w-full">
        <div className="min-w-[600px]"> {/* Reduced from 800px */}
          <Table className="relative bg-white">
            <TableHeader className="bg-white">
              <TableRow className="bg-white">
                <TableHead style={fixedColumnStyle} className="bg-white w-1/6">Naam</TableHead>
                <TableHead className="text-right w-1/6 bg-white">Berekend</TableHead>
                <TableHead className="text-right w-1/6 bg-white">Saldo</TableHead>
                <TableHead className="text-right w-1/6 bg-white">Totaal</TableHead>
                <TableHead className="text-right w-1/6 bg-white">Uitbetaald</TableHead>
                <TableHead className="text-right w-1/6 bg-white">Nieuw saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white">
              {distribution.map((item, index) => {
                const member = findTeamMember(item.memberId);
                const calculatedAmount = item.amount;
                const originalBalance = originalBalances[item.memberId] || 0;
                const totalAmount = calculatedAmount + originalBalance;
                const actualAmount = isEditing ? item.actualAmount : item.actualAmount || totalAmount;
                const newBalance = isEditing ? item.balance : totalAmount - actualAmount;
                
                return (
                  <TableRow key={index} className={`${isEditing && item.isEdited ? "bg-amber-50" : "bg-white"}`}>
                    <TableCell 
                      style={fixedColumnStyle}
                      className="bg-white font-medium truncate"
                    >
                      {member ? member.name : 'Onbekend'}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap bg-white text-sm">€{calculatedAmount.toFixed(2)}</TableCell>
                    <TableCell className={`text-right whitespace-nowrap bg-white text-sm ${originalBalance > 0 ? 'text-green-600' : originalBalance < 0 ? 'text-red-600' : ''}`}>
                      {originalBalance !== 0 ? `€${Math.abs(originalBalance).toFixed(2)} ${originalBalance > 0 ? '+' : '-'}` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium whitespace-nowrap bg-white text-sm">
                      €{totalAmount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium whitespace-nowrap bg-white text-sm">
                      {isEditing ? (
                        <Input 
                          type="number" 
                          value={actualAmount} 
                          onChange={e => handleAmountChange(item.memberId, e.target.value)} 
                          className="w-20 text-right inline-block h-8 text-sm" 
                          min="0" 
                          step="0.01" 
                        />
                      ) : `€${actualAmount.toFixed(2)}`}
                    </TableCell>
                    <TableCell className={`text-right whitespace-nowrap bg-white text-sm ${newBalance && newBalance > 0 ? 'text-green-600' : newBalance && newBalance < 0 ? 'text-red-600' : ''}`}>
                      {newBalance !== undefined && newBalance !== 0 ? `€${Math.abs(newBalance).toFixed(2)} ${newBalance > 0 ? '+' : '-'}` : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>
      
      <div className="p-2 border-t flex justify-between bg-white">
        <span className="font-medium">Totaal</span>
        <span className="font-medium">
          €{distribution.reduce((sum, item) => sum + item.actualAmount, 0).toFixed(2)}
        </span>
      </div>
    </div>
  );
};

export default DistributionTable;
