
import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useApp } from '@/contexts/AppContext';
import { History, FileText, Download, ArrowUpDown, ArrowUp, ArrowDown, Save } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

type SortField = 'date' | 'calculatedAmount' | 'actualAmount';
type SortDirection = 'asc' | 'desc';

interface PayoutDetailWithEdits {
  memberId: string;
  amount: number;
  actualAmount: number;
  balance: number | undefined;
  isEdited: boolean;
}

const PayoutHistory = () => {
  const { payouts, teamMembers, updateTeamMemberBalance } = useApp();
  const { toast } = useToast();
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [editedDistribution, setEditedDistribution] = useState<PayoutDetailWithEdits[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  
  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'd MMMM yyyy HH:mm', { locale: nl });
    } catch (e) {
      return 'Ongeldige datum';
    }
  };

  const handleSortClick = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleRowClick = (payout) => {
    setSelectedPayout(payout);
    
    // Initialize editable distribution with actual amounts
    const initialEditableDistribution = payout.distribution.map(item => ({
      memberId: item.memberId,
      amount: item.amount,
      actualAmount: item.actualAmount || item.amount,
      balance: item.balance,
      isEdited: false
    }));
    
    setEditedDistribution(initialEditableDistribution);
    setIsEditing(false);
    setDetailsOpen(true);
  };

  const handleCopyToClipboard = () => {
    if (!selectedPayout) return;

    const payoutDate = formatDate(selectedPayout.date);
    const memberDetails = selectedPayout.distribution.map(item => {
      const member = teamMembers.find(m => m.id === item.memberId);
      return `${member?.name || 'Onbekend lid'}: €${(item.actualAmount || item.amount).toFixed(2)}`;
    }).join('\n');

    const totalAmount = selectedPayout.distribution.reduce(
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
    if (!selectedPayout) return;
    
    const headers = "Naam,Berekend bedrag,Daadwerkelijk uitbetaald,Saldo\n";
    const rows = selectedPayout.distribution.map(item => {
      const member = teamMembers.find(m => m.id === item.memberId);
      return `${member?.name || 'Onbekend lid'},${item.amount.toFixed(2)},${(item.actualAmount || item.amount).toFixed(2)},${(item.balance || 0).toFixed(2)}`;
    }).join('\n');
    
    const csv = headers + rows;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const payoutDate = formatDate(selectedPayout.date).replace(/\s/g, '_');
    
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
    if (!selectedPayout || !editedDistribution.length) return;
    
    // Calculate balance differences
    const updatedDistribution = editedDistribution.map(item => {
      const originalAmount = item.amount;
      const newActualAmount = item.actualAmount;
      const currentBalance = item.balance || 0;
      
      let newBalance = currentBalance;
      
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
    if (!selectedPayout || !editedDistribution.length) return;
    
    calculateNewBalances();
    
    // Apply the changes to the balances in the team members
    editedDistribution.forEach(item => {
      const member = teamMembers.find(m => m.id === item.memberId);
      if (member) {
        updateTeamMemberBalance(item.memberId, item.balance || 0);
      }
    });
    
    // TODO: In a real implementation, you would update the payout in your storage
    // For now, we'll just show a success message
    
    setIsEditing(false);
    toast({
      title: "Wijzigingen opgeslagen",
      description: "De uitbetalingen en saldi zijn bijgewerkt."
    });
  };

  useEffect(() => {
    if (isEditing) {
      calculateNewBalances();
    }
  }, [editedDistribution, isEditing]);

  const sortedPayouts = useMemo(() => {
    if (!payouts || payouts.length === 0) return [];
    
    return [...payouts].sort((a, b) => {
      let valueA, valueB;
      
      if (sortField === 'date') {
        valueA = new Date(a.date).getTime();
        valueB = new Date(b.date).getTime();
      } else if (sortField === 'calculatedAmount') {
        valueA = a.distribution.reduce((sum, dist) => sum + dist.amount, 0);
        valueB = b.distribution.reduce((sum, dist) => sum + dist.amount, 0);
      } else if (sortField === 'actualAmount') {
        valueA = a.distribution.reduce((sum, dist) => sum + (dist.actualAmount || dist.amount), 0);
        valueB = b.distribution.reduce((sum, dist) => sum + (dist.actualAmount || dist.amount), 0);
      }
      
      if (sortDirection === 'asc') {
        return valueA - valueB;
      } else {
        return valueB - valueA;
      }
    });
  }, [payouts, sortField, sortDirection]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1" />;
    }
    
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" /> 
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  return (
    <>
      <Card className="w-full mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Uitbetaal Geschiedenis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payouts && payouts.length > 0 ? (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      onClick={() => handleSortClick('date')} 
                      className="cursor-pointer hover:text-primary transition-colors"
                    >
                      <div className="flex items-center">
                        Datum
                        {renderSortIcon('date')}
                      </div>
                    </TableHead>
                    <TableHead>Periodes</TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:text-primary transition-colors"
                      onClick={() => handleSortClick('calculatedAmount')}
                    >
                      <div className="flex items-center justify-end">
                        Berekend bedrag
                        {renderSortIcon('calculatedAmount')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:text-primary transition-colors"
                      onClick={() => handleSortClick('actualAmount')}
                    >
                      <div className="flex items-center justify-end">
                        Uitbetaald
                        {renderSortIcon('actualAmount')}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPayouts.map((payout, index) => {
                    const calculatedAmount = payout.distribution.reduce(
                      (sum, dist) => sum + dist.amount, 
                      0
                    );
                    
                    const actualAmount = payout.distribution.reduce(
                      (sum, dist) => sum + (dist.actualAmount || dist.amount), 
                      0
                    );
                    
                    return (
                      <TableRow 
                        key={index} 
                        className="group cursor-pointer hover:bg-muted/80"
                        onClick={() => handleRowClick(payout)}
                      >
                        <TableCell className="font-medium">
                          {formatDate(payout.date)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {payout.periodIds.length > 3 ? (
                              <Badge variant="outline">
                                {payout.periodIds.length} periodes
                              </Badge>
                            ) : (
                              payout.periodIds.map((periodId, idx) => (
                                <Badge key={periodId} variant="outline">
                                  Periode {idx + 1}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          €{calculatedAmount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          €{actualAmount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Geen uitbetalingen gevonden</p>
              <p className="text-sm mt-2">Uitbetalingen verschijnen hier wanneer je fooi markeert als uitbetaald</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Uitbetaling details
            </DialogTitle>
            <DialogDescription>
              {selectedPayout && formatDate(selectedPayout.date)}
            </DialogDescription>
          </DialogHeader>

          {selectedPayout && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Periodes</h3>
                <div className="flex flex-wrap gap-1">
                  {selectedPayout.periodIds.length > 5 ? (
                    <Badge>
                      {selectedPayout.periodIds.length} periodes
                    </Badge>
                  ) : (
                    selectedPayout.periodIds.map((periodId, idx) => (
                      <Badge key={periodId} variant="outline">
                        Periode {idx + 1}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium">Uitbetaling per teamlid</h3>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsEditing(!isEditing)}
                    className="h-8"
                  >
                    {isEditing ? "Annuleren" : "Aanpassen"}
                  </Button>
                </div>
                
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
                      {(isEditing ? editedDistribution : selectedPayout.distribution).map((item, idx) => {
                        const member = teamMembers.find(m => m.id === item.memberId);
                        const amount = item.amount;
                        const actualAmount = isEditing ? item.actualAmount : (item.actualAmount || item.amount);
                        const balance = isEditing ? item.balance : item.balance;
                        
                        return (
                          <TableRow key={idx} className={isEditing && item.isEdited ? "bg-amber-50" : ""}>
                            <TableCell>{member?.name || 'Onbekend lid'}</TableCell>
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
                    <tfoot>
                      <tr className="border-t">
                        <td className="p-2 font-bold">Totaal</td>
                        <td className="p-2 text-right">
                          €{selectedPayout.distribution.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
                        </td>
                        <td className="p-2 text-right font-bold">
                          {isEditing ? 
                            `€${editedDistribution.reduce((sum, item) => sum + item.actualAmount, 0).toFixed(2)}` :
                            `€${selectedPayout.distribution.reduce((sum, item) => sum + (item.actualAmount || item.amount), 0).toFixed(2)}`
                          }
                        </td>
                        <td className="p-2"></td>
                      </tr>
                    </tfoot>
                  </Table>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                {isEditing ? (
                  <Button 
                    variant="goldGradient" 
                    onClick={saveChanges}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Opslaan
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={handleCopyToClipboard}>
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
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PayoutHistory;
