
import React, { useRef, useEffect } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { TeamMember } from '@/contexts/AppContext';
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
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Style for the fixed name column
  const fixedColumnStyle = {
    position: 'sticky' as const,
    left: 0,
    backgroundColor: 'white',
    zIndex: 10,
    boxShadow: '2px 0 5px rgba(0, 0, 0, 0.05)'
  };
  
  return (
    <div className="border rounded-md overflow-hidden">
      <div className="relative overflow-x-auto" ref={scrollRef}>
        <ScrollArea className="h-[300px]">
          <div className="min-w-[700px]"> {/* Set minimum width to ensure horizontal scrolling on mobile */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead style={fixedColumnStyle} className="bg-white">Naam</TableHead>
                  <TableHead className="text-right min-w-[100px]">Berekend</TableHead>
                  <TableHead className="text-right min-w-[100px]">Saldo</TableHead>
                  <TableHead className="text-right min-w-[100px]">Totaal</TableHead>
                  <TableHead className="text-right min-w-[100px]">Uitbetaald</TableHead>
                  <TableHead className="text-right min-w-[100px]">Nieuw saldo</TableHead>
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
                      <TableCell 
                        style={fixedColumnStyle}
                        className="bg-white min-w-[120px] font-medium"
                      >
                        {member ? member.name : 'Onbekend teamlid'}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">€{calculatedAmount.toFixed(2)}</TableCell>
                      <TableCell className={`text-right whitespace-nowrap ${originalBalance > 0 ? 'text-green-600' : originalBalance < 0 ? 'text-red-600' : ''}`}>
                        {originalBalance !== 0 ? `€${Math.abs(originalBalance).toFixed(2)} ${originalBalance > 0 ? '+' : '-'}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        €{totalAmount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
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
                      <TableCell className={`text-right whitespace-nowrap ${newBalance && newBalance > 0 ? 'text-green-600' : newBalance && newBalance < 0 ? 'text-red-600' : ''}`}>
                        {newBalance !== undefined && newBalance !== 0 ? `€${Math.abs(newBalance).toFixed(2)} ${newBalance > 0 ? '+' : '-'}` : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </div>
      
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
