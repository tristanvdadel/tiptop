import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, ArrowLeft, Download, Copy, Calculator, Save, Wallet, Home } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious 
} from '@/components/ui/carousel';

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

export const PayoutSummary = ({
  onClose
}: PayoutSummaryProps) => {
  const {
    payouts,
    teamMembers,
    mostRecentPayout,
    updateTeamMemberBalance,
    clearTeamMemberHours,
    setMostRecentPayout
  } = useApp();
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [isEditing, setIsEditing] = useState(true);
  const [editedDistribution, setEditedDistribution] = useState<PayoutDetailWithEdits[]>([]);
  const [roundingOption, setRoundingOption] = useState<RoundingOption>('none');
  const [balancesUpdated, setBalancesUpdated] = useState(false);

  const latestPayout = mostRecentPayout || (payouts.length > 0 ? payouts[payouts.length - 1] : null);

  const findTeamMember = (id: string) => {
    return teamMembers.find(member => member.id === id);
  };

  useEffect(() => {
    if (latestPayout) {
      const initialEditableDistribution = latestPayout.distribution.map(item => {
        const calculatedAmount = item.amount;
        const originalBalance = item.balance || 0;
        const totalAmountWithBalance = calculatedAmount + originalBalance;
        return {
          memberId: item.memberId,
          amount: calculatedAmount,
          actualAmount: item.actualAmount || totalAmountWithBalance,
          balance: item.balance,
          isEdited: false
        };
      });
      setEditedDistribution(initialEditableDistribution);
    }
  }, [latestPayout]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('payoutSummary')) {
      url.searchParams.set('payoutSummary', 'true');
      window.history.pushState({}, '', url.toString());
    }
    
    return () => {
      const url = new URL(window.location.href);
      if (url.searchParams.has('payoutSummary')) {
        url.searchParams.delete('payoutSummary');
        window.history.pushState({}, '', url.toString());
      }
    };
  }, []);

  const handleCopyToClipboard = () => {
    if (!latestPayout) return;
    const payoutDate = new Date(latestPayout.date).toLocaleDateString('nl');
    const memberDetails = latestPayout.distribution.map(item => {
      const member = findTeamMember(item.memberId);
      return `${member?.name || 'Onbekend lid'}: €${(item.actualAmount || item.amount).toFixed(2)}`;
    }).join('\n');
    const totalAmount = latestPayout.distribution.reduce((sum, dist) => sum + (dist.actualAmount || dist.amount), 0);
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
    const headers = "Naam,Berekend bedrag,Saldo,Totaal te ontvangen,Daadwerkelijk uitbetaald,Nieuw saldo\n";
    const rows = latestPayout.distribution.map(item => {
      const member = findTeamMember(item.memberId);
      const calculatedAmount = item.amount;
      const originalBalance = item.balance || 0;
      const totalToReceive = calculatedAmount + originalBalance;
      const actuallyPaid = item.actualAmount || totalToReceive;
      const newBalance = totalToReceive - actuallyPaid;
      return `${member?.name || 'Onbekend lid'},${calculatedAmount.toFixed(2)},${originalBalance.toFixed(2)},${totalToReceive.toFixed(2)},${actuallyPaid.toFixed(2)},${newBalance.toFixed(2)}`;
    }).join('\n');
    const csv = headers + rows;
    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;'
    });
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
    setEditedDistribution(prev => prev.map(item => item.memberId === memberId ? {
      ...item,
      actualAmount: amount,
      isEdited: true
    } : item));
  };

  const calculateNewBalances = () => {
    if (!editedDistribution.length) return;
    const updatedDistribution = editedDistribution.map(item => {
      const calculatedAmount = item.amount;
      const originalBalance = latestPayout?.distribution.find(d => d.memberId === item.memberId)?.balance || 0;
      const totalToReceive = calculatedAmount + originalBalance;
      const actuallyPaid = item.actualAmount;
      const newBalance = totalToReceive - actuallyPaid;
      return {
        ...item,
        balance: parseFloat(newBalance.toFixed(2))
      };
    });
    setEditedDistribution(updatedDistribution);
  };

  const saveChanges = () => {
    if (!latestPayout || !editedDistribution.length) return;

    editedDistribution.forEach(item => {
      const member = teamMembers.find(m => m.id === item.memberId);
      if (member) {
        updateTeamMemberBalance(item.memberId, item.balance || 0);
        clearTeamMemberHours(item.memberId);
      }
    });

    const updatedDistribution = editedDistribution.map(item => ({
      memberId: item.memberId,
      amount: item.amount,
      actualAmount: item.actualAmount,
      balance: latestPayout.distribution.find(d => d.memberId === item.memberId)?.balance || 0
    }));

    const updatedPayout = {
      ...latestPayout,
      distribution: updatedDistribution
    };

    setMostRecentPayout(updatedPayout);
    setIsEditing(false);
    setBalancesUpdated(true);

    toast({
      title: "Gefeliciteerd!",
      description: "De uitbetaling is voltooid. De saldo's zijn opgeslagen. Je kan de uitbetaling terugvinden in de geschiedenis.",
      variant: "default"
    });

    setTimeout(() => {
      navigate('/');
    }, 1500);
  };

  const applyRounding = () => {
    if (!editedDistribution.length || roundingOption === 'none') return;
    const roundingValue = parseFloat(roundingOption);
    const roundedDistribution = editedDistribution.map(item => {
      const calculatedAmount = item.amount;
      const originalBalance = latestPayout?.distribution.find(d => d.memberId === item.memberId)?.balance || 0;
      const totalAmount = calculatedAmount + originalBalance;
      let roundedAmount = totalAmount;
      if (roundingValue === 0.50) {
        roundedAmount = Math.floor(totalAmount / 0.50) * 0.50;
      } else if (roundingValue === 1.00) {
        roundedAmount = Math.floor(totalAmount);
      } else if (roundingValue === 2.00) {
        roundedAmount = Math.floor(totalAmount / 2.00) * 2.00;
      } else if (roundingValue === 5.00) {
        roundedAmount = Math.floor(totalAmount / 5.00) * 5.00;
      } else if (roundingValue === 10.00) {
        roundedAmount = Math.floor(totalAmount / 10.00) * 10.00;
      }
      return {
        ...item,
        actualAmount: parseFloat(roundedAmount.toFixed(2)),
        isEdited: roundedAmount !== totalAmount
      };
    });
    setEditedDistribution(roundedDistribution);
    toast({
      title: "Bedragen afgerond",
      description: `Alle bedragen zijn naar beneden afgerond op €${roundingOption}.`
    });
  };

  useEffect(() => {
    if (isEditing) {
      calculateNewBalances();
    }
  }, [editedDistribution, isEditing]);

  const reopenEditor = () => {
    setBalancesUpdated(false);
    setIsEditing(true);
  };

  const renderDistributionTable = () => {
    if (isMobile) {
      return (
        <Carousel className="w-full">
          <CarouselContent>
            {(isEditing ? editedDistribution : latestPayout?.distribution || []).map((item, index) => {
              const member = findTeamMember(item.memberId);
              const calculatedAmount = item.amount;
              const originalBalance = latestPayout?.distribution.find(d => d.memberId === item.memberId)?.balance || 0;
              const totalAmount = calculatedAmount + originalBalance;
              const actualAmount = isEditing ? item.actualAmount : item.actualAmount || totalAmount;
              const newBalance = isEditing ? item.balance : totalAmount - actualAmount;
              
              return (
                <CarouselItem key={index}>
                  <Card className={isEditing && (item as any).isEdited ? "bg-amber-50" : ""}>
                    <CardContent className="p-4">
                      <h4 className="font-medium text-center mb-2">{member ? member.name : 'Onbekend teamlid'}</h4>
                      <div className="grid grid-cols-2 gap-y-2 text-sm">
                        <span className="text-muted-foreground">Berekend:</span>
                        <span className="text-right">€{calculatedAmount.toFixed(2)}</span>
                        
                        <span className="text-muted-foreground">Saldo:</span>
                        <span className={`text-right ${originalBalance > 0 ? 'text-green-600' : originalBalance < 0 ? 'text-red-600' : ''}`}>
                          {originalBalance !== 0 ? `€${Math.abs(originalBalance).toFixed(2)} ${originalBalance > 0 ? '+' : '-'}` : '-'}
                        </span>
                        
                        <span className="text-muted-foreground">Totaal:</span>
                        <span className="text-right font-medium">€{totalAmount.toFixed(2)}</span>
                        
                        <span className="text-muted-foreground">Uitbetaald:</span>
                        <span className="text-right">
                          {isEditing ? 
                            <Input 
                              type="number" 
                              value={actualAmount} 
                              onChange={e => handleAmountChange(item.memberId, e.target.value)} 
                              className="w-24 text-right inline-block h-8" 
                              min="0" 
                              step="0.01" 
                            /> : 
                            `€${actualAmount.toFixed(2)}`
                          }
                        </span>
                        
                        <span className="text-muted-foreground">Nieuw saldo:</span>
                        <span className={`text-right ${newBalance && newBalance > 0 ? 'text-green-600' : newBalance && newBalance < 0 ? 'text-red-600' : ''}`}>
                          {newBalance !== undefined && newBalance !== 0 ? `€${Math.abs(newBalance).toFixed(2)} ${newBalance > 0 ? '+' : '-'}` : '-'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <div className="flex justify-center gap-2 mt-2">
            <CarouselPrevious className="static transform-none mx-0" />
            <CarouselNext className="static transform-none mx-0" />
          </div>
        </Carousel>
      );
    }
    
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
              {(isEditing ? editedDistribution : latestPayout?.distribution || []).map((item, index) => {
                const member = findTeamMember(item.memberId);
                const calculatedAmount = item.amount;
                const originalBalance = latestPayout?.distribution.find(d => d.memberId === item.memberId)?.balance || 0;
                const totalAmount = calculatedAmount + originalBalance;
                const actualAmount = isEditing ? item.actualAmount : item.actualAmount || totalAmount;
                const newBalance = isEditing ? item.balance : totalAmount - actualAmount;
                return <TableRow key={index} className={isEditing && (item as any).isEdited ? "bg-amber-50" : ""}>
                        <TableCell>{member ? member.name : 'Onbekend teamlid'}</TableCell>
                        <TableCell className="text-right">€{calculatedAmount.toFixed(2)}</TableCell>
                        <TableCell className={`text-right ${originalBalance > 0 ? 'text-green-600' : originalBalance < 0 ? 'text-red-600' : ''}`}>
                          {originalBalance !== 0 ? `€${Math.abs(originalBalance).toFixed(2)} ${originalBalance > 0 ? '+' : '-'}` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          €{totalAmount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {isEditing ? <Input type="number" value={actualAmount} onChange={e => handleAmountChange(item.memberId, e.target.value)} className="w-24 text-right inline-block h-8" min="0" step="0.01" /> : `€${actualAmount.toFixed(2)}`}
                        </TableCell>
                        <TableCell className={`text-right ${newBalance && newBalance > 0 ? 'text-green-600' : newBalance && newBalance < 0 ? 'text-red-600' : ''}`}>
                          {newBalance !== undefined && newBalance !== 0 ? `€${Math.abs(newBalance).toFixed(2)} ${newBalance > 0 ? '+' : '-'}` : '-'}
                        </TableCell>
                      </TableRow>;
              })}
            </TableBody>
          </Table>
        </ScrollArea>
        
        <div className="p-2 border-t flex justify-between">
          <span className="font-medium">Totaal</span>
          <span className="font-medium">
            €{(isEditing ? editedDistribution.reduce((sum, item) => sum + item.actualAmount, 0) : latestPayout?.distribution.reduce((sum, item) => sum + (item.actualAmount || item.amount + (item.balance || 0)), 0) || 0).toFixed(2)}
          </span>
        </div>
      </div>
    );
  };

  return <Card className="w-full max-w-3xl mx-auto">
      <CardHeader className="border-b">
        <CardTitle className="text-xl flex items-center">
          <Check className="h-5 w-5 mr-2 text-green-500" />
          Uitbetaling succesvol
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {latestPayout ? <div className="space-y-6">
            <div>
              <h3 className="font-medium mb-2">Uitbetaling details:</h3>
              <p className="text-sm text-muted-foreground">
                Uitbetaald op: {new Date(latestPayout.date).toLocaleDateString('nl')}
              </p>
              {latestPayout.periodIds && latestPayout.periodIds.length > 0 && <p className="text-sm text-muted-foreground">
                  Aantal periodes: {latestPayout.periodIds.length}
                </p>}
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">Verdeling:</h3>
                {balancesUpdated ? <Button variant="outline" size="sm" onClick={reopenEditor} className="h-8">
                    Opnieuw aanpassen
                  </Button> : 
                  !isEditing && <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="h-8">
                    Aanpassen
                  </Button>}
              </div>
              
              {isEditing && <div className="bg-muted/30 p-3 rounded-md mb-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="rounding-select" className="text-sm whitespace-nowrap">Afronden op:</Label>
                    <Select value={roundingOption} onValueChange={value => setRoundingOption(value as RoundingOption)}>
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
                    
                    <Button variant="outline" size="sm" onClick={applyRounding} className="h-8 gap-1">
                      <Calculator className="h-4 w-4" />
                      Toepassen
                    </Button>
                  </div>
                </div>}
              
              {renderDistributionTable()}
            </div>
            
            <div className="bg-green-50 border border-green-200 p-4 rounded-md mt-4">
              <p className="flex items-center">
                <Check className="h-5 w-5 mr-2" />
                Alle geselecteerde periodes zijn gemarkeerd als uitbetaald.
              </p>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              {!balancesUpdated && isEditing ? <Button variant="goldGradient" onClick={saveChanges}>
                  <Save className="h-4 w-4 mr-2" />
                  Uitbetaling afronden
                </Button> : balancesUpdated ? <Button variant="goldGradient" onClick={() => navigate('/')}>
                    <Home className="h-4 w-4 mr-2" />
                    Naar startpagina
                  </Button> : <>
                    <Button variant="outline" onClick={handleCopyToClipboard}>
                      <Copy className="h-4 w-4 mr-2" />
                      Kopiëren
                    </Button>
                    <Button variant="outline" onClick={downloadCSV}>
                      <Download className="h-4 w-4 mr-2" />
                      Download CSV
                    </Button>
                  </>}
            </div>
          </div> : <div className="text-center py-6">
            <p>Geen recente uitbetaling gevonden.</p>
          </div>}
        
        <div className="mt-8">
          
        </div>
      </CardContent>
    </Card>;
};

export default PayoutSummary;
