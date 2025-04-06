
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApp } from '@/contexts/AppContext';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { PrinterIcon, ClipboardList, FileCheck, ArrowLeft, Download, Save, Info, ArrowDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type PayoutSummaryProps = {
  onClose: () => void;
};

type RoundingMethod = 'none' | 'down' | 'multiple5' | 'multiple10';

export const PayoutSummary = ({
  onClose
}: PayoutSummaryProps) => {
  const {
    mostRecentPayout,
    teamMembers,
    periods,
    updateTeamMemberBalance,
    clearTeamMemberHours,
    markPeriodsAsPaid,
    setMostRecentPayout
  } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [actualPayouts, setActualPayouts] = useState<{
    [key: string]: number;
  }>({});
  const [balances, setBalances] = useState<{
    [key: string]: number;
  }>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [inputValues, setInputValues] = useState<{
    [key: string]: string;
  }>({});
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [copiedText, setCopiedText] = useState('');
  const [isPendingPayout, setIsPendingPayout] = useState(true);
  const [roundingMethod, setRoundingMethod] = useState<RoundingMethod>('none');
  
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('payoutSummary', 'true');
    navigate(`${location.pathname}?${searchParams.toString()}`, { replace: true });
    
    return () => {
      const searchParams = new URLSearchParams(location.search);
      searchParams.delete('payoutSummary');
      navigate(`${location.pathname}?${searchParams.toString()}`, { replace: true });
    };
  }, []);
  
  useEffect(() => {
    if (mostRecentPayout) {
      const initialPayouts: {
        [key: string]: number;
      } = {};
      const initialBalances: {
        [key: string]: number;
      } = {};
      const initialInputValues: {
        [key: string]: string;
      } = {};
      mostRecentPayout.distribution.forEach(item => {
        const member = teamMembers.find(m => m.id === item.memberId);
        if (member) {
          const calculatedAmount = item.amount || 0;
          initialPayouts[item.memberId] = calculatedAmount;
          initialBalances[item.memberId] = 0;
          initialInputValues[item.memberId] = calculatedAmount.toString();
        }
      });
      setActualPayouts(initialPayouts);
      setBalances(initialBalances);
      setInputValues(initialInputValues);
    }
  }, [mostRecentPayout, teamMembers]);
  
  // Apply rounding when the method changes
  useEffect(() => {
    if (mostRecentPayout && roundingMethod !== 'none') {
      const updatedPayouts = {...actualPayouts};
      const updatedBalances = {...balances};
      const updatedInputValues = {...inputValues};
      
      mostRecentPayout.distribution.forEach(item => {
        const originalAmount = item.amount || 0;
        let roundedAmount = originalAmount;
        
        switch (roundingMethod) {
          case 'down':
            roundedAmount = Math.floor(originalAmount);
            break;
          case 'multiple5':
            roundedAmount = Math.floor(originalAmount / 5) * 5;
            break;
          case 'multiple10':
            roundedAmount = Math.floor(originalAmount / 10) * 10;
            break;
        }
        
        const difference = originalAmount - roundedAmount;
        
        updatedPayouts[item.memberId] = roundedAmount;
        updatedBalances[item.memberId] = difference;
        updatedInputValues[item.memberId] = roundedAmount.toString();
      });
      
      setActualPayouts(updatedPayouts);
      setBalances(updatedBalances);
      setInputValues(updatedInputValues);
      setHasChanges(true);
    } else if (mostRecentPayout && roundingMethod === 'none') {
      // Restore original values
      const updatedPayouts = {...actualPayouts};
      const updatedBalances = {...balances};
      const updatedInputValues = {...inputValues};
      
      mostRecentPayout.distribution.forEach(item => {
        const originalAmount = item.amount || 0;
        
        updatedPayouts[item.memberId] = originalAmount;
        updatedBalances[item.memberId] = 0;
        updatedInputValues[item.memberId] = originalAmount.toString();
      });
      
      setActualPayouts(updatedPayouts);
      setBalances(updatedBalances);
      setInputValues(updatedInputValues);
      setHasChanges(false);
    }
  }, [roundingMethod, mostRecentPayout]);
  
  if (!mostRecentPayout) {
    return <Card>
        <CardContent className="p-6 text-center">
          <p>Geen recente uitbetaling gevonden.</p>
          <Button className="mt-4" onClick={onClose} variant="goldGradient">
            <ArrowLeft size={16} className="mr-1" /> Terug
          </Button>
        </CardContent>
      </Card>;
  }
  
  const formatDate = (dateString: string): string => {
    return format(new Date(dateString), 'd MMMM yyyy', {
      locale: nl
    });
  };
  
  const payoutDate = format(new Date(mostRecentPayout.date), 'd MMMM yyyy', {
    locale: nl
  });
  
  const periodData = periods.filter(period => mostRecentPayout.periodIds.includes(period.id)).map(period => {
    const startDate = format(new Date(period.startDate), 'd MMM', {
      locale: nl
    });
    const endDate = period.endDate ? format(new Date(period.endDate), 'd MMM', {
      locale: nl
    }) : 'Huidig';
    const totalTip = period.tips.reduce((sum, tip) => sum + tip.amount, 0);
    return {
      id: period.id,
      dateRange: `${startDate} - ${endDate}`,
      total: totalTip
    };
  });
  
  const totalPayout = mostRecentPayout.distribution.reduce((sum, item) => sum + item.amount, 0);
  
  const memberPayouts = mostRecentPayout.distribution.map(item => {
    const member = teamMembers.find(m => m.id === item.memberId);
    return {
      id: item.memberId,
      name: member?.name || 'Onbekend lid',
      amount: item.amount
    };
  });
  
  const handlePrint = () => {
    window.print();
  };
  
  const handleCopyToClipboard = () => {
    const payoutText = `Uitbetaling fooi: ${payoutDate}\n\n` + 
      memberPayouts.map(member => {
        const actualAmount = actualPayouts[member.id] || member.amount;
        const carriedBalance = balances[member.id] || 0;
        return `${member.name}: €${actualAmount.toFixed(2)}${carriedBalance !== 0 ? 
          ` (€${Math.abs(carriedBalance).toFixed(2)} ${carriedBalance > 0 ? 'meegenomen' : 'teveel betaald'})` : ''}`;
      }).join('\n') + 
      `\n\nTotaal: €${Object.values(actualPayouts).reduce((sum, amount) => sum + amount, 0).toFixed(2)}`;
    
    setCopiedText(payoutText);
    setShowCopyDialog(true);
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(copiedText).then(() => {
      toast({
        title: "Gekopieerd naar klembord",
        description: "De uitbetalingsgegevens zijn gekopieerd naar het klembord."
      });
      setShowCopyDialog(false);
    });
  };
  
  const handleDownloadCSV = () => {
    setShowDownloadDialog(true);
  };
  
  const downloadCSV = () => {
    const headers = "Naam,Bedrag,Saldo\n";
    const rows = memberPayouts.map(member => {
      const actualAmount = actualPayouts[member.id] || member.amount;
      const carriedBalance = balances[member.id] || 0;
      return `${member.name},${actualAmount.toFixed(2)},${carriedBalance.toFixed(2)}`;
    }).join('\n');
    
    const csv = headers + rows;
    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
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
    setShowDownloadDialog(false);
  };
  
  const handleActualPayoutChange = (memberId: string, value: string) => {
    setInputValues(prev => ({
      ...prev,
      [memberId]: value
    }));
    const amount = parseFloat(value);
    if (!isNaN(amount)) {
      const member = memberPayouts.find(m => m.id === memberId);
      if (member) {
        const newActualPayouts = {
          ...actualPayouts,
          [memberId]: amount
        };
        setActualPayouts(newActualPayouts);
        
        const calculatedAmount = member.amount || 0;
        const newBalance = calculatedAmount - amount;
        
        setBalances({
          ...balances,
          [memberId]: newBalance
        });
        setHasChanges(true);
      }
    }
  };
  
  const handleSaveBalancesAndClose = () => {
    if (mostRecentPayout && isPendingPayout) {
      Object.entries(balances).forEach(([memberId, balance]) => {
        updateTeamMemberBalance(memberId, balance);
      });
      
      const updatedDistribution = mostRecentPayout.distribution.map(item => ({
        memberId: item.memberId,
        amount: item.amount,
        actualAmount: actualPayouts[item.memberId] || item.amount,
        balance: balances[item.memberId] || 0
      }));
      
      memberPayouts.forEach(member => {
        clearTeamMemberHours(member.id);
      });
      
      if (mostRecentPayout.periodIds.length > 0) {
        markPeriodsAsPaid(mostRecentPayout.periodIds, updatedDistribution);
      }
      
      setMostRecentPayout({
        ...mostRecentPayout,
        distribution: updatedDistribution
      });
      
      setIsPendingPayout(false);
      
      toast({
        title: "Uitbetaling voltooid",
        description: "De uitbetaling is verwerkt, saldi bijgewerkt en uren gewist."
      });
    }
    
    const searchParams = new URLSearchParams(location.search);
    searchParams.delete('payoutSummary');
    navigate(`${location.pathname}?${searchParams.toString()}`, { replace: true });
    
    onClose();
  };
  
  const handleBackButtonClick = () => {
    if (hasChanges) {
      setShowExitConfirmation(true);
    } else {
      onClose();
    }
  };
  
  const getBalanceText = (balance: number) => {
    if (balance === 0) return "";
    if (balance > 0) {
      return `€${balance.toFixed(2)} meegenomen`;
    } else {
      return `€${Math.abs(balance).toFixed(2)} teveel betaald`;
    }
  };
  
  return <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Uitbetaling samenvatting</h1>
      </div>
      
      <Card className="border-green-200 bg-green-50/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <FileCheck size={20} className="text-green-600" />
            <span>Uitbetaling voltooid</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-green-700">
            Gefeliciteerd! Je hebt succesvol de fooi uitbetaald op {payoutDate}.
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Samenvatting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Uitbetaalde periodes</h3>
            <div className="space-y-2">
              {periodData.map(period => <div key={period.id} className="flex justify-between">
                  <span>Periode {period.dateRange}</span>
                  <span className="font-medium">€{period.total.toFixed(2)}</span>
                </div>)}
              <div className="flex justify-between pt-2 border-t">
                <span className="font-bold">Totaal</span>
                <span className="font-bold">€{totalPayout.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div className="my-4 bg-slate-50 p-3 rounded-md">
            <h3 className="text-sm font-medium mb-3">Bedragen afronden</h3>
            <RadioGroup value={roundingMethod} onValueChange={(value) => setRoundingMethod(value as RoundingMethod)} className="space-y-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="none" />
                <Label htmlFor="none">Geen afronding</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="down" id="down" />
                <Label htmlFor="down">Afronden naar beneden</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="multiple5" id="multiple5" />
                <Label htmlFor="multiple5">Afronden naar veelvoud van 5</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="multiple10" id="multiple10" />
                <Label htmlFor="multiple10">Afronden naar tiental</Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-2">Verdeling per teamlid</h3>
            <div className="space-y-4">
              {memberPayouts.map(member => {
              const actualPayout = actualPayouts[member.id] || member.amount;
              const carriedBalance = balances[member.id] || 0;
              return <div key={member.id} className="p-3 border rounded-md">
                    <div className="flex justify-between font-medium mb-2">
                      <span>{member.name}</span>
                      <span>Te betalen: €{member.amount.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex items-center mt-3 space-x-2">
                      <div className="flex-1">
                        <Label htmlFor={`actual-${member.id}`} className="text-sm">
                          Daadwerkelijk uitbetaald
                        </Label>
                        <Input id={`actual-${member.id}`} type="number" value={inputValues[member.id] || ""} onChange={e => handleActualPayoutChange(member.id, e.target.value)} step="0.01" min="0" className="mt-1" />
                      </div>
                      
                      <div className="flex-1">
                        {carriedBalance !== 0 && <span className={`text-xs ${carriedBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {getBalanceText(carriedBalance)}
                        </span>}
                      </div>
                    </div>
                  </div>;
            })}
            </div>
          </div>
          
          {hasChanges && <Alert className="mt-4 bg-amber-50">
              <AlertDescription>
                <strong>Let op:</strong> Je hebt aanpassingen gemaakt in de uitbetaling. Klik op 'Saldi opslaan en afsluiten' hieronder om deze op te slaan voordat je verder gaat.
              </AlertDescription>
            </Alert>}
          
          <Button onClick={handleSaveBalancesAndClose} className="w-full" variant="goldGradient">
            <Save size={16} className="mr-1" /> Saldi opslaan en afsluiten
          </Button>
        </CardContent>
        <CardFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" className="w-full sm:w-auto" onClick={handlePrint}>
            <PrinterIcon size={16} className="mr-1" /> Afdrukken
          </Button>
          <Button variant="outline" className="w-full sm:w-auto" onClick={handleCopyToClipboard}>
            <ClipboardList size={16} className="mr-1" /> Kopiëren
          </Button>
          <Button variant="outline" className="w-full sm:w-auto" onClick={handleDownloadCSV}>
            <Download size={16} className="mr-1" /> Download CSV
          </Button>
        </CardFooter>
      </Card>
      
      <AlertDialog open={showExitConfirmation} onOpenChange={setShowExitConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wijzigingen niet opgeslagen</AlertDialogTitle>
            <AlertDialogDescription>
              Je hebt wijzigingen aangebracht in de uitbetaling die nog niet zijn opgeslagen.
              Wil je deze wijzigingen opslaan voordat je verder gaat?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowExitConfirmation(false)}>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveBalancesAndClose} className="bg-green-600 hover:bg-green-700">
              Opslaan en afsluiten
            </AlertDialogAction>
            <AlertDialogAction onClick={() => {
              setShowExitConfirmation(false);
              onClose();
            }} className="bg-amber-600 hover:bg-amber-700">
              Afsluiten zonder opslaan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kopiëren naar klembord</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <div className="bg-gray-50 p-4 rounded-md mb-4 whitespace-pre-wrap text-sm">
              {copiedText}
            </div>
            <Button onClick={copyToClipboard} className="w-full">
              <ClipboardList size={16} className="mr-1" /> Kopiëren naar klembord
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showDownloadDialog} onOpenChange={setShowDownloadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Download CSV bestand</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <p className="mb-4">
              Je staat op het punt een CSV-bestand te downloaden met de uitbetalingsgegevens voor {payoutDate}.
            </p>
            <Button onClick={downloadCSV} className="w-full">
              <Download size={16} className="mr-1" /> Download CSV
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};
