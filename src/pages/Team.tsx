import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { TeamMember } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { Plus, Trash2 } from 'lucide-react';
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
} from "@/components/ui/alert-dialog"

const Team = () => {
  const { teamMembers, addTeamMember, removeTeamMember, updateTeamMemberHours, calculateTipDistribution, markPeriodsAsPaid, currentPeriod, payouts } = useApp();
  const [newMemberName, setNewMemberName] = useState('');
  const [hours, setHours] = useState<{ [key: string]: number }>({});
  const [distribution, setDistribution] = useState<TeamMember[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [customDistribution, setCustomDistribution] = useState<{ memberId: string; amount: number; }[]>([]);
  const { toast } = useToast()
  
  const calculateDistribution = useCallback(async () => {
    setIsCalculating(true);
    
    // Delay the calculation to show the loading state
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const calculatedDistribution = calculateTipDistribution();
    setDistribution(calculatedDistribution);
    
    // Initialize custom distribution state
    const initialCustomDistribution = calculatedDistribution.map(member => ({
      memberId: member.id,
      amount: member.tipAmount || 0,
    }));
    setCustomDistribution(initialCustomDistribution);
    
    setIsCalculating(false);
  }, [calculateTipDistribution]);

  useEffect(() => {
    calculateDistribution();
  }, [teamMembers, currentPeriod, calculateDistribution]);

  const handleAddMember = () => {
    if (newMemberName.trim() !== '') {
      addTeamMember(newMemberName);
      setNewMemberName('');
    }
  };

  const handleRemoveMember = (id: string) => {
    removeTeamMember(id);
  };

  const handleHoursChange = (id: string, value: number) => {
    setHours(prev => ({ ...prev, [id]: value }));
  };

  const handleBlur = (id: string, value: number) => {
    updateTeamMemberHours(id, value);
  };
  
  const handlePartialAmountChange = (memberId: string, amount: number) => {
    const updatedDistribution = [...customDistribution];
    const index = updatedDistribution.findIndex(item => item.memberId === memberId);
    
    if (index !== -1) {
      updatedDistribution[index].amount = amount;
      setCustomDistribution(updatedDistribution);
    }
  };

  const handlePayout = () => {
    if (currentPeriod) {
      const totalDistributedAmount = customDistribution.reduce((sum, item) => sum + item.amount, 0);
      const totalTipAmount = currentPeriod.tips.reduce((sum, tip) => sum + tip.amount, 0);
      
      if (totalDistributedAmount > totalTipAmount) {
        toast({
          title: "Fout",
          description: "Het totale uit te betalen bedrag is hoger dan de totale fooi.",
          variant: "destructive",
        });
        return;
      }
      
      markPeriodsAsPaid([currentPeriod.id], customDistribution);
      setIsPayoutModalOpen(false);
    }
  };

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
                <Label htmlFor={`hours-${member.id}`} className="block text-sm font-medium text-gray-700">
                  {member.name}
                </Label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <Input
                    type="number"
                    name={`hours-${member.id}`}
                    id={`hours-${member.id}`}
                    className="block w-full pr-10 text-sm rounded-md"
                    placeholder="Uren"
                    defaultValue={member.hours}
                    onChange={(e) => handleHoursChange(member.id, parseFloat(e.target.value))}
                    onBlur={(e) => handleBlur(member.id, parseFloat(e.target.value))}
                  />
                </div>
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
      
      <div className="mb-6">
        <h2 className="text-lg font-medium mb-2">Fooi verdeling</h2>
        {isCalculating ? (
          <p>Bezig met berekenen...</p>
        ) : (
          <>
            {distribution.length > 0 ? (
              <Card>
                <CardContent className="p-4">
                  <ul>
                    {distribution.map((member) => (
                      <li key={member.id} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                        <div>
                          {member.name}
                        </div>
                        <div className="flex items-center">
                          <div className="mr-2">€</div>
                          <Input
                            type="number"
                            className="w-24 text-right"
                            value={customDistribution.find(item => item.memberId === member.id)?.amount || 0}
                            onChange={(e) => handlePartialAmountChange(member.id, parseFloat(e.target.value))}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : (
              <p>Geen teamleden of actieve periode gevonden.</p>
            )}
          </>
        )}
      </div>
      
      {currentPeriod && !currentPeriod.isPaid && (
        <Button className="gold-button" onClick={() => setIsPayoutModalOpen(true)}>
          Markeer als uitbetaald
        </Button>
      )}
      
      <AlertDialog open={isPayoutModalOpen} onOpenChange={setIsPayoutModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
            <AlertDialogDescription>
              De huidige periode wordt gemarkeerd als uitbetaald.
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
