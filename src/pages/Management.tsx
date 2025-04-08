import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Users, Link, LogIn, History, Shield, MoveHorizontal, LogOut, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { useNavigate, useLocation } from "react-router-dom";
import { addDays } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import PayoutHistory from '@/components/PayoutHistory';
import TeamMemberPermissions from '@/components/TeamMemberPermissions';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

const Management = () => {
  const location = useLocation();
  const initialTabFromState = location.state?.initialTab;
  
  const [userTeams, setUserTeams] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [userTeamMemberships, setUserTeamMemberships] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [selectedMembershipId, setSelectedMembershipId] = useState(null);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [hasAnyTeam, setHasAnyTeam] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTabFromState || "teams");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (initialTabFromState) {
      setActiveTab(initialTabFromState);
    }
  }, [initialTabFromState]);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }
        setUser(user);
        
        setLoadingTeams(true);
        setError(null);
        
        try {
          const { data: teamMembers, error: memberError } = await supabase
            .from('team_members')
            .select('id, team_id, role')
            .eq('user_id', user.id);
            
          if (memberError) {
            console.error('Error fetching team memberships:', memberError);
            setError(memberError.message);
            toast({
              title: "Fout bij ophalen teams",
              description: memberError.message,
              variant: "destructive"
            });
            setLoadingTeams(false);
            return;
          }
          
          setUserTeamMemberships(teamMembers || []);
          setHasAnyTeam(teamMembers && teamMembers.length > 0);
          
          if (teamMembers && teamMembers.length > 0) {
            const teamIds = teamMembers.map(tm => tm.team_id);
            const { data: teams, error: teamsError } = await supabase
              .from('teams')
              .select('*')
              .in('id', teamIds);
              
            if (teamsError) {
              console.error('Error fetching teams:', teamsError);
              setError(teamsError.message);
            } else {
              setUserTeams(teams || []);
              
              if (teams && teams.length > 0 && !selectedTeamId) {
                setSelectedTeamId(teams[0].id);
                
                const membership = teamMembers.find(tm => tm.team_id === teams[0].id);
                if (membership) {
                  setSelectedMembershipId(membership.id);
                }
              }
            }
            
            const adminMemberships = teamMembers?.filter(tm => tm.role === 'admin') || [];
            setIsAdmin(adminMemberships.length > 0);
          }
        } catch (err) {
          console.error('Error in team fetch:', err);
          setError(err.message);
        }
        
        setLoadingTeams(false);
      } catch (err) {
        console.error('Error checking user:', err);
        setError(err.message);
        setLoadingTeams(false);
      }
    };
    
    checkUser();
  }, [navigate, toast]);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!selectedTeamId) return;
      
      setLoadingMembers(true);
      try {
        const { data: members, error: membersError } = await supabase
          .from('team_members')
          .select('*')
          .eq('team_id', selectedTeamId);
          
        if (membersError) {
          console.error('Error fetching team members:', membersError);
          throw membersError;
        }
        
        const userIds = members.map(member => member.user_id);
        
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url')
          .in('id', userIds);
          
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          throw profilesError;
        }

        const currentMembership = members.find(m => m.user_id === user?.id);
        if (currentMembership) {
          setSelectedMembershipId(currentMembership.id);
        }
        
        try {
          const { data, error: usersError } = await supabase.auth.admin.listUsers();
          
          if (usersError) throw usersError;
          
          const enrichedMembers = members.map(member => {
            const profile = profiles?.find(p => p.id === member.user_id) || {};
            const userInfo = data?.users?.find(u => u.id === member.user_id);
            const userEmail = userInfo?.email || 'Onbekend';
            
            return {
              ...member,
              profile,
              email: userEmail
            };
          });
          
          setTeamMembers(enrichedMembers);
        } catch (error) {
          console.error('Error fetching user emails:', error);
          const enrichedMembers = members.map(member => {
            const profile = profiles?.find(p => p.id === member.user_id) || {};
            
            return {
              ...member,
              profile,
              email: 'Onbekend'
            };
          });
          
          setTeamMembers(enrichedMembers);
        }
      } catch (error) {
        console.error('Error loading team members:', error);
        toast({
          title: "Fout bij ophalen teamleden",
          description: error.message,
          variant: "destructive"
        });
      } finally {
        setLoadingMembers(false);
      }
    };
    
    fetchTeamMembers();
  }, [selectedTeamId, toast, user]);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || !user) return;
    
    try {
      console.log("Creating team:", newTeamName, "for user:", user.id);
      
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert([
          { name: newTeamName, created_by: user.id }
        ])
        .select()
        .single();
      
      if (teamError) {
        console.error("Team creation error:", teamError);
        throw teamError;
      }
      
      console.log("Team created:", team);
      
      const { error: memberError } = await supabase
        .from('team_members')
        .insert([
          { 
            team_id: team.id, 
            user_id: user.id, 
            role: 'admin',
            permissions: {
              add_tips: true,
              edit_tips: true,
              add_hours: true,
              view_team: true,
              view_reports: true,
              close_periods: true,
              manage_payouts: true
            }
          }
        ]);
      
      if (memberError) {
        console.error("Team member creation error:", memberError);
        throw memberError;
      }
      
      toast({
        title: "Team aangemaakt",
        description: `Team '${newTeamName}' is succesvol aangemaakt.`
      });
      
      setNewTeamName('');
      
      window.location.reload();
      
    } catch (error) {
      console.error('Error creating team:', error);
      toast({
        title: "Fout bij aanmaken team",
        description: error.message || "Er is een fout opgetreden bij het aanmaken van het team.",
        variant: "destructive"
      });
    }
  };

  const handleGenerateInvite = async (role, permissions) => {
    if (!selectedTeamId || !user) return;
    
    try {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      const expiresAt = addDays(new Date(), 7).toISOString();
      
      const fullPermissions = {
        ...permissions,
        edit_tips: role === 'admin' || permissions.edit_tips || false,
        close_periods: role === 'admin' || permissions.close_periods || false,
        manage_payouts: role === 'admin' || permissions.manage_payouts || false
      };
      
      const { error } = await supabase
        .from('invites')
        .insert([
          { 
            team_id: selectedTeamId, 
            code, 
            created_by: user.id,
            role,
            permissions: fullPermissions,
            expires_at: expiresAt
          }
        ]);
      
      if (error) throw error;
      
      setInviteCode(code);
      toast({
        title: "Uitnodigingscode aangemaakt",
        description: "De code is 7 dagen geldig."
      });
      
    } catch (error) {
      console.error('Error generating invite:', error);
      toast({
        title: "Fout bij aanmaken uitnodiging",
        description: error.message || "Er is een fout opgetreden bij het aanmaken van de uitnodiging.",
        variant: "destructive"
      });
    }
  };

  const handleJoinTeam = async () => {
    if (!inviteCode.trim() || !user) return;
    
    try {
      const { data: invite, error: inviteError } = await supabase
        .from('invites')
        .select('*')
        .eq('code', inviteCode.trim())
        .single();
      
      if (inviteError) {
        if (inviteError.code === 'PGRST116') {
          throw new Error("Ongeldige uitnodigingscode");
        }
        throw inviteError;
      }
      
      if (new Date(invite.expires_at) < new Date()) {
        throw new Error("Deze uitnodigingscode is verlopen");
      }
      
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', invite.team_id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (existingMember) {
        throw new Error("Je bent al lid van dit team");
      }
      
      const { error: memberError } = await supabase
        .from('team_members')
        .insert([
          { 
            team_id: invite.team_id, 
            user_id: user.id,
            role: invite.role,
            permissions: invite.permissions
          }
        ]);
      
      if (memberError) throw memberError;
      
      toast({
        title: "Succesvol toegevoegd",
        description: "Je bent toegevoegd aan het team."
      });
      
      setInviteCode('');
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('Error joining team:', error);
      toast({
        title: "Fout bij deelnemen aan team",
        description: error.message || "Er is een fout opgetreden bij het deelnemen aan het team.",
        variant: "destructive"
      });
    }
  };

  const handleTeamChange = (teamId) => {
    setSelectedTeamId(teamId);
    
    const membership = userTeamMemberships.find(tm => tm.team_id === teamId);
    if (membership) {
      setSelectedMembershipId(membership.id);
    }
  };
  
  const handleLeaveTeam = async () => {
    if (!selectedTeamId || !selectedMembershipId || !user) return;
    
    try {
      const { data: teamAdmins, error: adminsError } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', selectedTeamId)
        .eq('role', 'admin');
        
      if (adminsError) throw adminsError;
      
      const isLastAdmin = teamAdmins.length === 1 && 
                          teamAdmins[0].id === selectedMembershipId;
      
      if (isLastAdmin) {
        throw new Error("Je kunt het team niet verlaten omdat je de enige beheerder bent. Maak eerst een ander lid beheerder of verwijder het team.");
      }
      
      const { error: deleteError } = await supabase
        .from('team_members')
        .delete()
        .eq('id', selectedMembershipId);
        
      if (deleteError) throw deleteError;
      
      toast({
        title: "Team verlaten",
        description: "Je bent niet langer lid van dit team."
      });
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('Error leaving team:', error);
      toast({
        title: "Fout bij verlaten team",
        description: error.message || "Er is een fout opgetreden bij het verlaten van het team.",
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteTeam = async () => {
    if (!selectedTeamId || !user) return;
    
    try {
      const { data: adminMembership, error: adminError } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', selectedTeamId)
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
        
      if (adminError) {
        console.error("Error checking admin status:", adminError);
        throw new Error("Er is een fout opgetreden bij het verifiëren van je rechten.");
      }
      
      if (!adminMembership) {
        throw new Error("Je hebt geen rechten om dit team te verwijderen.");
      }
      
      const { error: inviteDeleteError } = await supabase
        .from('invites')
        .delete()
        .eq('team_id', selectedTeamId);
        
      if (inviteDeleteError) throw inviteDeleteError;
      
      const { error: memberDeleteError } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', selectedTeamId);
        
      if (memberDeleteError) throw memberDeleteError;
      
      const { error: teamDeleteError } = await supabase
        .from('teams')
        .delete()
        .eq('id', selectedTeamId);
        
      if (teamDeleteError) throw teamDeleteError;
      
      toast({
        title: "Team verwijderd",
        description: "Het team is succesvol verwijderd."
      });
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('Error deleting team:', error);
      toast({
        title: "Fout bij verwijderen team",
        description: error.message || "Er is een fout opgetreden bij het verwijderen van het team.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 pb-20">
      <h1 className="text-2xl font-bold">Beheer</h1>
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Fout bij laden van teams</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue={hasAnyTeam ? "teams" : "teams"}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="teams">Mijn teams</TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-1">
            <Shield className="h-4 w-4" />
            Bevoegdheden
          </TabsTrigger>
          <TabsTrigger value="payouts" className="flex items-center gap-1">
            <History className="h-4 w-4" />
            Uitbetalingen
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="teams" className="space-y-4 mt-4">
          {loadingTeams ? (
            <div className="flex justify-center py-8">Laden...</div>
          ) : userTeams.length > 0 ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MoveHorizontal className="mr-2 h-5 w-5" />
                    Team beheer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {userTeams.length > 1 && (
                      <div className="space-y-2">
                        <Label>Wissel tussen teams</Label>
                        <Select value={selectedTeamId} onValueChange={handleTeamChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecteer een team" />
                          </SelectTrigger>
                          <SelectContent>
                            {userTeams.map(team => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label>Toetreden met code</Label>
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Voer uitnodigingscode in"
                          value={inviteCode}
                          onChange={(e) => setInviteCode(e.target.value)}
                        />
                        <Button onClick={handleJoinTeam} disabled={!inviteCode.trim()}>
                          <LogIn className="mr-2 h-4 w-4" />
                          Toetreden
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" className="flex-1">
                            <LogOut className="mr-2 h-4 w-4" />
                            Team verlaten
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Team verlaten</AlertDialogTitle>
                            <AlertDialogDescription>
                              Weet je zeker dat je dit team wilt verlaten? Je kunt later opnieuw lid worden met een uitnodigingscode.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuleren</AlertDialogCancel>
                            <AlertDialogAction onClick={handleLeaveTeam}>Verlaten</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="flex-1">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Team verwijderen
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Team verwijderen</AlertDialogTitle>
                            <AlertDialogDescription>
                              Weet je zeker dat je dit team wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
                              Alle teamleden, uitnodigingen en gegevens van dit team worden permanent verwijderd.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuleren</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={handleDeleteTeam} 
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Verwijderen
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Team leden</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingMembers ? (
                    <div className="py-4 text-center">Laden van teamleden...</div>
                  ) : teamMembers.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Naam</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Rol</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teamMembers.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>
                              {member.profile?.first_name || ''} {member.profile?.last_name || 'Gebruiker'}
                            </TableCell>
                            <TableCell>{member.email}</TableCell>
                            <TableCell className="capitalize">{member.role}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="py-4 text-center">Geen teamleden gevonden</div>
                  )}
                </CardContent>
              </Card>
              
              {selectedTeamId && (
                <Card>
                  <CardHeader>
                    <CardTitle>Team uitnodiging aanmaken</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label>Rol</Label>
                        <div className="flex items-center space-x-2 mt-1.5">
                          <Button 
                            onClick={() => handleGenerateInvite('member', {
                              add_tips: true,
                              add_hours: true,
                              view_team: true,
                              view_reports: false,
                              edit_tips: false,
                              close_periods: false,
                              manage_payouts: false
                            })}
                            variant="outline"
                          >
                            Teamlid (standaard)
                          </Button>
                          <Button 
                            onClick={() => handleGenerateInvite('admin', {
                              add_tips: true,
                              add_hours: true,
                              view_team: true,
                              view_reports: true,
                              edit_tips: true,
                              close_periods: true,
                              manage_payouts: true
                            })}
                            variant="outline"
                          >
                            Admin
                          </Button>
                        </div>
                      </div>
                      
                      {inviteCode && (
                        <div className="mt-4 space-y-4">
                          <Separator />
                          
                          <div className="flex flex-col items-center justify-center space-y-4">
                            <Label>Uitnodigingscode:</Label>
                            <div className="text-2xl font-mono tracking-wider bg-muted p-2 rounded">
                              {inviteCode}
                            </div>
                            
                            <Button
                              onClick={() => {
                                navigator.clipboard.writeText(inviteCode);
                                toast({
                                  title: "Gekopieerd",
                                  description: "Uitnodigingscode is gekopieerd naar het klembord."
                                });
                              }}
                              className="mt-2"
                            >
                              Kopieer code
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Team toetreden met code</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="inviteCode">Uitnodigingscode</Label>
                      <Input
                        id="inviteCode"
                        placeholder="Voer code in"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleJoinTeam} disabled={!inviteCode.trim()}>
                      <LogIn className="mr-2 h-4 w-4" />
                      Team toetreden
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Nieuw team aanmaken</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="teamName">Teamnaam</Label>
                      <Input
                        id="teamName"
                        placeholder="Bijv. Café De Kroeg"
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleCreateTeam} disabled={!newTeamName.trim()}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Team aanmaken
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="permissions" className="mt-4">
          <TeamMemberPermissions teamId={selectedTeamId} isAdmin={isAdmin} />
        </TabsContent>
        
        <TabsContent value="payouts" className="mt-4">
          <PayoutHistory />
        </TabsContent>
      </Tabs>
      
      {userTeams.length === 0 && !loadingTeams && !error && (
        <Alert className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Geen team gevonden</AlertTitle>
          <AlertDescription>
            Je hebt nog geen team. Maak een nieuw team aan of treed toe tot een bestaand team met een uitnodigingscode.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default Management;
