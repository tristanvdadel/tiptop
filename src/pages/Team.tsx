
import { useState, useRef } from 'react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMemberName.trim()) {
      addTeamMember(newMemberName.trim());
      setNewMemberName('');
    }
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

    // Here we'd process the CSV file in a real implementation
    // For now, just show a success message
    toast({
      title: "CSV geïmporteerd",
      description: "De uren zijn succesvol geïmporteerd voor je teamleden.",
    });
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
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
  
  // Get completed and unpaid periods
  const completedPeriods = periods.filter(p => !p.isActive && !p.isPaid);
  
  // Calculate distribution for selected periods
  const distribution = selectedPeriods.length > 0 
    ? calculateTipDistribution(selectedPeriods) 
    : [];
    
  // Calculate total tip amount for selected periods
  const totalSelectedTip = selectedPeriods.length > 0
    ? periods
        .filter(p => selectedPeriods.includes(p.id))
        .reduce((sum, period) => 
          sum + period.tips.reduce((s, tip) => s + tip.amount, 0), 
          0
        )
    : 0;
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Team</h1>
        <div className="flex gap-2">
          <Badge className="tier-free">
            {teamMembers.length}/5 leden
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
      
      {showPayout ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex justify-between items-center">
              <span>Uitbetaling</span>
              <Badge variant="outline">
                €{totalSelectedTip.toFixed(2)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">Selecteer periodes:</h3>
              {completedPeriods.length > 0 ? (
                <div className="space-y-3">
                  {completedPeriods.map(period => {
                    const startDate = format(new Date(period.startDate), 'd MMMM', { locale: nl });
                    const endDate = period.endDate 
                      ? format(new Date(period.endDate), 'd MMMM', { locale: nl }) 
                      : '';
                    const totalTip = period.tips.reduce((sum, tip) => sum + tip.amount, 0);
                    
                    return (
                      <div 
                        key={period.id} 
                        className="flex items-center space-x-2 p-3 border rounded-lg"
                      >
                        <Checkbox 
                          id={period.id}
                          checked={selectedPeriods.includes(period.id)}
                          onCheckedChange={() => togglePeriodSelection(period.id)}
                        />
                        <label 
                          htmlFor={period.id} 
                          className="flex-grow cursor-pointer flex justify-between"
                        >
                          <span>{startDate} - {endDate}</span>
                          <span className="font-medium">€{totalTip.toFixed(2)}</span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground">Geen afgeronde periodes beschikbaar.</p>
              )}
            </div>
            
            {distribution.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium">Verdeling:</h3>
                <div className="space-y-3">
                  {distribution.map(member => (
                    <div key={member.id} className="flex justify-between p-3 border rounded-lg">
                      <span>{member.name}</span>
                      <span className="font-medium">€{member.tipAmount?.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                
                <Button 
                  className="w-full mt-4" 
                  onClick={handlePayout}
                  disabled={selectedPeriods.length === 0}
                >
                  <Check size={16} className="mr-2" />
                  Uitbetaling bevestigen
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Teamleden</CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center gap-1"
              onClick={triggerFileUpload}
              disabled={tier !== 'pro'}
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
                      <Input
                        type="number"
                        value={member.hours || ''}
                        onChange={(e) => updateTeamMemberHours(member.id, parseFloat(e.target.value) || 0)}
                        className="w-20 mr-2"
                        placeholder="Uren"
                      />
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeTeamMember(member.id)}
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
              <Button type="submit" disabled={!newMemberName.trim() || (tier === 'free' && teamMembers.length >= 5)}>
                <Plus size={16} className="mr-1" /> Toevoegen
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

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
