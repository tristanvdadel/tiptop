
import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { TeamMember } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Users } from 'lucide-react';
import { PayoutSummary } from '@/components/PayoutSummary';
import { useNavigate } from 'react-router-dom';
import TeamMemberList from '@/components/team/TeamMemberList';
import PeriodSelector from '@/components/team/PeriodSelector';
import TipDistribution from '@/components/team/TipDistribution';

const Team = () => {
  const {
    teamMembers,
    addTeamMember,
    removeTeamMember,
    updateTeamMemberHours,
    deleteHourRegistration,
    calculateTipDistribution,
    markPeriodsAsPaid,
    periods,
    payouts,
    updateTeamMemberName,
  } = useApp();
  
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [distribution, setDistribution] = useState<TeamMember[]>([]);
  const [showPayoutSummary, setShowPayoutSummary] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if the URL has payoutSummary=true and set state accordingly
    const urlParams = new URLSearchParams(window.location.search);
    const showSummary = urlParams.get('payoutSummary') === 'true';
    setShowPayoutSummary(showSummary);
    
    if (!showSummary) {
      setSelectedPeriods([]);
    }
  }, []);

  const togglePeriodSelection = (periodId: string) => {
    setSelectedPeriods(prev => {
      if (prev.includes(periodId)) {
        return prev.filter(id => id !== periodId);
      } else {
        return [...prev, periodId];
      }
    });
  };

  const calculateDistributionForSelectedPeriods = useCallback(() => {
    if (selectedPeriods.length === 0 || teamMembers.length === 0) {
      setDistribution([]);
      return;
    }
    const calculatedDistribution = calculateTipDistribution(selectedPeriods);
    setDistribution(calculatedDistribution);
  }, [selectedPeriods, calculateTipDistribution, teamMembers.length]);

  useEffect(() => {
    calculateDistributionForSelectedPeriods();
  }, [selectedPeriods, calculateDistributionForSelectedPeriods]);

  const handlePayout = () => {
    if (selectedPeriods.length === 0) {
      toast({
        title: "Selecteer perioden",
        description: "Selecteer minimaal één periode voor uitbetaling.",
        variant: "destructive"
      });
      return;
    }

    const customDistribution = distribution.map(member => ({
      memberId: member.id,
      amount: member.tipAmount || 0,
      actualAmount: (member.tipAmount || 0) + (member.balance || 0),
      balance: member.balance
    }));
    
    markPeriodsAsPaid(selectedPeriods, customDistribution);
    setShowPayoutSummary(true);
    
    // Update URL to include payoutSummary parameter
    const url = new URL(window.location.href);
    url.searchParams.set('payoutSummary', 'true');
    window.history.pushState({}, '', url.toString());
  };

  const calculateTotalTipsAndHours = useCallback(() => {
    if (selectedPeriods.length === 0) {
      return {
        totalTips: 0,
        totalHours: 0
      };
    }
    
    const totalTips = selectedPeriods.reduce((sum, periodId) => {
      const period = periods.find(p => p.id === periodId);
      if (period) {
        return sum + period.tips.reduce((s, tip) => s + tip.amount, 0);
      }
      return sum;
    }, 0);
    
    const totalHours = teamMembers.reduce((sum, member) => sum + member.hours, 0);
    
    return {
      totalTips,
      totalHours
    };
  }, [selectedPeriods, periods, teamMembers]);

  const { totalTips, totalHours } = calculateTotalTipsAndHours();

  const handleViewPayoutHistory = () => {
    navigate('/management', {
      state: {
        initialTab: 'payouts'
      }
    });
  };

  if (showPayoutSummary) {
    return (
      <div>
        <PayoutSummary onClose={() => {
          setShowPayoutSummary(false);
          // Remove the payoutSummary parameter from URL when closing
          const url = new URL(window.location.href);
          url.searchParams.delete('payoutSummary');
          window.history.pushState({}, '', url.toString());
        }} />
      </div>
    );
  }

  return (
    <div className="pb-20 min-h-[calc(100vh-100px)]">
      <div className="flex items-center gap-2 mb-4">
        <Users size={20} />
        <h1 className="text-xl font-bold">Team leden</h1>
      </div>
      
      <TeamMemberList 
        teamMembers={teamMembers}
        addTeamMember={addTeamMember}
        removeTeamMember={removeTeamMember}
        updateTeamMemberHours={updateTeamMemberHours}
        deleteHourRegistration={deleteHourRegistration}
        updateTeamMemberName={updateTeamMemberName}
      />
      
      <PeriodSelector 
        periods={periods}
        selectedPeriods={selectedPeriods}
        onTogglePeriodSelection={togglePeriodSelection}
      />
      
      {selectedPeriods.length > 0 && (
        <TipDistribution 
          distribution={distribution}
          totalTips={totalTips}
          totalHours={totalHours}
        />
      )}
      
      {periods.filter(period => !period.isPaid && !period.isActive).length > 0 && (
        <div className="flex gap-2">
          <Button 
            variant="default" 
            className="w-full md:w-auto bg-green-500 hover:bg-green-600 text-white"
            onClick={handlePayout} 
            disabled={selectedPeriods.length === 0}
          >
            Uitbetaling voltooien
          </Button>
        </div>
      )}
    </div>
  );
};

export default Team;
