import { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, User, Upload, Crown, DollarSign, Check, Clock, Edit, Info } from 'lucide-react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const Team = () => {
  const { 
    teamMembers, 
    addTeamMember, 
    removeTeamMember, 
    updateTeamMemberHours, 
    tier, 
    periods,
    calculateTipDistribution, 
    markPeriodsAsPaid,
    calculateAverageTipPerHour
  } = useApp();
  
  const [newMemberName, setNewMemberName] = useState('');
  const [showPayout, setShowPayout] = useState(false);
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [showCsvDialog, setShowCsvDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [hourInputs, setHourInputs] = useState<Record<string, number>>({});
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [showHoursDialog, setShowHoursDialog] = useState(false);
  const [showPartialPayoutDialog, setShowPartialPayoutDialog] = useState(false);
  const [partialPayoutAmounts, setPartialPayoutAmounts] = useState<Record<string, number>>({});
  const [isPartialPayout, setIsPartialPayout] = useState(false);
  const [averageView, setAverageView] = useState<'period' | 'day' | 'week' | 'month'>('period');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const handleAverageViewChange = (value: 'period' | 'day' | 'week' | 'month') => {
    if (value !== 'period' && tier !== 'pro') {
      toast({
        title: "PRO functie",
        description: `Deze weergave is alleen beschikbaar in het PRO abonnement.`,
      });
      return;
    }
    setAverageView(value);
  };
  
  useEffect(() => {
    const initialHourInputs: Record<string, number> = {};
    teamMembers.forEach(member => {
      initialHourInputs[member.id] = member.hours;
    });
    setHourInputs(initialHourInputs);
  }, [teamMembers]);
  
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
    setEditingMember(null);
    setShowHoursDialog(false);
    setHourInputs(prev => ({
      ...prev,
      [id]: 0
    }));
  };

  const openHoursDialog = (member: typeof teamMembers[0]) => {
    setEditingMember(member.id);
    setHourInputs(prev => ({
      ...prev,
      [member.id]: 0
    }));
    setShowHoursDialog(true);
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
    
    if (tier === 'pro' && isPartialPayout) {
      setShowPartialPayoutDialog(true);
      
      const initialAmounts: Record<string, number> = {};
      distribution.forEach(member => {
        initialAmounts[member.id] = member.tipAmount || 0;
      });
      setPartialPayoutAmounts(initialAmounts);
      
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
  
  const handlePartialPayout = () => {
    const distribution = Object.entries(partialPayoutAmounts).map(([memberId, amount]) => ({
      memberId,
      amount
    }));
    
    markPeriodsAsPaid(selectedPeriods, distribution);
    
    toast({
      title: "Gedeeltelijke uitbetaling voltooid",
      description: "De gedeeltelijke uitbetaling is verwerkt.",
    });
    
    setSelectedPeriods([]);
    setShowPayout(false);
    setShowPartialPayoutDialog(false);
    setIsPartialPayout(false);
  };
  
  const handlePartialAmountChange = (id: string, value: string) => {
    const amount = parseFloat(value) || 0;
    setPartialPayoutAmounts(prev => ({
      ...prev,
      [id]: amount
    }));
  };
  
  const completedPeriods = periods.filter(p => !p.isActive && !p.isPaid);
  
  const distribution = selectedPeriods.length > 0 
    ? calculateTipDistribution(selectedPeriods, averageView) 
    : [];
    
  const totalSelectedTip = selectedPeriods.length > 0
    ? periods
        .filter(p => selectedPeriods.includes(p.id))
        .reduce((sum, period) => 
          sum + period.tips.reduce((s, tip) => s + tip.amount, 0), 
          0
        )
    : 0;
  
  const averageTipPerHour = useMemo(() => {
    if (selectedPeriods.length > 0) {
      return calculateAverageTipPerHour(selectedPeriods[0], averageView);
    }
    return 0;
  }, [calculateAverageTipPerHour, selectedPeriods, averageView]);
    
  const tierMemberLimit = tier === 'free' ? 5 : tier === 'team' ? 10 : Infinity;
  
  const hasReachedTeamMemberLimit = teamMembers.length >= tierMemberLimit;
  
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
      
      {!showPayout ? (
        <>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Naam</TableHead>
                      <TableHead>Gewerkte uren</TableHead>
                      <TableHead className="text-right">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                              <User size={16} />
                            </div>
                            <span>{member.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            className="flex items-center gap-2"
                            onClick={() => openHoursDialog(member)}
                          >
                            <Clock size={16} className="text-muted-foreground" />
                            <span className="font-medium">{member.hours || 0} uren</span>
                            <Edit size={14} className="text-muted-foreground" />
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => confirmRemoveMember(member.id)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground">Nog geen teamleden toegevoegd.</p>
              )}
              
              {hasReachedTeamMemberLimit ? (
                <div className="mt-6 flex">
                  <Button 
                    className="w-full bg-tier-team hover:bg-tier-team/90 text-white"
                    onClick={() => {
                      toast({
                        title: "Upgraden naar TEAM",
                        description: tier === 'free' 
                          ? "Upgrade naar TEAM om meer teamleden toe te voegen." 
                          : "Upgrade naar PRO om onbeperkt teamleden toe te voegen."
                      });
                    }}
                  >
                    <Crown size={16} className="mr-1" /> Upgraden naar {tier === 'free' ? 'TEAM' : 'PRO'}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleAddMember} className="mt-6 flex gap-2">
                  <Input
                    placeholder="Naam nieuw teamlid"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="flex-grow"
                  />
                  <Button type="submit" disabled={!newMemberName.trim()}>
                    <Plus size={16} className="mr-1" /> Toevoegen
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Team distribution card */}
          {distribution.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Fooi Verdeling</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {distribution.map((member) => (
                    <div key={member.id} className="flex justify-between">
                      <span>{member.name}</span>
                      <span className="font-medium">
                        €{member.tipAmount?.toFixed(2)} ({member.hours} uur)
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Uitbetalen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Selecteer perioden om uit te betalen:</span>
                {tier === 'pro' && (
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="partial-payout"
                      checked={isPartialPayout}
                      onCheckedChange={(checked) => setIsPartialPayout(checked === true)}
                    />
                    <label htmlFor="partial-payout" className="cursor-pointer flex items-center gap-1">
                      Gedeeltelijke uitbetaling
                      <Info size={14} className="text-muted-foreground" />
                    </label>
                  </div>
                )}
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                {completedPeriods.length > 0 ? (
                  completedPeriods.map((period) => {
                    const periodStartDate = format(new Date(period.startDate), 'd MMM', { locale: nl });
                    const periodEndDate = period.endDate ? format(new Date(period.endDate), 'd MMM', { locale: nl }) : 'Huidig';
                    const totalTip = period.tips.reduce((sum, tip) => sum + tip.amount, 0);
                    
                    return (
                      <div 
                        key={period.id} 
                        className="flex items-center p-2 hover:bg-muted/50 rounded-md cursor-pointer"
                        onClick={() => togglePeriodSelection(period.id)}
                      >
                        <Checkbox 
                          checked={selectedPeriods.includes(period.id)}
                          onCheckedChange={() => togglePeriodSelection(period.id)}
                          className="mr-2"
                        />
                        <div className="ml-2 flex-1">
                          <div className="flex justify-between">
                            <span>
                              Periode {periodStartDate} - {periodEndDate}
                            </span>
                            <span className="font-medium">€{totalTip.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    Geen onbetaalde afgeronde perioden beschikbaar.
                  </p>
                )}
              </div>
              
              {selectedPeriods.length > 0 && (
                <div className="space-y-4 mt-6">
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">Geselecteerde uitbetaling</h3>
                      <Select
                        value={averageView}
                        onValueChange={handleAverageViewChange}
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Weergave selecteren" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="period">Per periode</SelectItem>
                          <SelectItem value="day" className={tier !== 'pro' ? "opacity-60" : ""}>
                            <div className="flex items-center gap-1">
                              Per dag
                              {tier !== 'pro' && <Crown size={14} className="text-tier-pro" />}
                            </div>
                          </SelectItem>
                          <SelectItem value="week" className={tier !== 'pro' ? "opacity-60" : ""}>
                            <div className="flex items-center gap-1">
                              Per week
                              {tier !== 'pro' && <Crown size={14} className="text-tier-pro" />}
                            </div>
                          </SelectItem>
                          <SelectItem value="month" className={tier !== 'pro' ? "opacity-60" : ""}>
                            <div className="flex items-center gap-1">
                              Per maand
                              {tier !== 'pro' && <Crown size={14} className="text-tier-pro" />}
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="bg-muted/50 p-3 rounded-md mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Gemiddelde fooi per uur:</span>
                        <span className="font-medium text-xl">€{averageTipPerHour.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {distribution.map((member) => (
                        <div key={member.id} className="flex justify-between">
                          <span>{member.name}</span>
                          <span className="font-medium">
                            €{member.tipAmount?.toFixed(2)} ({member.hours} uur)
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2 border-t">
                        <span className="font-bold">Totaal</span>
                        <span className="font-bold">€{totalSelectedTip.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedPeriods([]);
                        setShowPayout(false);
                      }}
                    >
                      Annuleren
                    </Button>
                    <Button 
                      onClick={handlePayout}
                      className="gold-button"
                    >
                      <DollarSign size={16} className="mr-1" />
                      Uitbetalen
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showCsvDialog} onOpenChange={setShowCsvDialog}>
        <DialogContent className="sm:max-w-md">
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
        <DialogContent className="sm:max-w-md">
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

      <Dialog open={showHoursDialog} onOpenChange={setShowHoursDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Uren toevoegen</DialogTitle>
            <DialogDescription>
              Voeg het aantal gewerkte uren toe voor dit teamlid.
              Deze uren worden toegevoegd aan het huidige totaal.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {editingMember && (
              <div className="flex flex-col gap-2">
                <label htmlFor="hours" className="text-sm font-medium">
                  Gewerkte uren
                </label>
                <Input
                  id="hours"
                  type="number"
                  value={hourInputs[editingMember] || ''}
                  onChange={(e) => handleHoursChange(editingMember, e.target.value)}
                  className="col-span-3"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHoursDialog(false)}>
              Annuleren
            </Button>
            {editingMember && (
              <Button onClick={() => handleSubmitHours(editingMember)}>
                Toevoegen
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPartialPayoutDialog} onOpenChange={setShowPartialPayoutDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gedeeltelijke uitbetaling (PRO)</DialogTitle>
            <DialogDescription>
              Pas de uitbetaling per persoon aan. Je kunt een deel uitbetalen en een deel laten staan voor een volgende keer.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
            {distribution.map((member) => (
              <div key={member.id} className="flex items-center gap-4">
                <div className="flex-1">{member.name}</div>
                <div className="flex items-center gap-2">
                  <span>€</span>
                  <Input
                    type="number"
                    value={partialPayoutAmounts[member.id] || 0}
                    onChange={(e) => handlePartialAmountChange(member.id, e.target.value)}
                    max={member.tipAmount || 0}
                    step="0.01"
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground">
                    van €{member.tipAmount?.toFixed(2) || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPartialPayoutDialog(false)}>
              Annuleren
            </Button>
            <Button onClick={handlePartialPayout} className="gold-button">
              <DollarSign size={16} className="mr-1" />
              Uitbetalen
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
