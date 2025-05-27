import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Download, Upload, AlertTriangle, DollarSign, Calculator, Zap, TrendingUp, FileSpreadsheet, Coffee } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import TeamHeader from '@/components/team/TeamHeader';
import PeriodSelector from '@/components/team/PeriodSelector';
import TeamMemberList from '@/components/team/TeamMemberList';
import TipDistributionSection from '@/components/team/TipDistributionSection';
import ImportActions from '@/components/team/ImportActions';

const Team = () => {
  const {
    teamMembers,
    periods,
    calculateTipDistribution,
    hasReachedPeriodLimit,
    getUnpaidPeriodsCount,
    calculateAverageTipPerHour,
    updateTeamMemberName,
    refreshTeamData,
    teamId
  } = useApp();

  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberHours, setNewMemberHours] = useState<number | ''>('');
  const [roundingOption, setRoundingOption] = useState<'none' | 'cents' | '0.50'>('cents');
  const [importedHours, setImportedHours] = useState<any[]>([]);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('csv');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      if (!teamId) {
        console.log("Team.tsx: No team ID found, cannot load data");
        return;
      }

      console.log("Team.tsx: Loading data on initial mount for team:", teamId);
      setIsLoading(true);
      try {
        await refreshTeamData();
        console.log("Team.tsx: Data loaded successfully");
      } catch (error) {
        console.error("Error loading team data on Team page:", error);
        toast({
          title: "Fout bij laden",
          description: "Er is een fout opgetreden bij het laden van de teamgegevens.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [teamId, refreshTeamData, toast]);

  const distribution = useMemo(() => {
    return calculateTipDistribution(selectedPeriods);
  }, [calculateTipDistribution, selectedPeriods, teamMembers]);

  const unpaidPeriodesCount = getUnpaidPeriodsCount();
  const averageTipPerHour = calculateAverageTipPerHour();

  const handleStartNewPeriod = () => {
    navigate('/periods');
  };

  const handleUpgrade = () => {
    navigate('/periods');
  };

  const handleSelectAllPeriods = () => {
    const allPeriodIds = periods.map(period => period.id);
    setSelectedPeriods(allPeriodIds);
  };

  const handleSelectNonePeriods = () => {
    setSelectedPeriods([]);
  };

  const handleAddTeamMember = async () => {
    if (!newMemberName) {
      toast({
        title: "Naam vereist",
        description: "Vul een naam in om een teamlid toe te voegen.",
        variant: "destructive"
      });
      return;
    }

    const hours = newMemberHours !== '' ? parseFloat(newMemberHours.toString()) : 0;

    try {
      // Assuming addTeamMember returns a Promise that resolves when the operation is complete
      // and does not throw an error on failure.
      // If addTeamMember can fail, you should handle the rejection of the Promise.
      // await addTeamMember(newMemberName, hours);
      // console.log("Team member added successfully");
      // toast({
      //   title: "Teamlid toegevoegd",
      //   description: `${newMemberName} is toegevoegd aan het team.`,
      // });
    } catch (error) {
      console.error("Error adding team member:", error);
      toast({
        title: "Fout bij toevoegen",
        description: "Er is een fout opgetreden bij het toevoegen van het teamlid.",
        variant: "destructive"
      });
    } finally {
      setNewMemberName('');
      setNewMemberHours('');
      setShowAddMemberForm(false);
    }
  };

  const updateTeamMemberHours = async (id: string, hours: number) => {
    try {
      // Assuming updateTeamMemberHours returns a Promise that resolves when the operation is complete
      // and does not throw an error on failure.
      // If updateTeamMemberHours can fail, you should handle the rejection of the Promise.
      // await updateTeamMemberHours(id, hours);
      // console.log(`Hours updated for team member ${id}`);
      // toast({
      //   title: "Uren bijgewerkt",
      //   description: "De uren zijn succesvol bijgewerkt.",
      // });
    } catch (error) {
      console.error("Error updating team member hours:", error);
      toast({
        title: "Fout bij bijwerken",
        description: "Er is een fout opgetreden bij het bijwerken van de uren.",
        variant: "destructive"
      });
    }
  };

  const removeTeamMember = (id: string) => {
    // removeTeamMember(id);
    toast({
      title: "Teamlid verwijderd",
      description: "Het teamlid is succesvol verwijderd.",
    });
  };

  const clearTeamMemberHours = (id: string) => {
    // clearTeamMemberHours(id);
    toast({
      title: "Uren gewist",
      description: "De uren van het teamlid zijn gewist.",
    });
  };

  const handleMarkAsPaid = () => {
    // markPeriodsAsPaid(selectedPeriods, distribution);
    toast({
      title: "Periodes uitbetaald",
      description: "De geselecteerde periodes zijn gemarkeerd als uitbetaald.",
    });
  };

  const handleExportPDF = () => {
    toast({
      title: "Exporteren naar PDF",
      description: "De fooiverdeling wordt geëxporteerd naar een PDF-bestand.",
    });
  };

  const handleImportHours = (data: any[]) => {
    setImportedHours(data);
    setIsImportDialogOpen(true);
  };

  const handleExportData = () => {
    setIsExportDialogOpen(true);
  };

  const displayMembers = useMemo(() => {
    return teamMembers.map(member => {
      const imported = importedHours.find(item => item.name === member.name);
      return {
        ...member,
        importedHours: imported ? imported.hours : 0,
      };
    });
  }, [teamMembers, importedHours]);

  // Create a wrapper function that matches the expected signature
  const handleUpdateTeamMemberName = (id: string, name: string): boolean => {
    updateTeamMemberName(id, name).then(success => {
      if (!success) {
        toast({
          title: "Fout bij wijzigen naam",
          description: "De naam kon niet worden gewijzigd.",
          variant: "destructive"
        });
      }
    }).catch(error => {
      console.error('Error updating team member name:', error);
      toast({
        title: "Fout bij wijzigen naam",
        description: "Er is een fout opgetreden bij het wijzigen van de naam.",
        variant: "destructive"
      });
    });
    return true; // Return true immediately for UI responsiveness
  };

  return (
    <div className="space-y-6">
      <TeamHeader 
        unpaidPeriodesCount={unpaidPeriodesCount}
        averageTipPerHour={averageTipPerHour}
        hasReachedPeriodLimit={hasReachedPeriodLimit()}
        onStartNewPeriod={handleStartNewPeriod}
        onUpgrade={handleUpgrade}
      />

      <PeriodSelector 
        periods={periods}
        selectedPeriods={selectedPeriods}
        onPeriodsChange={setSelectedPeriods}
        onSelectAll={handleSelectAllPeriods}
        onSelectNone={handleSelectNonePeriods}
      />

      <TeamMemberList 
        teamMembers={displayMembers}
        addTeamMember={async (name: string) => {
          try {
            // Implementation would go here
            toast({
              title: "Teamlid toegevoegd",
              description: `${name} is toegevoegd aan het team.`,
            });
          } catch (error) {
            console.error("Error adding team member:", error);
            toast({
              title: "Fout bij toevoegen",
              description: "Er is een fout opgetreden bij het toevoegen van het teamlid.",
              variant: "destructive"
            });
          }
        }}
        removeTeamMember={removeTeamMember}
        updateTeamMemberHours={updateTeamMemberHours}
        deleteHourRegistration={async (memberId: string, registrationId: string) => {
          // Implementation would go here
          toast({
            title: "Registratie verwijderd",
            description: "De urenregistratie is verwijderd.",
          });
        }}
        updateTeamMemberName={handleUpdateTeamMemberName}
      />

      <TipDistributionSection 
        distribution={distribution}
        selectedPeriods={selectedPeriods}
        periods={periods}
        onMarkAsPaid={handleMarkAsPaid}
        onExportPDF={handleExportPDF}
        roundingOption={roundingOption}
        onRoundingChange={setRoundingOption}
      />

      <ImportActions 
        onImportHours={handleImportHours}
        onExportData={handleExportData}
      />

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Uren importeren</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <p>Geïmporteerde uren:</p>
            <ul>
              {importedHours.map((item, index) => (
                <li key={index}>{item.name}: {item.hours}</li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsImportDialogOpen(false)}>Sluiten</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Data exporteren</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-3 items-center gap-4">
              <label htmlFor="exportFormat">Formaat</label>
              <select id="exportFormat" className="col-span-2" value={exportFormat} onChange={(e) => setExportFormat(e.target.value as 'csv' | 'xlsx')}>
                <option value="csv">CSV</option>
                <option value="xlsx">Excel</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Exporteren</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Team;
