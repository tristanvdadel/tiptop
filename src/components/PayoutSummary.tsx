import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, ArrowLeft, Download, Copy, Calculator } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface PayoutSummaryProps {
  onClose: () => void;
}

type RoundingOption = 'none' | '0.50' | '1.00' | '2.00' | '5.00' | '10.00';

interface PayoutDetailWithEdits {
  memberId: string;
  amount: number;
  actualAmount: number;
  balance: number | undefined;
  isEdited: boolean;
}

export const PayoutSummary = ({ onClose }: PayoutSummaryProps) => {
  const { payouts, teamMembers, mostRecentPayout, updateTeamMemberBalance } = useApp();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedDistribution, setEditedDistribution] = useState<PayoutDetailWithEdits[]>([]);
  const [roundingOption, setRoundingOption] = useState<RoundingOption>('none');
  
  // Use the most recent payout provided by context, or fall back to the last one in the array
  const latestPayout = mostRecentPayout || (payouts.length > 0 ? payouts[payouts.length - 1] : null);
  
  // Function to find a team member by ID
  const findTeamMember = (id: string) => {
    return teamMembers.find(member => member.id === id);
  };

  // Initialize edited distribution when latestPayout changes
  useEffect(() => {
    if (latestPayout) {
      const initialEditableDistribution = latestPayout.distribution.map(item => ({
        memberId: item.memberId,
        amount: item.amount,
        actualAmount: item.actualAmount || item.amount,
        balance: item.balance,
        isEdited: false
      }));
      
      setEditedDistribution(initialEditableDistribution);
    }
  }, [latestPayout]);
  
  const handleCopyToClipboard = () => {
    if (!latestPayout) return;

    const payoutDate = new Date(latestPayout.date).toLocaleDateString('nl');
    const memberDetails = latestPayout.distribution.map(item => {
      const member = findTeamMember(item.memberId);
      return `${member?.name || 'Onbekend lid'}: €${(item.actualAmount || item.amount).toFixed(2)}`;
    }).join('\n');

    const totalAmount = latestPayout.distribution.reduce(
      (sum, dist) => sum + (dist.actualAmount || dist.amount), 
      0
    );

    const payoutText = `Uitbetaling fooi: ${payoutDate}\n\n${memberDetails}\n\nTotaal: €${totalAmount.toFixed(2)}`;
    
    navigator.clipboard.writeText(payoutText).then(() => {
      toast({
        title: "Gekopieerd naar klembord",
        description: "De uitbetalingsgegevens zijn gekopieerd naar het klembord."
      });
    });
  };

  const downloadCSV = () => {
    if (!latestPayout) return;
    
    const headers = "Naam,Berekend bedrag,Daadwerkelijk uitbetaald,Saldo\n";
    const rows = latestPayout.distribution.map(item => {
      const member = findTeamMember(item.memberId);
      return `${member?.name || 'Onbekend lid'},${item.amount.toFixed(2)},${(item.actualAmount || item.amount).toFixed(2)},${(item.balance || 0).toFixed(2)}`;
    }).join('\n');
    
    const csv = headers + rows;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const payoutDate = new Date(latestPayout.date).toLocaleDateString('nl').replace(/\//g, '-');
    
    link.setAttribute('href', url);
    link.setAttribute('download', `fooi-uitbetaling-${payoutDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "CSV gedownload",
      description: "De uitbetalingsgegevens zijn gedownload als CSV-bestand."
    });
  };

  const handleAmountChange = (memberId: string, actualAmount: string) => {
    const amount = parseFloat(actualAmount);
    
    if (isNaN(amount) || amount < 0) return;
    
    setEditedDistribution(prev => 
      prev.map(item => 
        item.memberId === memberId 
          ? { 
              ...item, 
              actualAmount: amount,
              isEdited: true
            } 
          : item
      )
    );
  };

  const calculateNewBalances = () => {
    if (!editedDistribution.length) return;
    
    // Calculate balance differences for one time only, not cumulative
    const updatedDistribution = editedDistribution.map(item => {
      const originalAmount = item.amount;
      const newActualAmount = item.actualAmount;
      // Get the original balance from the most recent payout
      const originalBalance = latestPayout?.distribution.find(d => d.memberId === item.memberId)?.balance || 0;
      
      let newBalance = originalBalance;
      
      // If actual amount is less than calculated, add the difference to balance
      if (newActualAmount < originalAmount) {
        newBalance += (originalAmount - newActualAmount);
      } 
      // If actual amount is more than calculated, subtract the difference from balance
      else if (newActualAmount > originalAmount) {
        newBalance -= (newActualAmount - originalAmount);
      }
      
      return {
        ...item,
        balance: parseFloat(newBalance.toFixed(2))
      };
    });
    
    setEditedDistribution(updatedDistribution);
  };

  const saveChanges = () => {
    if (!latestPayout || !editedDistribution.length) return;
    
    // Apply the changes to the balances in the team members
    editedDistribution.forEach(item => {
      const member = teamMembers.find(m => m.id === item.memberId);
      if (member) {
        updateTeamMemberBalance(item.memberId, item.balance || 0);
      }
    });
    
    setIsEditing(false);
    toast({
      title: "Wijzigingen opgeslagen",
      description: "De uitbetalingen en saldi zijn bijgewerkt."
    });
  };

  const applyRounding = () => {
    if (!editedDistribution.length || roundingOption === 'none') return;
    
    const roundingValue = parseFloat(roundingOption);
    
    // First create the rounded distribution without recalculating balances
    const roundedDistribution = editedDistribution.map(item => {
      // Round DOWN the actual amount based on the selected rounding option
      let roundedAmount = item.amount;
      
      if (roundingValue === 0.50) {
        // Round down to nearest 0.50
        roundedAmount = Math.floor(item.amount / 0.50) * 0.50;
      } else if (roundingValue === 1.00) {
        // Round down to nearest 1.00
        roundedAmount = Math.floor(item.amount);
      } else if (roundingValue === 2.00) {
        // Round down to nearest 2.00
        roundedAmount = Math.floor(item.amount / 2.00) * 2.00;
      } else if (roundingValue === 5.00) {
        // Round down to nearest 5.00
        roundedAmount = Math.floor(item.amount / 5.00) * 5.00;
      } else if (roundingValue === 10.00) {
        // Round down to nearest 10.00
        roundedAmount = Math.floor(item.amount / 10.00) * 10.00;
      }
      
      return {
        ...item,
        actualAmount: parseFloat(roundedAmount.toFixed(2)),
        isEdited: roundedAmount !== item.amount
      };
    });
    
    // Set the rounded distribution and then calculate balances
    setEditedDistribution(roundedDistribution);
    
    toast({
      title: "Bedragen afgerond",
      description: `Alle bedragen zijn naar beneden afgerond op €${roundingOption}.`
    });
  };

  // Calculate new balances whenever distribution changes, but only once
  useEffect(() => {
    if (isEditing) {
      calculateNewBalances();
    }
  }, [isEditing]); // Only recalculate when editing mode changes
  
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader className="border-b">
        <CardTitle className="text-xl flex items-center">
          <Check className="h-5 w-5 mr-2 text-green-500" />
          Uitbetaling succesvol
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {latestPayout ? (
          <div className="space-y-6">
            <div>
              <h3 className="font-medium mb-2">Uitbetaling details:</h3>
              <p className="text-sm text-muted-foreground">
                Uitbetaald op: {new Date(latestPayout.date).toLocaleDateString('nl')}
              </p>
              {latestPayout.periodIds && latestPayout.periodIds.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Aantal periodes: {latestPayout.periodIds.length}
                </p>
              )}
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">Verdeling:</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsEditing(!isEditing)}
                  className="h-8"
                >
                  {isEditing ? "Annuleren" : "Aanpassen"}
                </Button>
              </div>
              
              {isEditing && (
                <div className="bg-muted/30 p-3 rounded-md mb-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="rounding-select" className="text-sm whitespace-nowrap">Afronden op:</Label>
                    <Select
                      value={roundingOption}
                      onValueChange={(value) => setRoundingOption(value as RoundingOption)}
                    >
                      <SelectTrigger id="rounding-select" className="h-8">
                        <SelectValue placeholder="Geen afronding" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Geen afronding</SelectItem>
                        <SelectItem value="0.50">€0.50</SelectItem>
                        <SelectItem value="1.00">€1.00</SelectItem>
                        <SelectItem value="2.00">€2.00</SelectItem>
                        <SelectItem value="5.00">€5.00</SelectItem>
                        <SelectItem value="10.00">€10.00</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={applyRounding} 
                      className="h-8 gap-1"
                      disabled={roundingOption === 'none'}
                    >
                      <Calculator className="h-4 w-4" />
                      Toepassen
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Naam</TableHead>
                      <TableHead className="text-right">Berekend</TableHead>
                      <TableHead className="text-right">Uitbetaald</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(isEditing ? editedDistribution : latestPayout.distribution).map((item, index) => {
                      const member = findTeamMember(item.memberId);
                      const amount = item.amount;
                      const actualAmount = isEditing 
                        ? item.actualAmount 
                        : (item.actualAmount || item.amount);
                      const balance = isEditing ? item.balance : item.balance;
                      
                      return (
                        <TableRow key={index} className={isEditing && (item as any).isEdited ? "bg-amber-50" : ""}>
                          <TableCell>{member ? member.name : 'Onbekend teamlid'}</TableCell>
                          <TableCell className="text-right">€{amount.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {isEditing ? (
                              <Input 
                                type="number" 
                                value={actualAmount} 
                                onChange={(e) => handleAmountChange(item.memberId, e.target.value)}
                                className="w-24 text-right inline-block h-8"
                                min="0"
                                step="0.01"
                              />
                            ) : (
                              `€${actualAmount.toFixed(2)}`
                            )}
                          </TableCell>
                          <TableCell className={`text-right ${balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : ''}`}>
                            {balance !== undefined && balance !== 0 ? 
                              `€${Math.abs(balance).toFixed(2)} ${balance > 0 ? '+' : '-'}` : 
                              '-'
                            }
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                
                <div className="p-2 border-t flex justify-between">
                  <span className="font-medium">Totaal</span>
                  <span className="font-medium">
                    €{(isEditing 
                      ? editedDistribution.reduce((sum, item) => sum + item.actualAmount, 0) 
                      : latestPayout.distribution.reduce((sum, item) => sum + (item.actualAmount || item.amount), 0)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 border border-green-200 p-4 rounded-md mt-4">
              <p className="flex items-center">
                <Check className="h-5 w-5 mr-2" />
                Alle geselecteerde periodes zijn gemarkeerd als uitbetaald.
              </p>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              {isEditing ? (
                <Button variant="goldGradient" onClick={saveChanges}>
                  Wijzigingen opslaan
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={handleCopyToClipboard}>
                    <Copy className="h-4 w-4 mr-2" />
                    Kopiëren
                  </Button>
                  <Button variant="outline" onClick={downloadCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    Download CSV
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p>Geen recente uitbetaling gevonden.</p>
          </div>
        )}
        
        <div className="mt-8">
          <Button 
            onClick={onClose}
            className="w-full"
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Terug naar team overzicht
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PayoutSummary;
