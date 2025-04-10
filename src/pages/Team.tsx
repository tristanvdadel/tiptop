
import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { TeamMember } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Users } from 'lucide-react';
import { PayoutSummary } from '@/components/PayoutSummary';
import { useNavigate, useLocation } from 'react-router-dom';
import TeamMemberList from '@/components/team/TeamMemberList';
import PeriodSelector from '@/components/team/PeriodSelector';
import TipDistribution from '@/components/team/TipDistribution';
import { supabase } from '@/integrations/supabase/client';

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
    fetchTeamMembers,
    fetchPeriods,
  } = useApp();
  
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [distribution, setDistribution] = useState<TeamMember[]>([]);
  const [showPayoutSummary, setShowPayoutSummary] = useState(false);
  const [sortedTeamMembers, setSortedTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch data when component mounts
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await fetchTeamMembers();
        await fetchPeriods();
      } catch (error) {
        console.error("Error loading team data:", error);
        toast({
          title: "Fout bij laden",
          description: "Er is een fout opgetreden bij het laden van de teamgegevens.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [fetchTeamMembers, fetchPeriods, toast]);

  // Sort team members alphabetically by name
  useEffect(() => {
    const sorted = [...teamMembers].sort((a, b) => 
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
    setSortedTeamMembers(sorted);
  }, [teamMembers]);

  useEffect(() => {
    // Check if the URL has payoutSummary=true and set state accordingly
    const urlParams = new URLSearchParams(location.search);
    const showSummary = urlParams.get('payoutSummary') === 'true';
    setShowPayoutSummary(showSummary);
    
    if (!showSummary) {
      setSelectedPeriods([]);
    }
  }, [location.search]);

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

  const handlePayout = async () => {
    if (selectedPeriods.length === 0) {
      toast({
        title: "Selecteer perioden",
        description: "Selecteer minimaal één periode voor uitbetaling.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const customDistribution = distribution.map(member => ({
        memberId: member.id,
        amount: member.tipAmount || 0,
        actualAmount: (member.tipAmount || 0) + (member.balance || 0),
        balance: member.balance
      }));
      
      await markPeriodsAsPaid(selectedPeriods, customDistribution);
      setShowPayoutSummary(true);
      
      // Update URL to include payoutSummary parameter
      navigate('/team?payoutSummary=true');
    } catch (error) {
      console.error("Error processing payout:", error);
      toast({
        title: "Fout bij uitbetaling",
        description: "Er is een fout opgetreden bij het verwerken van de uitbetaling.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Gegevens laden...</p>
        </div>
      </div>
    );
  }

  if (showPayoutSummary) {
    return (
      <div className="pb-16">
        <PayoutSummary onClose={() => {
          setShowPayoutSummary(false);
          // Remove the payoutSummary parameter from URL when closing
          navigate('/team');
        }} />
      </div>
    );
  }

  const hasPermission = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    
    const { data } = await supabase
      .from('team_members')
      .select('permissions, role')
      .eq('user_id', user.id)
      .single();
    
    if (!data) return false;
    
    if (data.role === 'admin') return true;
    
    const permissions = data.permissions as unknown as Record<string, boolean>;
    return permissions?.manage_payouts === true;
  };

  return (
    <div className="pb-16">
      <div className="flex items-center gap-2 mb-4">
        <Users size={20} />
        <h1 className="text-xl font-bold">Team leden</h1>
      </div>
      
      <TeamMemberList 
        teamMembers={sortedTeamMembers}
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
            disabled={selectedPeriods.length === 0 || loading}
          >
            {loading ? "Verwerken..." : "Uitbetaling voltooien"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default Team;
