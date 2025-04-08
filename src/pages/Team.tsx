import React, { useState, useEffect, useCallback, KeyboardEvent } from 'react';
import { useApp } from '@/contexts/AppContext';
import { TeamMember, Period, HourRegistration } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Check, Clock, Calendar, PlusCircle, MinusCircle, Receipt, ChevronDown, ChevronUp, Users, Pencil, History } from 'lucide-react';
import { PayoutSummary } from '@/components/PayoutSummary';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type RoundingOption = 'none' | '0.05' | '0.10' | '0.50' | '1.00';

interface PayoutDetailWithEdits {
  memberId: string;
  amount: number;
  actualAmount: number;
  balance: number | undefined;
  isEdited: boolean;
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
    currentPeriod,
    periods,
    payouts,
    updateTeamMemberName,
    clearTeamMemberHours
  } = useApp();
  const [newMemberName, setNewMemberName] = useState('');
  const [hoursInputs, setHoursInputs] = useState<{
    [key: string]: string;
  }>({});
  const [distribution, setDistribution] = useState<TeamMember[]>([]);
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [showPayoutSummary, setShowPayoutSummary] = useState(false);
  const [openMemberDetails, setOpenMemberDetails] = useState<{
    [key: string]: boolean;
  }>({});
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [isPayoutPreparationOpen, setIsPayoutPreparationOpen] = useState(false);
  const [editedDistribution, setEditedDistribution] = useState<PayoutDetailWithEdits[]>([]);
  const [roundingOption, setRoundingOption] = useState<RoundingOption>('none');
  const {
    toast
  } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    setSelectedPeriods([]);
  }, []);

  useEffect(() => {
    const initialHours: {
      [key: string]: string;
    } = {};
    teamMembers.forEach(member => {
      initialHours[member.id] = '';
    });
    setHoursInputs(initialHours);
  }, [teamMembers]);

  const handleAddMember = () => {
    if (newMemberName.trim() !== '') {
      const nameExists = teamMembers.some(member => member.name.toLowerCase() === newMemberName.trim().toLowerCase());
      if (nameExists) {
        toast({
          title: "Naam bestaat al",
          description: "Er is al een teamlid met deze naam.",
          variant: "destructive"
        });
        return;
      }
      addTeamMember(newMemberName);
      setNewMemberName('');
    }
  };

  const handleRemoveMember = (id: string) => {
    removeTeamMember(id);
  };

  const handleHoursChange = (id: string, value: string) => {
    setHoursInputs(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleHoursSubmit = (id: string) => {
    const value = hoursInputs[id];
    if (value !== undefined) {
      const hours = value === '' ? 0 : parseFloat(value);
      if (!isNaN(hours)) {
        updateTeamMemberHours(id, hours);
        setHoursInputs(prev => ({
          ...prev,
          [id]: ''
        }));
        toast({
          title: "Uren opgeslagen",
          description: `Uren succesvol opgeslagen voor teamlid.`
        });
      } else {
        toast({
          title: "Ongeldige invoer",
          description: "Voer een geldig aantal uren in.",
          variant: "destructive"
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

  const toggleMemberDetails = (memberId: string) => {
    setOpenMemberDetails(prev => ({
      ...prev,
      [memberId]: !prev[memberId]
    }));
  };

  const startEditMemberName = (member: TeamMember) => {
    setEditingMember(member.id);
    setEditMemberName(member.name);
  };

  const handleUpdateMemberName = () => {
    if (!editingMember) return;
    if (updateTeamMemberName(editingMember, editMemberName)) {
      setEditingMember(null);
      setEditMemberName('');
    }
  };

  const handlePreparePayoutClick = () => {
    if (selectedPeriods.length === 0) {
      toast({
        title: "Selecteer perioden",
        description: "Selecteer minimaal één periode voor uitbetaling.",
        variant: "destructive"
      });
      return;
    }

    const initialEditableDistribution = distribution.map(member => ({
      memberId: member.id,
      amount: member.tipAmount || 0,
      actualAmount: member.tipAmount || 0,
      balance: member.balance,
      isEdited: false
    }));
    
    setEditedDistribution(initialEditableDistribution);
    setRoundingOption('none');
    setIsPayoutPreparationOpen(true);
  };

  const handleAmountChange = (memberId: string, actualAmount: string) => {
    const amount = parseFloat(actualAmount);
    
    if (isNaN(amount) || amount < 0) return;
    
    setEditedDistribution(prev => 
      prev.map(item => 
        item.memberId === memberId 
          ? { 
              ...item, 
              actualAmount: amount,
              isEdited: true
            } 
          : item
      )
    );
  };

  const calculateNewBalances = () => {
    if (!editedDistribution.length) return;
    
    const updatedDistribution = editedDistribution.map(item => {
      const originalAmount = item.amount;
      const newActualAmount = item.actualAmount;
      
      const member = teamMembers.find(m => m.id === item.memberId);
      const currentBalance = member?.balance || 0;
      
      let newBalance = currentBalance;
      
      if (newActualAmount < originalAmount) {
        newBalance += (originalAmount - newActualAmount);
      } else if (newActualAmount > originalAmount) {
        newBalance -= (newActualAmount - originalAmount);
      }
      
      return {
        ...item,
        balance: parseFloat(newBalance.toFixed(2))
      };
    });
    
    setEditedDistribution(updatedDistribution);
  };

  useEffect(() => {
    if (editedDistribution.length > 0) {
      calculateNewBalances();
    }
  }, [isPayoutPreparationOpen]);

  const applyRounding = () => {
    if (!editedDistribution.length || roundingOption === 'none') return;
    
    const roundingValue = parseFloat(roundingOption);
    
    const roundedDistribution = editedDistribution.map(item => {
      let roundedAmount = item.amount;
      
      if (roundingValue === 0.05) {
        roundedAmount = Math.floor(item.amount / 0.05) * 0.05;
      } else if (roundingValue === 0.10) {
        roundedAmount = Math.floor(item.amount / 0.10) * 0.10;
      } else if (roundingValue === 0.50) {
        roundedAmount = Math.floor(item.amount / 0.50) * 0.50;
      } else if (roundingValue === 1.00) {
        roundedAmount = Math.floor(item.amount);
      }
      
      return {
        ...item,
        actualAmount: parseFloat(roundedAmount.toFixed(2)),
        isEdited: roundedAmount !== item.amount
      };
    });
    
    setEditedDistribution(roundedDistribution);
    
    toast({
      title: "Bedragen afgerond",
      description: `Alle bedragen zijn naar beneden afgerond op €${roundingOption}.`
    });
  };

  const handlePayout = () => {
    if (selectedPeriods.length === 0) {
      toast({
        title: "Selecteer perioden",
        description: "Selecteer minimaal één periode voor uitbetaling.",
        variant: "destructive"
      });
      return;
    }

    const customDistribution = editedDistribution.map(item => ({
      memberId: item.memberId,
      amount: item.amount,
      actualAmount: item.actualAmount,
      balance: item.balance
    }));
    
    markPeriodsAsPaid(selectedPeriods, customDistribution);
    
    teamMembers.forEach(member => {
      clearTeamMemberHours(member.id);
    });
    
    setIsPayoutPreparationOpen(false);
    setIsPayoutModalOpen(false);
    setShowPayoutSummary(true);
    
    setSelectedPeriods([]);
  };

  const formatDate = (dateString: string): string => {
    return format(new Date(dateString), 'd MMM yyyy HH:mm', {
      locale: nl
    });
  };

  const unpaidPeriods = periods.filter(period => !period.isPaid && !period.isActive);
  const availablePeriods = unpaidPeriods;

  const formatBalance = (balance?: number): string => {
    if (balance === undefined || balance === 0) return '';
    return balance > 0 ? `+€${balance.toFixed(2)}` : `-€${Math.abs(balance).toFixed(2)}`;
  };

  const getBalanceClass = (balance?: number): string => {
    if (balance === undefined || balance === 0) return '';
    return balance > 0 ? 'text-green-600' : 'text-red-600';
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
    return <div>
        <PayoutSummary onClose={() => setShowPayoutSummary(false)} />
      </div>;
  }

  return <div className="pb-20 min-h-[calc(100vh-100px)]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Users size={20} />
          <h1 className="text-xl font-bold">Team leden</h1>
        </div>
        <div className="flex items-center gap-2">
          <Input type="text" placeholder="Naam team lid" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} className="w-full sm:w-auto" />
          <Button onClick={handleAddMember} variant="goldGradient">
            <Plus size={16} className="mr-2" /> Toevoegen
          </Button>
        </div>
      </div>
      
      <Separator className="my-4" />

      {teamMembers.length > 0 ? <Card className="mb-6">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex justify-between items-center">
              <span>Teamleden ({teamMembers.length})</span>
              <span>Totaal uren: {teamMembers.reduce((sum, member) => sum + member.hours, 0)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-hidden">
              <ScrollArea className="max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Naam</TableHead>
                      <TableHead className="w-[120px]">Saldo</TableHead>
                      <TableHead className="w-[80px] text-right">Uren</TableHead>
                      <TableHead className="w-[180px]">Toevoegen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamMembers.map(member => <TableRow key={member.id}>
                        <TableCell className="py-2">
                          <Collapsible>
                            <CollapsibleTrigger className="font-medium hover:underline cursor-pointer flex items-center" onClick={() => toggleMemberDetails(member.id)}>
                              {member.name}
                              {openMemberDetails[member.id] ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />}
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="bg-muted/30 p-3 rounded-b-md mt-2 mb-2">
                                <div className="flex items-center justify-between mb-3">
                                  <h3 className="text-sm font-medium mb-2 flex items-center">
                                    <Clock className="h-4 w-4 mr-2" />
                                    Urenoverzicht voor {member.name}
                                  </h3>
                                  <div className="flex items-center gap-2">
                                    {editingMember === member.id ? <div className="flex items-center gap-2">
                                        <Input type="text" value={editMemberName} onChange={e => setEditMemberName(e.target.value)} className="h-8 w-32" placeholder="Nieuwe naam" />
                                        <Button variant="ghost" size="icon" onClick={handleUpdateMemberName} className="h-8 w-8">
                                          <Check className="h-4 w-4" />
                                        </Button>
                                      </div> : <>
                                        <Button variant="ghost" size="icon" onClick={() => startEditMemberName(member)} className="h-8 w-8 text-gray-500 hover:text-amber-500">
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700">
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Dit teamlid wordt permanent verwijderd inclusief urenregistraties en saldo.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Annuleren</AlertDialogCancel>
                                              <AlertDialogAction onClick={() => handleRemoveMember(member.id)}>Verwijderen</AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </>}
                                  </div>
                                </div>
                                <ScrollArea className="max-h-[300px] overflow-y-auto">
                                  {member.hourRegistrations && member.hourRegistrations.length > 0 ? <div className="space-y-2">
                                      {member.hourRegistrations.map((registration: HourRegistration) => <div key={registration.id} className="flex items-center justify-between p-2 border border-gray-200 rounded-md bg-gray-50">
                                          <div className="flex items-center">
                                            <span className="font-medium">{registration.hours} uren</span>
                                            <span className="mx-2 text-gray-400">•</span>
                                            <span className="text-xs text-gray-500 flex items-center">
                                              <Calendar className="h-3 w-3 mr-1" />
                                              {formatDate(registration.date)}
                                            </span>
                                          </div>
                                          <Button variant="ghost" size="icon" onClick={() => handleDeleteRegistration(member.id, registration.id)} className="h-7 w-7 text-gray-500 hover:text-red-500">
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>)}
                                    </div> : <p className="text-sm text-gray-500">Geen uren historie beschikbaar</p>}
                                </ScrollArea>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </TableCell>
                        <TableCell className="py-2">
                          {member.balance !== undefined && member.balance !== 0 && <span className={`text-xs font-medium ${getBalanceClass(member.balance)}`}>
                              {member.balance > 0 ? <span className="flex items-center">
                                  <PlusCircle size={14} className="mr-1" />
                                  €{member.balance.toFixed(2)}
                                </span> : <span className="flex items-center">
                                  <MinusCircle size={14} className="mr-1" />
                                  €{Math.abs(member.balance).toFixed(2)}
                                </span>}
                            </span>}
                        </TableCell>
                        <TableCell className="text-right py-2 font-medium">{member.hours}</TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-2">
                            <Input type="number" name={`hours-${member.id}`} id={`hours-${member.id}`} className="h-8 w-20" placeholder="Uren" value={hoursInputs[member.id] || ''} onChange={e => handleHoursChange(member.id, e.target.value)} onKeyDown={e => handleKeyDown(e, member.id)} />
                            <Button variant="ghost" size="icon" onClick={() => handleHoursSubmit(member.id)} className="h-8 w-8 flex items-center justify-center">
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>)}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </CardContent>
        </Card> : <Card className="mb-6">
          <CardContent className="p-6 text-center">
            <p>Nog geen teamleden toegevoegd</p>
          </CardContent>
        </Card>}
      
      {availablePeriods.length > 0 && <div className="mb-6">
          <h2 className="text-lg font-medium mb-2">Selecteer periode om uit te betalen</h2>
          <Card 
            className="border-green-500/30 bg-green-500/5"
          >
            <CardContent className="p-4">
              <ul className="space-y-2">
                {availablePeriods.map(period => {
                  const periodName = period.name || (period.isActive ? "Huidige periode" : `Periode ${new Date(period.startDate).toLocaleDateString()}`);
                  const totalTips = period.tips.reduce((sum, tip) => sum + tip.amount, 0);
                  return <li key={period.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`period-${period.id}`} 
                      checked={selectedPeriods.includes(period.id)} 
                      onCheckedChange={() => togglePeriodSelection(period.id)} 
                      className={selectedPeriods.includes(period.id) ? "border-green-500 bg-green-500/20" : ""}
                    />
                    <Label 
                      htmlFor={`period-${period.id}`} 
                      className={`flex-1 cursor-pointer flex justify-between ${selectedPeriods.includes(period.id) ? "text-green-700" : ""}`}
                    >
                      <span>{periodName}</span>
                      <span className="font-medium">€{totalTips.toFixed(2)}</span>
                    </Label>
                  </li>;
                })}
              </ul>
            </CardContent>
          </Card>
        </div>}
      
      {selectedPeriods.length > 0 && <div className="mb-6">
          <h2 className="text-lg font-medium mb-2 flex items-center">
            <Receipt className="h-5 w-5 mr-2" />
            Fooi verdeling
          </h2>
          <Card>
            <CardHeader className="pb-2 border-b">
              <CardTitle className="flex justify-between text-sm font-medium text-muted-foreground">
                <span>Overzicht</span>
                <span>Totaal: €{totalTips.toFixed(2)} | Uren: {totalHours}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {distribution.length > 0 ? <div className="space-y-4">
                  <div className="flex justify-between text-xs text-muted-foreground border-b pb-2">
                    <div>Teamlid</div>
                    <div className="flex space-x-6">
                      <div className="w-16 text-right">Uren</div>
                      <div className="w-16 text-right">Saldo</div>
                      <div className="w-20 text-right">Uitbetaling</div>
                    </div>
                  </div>
                  
                  <ul className="space-y-2">
                    {distribution.map(member => <li key={member.id} className="flex justify-between items-center py-1">
                        <div className="font-medium">{member.name}</div>
                        <div className="flex space-x-6">
                          <div className="w-16 text-right text-gray-600">{member.hours}</div>
                          <div className={`w-16 text-right ${getBalanceClass(member.balance)}`}>
                            {member.balance !== undefined && member.balance !== 0 ? formatBalance(member.balance) : '€0.00'}
                          </div>
                          <div className="w-20 text-right font-medium">
                            €{member.tipAmount?.toFixed(2) || '0.00'}
                          </div>
                        </div>
                      </li>)}
                  </ul>
                  
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between font-medium">
                      <span>Fooi per uur</span>
                      <span>€{totalHours > 0 ? (totalTips / totalHours).toFixed(2) : '0.00'}</span>
                    </div>
                    <div className="flex justify-between font-medium text-lg mt-2">
                      <span>Totaal</span>
                      <span>€{distribution.reduce((sum, member) => sum + (member.tipAmount || 0), 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div> : <p>
                  {teamMembers.length === 0 ? "Geen teamleden gevonden." : "Geen uren ingesteld om verdeling te berekenen. Een gelijke verdeling zal worden toegepast."}
                </p>}
            </CardContent>
          </Card>
        </div>}
      
      {availablePeriods.length > 0 && 
        <div className="flex gap-2">
          <Button 
            variant="goldGradient" 
            onClick={handlePreparePayoutClick} 
            disabled={selectedPeriods.length === 0} 
            className="w-full md:w-auto"
          >
            Voorbereiden uitbetaling
          </Button>
        </div>
      }
      
      <Dialog open={isPayoutPreparationOpen} onOpenChange={setIsPayoutPreparationOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Uitbetaling voorbereiden
            </DialogTitle>
            <DialogDescription>
              Pas de bedragen aan indien nodig voordat je de uitbetaling markeert als voltooid.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted/30 p-3 rounded-md mb-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="rounding-select" className="text-sm whitespace-nowrap">Afronden op:</Label>
                <Select
                  value={roundingOption}
                  onValueChange={(value) => setRoundingOption(value as RoundingOption)}
                >
                  <SelectTrigger id="rounding-select" className="h-8">
                    <SelectValue placeholder="Geen afronding" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Geen afronding</SelectItem>
                    <SelectItem value="0.05">€0.05</SelectItem>
                    <SelectItem value="0.10">€0.10</SelectItem>
                    <SelectItem value="0.50">€0.50</SelectItem>
                    <SelectItem value="1.00">€1.00</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={applyRounding} 
                  className="h-8 gap-1"
                  disabled={roundingOption === 'none'}
                >
                  Toepassen
                </Button>
              </div>
            </div>
            
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Naam</TableHead>
                    <TableHead className="text-right">Berekend</TableHead>
                    <TableHead className="text-right">Uitbetalen</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editedDistribution.map((item, idx) => {
                    const member = teamMembers.find(m => m.id === item.memberId);
                    
                    return (
                      <TableRow key={idx} className={item.isEdited ? "bg-amber-50" : ""}>
                        <TableCell>{member?.name || 'Onbekend lid'}</TableCell>
                        <TableCell className="text-right">€{item.amount.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">
                          <Input 
                            type="number" 
                            value={item.actualAmount} 
                            onChange={(e) => handleAmountChange(item.memberId, e.target.value)}
                            className="w-24 text-right inline-block h-8"
                            min="0"
                            step="0.01"
                          />
                        </TableCell>
                        <TableCell className={`text-right ${item.balance && item.balance > 0 ? 'text-green-600' : item.balance && item.balance < 0 ? 'text-red-600' : ''}`}>
                          {item.balance !== undefined && item.balance !== 0 ? 
                            `€${Math.abs(item.balance).toFixed(2)} ${item.balance > 0 ? '+' : '-'}` : 
                            '-'
                          }
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <tfoot>
                  <tr className="border-t">
                    <td className="p-2 font-bold">Totaal</td>
                    <td className="p-2 text-right">
                      €{editedDistribution.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
                    </td>
                    <td className="p-2 text-right font-bold">
                      €{editedDistribution.reduce((sum, item) => sum + item.actualAmount, 0).toFixed(2)}
                    </td>
                    <td className="p-2"></td>
                  </tr>
                </tfoot>
              </Table>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-md mt-4">
              <p>
                Na uitbetaling worden uren automatisch gereset en wordt een nieuw saldo berekend op basis van de aangepaste uitbetaling.
              </p>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsPayoutPreparationOpen(false)}
              >
                Annuleren
              </Button>
              <Button 
                variant="goldGradient" 
                onClick={handlePayout}
              >
                Uitbetaling voltooien
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isPayoutModalOpen} onOpenChange={setIsPayoutModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
            <AlertDialogDescription>De geselecteerde periodes worden gemarkeerd als uitbetaald.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsPayoutModalOpen(false)}>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handlePayout}>Markeer als uitbetaald</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
};

export default Team;
