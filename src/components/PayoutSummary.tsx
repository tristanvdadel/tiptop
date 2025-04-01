import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApp } from '@/contexts/AppContext';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { PrinterIcon, ClipboardList, FileCheck, ArrowLeft, Download, Save, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Link } from 'react-router-dom';
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
  const [actualPayouts, setActualPayouts] = useState<{
    [key: string]: number;
  }>({});
  const [balances, setBalances] = useState<{
    [key: string]: number;
  }>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const roundDownToNearest = (value: number, nearest: number = 5): number => {
    return Math.floor(value / nearest) * nearest;
  };
  useEffect(() => {
    if (mostRecentPayout) {
      const initialPayouts: {
        [key: string]: number;
      } = {};
      const initialBalances: {
        [key: string]: number;
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
        }
      });
      setActualPayouts(initialPayouts);
      setBalances(initialBalances);
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
    Object.entries(balances).forEach(([memberId, balance]) => {
      updateTeamMemberBalance(memberId, balance);
    });
    memberPayouts.forEach(member => {
      clearTeamMemberHours(member.id);
    });
    toast({
      title: "Saldi opgeslagen",
      description: "De aangepaste uitbetaling en saldi zijn opgeslagen. Uren zijn gewist."
    });
    setHasChanges(false);
    onClose();
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
        <Button variant="outline" onClick={onClose}>
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
                        <Label htmlFor={`actual-${member.id}`} className="text-sm">
                          Daadwerkelijk uitbetaald
                        </Label>
                        <Input id={`actual-${member.id}`} type="number" value={actualPayout} onChange={e => handleActualPayoutChange(member.id, e.target.value)} step="0.01" min="0" className="mt-1" />
                      </div>
                      
                      <div className="flex-1">
                        <Label htmlFor={`carried-${member.id}`} className="text-sm">
                          Saldo
                        </Label>
                        <div className="mt-1 flex items-center">
                          <Input id={`carried-${member.id}`} type="number" value={carriedBalance} readOnly className={`bg-gray-50 ${carriedBalance < 0 ? 'text-red-600' : carriedBalance > 0 ? 'text-green-600' : ''}`} />
                          {carriedBalance !== 0 && <span className={`ml-2 text-xs ${carriedBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {getBalanceText(carriedBalance)}
                            </span>}
                        </div>
                      </div>
                    </div>
                  </div>;
            })}
            </div>
          </div>
          
          {hasChanges && <Alert className="mt-4 bg-amber-50">
              <AlertDescription>
                Je hebt aanpassingen gemaakt in de uitbetaling. Klik op 'Saldi opslaan en afsluiten' om deze op te slaan en de uren te wissen.
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
      
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground mb-4">
            De uitbetaalde perioden zijn nu opgeslagen in de geschiedenis.
            Je kunt altijd oude uitbetalingen terugvinden in het geschiedenis-overzicht.
          </p>
          <div className="flex justify-center">
            <Button onClick={onClose} variant="goldGradient">
              <ArrowLeft size={16} className="mr-1" /> Terug naar team
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>;
};