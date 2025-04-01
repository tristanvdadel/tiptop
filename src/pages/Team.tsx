
import { useState, useEffect, useCallback, KeyboardEvent } from 'react';
import { useApp } from '@/contexts/AppContext';
import { TeamMember, Period } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Check } from 'lucide-react';
import { PayoutSummary } from '@/components/PayoutSummary';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";

const Team = () => {
  const { teamMembers, addTeamMember, removeTeamMember, updateTeamMemberHours, calculateTipDistribution, markPeriodsAsPaid, currentPeriod, periods, payouts } = useApp();
  const [newMemberName, setNewMemberName] = useState('');
  const [hoursInputs, setHoursInputs] = useState<{ [key: string]: string }>({});
  const [distribution, setDistribution] = useState<TeamMember[]>([]);
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [showPayoutSummary, setShowPayoutSummary] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    // Initialize with current period if any
    if (currentPeriod) {
      setSelectedPeriods([currentPeriod.id]);
    }
  }, [currentPeriod]);
  
  useEffect(() => {
    // Initialize hours inputs with current values
    const initialHours: { [key: string]: string } = {};
    teamMembers.forEach(member => {
      initialHours[member.id] = member.hours > 0 ? member.hours.toString() : '';
    });
    setHoursInputs(initialHours);
  }, [teamMembers]);
  
  const handleAddMember = () => {
    if (newMemberName.trim() !== '') {
      addTeamMember(newMemberName);
      setNewMemberName('');
    }
  };

  const handleRemoveMember = (id: string) => {
    removeTeamMember(id);
  };

  const handleHoursChange = (id: string, value: string) => {
    setHoursInputs(prev => ({ ...prev, [id]: value }));
  };

  const handleHoursSubmit = (id: string) => {
    const value = hoursInputs[id];
    if (value !== undefined) {
      const hours = value === '' ? 0 : parseFloat(value);
      if (!isNaN(hours)) {
        updateTeamMemberHours(id, hours);
        toast({
          title: "Uren opgeslagen",
          description: `Uren succesvol opgeslagen voor teamlid.`,
        });
      } else {
        toast({
          title: "Ongeldige invoer",
          description: "Voer een geldig aantal uren in.",
          variant: "destructive",
        });
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleHoursSubmit(id);
    }
  };
  
  const togglePeriodSelection = (periodId: string) => {
    setSelectedPeriods(prev => {
      if (prev.includes(periodId)) {
        return prev.filter(id => id !== periodId);
      } else {
        return [...prev, periodId];
      }
    });
  };
  
  // Calculate distribution based on selected periods
  const calculateDistributionForSelectedPeriods = useCallback(() => {
    if (selectedPeriods.length === 0 || teamMembers.length === 0) {
      setDistribution([]);
      return;
    }
    
    const calculatedDistribution = calculateTipDistribution(selectedPeriods);
    setDistribution(calculatedDistribution);
  }, [selectedPeriods, calculateTipDistribution, teamMembers.length]);

  // Recalculate distribution when selected periods change
  useEffect(() => {
    calculateDistributionForSelectedPeriods();
  }, [selectedPeriods, calculateDistributionForSelectedPeriods]);

  const handlePayout = () => {
    if (selectedPeriods.length === 0) {
      toast({
        title: "Selecteer perioden",
        description: "Selecteer minimaal één periode voor uitbetaling.",
        variant: "destructive",
      });
      return;
    }
    
    let customDistribution;
    
    // If there's a valid distribution, use it
    if (distribution.length > 0) {
      customDistribution = distribution.map(member => ({
        memberId: member.id,
        amount: member.tipAmount || 0,
      }));
    } 
    // If there's no distribution but we have team members, create equal distribution
    else if (teamMembers.length > 0) {
      // Calculate total tips from selected periods
      const totalTips = selectedPeriods.reduce((sum, periodId) => {
        const period = periods.find(p => p.id === periodId);
        if (period) {
          return sum + period.tips.reduce((s, tip) => s + tip.amount, 0);
        }
        return sum;
      }, 0);
      
      const equalShare = teamMembers.length > 0 ? totalTips / teamMembers.length : 0;
      
      customDistribution = teamMembers.map(member => ({
        memberId: member.id,
        amount: parseFloat(equalShare.toFixed(2)),
      }));
    } else {
      toast({
        title: "Geen teamleden",
        description: "Er zijn geen teamleden om aan uit te betalen.",
        variant: "destructive",
      });
      return;
    }
    
    markPeriodsAsPaid(selectedPeriods, customDistribution);
    setIsPayoutModalOpen(false);
    setShowPayoutSummary(true);
  };

  // Get unpaid periods that can be selected for payout
  const unpaidPeriods = periods.filter(period => !period.isPaid && !period.isActive);
  
  // Check if current period can be included (active but has tips)
  const canIncludeCurrentPeriod = currentPeriod && currentPeriod.tips.length > 0;
  
  // All periods that can be selected for payout
  const availablePeriods = canIncludeCurrentPeriod 
    ? [...unpaidPeriods, currentPeriod] 
    : unpaidPeriods;

  if (showPayoutSummary) {
    return <PayoutSummary onClose={() => setShowPayoutSummary(false)} />;
  }

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between">
        <h1 className="text-xl font-bold mb-4 md:mb-0">Team leden</h1>
        <div className="flex items-center">
          <Input
            type="text"
            placeholder="Naam team lid"
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
            className="mr-2"
          />
          <Button onClick={handleAddMember}>
            <Plus size={16} className="mr-2" /> Toevoegen
          </Button>
        </div>
      </div>
      
      <Separator className="my-4" />

      <div className="grid gap-4 mb-8">
        {teamMembers.map((member) => (
          <Card key={member.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <Label htmlFor={`hours-${member.id}`} className="block text-sm font-medium mb-1">
                  {member.name}
                </Label>
                <div className="flex items-center">
                  <Input
                    type="number"
                    name={`hours-${member.id}`}
                    id={`hours-${member.id}`}
                    className="block w-full pr-10 text-sm rounded-md"
                    placeholder="Uren"
                    value={hoursInputs[member.id] || ''}
                    onChange={(e) => handleHoursChange(member.id, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, member.id)}
                  />
                  <Button 
                    variant="ghost"
                    size="icon"
                    onClick={() => handleHoursSubmit(member.id)}
                    className="ml-2"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
                {member.hours > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Huidige uren: {member.hours}
                  </p>
                )}
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Dit teamlid wordt permanent verwijderd.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuleren</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleRemoveMember(member.id)}>Verwijderen</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {availablePeriods.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-2">Selecteer perioden om uit te betalen</h2>
          <Card>
            <CardContent className="p-4">
              <ul className="space-y-2">
                {availablePeriods.map((period) => {
                  const periodName = period.name || (period.isActive ? "Huidige periode" : `Periode ${new Date(period.startDate).toLocaleDateString()}`);
                  const totalTips = period.tips.reduce((sum, tip) => sum + tip.amount, 0);
                  
                  return (
                    <li key={period.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`period-${period.id}`} 
                        checked={selectedPeriods.includes(period.id)}
                        onCheckedChange={() => togglePeriodSelection(period.id)}
                      />
                      <Label 
                        htmlFor={`period-${period.id}`}
                        className="flex-1 cursor-pointer flex justify-between"
                      >
                        <span>{periodName}</span>
                        <span className="font-medium">€{totalTips.toFixed(2)}</span>
                      </Label>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
      
      {selectedPeriods.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-2">Fooi verdeling</h2>
          <Card>
            <CardContent className="p-4">
              {distribution.length > 0 ? (
                <ul>
                  {distribution.map((member) => (
                    <li key={member.id} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                      <div>
                        {member.name}
                      </div>
                      <div className="font-medium">
                        €{member.tipAmount?.toFixed(2) || '0.00'}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  {teamMembers.length === 0 
                    ? "Geen teamleden gevonden." 
                    : "Geen uren ingesteld om verdeling te berekenen. Een gelijke verdeling zal worden toegepast."}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      
      {availablePeriods.length > 0 && (
        <Button 
          className="gold-button" 
          onClick={() => setIsPayoutModalOpen(true)}
          disabled={selectedPeriods.length === 0}
        >
          Markeer als uitbetaald
        </Button>
      )}
      
      <AlertDialog open={isPayoutModalOpen} onOpenChange={setIsPayoutModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
            <AlertDialogDescription>
              De geselecteerde perioden worden gemarkeerd als uitbetaald.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsPayoutModalOpen(false)}>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handlePayout}>Markeer als uitbetaald</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Team;
