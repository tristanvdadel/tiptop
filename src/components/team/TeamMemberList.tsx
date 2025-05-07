
import React, { useState } from 'react';
import { TeamMember, HourRegistration } from '@/types/models';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Check, Clock, Calendar, PlusCircle, MinusCircle, ChevronDown, ChevronUp, Pencil, UserCheck, User } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface TeamMemberListProps {
  teamMembers: TeamMember[];
  addTeamMember: (name: string) => void;
  removeTeamMember: (id: string) => void;
  updateTeamMemberHours: (id: string, hours: number) => void;
  deleteHourRegistration: (memberId: string, registrationId: string) => void;
  updateTeamMemberName: (id: string, name: string) => boolean;
}

const TeamMemberList: React.FC<TeamMemberListProps> = ({
  teamMembers,
  addTeamMember,
  removeTeamMember,
  updateTeamMemberHours,
  deleteHourRegistration,
  updateTeamMemberName
}) => {
  const [newMemberName, setNewMemberName] = useState('');
  const [hoursInputs, setHoursInputs] = useState<{
    [key: string]: string;
  }>({});
  const [openMemberDetails, setOpenMemberDetails] = useState<{
    [key: string]: boolean;
  }>({});
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const { toast } = useToast();

  React.useEffect(() => {
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleHoursSubmit(id);
    }
  };

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

  const formatDate = (dateString: string): string => {
    return format(new Date(dateString), 'd MMM yyyy HH:mm', {
      locale: nl
    });
  };

  const getBalanceClass = (balance?: number): string => {
    if (balance === undefined || balance === 0) return '';
    return balance > 0 ? 'text-green-600' : 'text-red-600';
  };

  const getScrollAreaHeight = (): string => {
    if (teamMembers.length <= 0) return 'auto';
    const calculatedHeight = Math.min(Math.max(teamMembers.length * 70, 250), 600);
    return `${calculatedHeight}px`;
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">Team leden</h1>
        </div>
        <div className="flex items-center gap-2">
          <Input 
            type="text" 
            placeholder="Naam team lid" 
            value={newMemberName} 
            onChange={e => setNewMemberName(e.target.value)} 
            className="w-full sm:w-auto" 
          />
          <Button onClick={handleAddMember} variant="goldGradient">
            <Plus size={16} className="mr-2" /> Toevoegen
          </Button>
        </div>
      </div>
      
      <Separator className="my-4" />

      {teamMembers.length > 0 ? (
        <Card className="mb-6">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex justify-between items-center">
              <span>Teamleden ({teamMembers.length})</span>
              <span>Totaal uren: {teamMembers.reduce((sum, member) => sum + member.hours, 0)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className={`w-full`} style={{ height: getScrollAreaHeight() }}>
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
                  {teamMembers.map(member => (
                    <TableRow key={member.id}>
                      <TableCell className="py-2">
                        <Collapsible>
                          <CollapsibleTrigger className="font-medium hover:underline cursor-pointer flex items-center" onClick={() => toggleMemberDetails(member.id)}>
                            <div className="flex items-center gap-2">
                              {member.name}
                              
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    {member.hasAccount ? (
                                      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1">
                                        <UserCheck className="h-3 w-3" />
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                      </Badge>
                                    )}
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {member.hasAccount 
                                      ? "Dit teamlid heeft een account" 
                                      : "Dit teamlid heeft geen account"}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            
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
                                  {editingMember === member.id ? (
                                    <div className="flex items-center gap-2">
                                      <Input 
                                        type="text" 
                                        value={editMemberName} 
                                        onChange={e => setEditMemberName(e.target.value)} 
                                        className="h-8 w-32" 
                                        placeholder="Nieuwe naam" 
                                      />
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={handleUpdateMemberName} 
                                        className="h-8 w-8"
                                      >
                                        <Check className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => startEditMemberName(member)} 
                                        className="h-8 w-8 text-gray-500 hover:text-amber-500"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-red-500 hover:text-red-700"
                                          >
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
                                            <AlertDialogAction onClick={() => removeTeamMember(member.id)}>Verwijderen</AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </>
                                  )}
                                </div>
                              </div>
                              <ScrollArea className="max-h-[300px] overflow-y-auto">
                                {member.hourRegistrations && member.hourRegistrations.length > 0 ? (
                                  <div className="space-y-2">
                                    {member.hourRegistrations.map((registration: HourRegistration) => (
                                      <div key={registration.id} className="flex items-center justify-between p-2 border border-gray-200 rounded-md bg-gray-50">
                                        <div className="flex items-center">
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
                                          onClick={() => deleteHourRegistration(member.id, registration.id)} 
                                          className="h-7 w-7 text-gray-500 hover:text-red-500"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500">Geen uren historie beschikbaar</p>
                                )}
                              </ScrollArea>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </TableCell>
                      <TableCell className="py-2">
                        {member.balance !== undefined && member.balance !== 0 && (
                          <span className={`text-xs font-medium ${getBalanceClass(member.balance)}`}>
                            {member.balance > 0 ? (
                              <span className="flex items-center">
                                <PlusCircle size={14} className="mr-1" />
                                €{member.balance.toFixed(2)}
                              </span>
                            ) : (
                              <span className="flex items-center">
                                <MinusCircle size={14} className="mr-1" />
                                €{Math.abs(member.balance).toFixed(2)}
                              </span>
                            )}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-2 font-medium">{member.hours}</TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number" 
                            name={`hours-${member.id}`} 
                            id={`hours-${member.id}`} 
                            className="h-8 w-20" 
                            placeholder="Uren" 
                            value={hoursInputs[member.id] || ''} 
                            onChange={e => handleHoursChange(member.id, e.target.value)} 
                            onKeyDown={e => handleKeyDown(e, member.id)} 
                          />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleHoursSubmit(member.id)} 
                            className="h-8 w-8 flex items-center justify-center"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6">
          <CardContent className="p-6 text-center">
            <p>Nog geen teamleden toegevoegd</p>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default TeamMemberList;
