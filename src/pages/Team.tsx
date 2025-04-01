import { useState, useEffect, useCallback, KeyboardEvent } from 'react';
import { useApp } from '@/contexts/AppContext';
import { TeamMember, Period, HourRegistration } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Check, Clock, Calendar } from 'lucide-react';
import { PayoutSummary } from '@/components/PayoutSummary';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
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
  const { teamMembers, addTeamMember, removeTeamMember, updateTeamMemberHours, deleteHourRegistration, calculateTipDistribution, markPeriodsAsPaid, currentPeriod, periods, payouts } = useApp();
  const [newMemberName, setNewMemberName] = useState('');
  const [hoursInputs, setHoursInputs] = useState<{ [key: string]: string }>({});
  const [distribution, setDistribution] = useState<TeamMember[]>([]);
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [showPayoutSummary, setShowPayoutSummary] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    if (currentPeriod) {
      setSelectedPeriods([currentPeriod.id]);
    }
  }, [currentPeriod]);
  
  useEffect(() => {
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
        setHoursInputs(prev => ({ ...prev, [id]: '' }));
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
  
  const handleDeleteRegistration = (memberId: string, registrationId: string) => {
    deleteHourRegistration(memberId, registrationId);
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
        variant: "destructive",
      });
      return;
    }
    
    let customDistribution;
    
    if (distribution.length > 0) {
      customDistribution = distribution.map(member => ({
        memberId: member.id,
        amount: member.tipAmount || 0,
      }));
    } else if (teamMembers.length > 0) {
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

  const formatDate = (dateString: string): string => {
    return format(new Date(dateString), 'd MMM yyyy HH:mm', { locale: nl });
  };

  const unpaidPeriods = periods.filter(period => !period.isPaid && !period.isActive);
  
  const canIncludeCurrentPeriod = currentPeriod && currentPeriod.tips.length > 0;
  
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
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <Label htmlFor={`hours-${member.id}`} className="block text-lg font-medium">
                  {member.name}
                </Label>
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
              </div>
              
              <div className="flex items-end gap-2 mb-4">
                <div className="flex-1">
                  <Label htmlFor={`hours-${member.id}`} className="block text-sm font-medium mb-1">
                    Uren toevoegen
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
                </div>
                
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Totaal uren</p>
                  <p className="text-xl font-semibold">{member.hours}</p>
                </div>
              </div>
              
              {member.hourRegistrations && member.hourRegistrations.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Uren geschiedenis</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {member.hourRegistrations.map((registration: HourRegistration) => (
                      <div 
                        key={registration.id} 
                        className="flex items-center justify-between p-2 border border-gray-200 rounded-md bg-gray-50"
                      >
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="font-medium">{registration.hours} uren</span>
                          <span className="mx-2 text-gray-400">•</span>
                          <span className="text-xs text-gray-500 flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(registration.date)}
                          </span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteRegistration(member.id, registration.id)}
                          className="h-7 w-7 text-gray-500 hover:text-red-500"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
