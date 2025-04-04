
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { PlusCircle, Copy, UsersRound, Settings, UserPlus, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import QRCode from 'qrcode.react';

interface Team {
  id: string;
  name: string;
  created_at: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  team_id: string;
  role: string;
  permissions: {
    add_tips: boolean;
    add_hours: boolean;
    view_team: boolean;
    view_reports: boolean;
  };
  profiles: {
    first_name: string | null;
    last_name: string | null;
  };
}

interface Invite {
  id: string;
  team_id: string;
  code: string;
  expires_at: string;
  role: string;
  permissions: {
    add_tips: boolean;
    add_hours: boolean;
    view_team: boolean;
    view_reports: boolean;
  };
}

const TeamManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('member');
  const [permissions, setPermissions] = useState({
    add_tips: true,
    add_hours: true,
    view_team: true,
    view_reports: true
  });

  useEffect(() => {
    if (user) {
      fetchTeams();
    }
  }, [user]);

  useEffect(() => {
    if (selectedTeam) {
      fetchTeamMembers(selectedTeam.id);
      fetchTeamInvites(selectedTeam.id);
    }
  }, [selectedTeam]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      
      // Fetch teams where user is a member
      const { data: teamMembers, error: memberError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user?.id);
      
      if (memberError) throw memberError;
      
      if (teamMembers && teamMembers.length > 0) {
        const teamIds = teamMembers.map(tm => tm.team_id);
        
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('*')
          .in('id', teamIds);
        
        if (teamsError) throw teamsError;
        setTeams(teamsData || []);
        
        if (teamsData && teamsData.length > 0 && !selectedTeam) {
          setSelectedTeam(teamsData[0]);
        }
      }
    } catch (error: any) {
      toast({
        title: 'Fout bij ophalen teams',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name
          )
        `)
        .eq('team_id', teamId);
        
      if (error) throw error;
      setMembers(data || []);
    } catch (error: any) {
      toast({
        title: 'Fout bij ophalen teamleden',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const fetchTeamInvites = async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('invites')
        .select('*')
        .eq('team_id', teamId)
        .gt('expires_at', new Date().toISOString());
        
      if (error) throw error;
      setInvites(data || []);
    } catch (error: any) {
      toast({
        title: 'Fout bij ophalen uitnodigingen',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const createTeam = async () => {
    if (!newTeamName.trim() || !user) return;
    
    try {
      const { data, error } = await supabase
        .from('teams')
        .insert([{ name: newTeamName, created_by: user.id }])
        .select()
        .single();
        
      if (error) throw error;
      
      // Add creator as admin to the team
      const { error: memberError } = await supabase
        .from('team_members')
        .insert([{ 
          team_id: data.id, 
          user_id: user.id, 
          role: 'admin',
          permissions: {
            add_tips: true,
            add_hours: true,
            view_team: true,
            view_reports: true
          }
        }]);
        
      if (memberError) throw memberError;
      
      toast({
        title: 'Team aangemaakt',
        description: `Het team ${newTeamName} is succesvol aangemaakt.`
      });
      
      setNewTeamName('');
      fetchTeams();
    } catch (error: any) {
      toast({
        title: 'Fout bij aanmaken team',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const createInvite = async () => {
    if (!selectedTeam || !user) return;
    
    try {
      // Generate a random 6-character code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Set expiration to 7 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      const { data, error } = await supabase
        .from('invites')
        .insert([{ 
          team_id: selectedTeam.id, 
          code, 
          created_by: user.id,
          role: newMemberRole,
          permissions,
          expires_at: expiresAt.toISOString()
        }])
        .select()
        .single();
        
      if (error) throw error;
      
      setInviteCode(code);
      setShowInviteCode(true);
      fetchTeamInvites(selectedTeam.id);
      
      toast({
        title: 'Uitnodiging aangemaakt',
        description: 'De uitnodigingscode is succesvol aangemaakt.'
      });
    } catch (error: any) {
      toast({
        title: 'Fout bij aanmaken uitnodiging',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode);
    toast({
      title: 'Gekopieerd',
      description: 'Uitnodigingscode is gekopieerd naar het klembord.'
    });
  };

  const getMemberName = (member: TeamMember) => {
    const firstName = member.profiles?.first_name || '';
    const lastName = member.profiles?.last_name || '';
    
    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim();
    }
    
    return 'Naamloos lid';
  };

  const isAdmin = () => {
    if (!selectedTeam || !user) return false;
    
    const currentMember = members.find(m => m.user_id === user.id);
    return currentMember?.role === 'admin';
  };

  const acceptInvite = async (code: string) => {
    if (!user) return;
    
    try {
      // Get the invite
      const { data: invite, error: inviteError } = await supabase
        .from('invites')
        .select('*')
        .eq('code', code)
        .gt('expires_at', new Date().toISOString())
        .single();
        
      if (inviteError) throw inviteError;
      
      // Check if user is already a member
      const { data: existingMember, error: memberCheckError } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', invite.team_id)
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (memberCheckError) throw memberCheckError;
      
      if (existingMember) {
        toast({
          title: 'Al lid',
          description: 'Je bent al lid van dit team.',
          variant: 'destructive'
        });
        return;
      }
      
      // Add user to team
      const { error: addMemberError } = await supabase
        .from('team_members')
        .insert([{ 
          team_id: invite.team_id, 
          user_id: user.id, 
          role: invite.role,
          permissions: invite.permissions
        }]);
        
      if (addMemberError) throw addMemberError;
      
      toast({
        title: 'Toegevoegd aan team',
        description: 'Je bent succesvol toegevoegd aan het team.'
      });
      
      fetchTeams();
    } catch (error: any) {
      toast({
        title: 'Fout bij accepteren uitnodiging',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersRound className="h-5 w-5" />
            Teams & Bevoegdheden
          </CardTitle>
          <CardDescription>
            Beheer je teams en stel bevoegdheden in voor teamleden
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Laden...</div>
          ) : (
            <Tabs defaultValue="teams" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="teams">Mijn Teams</TabsTrigger>
                <TabsTrigger value="invites">Uitnodiging Accepteren</TabsTrigger>
              </TabsList>
              
              <TabsContent value="teams" className="space-y-4 pt-4">
                {teams.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">Je hebt nog geen teams</p>
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Nieuw Team Aanmaken
                        </Button>
                      </SheetTrigger>
                      <SheetContent>
                        <SheetHeader>
                          <SheetTitle>Nieuw Team</SheetTitle>
                          <SheetDescription>
                            Maak een nieuw team aan om fooien te beheren
                          </SheetDescription>
                        </SheetHeader>
                        <div className="py-4 space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="teamName">Teamnaam</Label>
                            <Input
                              id="teamName"
                              placeholder="Bijv. Café Centraal"
                              value={newTeamName}
                              onChange={(e) => setNewTeamName(e.target.value)}
                            />
                          </div>
                        </div>
                        <SheetFooter>
                          <SheetClose asChild>
                            <Button variant="outline">Annuleren</Button>
                          </SheetClose>
                          <Button onClick={createTeam}>Team Aanmaken</Button>
                        </SheetFooter>
                      </SheetContent>
                    </Sheet>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <Select
                        value={selectedTeam?.id}
                        onValueChange={(value) => {
                          const team = teams.find(t => t.id === value);
                          if (team) setSelectedTeam(team);
                        }}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Selecteer team" />
                        </SelectTrigger>
                        <SelectContent>
                          {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button variant="outline" size="sm">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Nieuw Team
                          </Button>
                        </SheetTrigger>
                        <SheetContent>
                          <SheetHeader>
                            <SheetTitle>Nieuw Team</SheetTitle>
                            <SheetDescription>
                              Maak een nieuw team aan om fooien te beheren
                            </SheetDescription>
                          </SheetHeader>
                          <div className="py-4 space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="teamName">Teamnaam</Label>
                              <Input
                                id="teamName"
                                placeholder="Bijv. Café Centraal"
                                value={newTeamName}
                                onChange={(e) => setNewTeamName(e.target.value)}
                              />
                            </div>
                          </div>
                          <SheetFooter>
                            <SheetClose asChild>
                              <Button variant="outline">Annuleren</Button>
                            </SheetClose>
                            <Button onClick={createTeam}>Team Aanmaken</Button>
                          </SheetFooter>
                        </SheetContent>
                      </Sheet>
                    </div>
                    
                    {selectedTeam && (
                      <div className="space-y-4 mt-6">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-medium">{selectedTeam.name}</h3>
                          {isAdmin() && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline">
                                  <UserPlus className="h-4 w-4 mr-2" />
                                  Uitnodigen
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Teamlid Uitnodigen</DialogTitle>
                                  <DialogDescription>
                                    Maak een uitnodigingscode aan om nieuwe teamleden toe te voegen.
                                  </DialogDescription>
                                </DialogHeader>
                                
                                {showInviteCode ? (
                                  <div className="space-y-4 py-4">
                                    <div className="text-center">
                                      <div className="inline-block p-4 bg-amber-50 rounded-md mb-2">
                                        <div className="text-2xl font-mono font-bold tracking-wider text-amber-800">
                                          {inviteCode}
                                        </div>
                                      </div>
                                      <div className="flex justify-center mt-4 mb-6">
                                        <QRCode 
                                          value={`tiptop://invite/${inviteCode}`} 
                                          size={150}
                                          fgColor="#92400e"
                                          bgColor="#fffbeb"
                                          level="H"
                                          renderAs="svg"
                                        />
                                      </div>
                                    </div>
                                    <div className="flex justify-center">
                                      <Button variant="outline" onClick={copyInviteCode} className="flex items-center">
                                        <Copy className="h-4 w-4 mr-2" />
                                        Kopieer Code
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                      <Label>Rol</Label>
                                      <Select
                                        value={newMemberRole}
                                        onValueChange={setNewMemberRole}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Selecteer rol" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="admin">Beheerder</SelectItem>
                                          <SelectItem value="member">Lid</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    
                                    <div className="space-y-2">
                                      <Label>Bevoegdheden</Label>
                                      <div className="space-y-3 border rounded-md p-3">
                                        <div className="flex items-center justify-between">
                                          <Label htmlFor="add_tips" className="cursor-pointer">Fooien toevoegen</Label>
                                          <Switch 
                                            id="add_tips" 
                                            checked={permissions.add_tips}
                                            onCheckedChange={(checked) => setPermissions({
                                              ...permissions,
                                              add_tips: checked
                                            })}
                                          />
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <Label htmlFor="add_hours" className="cursor-pointer">Uren toevoegen</Label>
                                          <Switch 
                                            id="add_hours" 
                                            checked={permissions.add_hours}
                                            onCheckedChange={(checked) => setPermissions({
                                              ...permissions,
                                              add_hours: checked
                                            })}
                                          />
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <Label htmlFor="view_team" className="cursor-pointer">Team inzien</Label>
                                          <Switch 
                                            id="view_team" 
                                            checked={permissions.view_team}
                                            onCheckedChange={(checked) => setPermissions({
                                              ...permissions,
                                              view_team: checked
                                            })}
                                          />
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <Label htmlFor="view_reports" className="cursor-pointer">Rapporten inzien</Label>
                                          <Switch 
                                            id="view_reports" 
                                            checked={permissions.view_reports}
                                            onCheckedChange={(checked) => setPermissions({
                                              ...permissions,
                                              view_reports: checked
                                            })}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                <DialogFooter>
                                  {showInviteCode ? (
                                    <Button onClick={() => setShowInviteCode(false)}>Gereed</Button>
                                  ) : (
                                    <Button onClick={createInvite}>Uitnodiging aanmaken</Button>
                                  )}
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Teamleden ({members.length})</h4>
                          {members.length > 0 ? (
                            <div className="divide-y border rounded-md">
                              {members.map((member) => (
                                <div key={member.id} className="flex items-center justify-between p-3">
                                  <div>
                                    <span className="font-medium">{getMemberName(member)}</span>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {member.role === 'admin' ? 'Beheerder' : 'Lid'}
                                    </div>
                                  </div>
                                  {isAdmin() && user?.id !== member.user_id && (
                                    <Button variant="ghost" size="sm">
                                      <Settings className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-4 text-center text-muted-foreground text-sm">
                              Geen teamleden gevonden
                            </div>
                          )}
                        </div>
                        
                        {isAdmin() && invites.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">Actieve uitnodigingen ({invites.length})</h4>
                            <div className="divide-y border rounded-md">
                              {invites.map((invite) => (
                                <div key={invite.id} className="flex items-center justify-between p-3">
                                  <div>
                                    <span className="font-mono">{invite.code}</span>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Verloopt op {new Date(invite.expires_at).toLocaleDateString()}
                                    </div>
                                  </div>
                                  <Button variant="ghost" size="sm" onClick={() => {
                                    setInviteCode(invite.code);
                                    setShowInviteCode(true);
                                  }}>
                                    <QrCode className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
              
              <TabsContent value="invites" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Uitnodigingscode</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="inviteCode"
                      placeholder="Voer code in (bijv. AB12CD)"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    />
                    <Button onClick={() => acceptInvite(inviteCode)}>Accepteren</Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamManagement;
