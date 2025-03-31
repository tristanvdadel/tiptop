import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, User, Upload, Crown, DollarSign, Check } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const Team = () => {
  const { 
    teamMembers, 
    addTeamMember, 
    removeTeamMember, 
    updateTeamMemberHours, 
    tier, 
    periods,
    calculateTipDistribution, 
    markPeriodsAsPaid 
  } = useApp();
  
  const [newMemberName, setNewMemberName] = useState('');
  const [showPayout, setShowPayout] = useState(false);
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [showCsvDialog, setShowCsvDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [hourInputs, setHourInputs] = useState<Record<string, number>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    const initialHourInputs: Record<string, number> = {};
    teamMembers.forEach(member => {
      initialHourInputs[member.id] = 0;
    });
    setHourInputs(initialHourInputs);
  }, [teamMembers.length]);
  
  useEffect(() => {
    const handleResetHoursInput = (e: CustomEvent) => {
      const { memberId } = e.detail;
      setHourInputs(prev => ({
        ...prev,
        [memberId]: 0
      }));
    };
    
    window.addEventListener('reset-hours-input', handleResetHoursInput as EventListener);
    
    return () => {
      window.removeEventListener('reset-hours-input', handleResetHoursInput as EventListener);
    };
  }, []);
  
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMemberName.trim()) {
      addTeamMember(newMemberName.trim());
      setNewMemberName('');
    }
  };

  const handleHoursChange = (id: string, value: string) => {
    const hours = parseFloat(value) || 0;
    setHourInputs(prev => ({
      ...prev,
      [id]: hours
    }));
  };
  
  const handleSubmitHours = (id: string) => {
    updateTeamMemberHours(id, hourInputs[id] || 0);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (tier !== 'pro') {
      toast({
        title: "PRO functie",
        description: "CSV import is alleen beschikbaar in het PRO abonnement.",
      });
      return;
    }

    toast({
      title: "CSV geïmporteerd",
      description: "De uren zijn succesvol geïmporteerd voor je teamleden.",
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    setShowCsvDialog(false);
  };
  
  const triggerFileUpload = () => {
    if (tier === 'pro') {
      setShowCsvDialog(true);
    } else {
      toast({
        title: "PRO functie",
        description: "CSV import is alleen beschikbaar in het PRO abonnement.",
      });
    }
  };
  
  const confirmRemoveMember = (id: string) => {
    setMemberToRemove(id);
    setShowRemoveDialog(true);
  };
  
  const handleRemoveMember = () => {
    if (memberToRemove) {
      removeTeamMember(memberToRemove);
      setShowRemoveDialog(false);
      setMemberToRemove(null);
    }
  };
  
  const togglePeriodSelection = (periodId: string) => {
    setSelectedPeriods(prev => 
      prev.includes(periodId)
        ? prev.filter(id => id !== periodId)
        : [...prev, periodId]
    );
  };
  
  const handlePayout = () => {
    if (!selectedPeriods.length) {
      toast({
        title: "Geen periodes geselecteerd",
        description: "Selecteer ten minste één periode om uit te betalen.",
      });
      return;
    }
    
    markPeriodsAsPaid(selectedPeriods);
    
    toast({
      title: "Uitbetaling voltooid",
      description: "De geselecteerde periodes zijn gemarkeerd als uitbetaald.",
    });
    
    setSelectedPeriods([]);
    setShowPayout(false);
  };
  
  const completedPeriods = periods.filter(p => !p.isActive && !p.isPaid);
  
  const distribution = selectedPeriods.length > 0 
    ? calculateTipDistribution(selectedPeriods) 
    : [];
    
  const totalSelectedTip = selectedPeriods.length > 0
    ? periods
        .filter(p => selectedPeriods.includes(p.id))
        .reduce((sum, period) => 
          sum + period.tips.reduce((s, tip) => s + tip.amount, 0), 
          0
        )
    : 0;
    
  const tierMemberLimit = tier === 'free' ? 5 : tier === 'team' ? 10 : Infinity;
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Team</h1>
        <div className="flex gap-2">
          <Badge className="tier-free">
            {teamMembers.length}/{tierMemberLimit} leden
          </Badge>
          {completedPeriods.length > 0 && (
            <Button 
              onClick={() => setShowPayout(!showPayout)}
              className="gold-button"
              size="sm"
            >
              <DollarSign size={16} />
              {showPayout ? 'Annuleren' : 'Uitbetalen'}
            </Button>
          )}
        </div>
      </div>
      
      {!showPayout && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Teamleden</CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center gap-1"
              onClick={triggerFileUpload}
            >
              <Upload size={16} />
              <span>CSV importeren</span>
              {tier !== 'pro' && <Crown size={14} className="text-tier-pro ml-1" />}
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
            </Button>
          </CardHeader>
          <CardContent>
            {teamMembers.length > 0 ? (
              <div className="space-y-4">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-3 border rounded-md">
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                      <User size={16} />
                    </div>
                    <div className="flex-grow">
                      <p className="font-medium">{member.name}</p>
                    </div>
                    <div className="flex items-center">
                      <div className="flex items-center">
                        <Input
                          type="number"
                          value={hourInputs[member.id] || ''}
                          onChange={(e) => handleHoursChange(member.id, e.target.value)}
                          className="w-20 mr-2"
                          placeholder="Uren"
                        />
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => handleSubmitHours(member.id)}
                          className="mr-2"
                        >
                          Opslaan
                        </Button>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => confirmRemoveMember(member.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Nog geen teamleden toegevoegd.</p>
            )}
            
            <form onSubmit={handleAddMember} className="mt-6 flex gap-2">
              <Input
                placeholder="Naam nieuw teamlid"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="flex-grow"
              />
              <Button type="submit" disabled={!newMemberName.trim() || (teamMembers.length >= tierMemberLimit)}>
                <Plus size={16} className="mr-1" /> Toevoegen
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Dialog open={showCsvDialog} onOpenChange={setShowCsvDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>CSV Importeren (PRO)</DialogTitle>
            <DialogDescription>
              Upload een CSV bestand met teamleden en uren.
              Format: Naam,Uren (bijv. "Jan,8.5")
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex justify-center items-center gap-4">
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCsvDialog(false)}>
              Annuleren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Teamlid verwijderen</DialogTitle>
            <DialogDescription>
              Weet je zeker dat je dit teamlid wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemoveDialog(false)}>
              Annuleren
            </Button>
            <Button variant="destructive" onClick={handleRemoveMember}>
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {tier !== 'pro' && !showPayout && (
        <Card className="border-tier-pro">
          <CardContent className="p-6 text-center">
            <Crown size={42} className="mx-auto mb-4 text-tier-pro" />
            <h2 className="text-xl font-medium mb-2">PRO-functie</h2>
            <p className="text-muted-foreground mb-6">
              Upgrade naar PRO om uren te importeren via CSV en toegang te krijgen tot alle PRO-functies.
            </p>
            <Button className="bg-tier-pro hover:bg-tier-pro/90 text-white">
              Upgraden naar PRO
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Team;
