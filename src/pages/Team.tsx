import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { TeamMember } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Users, Upload, RefreshCw } from 'lucide-react';
import { PayoutSummary } from '@/components/PayoutSummary';
import { useNavigate, useLocation } from 'react-router-dom';
import TeamMemberList from '@/components/team/TeamMemberList';
import PeriodSelector from '@/components/team/PeriodSelector';
import TipDistribution from '@/components/team/TipDistribution';
import ImportHoursDialog from '@/components/team/ImportHoursDialog';
import { supabase } from '@/integrations/supabase/client';
import { extractHoursFromExcel } from '@/services/excelService';

interface ImportedHour {
  name: string;
  hours: number;
  date: string;
  exists: boolean;
}

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
    refreshTeamData
  } = useApp();
  
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [distribution, setDistribution] = useState<TeamMember[]>([]);
  const [showPayoutSummary, setShowPayoutSummary] = useState(false);
  const [sortedTeamMembers, setSortedTeamMembers] = useState<TeamMember[]>([]);
  const [importUrl, setImportUrl] = useState<string>('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importedHours, setImportedHours] = useState<ImportedHour[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await refreshTeamData();
      } catch (error) {
        console.error("Error refreshing team data:", error);
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
  }, [refreshTeamData, toast]);

  useEffect(() => {
    const checkTeamMembersWithAccounts = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id');
        
        const userIds = new Set(profiles?.map(profile => profile.id) || []);
        
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

  const handleFileImport = async (file: File) => {
    try {
      const extractedData = await extractHoursFromExcel(file);
      
      if (extractedData.length === 0) {
        toast({
          title: "Geen data gevonden",
          description: "Er zijn geen bruikbare gegevens gevonden in het bestand.",
          variant: "destructive"
        });
        return;
      }
      
      const existingNames = new Set(teamMembers.map(m => m.name.toLowerCase()));
      const processedData = extractedData.map(item => ({
        ...item,
        exists: existingNames.has(item.name.toLowerCase())
      }));
      
      setImportedHours(processedData);
      console.log("Imported hours:", processedData);
      
      toast({
        title: "Bestand verwerkt",
        description: `${processedData.length} uur registraties gevonden.`,
      });
    } catch (error) {
      console.error("Error processing file:", error);
      toast({
        title: "Verwerkingsfout",
        description: "Er is een fout opgetreden bij het verwerken van het bestand.",
        variant: "destructive"
      });
    }
  };

  const handleConfirmImportedHours = (confirmedHours: ImportedHour[]) => {
    for (const hourData of confirmedHours) {
      const teamMember = teamMembers.find(
        member => member.name.toLowerCase() === hourData.name.toLowerCase()
      );
      
      if (teamMember) {
        updateTeamMemberHours(teamMember.id, hourData.hours);
      } else {
        const newMemberId = addTeamMember(hourData.name);
        const newMember = teamMembers.find(member => 
          member.name.toLowerCase() === hourData.name.toLowerCase()
        );
        
        if (newMember) {
          updateTeamMemberHours(newMember.id, hourData.hours);
        }
      }
    }
    
    toast({
      title: "Uren verwerkt",
      description: `${confirmedHours.length} uren registraties succesvol verwerkt.`,
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users size={20} />
          <h1 className="text-xl font-bold">Team leden</h1>
        </div>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => refreshTeamData()}
          disabled={loading}
        >
          <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Laden...' : 'Verversen'}
        </Button>
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
        onConfirm={handleConfirmImportedHours}
        importedHours={importedHours}
      />
    </div>
  );
};

export default Team;
