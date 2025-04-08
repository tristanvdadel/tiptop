
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import PayoutHeader from './PayoutHeader';
import PayoutDetails from './PayoutDetails';
import RoundingSelector, { RoundingOption } from './RoundingSelector';
import DistributionTable from './DistributionTable';
import ActionButtons from './ActionButtons';

interface PayoutSummaryProps {
  onClose: () => void;
}

interface PayoutDetailWithEdits {
  memberId: string;
  amount: number;
  actualAmount: number;
  balance: number | undefined;
  isEdited: boolean;
}

const PayoutSummary = ({ onClose }: PayoutSummaryProps) => {
  const {
    payouts,
    teamMembers,
    mostRecentPayout,
    updateTeamMemberBalance,
    clearTeamMemberHours,
    setMostRecentPayout
  } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(true);
  const [editedDistribution, setEditedDistribution] = useState<PayoutDetailWithEdits[]>([]);
  const [roundingOption, setRoundingOption] = useState<RoundingOption>('none');
  const [balancesUpdated, setBalancesUpdated] = useState(false);

  const latestPayout = mostRecentPayout || (payouts.length > 0 ? payouts[payouts.length - 1] : null);

  const findTeamMember = (id: string) => {
    return teamMembers.find(member => member.id === id);
  };

  // Initialize edited distribution from latest payout
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

  // Handle URL parameters
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

  // Calculate new balances whenever distribution changes
  useEffect(() => {
    if (isEditing) {
      calculateNewBalances();
    }
  }, [editedDistribution, isEditing]);

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

  const reopenEditor = () => {
    setBalancesUpdated(false);
    setIsEditing(true);
  };

  // Create an object with original balances for the DistributionTable component
  const originalBalances = latestPayout ? 
    latestPayout.distribution.reduce((acc, item) => {
      acc[item.memberId] = item.balance;
      return acc;
    }, {} as { [key: string]: number | undefined }) 
    : {};

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <PayoutHeader />
      <CardContent className="p-6">
        {latestPayout ? (
          <div className="space-y-6">
            <PayoutDetails payout={latestPayout} />
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">Verdeling:</h3>
                {balancesUpdated ? (
                  <Button variant="outline" size="sm" onClick={reopenEditor} className="h-8">
                    Opnieuw aanpassen
                  </Button>
                ) : !isEditing && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="h-8">
                    Aanpassen
                  </Button>
                )}
              </div>
              
              {isEditing && (
                <RoundingSelector 
                  roundingOption={roundingOption}
                  setRoundingOption={setRoundingOption}
                  applyRounding={applyRounding}
                />
              )}
              
              <DistributionTable
                distribution={isEditing ? editedDistribution : latestPayout.distribution.map(item => ({
                  ...item,
                  isEdited: false,
                  actualAmount: item.actualAmount || (item.amount + (item.balance || 0))
                }))}
                isEditing={isEditing}
                findTeamMember={findTeamMember}
                originalBalances={originalBalances}
                handleAmountChange={handleAmountChange}
              />
            </div>
            
            <div className="bg-green-50 border border-green-200 p-4 rounded-md mt-4">
              <p className="flex items-center">
                <Check className="h-5 w-5 mr-2" />
                Alle geselecteerde periodes zijn gemarkeerd als uitbetaald.
              </p>
            </div>
            
            <ActionButtons
              isEditing={isEditing}
              balancesUpdated={balancesUpdated}
              saveChanges={saveChanges}
              handleCopyToClipboard={handleCopyToClipboard}
              downloadCSV={downloadCSV}
            />
          </div>
        ) : (
          <div className="text-center py-6">
            <p>Geen recente uitbetaling gevonden.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PayoutSummary;
