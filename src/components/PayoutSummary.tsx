
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApp } from '@/contexts/AppContext';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { PrinterIcon, ClipboardList, FileCheck, ArrowLeft, Download, Save, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Link, useNavigate } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

type PayoutSummaryProps = {
  onClose: () => void;
};

export const PayoutSummary = ({
  onClose
}: PayoutSummaryProps) => {
  const {
    mostRecentPayout,
    teamMembers,
    periods,
    updateTeamMemberBalance,
    clearTeamMemberHours
  } = useApp();
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const [actualPayouts, setActualPayouts] = useState<{
    [key: string]: number;
  }>({});
  const [balances, setBalances] = useState<{
    [key: string]: number;
  }>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [inputValues, setInputValues] = useState<{
    [key: string]: string;
  }>({});
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [attemptingNavigation, setAttemptingNavigation] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState<string | null>(null);

  const roundDownToNearest = (value: number, nearest: number = 5): number => {
    return Math.floor(value / nearest) * nearest;
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasChanges]);

  useEffect(() => {
    const handleNavigation = e => {
      if (hasChanges) {
        e.preventDefault();
        setAttemptingNavigation(true);
        setNavigationTarget(e.target.pathname);
      }
    };
    document.querySelectorAll('a[href]').forEach(link => {
      link.addEventListener('click', handleNavigation);
    });
    return () => {
      document.querySelectorAll('a[href]').forEach(link => {
        link.removeEventListener('click', handleNavigation);
      });
    };
  }, [hasChanges]);

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
          const existingBalance = member.balance || 0;
          const totalDue = calculatedAmount + existingBalance;
          const roundedPayout = roundDownToNearest(totalDue);
          initialPayouts[item.memberId] = roundedPayout;
          initialBalances[item.memberId] = totalDue - roundedPayout;
          initialInputValues[item.memberId] = roundedPayout.toString();
        }
      });
      setActualPayouts(initialPayouts);
      setBalances(initialBalances);
      setInputValues(initialInputValues);
    }
  }, [mostRecentPayout, teamMembers]);

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
    const existingBalance = member?.balance || 0;
    return {
      id: item.memberId,
      name: member?.name || 'Onbekend lid',
      amount: item.amount,
      existingBalance,
      totalDue: item.amount + existingBalance
    };
  });

  const handlePrint = () => {
    window.print();
  };

  const handleCopyToClipboard = () => {
    const payoutText = `Uitbetaling fooi: ${payoutDate}\n\n` + memberPayouts.map(member => {
      const actualAmount = actualPayouts[member.id] || member.amount;
      const carriedBalance = balances[member.id] || 0;
      return `${member.name}: €${actualAmount.toFixed(2)}${carriedBalance !== 0 ? ` (€${Math.abs(carriedBalance).toFixed(2)} ${carriedBalance > 0 ? 'meegenomen' : 'teveel betaald'})` : ''}`;
    }).join('\n') + `\n\nTotaal: €${Object.values(actualPayouts).reduce((sum, amount) => sum + amount, 0).toFixed(2)}`;
    navigator.clipboard.writeText(payoutText).then(() => {
      toast({
        title: "Gekopieerd naar klembord",
        description: "De uitbetalingsgegevens zijn gekopieerd naar het klembord."
      });
    });
  };

  const handleDownloadCSV = () => {
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
        const existingBalance = member.existingBalance || 0;
        const calculatedAmount = member.amount || 0;
        const totalDue = calculatedAmount + existingBalance;
        const newBalance = totalDue - amount;
        setBalances({
          ...balances,
          [memberId]: newBalance
        });
        setHasChanges(true);
      }
    }
  };

  const handleSaveBalancesAndClose = () => {
    if (mostRecentPayout && hasChanges) {
      // Update balances for each team member
      Object.entries(balances).forEach(([memberId, balance]) => {
        updateTeamMemberBalance(memberId, balance);
      });

      // Clear hours for all team members in the distribution
      mostRecentPayout.distribution.forEach(item => {
        clearTeamMemberHours(item.memberId);
      });

      // Update the distribution with actual amounts and balances
      const updatedDistribution = mostRecentPayout.distribution.map(item => ({
        ...item,
        actualAmount: actualPayouts[item.memberId] || item.amount,
        balance: balances[item.memberId] || 0
      }));

      toast({
        title: "Uitbetaling voltooid",
        description: "De aangepaste uitbetaling en saldi zijn opgeslagen. Uren zijn gewist."
      });
      setHasChanges(false);
      
      // Force a navigation to reload the team page with cleared data
      navigate('/team', { replace: true });
    } else {
      onClose();
    }
  };

  const handleBackButtonClick = () => {
    if (hasChanges) {
      setShowExitConfirmation(true);
    } else {
      onClose();
    }
  };

  const handleContinueNavigation = () => {
    setHasChanges(false);
    if (navigationTarget) {
      navigate(navigationTarget);
    } else {
      onClose();
    }
    setAttemptingNavigation(false);
    setNavigationTarget(null);
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
        <Button variant="outline" onClick={handleBackButtonClick}>
          <ArrowLeft size={16} className="mr-1" /> Terug
        </Button>
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
          
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-2">Verdeling per teamlid</h3>
            <div className="space-y-4">
              {memberPayouts.map(member => {
              const totalDue = member.amount + (member.existingBalance || 0);
              const actualPayout = actualPayouts[member.id] || roundDownToNearest(totalDue);
              const carriedBalance = balances[member.id] || totalDue - actualPayout;
              return <div key={member.id} className="p-3 border rounded-md">
                    <div className="flex justify-between font-medium mb-2">
                      <span>{member.name}</span>
                      <span>Te betalen: €{totalDue.toFixed(2)}</span>
                    </div>
                    
                    {member.existingBalance !== 0 && <div className="flex justify-between text-sm mb-2 text-gray-600">
                        <span>Vorig saldo</span>
                        <span>€{member.existingBalance.toFixed(2)}</span>
                      </div>}
                    
                    <div className="flex justify-between text-sm mb-2 text-gray-600">
                      <span>Huidige berekening</span>
                      <span>€{member.amount.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex items-center mt-3 space-x-2">
                      <div className="flex-1">
                        <label className="text-sm">
                          Daadwerkelijk uitbetaald
                        </label>
                        <div className="mt-1 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              value={inputValues[member.id] || actualPayout.toString()}
                              onChange={(e) => handleActualPayoutChange(member.id, e.target.value)}
                              className="w-24 h-8 text-sm"
                            />
                            {carriedBalance !== 0 && 
                              <span className={`text-xs ${carriedBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {getBalanceText(carriedBalance)}
                              </span>
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>;
            })}
            </div>
          </div>
          
          {hasChanges && <Alert className="mt-4 bg-amber-50">
              <AlertDescription>
                <strong>Let op:</strong> Je hebt aanpassingen gemaakt in de uitbetaling. Klik op 'Saldi opslaan' hieronder om deze op te slaan voordat je verder gaat.
              </AlertDescription>
            </Alert>}
          
          <Button onClick={handleSaveBalancesAndClose} className="w-full" variant="goldGradient">
            <Save size={16} className="mr-1" /> Saldi opslaan
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
      
      <Card>
        
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

      <AlertDialog open={attemptingNavigation} onOpenChange={setAttemptingNavigation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Uitbetaling niet afgerond</AlertDialogTitle>
            <AlertDialogDescription>
              Je probeert weg te navigeren terwijl de uitbetaling niet is afgerond.
              De periode is al als uitbetaald gemarkeerd, maar de uren staan nog ingevoerd.
              Wil je eerst de uitbetaling afronden?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAttemptingNavigation(false)}>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveBalancesAndClose} className="bg-green-600 hover:bg-green-700">
              Uitbetaling afronden
            </AlertDialogAction>
            <AlertDialogAction onClick={handleContinueNavigation} className="bg-amber-600 hover:bg-amber-700">
              Doorgaan zonder afronden
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
};

export default PayoutSummary;
