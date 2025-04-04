
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QRCodeSVG } from 'qrcode.react';
import { Users, UserPlus, Settings, Building2, Plus, RefreshCw, Copy, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const Management = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teams, setTeams] = useState<any[]>([]);
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  
  // Permissions switches
  const [canAddTips, setCanAddTips] = useState(true);
  const [canAddHours, setCanAddHours] = useState(true);
  const [canViewTeam, setCanViewTeam] = useState(true);
  const [canViewReports, setCanViewReports] = useState(true);
  const [memberRole, setMemberRole] = useState("member");

  // Fetch team data
  const fetchTeamData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch all teams the user is a member of
      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select('team_id, role, permissions')
        .eq('user_id', user.id);
      
      if (memberError) throw memberError;
      
      if (memberData && memberData.length > 0) {
        const teamIds = memberData.map(m => m.team_id);
        
        // Fetch team details
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('*')
          .in('id', teamIds);
        
        if (teamsError) throw teamsError;
        
        // Combine member role with team data
        const teamsWithRole = teamsData?.map(team => {
          const memberInfo = memberData.find(m => m.team_id === team.id);
          return {
            ...team,
            role: memberInfo?.role || 'member',
            permissions: memberInfo?.permissions || {}
          };
        });
        
        setMyTeams(teamsWithRole || []);
        
        // Set selected team to first team if not already set
        if (!selectedTeam && teamsWithRole && teamsWithRole.length > 0) {
          setSelectedTeam(teamsWithRole[0].id);
          await fetchTeamMembers(teamsWithRole[0].id);
          await fetchTeamInvites(teamsWithRole[0].id);
        } else if (selectedTeam) {
          await fetchTeamMembers(selectedTeam);
          await fetchTeamInvites(selectedTeam);
        }
      } else {
        setMyTeams([]);
        setTeamMembers([]);
        setInvites([]);
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
      toast({
        title: "Fout bij laden",
        description: "Er is een fout opgetreden bij het laden van de teams.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch team members
  const fetchTeamMembers = async (teamId: string) => {
    if (!teamId) return;
    
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          profiles:user_id (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('team_id', teamId);
      
      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  // Fetch team invites
  const fetchTeamInvites = async (teamId: string) => {
    if (!teamId) return;
    
    try {
      const { data, error } = await supabase
        .from('invites')
        .select('*')
        .eq('team_id', teamId);
      
      if (error) throw error;
      setInvites(data || []);
    } catch (error) {
      console.error('Error fetching team invites:', error);
    }
  };

  // Create new team
  const handleCreateTeam = async () => {
    if (!user || !newTeamName.trim()) return;
    
    try {
      // First create the team
      const { data, error } = await supabase
        .from('teams')
        .insert([
          { name: newTeamName, created_by: user.id }
        ])
        .select();
      
      if (error) throw error;
      
      if (data && data[0]) {
        // Then add the creator as an admin member
        const { error: memberError } = await supabase
          .from('team_members')
          .insert([
            { 
              team_id: data[0].id, 
              user_id: user.id, 
              role: 'admin',
              permissions: {
                add_tips: true,
                add_hours: true,
                view_team: true,
                view_reports: true
              }
            }
          ]);
        
        if (memberError) throw memberError;
        
        toast({
          title: "Team aangemaakt",
          description: `Je team "${newTeamName}" is succesvol aangemaakt.`,
        });
        
        setNewTeamName("");
        await fetchTeamData();
      }
    } catch (error) {
      console.error('Error creating team:', error);
      toast({
        title: "Fout bij aanmaken",
        description: "Er is een fout opgetreden bij het aanmaken van het team.",
        variant: "destructive"
      });
    }
  };

  // Generate invite code
  const generateInviteCode = async () => {
    if (!user || !selectedTeam) return;
    
    try {
      // Generate a random 8 character alphanumeric code
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      // Set expiration to 7 days from now
      const expires = new Date();
      expires.setDate(expires.getDate() + 7);
      
      const permissions = {
        add_tips: canAddTips,
        add_hours: canAddHours,
        view_team: canViewTeam,
        view_reports: canViewReports
      };
      
      const { data, error } = await supabase
        .from('invites')
        .insert([
          {
            team_id: selectedTeam,
            code: code,
            created_by: user.id,
            role: memberRole,
            permissions: permissions,
            expires_at: expires.toISOString()
          }
        ]);
      
      if (error) throw error;
      
      setInviteCode(code);
      await fetchTeamInvites(selectedTeam);
      
      toast({
        title: "Uitnodiging aangemaakt",
        description: "De uitnodigingscode is aangemaakt en is 7 dagen geldig.",
      });
    } catch (error) {
      console.error('Error generating invite code:', error);
      toast({
        title: "Fout bij aanmaken",
        description: "Er is een fout opgetreden bij het aanmaken van de uitnodigingscode.",
        variant: "destructive"
      });
    }
  };

  // Join team with invite code
  const handleJoinTeam = async () => {
    if (!user || !inviteCode.trim()) return;
    
    try {
      // Find the invite
      const { data: invite, error: inviteError } = await supabase
        .from('invites')
        .select('*')
        .eq('code', inviteCode.trim())
        .single();
      
      if (inviteError || !invite) {
        toast({
          title: "Ongeldige code",
          description: "De ingevoerde uitnodigingscode is ongeldig of verlopen.",
          variant: "destructive"
        });
        return;
      }
      
      // Check if already a member
      const { data: existingMember, error: memberCheckError } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', invite.team_id)
        .eq('user_id', user.id)
        .single();
      
      if (existingMember) {
        toast({
          title: "Al lid",
          description: "Je bent al lid van dit team.",
          variant: "destructive"
        });
        return;
      }
      
      // Add user to team
      const { error: joinError } = await supabase
        .from('team_members')
        .insert([
          {
            team_id: invite.team_id,
            user_id: user.id,
            role: invite.role,
            permissions: invite.permissions
          }
        ]);
      
      if (joinError) throw joinError;
      
      toast({
        title: "Team toegevoegd",
        description: "Je bent succesvol toegevoegd aan het team.",
      });
      
      setInviteCode("");
      setShowJoinDialog(false);
      await fetchTeamData();
    } catch (error) {
      console.error('Error joining team:', error);
      toast({
        title: "Fout bij toevoegen",
        description: "Er is een fout opgetreden bij het toevoegen aan het team.",
        variant: "destructive"
      });
    }
  };

  // Copy invite code to clipboard
  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode);
    toast({
      title: "Gekopieerd",
      description: "De uitnodigingscode is gekopieerd naar het klembord.",
    });
  };

  // Select team
  const handleSelectTeam = async (teamId: string) => {
    setSelectedTeam(teamId);
    await fetchTeamMembers(teamId);
    await fetchTeamInvites(teamId);
  };

  // Check if user is admin of selected team
  const isTeamAdmin = () => {
    if (!selectedTeam || !myTeams) return false;
    const team = myTeams.find(t => t.id === selectedTeam);
    return team?.role === 'admin';
  };

  useEffect(() => {
    fetchTeamData();
  }, [user]);

  if (loading && myTeams.length === 0) {
    return (
      <div className="container py-6">
        <h1 className="text-2xl font-bold mb-6">Team Beheer</h1>
        <p>Laden...</p>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Team Beheer</h1>

      <Tabs defaultValue="teams" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="teams">Mijn Teams</TabsTrigger>
          <TabsTrigger value="join">Deelnemen</TabsTrigger>
        </TabsList>

        {/* My Teams Tab */}
        <TabsContent value="teams" className="space-y-4">
          {myTeams.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Geen teams</CardTitle>
                <CardDescription>
                  Je bent nog geen lid van een team. Maak een nieuw team aan of gebruik een uitnodigingscode om lid te worden.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Mijn Teams</CardTitle>
                    <CardDescription>
                      Selecteer een team om te beheren
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {myTeams.map(team => (
                      <Button 
                        key={team.id}
                        variant={selectedTeam === team.id ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => handleSelectTeam(team.id)}
                      >
                        <Building2 className="mr-2 h-4 w-4" />
                        {team.name}
                        {team.role === 'admin' && (
                          <span className="ml-auto text-xs bg-primary/20 px-2 py-1 rounded-full">
                            Beheerder
                          </span>
                        )}
                      </Button>
                    ))}
                  </CardContent>
                  <CardFooter>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="w-full">
                          <Plus className="mr-2 h-4 w-4" />Nieuw Team
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Nieuw Team Aanmaken</DialogTitle>
                          <DialogDescription>
                            Maak een nieuw team aan en nodig teamleden uit.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="team-name">Team Naam</Label>
                            <Input 
                              id="team-name" 
                              value={newTeamName}
                              onChange={e => setNewTeamName(e.target.value)}
                              placeholder="Bijv. Café Amsterdam"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button 
                            onClick={handleCreateTeam} 
                            disabled={!newTeamName.trim()}
                          >
                            Team Aanmaken
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CardFooter>
                </Card>
              </div>

              {selectedTeam && (
                <div className="md:col-span-2 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Team Details</CardTitle>
                      <CardDescription>
                        {myTeams.find(t => t.id === selectedTeam)?.name}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h3 className="text-lg font-medium flex items-center mb-2">
                          <Users className="mr-2 h-5 w-5" />
                          Teamleden ({teamMembers.length})
                        </h3>
                        <div className="space-y-2">
                          {teamMembers.map(member => (
                            <div key={member.id} className="flex items-center justify-between p-2 border rounded">
                              <div>
                                <p className="font-medium">
                                  {member.profiles?.first_name || 'Gebruiker'} {member.profiles?.last_name || ''}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Rol: {member.role === 'admin' ? 'Beheerder' : 'Teamlid'}
                                </p>
                              </div>
                              {isTeamAdmin() && (
                                <Button variant="ghost" size="sm" disabled={member.user_id === user?.id}>
                                  <Settings className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {isTeamAdmin() && (
                        <div>
                          <h3 className="text-lg font-medium flex items-center mb-2">
                            <UserPlus className="mr-2 h-5 w-5" />
                            Uitnodigingen ({invites.length})
                          </h3>
                          {invites.length > 0 ? (
                            <div className="space-y-2">
                              {invites.map(invite => {
                                const expiresDate = new Date(invite.expires_at);
                                return (
                                  <div key={invite.id} className="p-2 border rounded">
                                    <div className="flex justify-between items-center">
                                      <div className="font-mono font-bold">{invite.code}</div>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => {
                                          navigator.clipboard.writeText(invite.code);
                                          toast({
                                            title: "Gekopieerd",
                                            description: "Code gekopieerd naar klembord",
                                          });
                                        }}
                                      >
                                        <Copy className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      Rol: {invite.role === 'admin' ? 'Beheerder' : 'Teamlid'}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      Geldig tot: {expiresDate.toLocaleDateString()}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Geen actieve uitnodigingen. Maak een nieuwe uitnodiging aan.
                            </p>
                          )}
                          <div className="mt-4">
                            <Button onClick={() => setShowInviteDialog(true)} className="w-full">
                              <Plus className="mr-2 h-4 w-4" />
                              Nieuwe Uitnodiging
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Join Team Tab */}
        <TabsContent value="join" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deelnemen aan Team</CardTitle>
              <CardDescription>
                Gebruik een uitnodigingscode om lid te worden van een team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="invite-code">Uitnodigingscode</Label>
                <Input 
                  id="invite-code" 
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value)}
                  placeholder="Voer uitnodigingscode in"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleJoinTeam} disabled={!inviteCode.trim()} className="w-full">
                Deelnemen aan Team
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Nieuwe Uitnodiging</DialogTitle>
            <DialogDescription>
              Maak een uitnodigingscode aan om nieuwe teamleden uit te nodigen.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Rol in Team</Label>
              <div className="flex items-center space-x-2">
                <Button
                  variant={memberRole === 'member' ? 'default' : 'outline'}
                  onClick={() => setMemberRole('member')}
                  className="flex-1"
                >
                  Teamlid
                </Button>
                <Button
                  variant={memberRole === 'admin' ? 'default' : 'outline'}
                  onClick={() => setMemberRole('admin')}
                  className="flex-1"
                >
                  Beheerder
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Rechten</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="can-add-tips" className="cursor-pointer">Fooien toevoegen</Label>
                  <Switch 
                    id="can-add-tips" 
                    checked={canAddTips}
                    onCheckedChange={setCanAddTips}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="can-add-hours" className="cursor-pointer">Uren registreren</Label>
                  <Switch 
                    id="can-add-hours" 
                    checked={canAddHours}
                    onCheckedChange={setCanAddHours}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="can-view-team" className="cursor-pointer">Team bekijken</Label>
                  <Switch 
                    id="can-view-team" 
                    checked={canViewTeam}
                    onCheckedChange={setCanViewTeam}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="can-view-reports" className="cursor-pointer">Rapporten bekijken</Label>
                  <Switch 
                    id="can-view-reports" 
                    checked={canViewReports}
                    onCheckedChange={setCanViewReports}
                  />
                </div>
              </div>
            </div>
            
            {inviteCode && (
              <div className="space-y-2 pt-2">
                <Label>Uitnodigingscode</Label>
                <div className="border rounded-md p-4 flex flex-col items-center space-y-4">
                  <div className="font-mono text-xl font-bold">{inviteCode}</div>
                  <QRCodeSVG value={inviteCode} size={150} />
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={copyInviteCode}>
                      <Copy className="mr-2 h-4 w-4" />Kopiëren
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setInviteCode("")}>
                      <RefreshCw className="mr-2 h-4 w-4" />Reset
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            {!inviteCode ? (
              <Button onClick={generateInviteCode}>
                Code Aanmaken
              </Button>
            ) : (
              <Button onClick={() => setShowInviteDialog(false)}>
                Sluiten
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Management;
