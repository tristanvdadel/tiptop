
import React, { useEffect, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Payout, PayoutData, TeamMember } from '@/types/models';

interface PayoutSummaryProps {
  onPayoutCompleted?: () => void;
  onClose?: () => void;
}

const PayoutSummary: React.FC<PayoutSummaryProps> = ({ onPayoutCompleted, onClose }) => {
  const { teamId, periods, teamMembers, payouts, calculateTipDistribution, markPeriodsAsPaid, mostRecentPayout, refreshTeamData } = useApp();
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [distribution, setDistribution] = useState<TeamMember[]>([]);
  const [paidBy, setPaidBy] = useState<string>('');
  const [totalTips, setTotalTips] = useState<number>(0);
  const [totalHours, setTotalHours] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  useEffect(() => {
    if (teamId) {
      const calculatedDistribution = calculateTipDistribution(selectedPeriods);
      setDistribution(calculatedDistribution);
      
      // Calculate total tips from selected periods
      const tips = selectedPeriods.reduce((acc, periodId) => {
        const period = periods.find(p => p.id === periodId);
        return acc + (period?.tips?.reduce((sum, tip) => sum + tip.amount, 0) || 0);
      }, 0);
      setTotalTips(tips);
      
      // Calculate total hours from team members
      const hours = teamMembers.reduce((acc, member) => acc + member.hours, 0);
      setTotalHours(hours);
    }
  }, [teamId, periods, teamMembers, selectedPeriods, calculateTipDistribution]);
  
  const handleTogglePeriodSelection = (periodId: string) => {
    setSelectedPeriods(prev =>
      prev.includes(periodId) ? prev.filter(id => id !== periodId) : [...prev, periodId]
    );
  };
  
  const handlePayout = async () => {
    setIsSaving(true);
    try {
      if (!teamId || !selectedPeriods.length || !paidBy || !distribution.length) return;
      
      await markPeriodsAsPaid(selectedPeriods, distribution);
      
      // Refresh team data after payout
      await refreshTeamData();
      
      // Reset state
      setSelectedPeriods([]);
      setPaidBy('');
      
      if (onPayoutCompleted) {
        onPayoutCompleted();
      }
    } catch (error) {
      console.error("Error during payout:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const savePayoutData = async () => {
    if (!teamId || !selectedPeriods.length || !paidBy || !distribution.length) return;
    
    // Create payout data
    const payoutData: PayoutData = {
      teamId,
      date: new Date().toISOString(),
      payoutTime: new Date().toISOString(),
      totalTips: totalTips,
      totalHours: totalHours,
      payerName: paidBy,
      totalAmount: totalTips,
      distribution: distribution.map(m => ({
        memberId: m.id,
        amount: m.tipAmount || 0,
        hours: m.hours,
        balance: m.balance
      })),
      periodIds: selectedPeriods,
    };
    
    try {
      // Mark periods as paid and save payout data
      await markPeriodsAsPaid(selectedPeriods, distribution);
      
      // Refresh team data after payout
      await refreshTeamData();
      
      // Reset state
      setSelectedPeriods([]);
      setPaidBy('');
      
      if (onPayoutCompleted) {
        onPayoutCompleted();
      }
    } catch (error) {
      console.error("Error during payout:", error);
    }
  };

  const formatDate = (dateString: string): string => {
    return format(new Date(dateString), 'd MMMM yyyy', {
      locale: nl
    });
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">
          Uitbetaling
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {mostRecentPayout && <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-200">
            <h3 className="text-sm font-medium text-green-700">
              Laatste uitbetaling
            </h3>
            <p className="text-xs text-green-600">
              {formatDate(mostRecentPayout.date)}
            </p>
          </div>}
        
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-2">Betaald door</h2>
          <input
            type="text"
            placeholder="Naam"
            value={paidBy}
            onChange={e => setPaidBy(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        
        <div className="flex justify-between gap-2">
          <Button onClick={handlePayout} disabled={isSaving} className="bg-green-500 hover:bg-green-600 text-white">
            {isSaving ? 'Uitbetalen...' : 'Uitbetalen'}
          </Button>
          
          {onClose && (
            <Button onClick={onClose} variant="outline">
              Annuleren
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PayoutSummary;
