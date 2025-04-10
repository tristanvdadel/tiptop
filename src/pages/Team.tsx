import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { TeamMember } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Users, Upload } from 'lucide-react';
import { PayoutSummary } from '@/components/PayoutSummary';
import { useNavigate, useLocation } from 'react-router-dom';
import TeamMemberList from '@/components/team/TeamMemberList';
import PeriodSelector from '@/components/team/PeriodSelector';
import TipDistribution from '@/components/team/TipDistribution';
import ImportHoursDialog from '@/components/team/ImportHoursDialog';
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
  } = useApp();
  
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [distribution, setDistribution] = useState<TeamMember[]>([]);
  const [showPayoutSummary, setShowPayoutSummary] = useState(false);
  const [sortedTeamMembers, setSortedTeamMembers] = useState<TeamMember[]>([]);
  const [importUrl, setImportUrl] = useState<string>('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Check which team members have accounts
  useEffect(() => {
    const checkTeamMembersWithAccounts = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // Get all registered users from profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id');
        
        const userIds = new Set(profiles?.map(profile => profile.id) || []);
        
        // Update team members with account status
        const updatedTeamMembers = teamMembers.map(member => ({
          ...member,
          hasAccount: userIds.has(member.id)
        }));
        
        const sorted = [...updatedTeamMembers].sort((a, b) => 
          a.name.toLowerCase().localeCompare(b.name.toLowerCase())
        );
        
        setSortedTeamMembers(sorted);
      } catch (error) {
        console.error("Error checking team members with accounts:", error);
      }
    };
    
    checkTeamMembersWithAccounts();
  }, [teamMembers]);

  useEffect(() => {
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
    
    navigate('/team?payoutSummary=true');
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

  const handleImportHours = () => {
    setShowImportDialog(true);
  };

  const handleFileImport = (file: File) => {
    console.log("File imported:", file.name);
    toast({
      title: "Bestand geüpload",
      description: "Het bestand is geüpload en wordt verwerkt. De functionaliteit voor het verwerken van de geïmporteerde uren is nog in ontwikkeling.",
    });
  };

  if (showPayoutSummary) {
    return (
      <div className="pb-16">
        <PayoutSummary onClose={() => {
          setShowPayoutSummary(false);
          navigate('/team');
        }} />
      </div>
    );
  }

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
      
      <div className="flex justify-end my-4">
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={handleImportHours}
        >
          <Upload size={16} />
          Uren importeren
        </Button>
      </div>
      
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

      <ImportHoursDialog 
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={handleFileImport}
      />
    </div>
  );
};

export default Team;
