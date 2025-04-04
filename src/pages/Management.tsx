
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Users, Link, Settings, LogIn } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from 'uuid';
import { addDays } from 'date-fns';

const Management = () => {
  const [userTeams, setUserTeams] = useState<any[]>([]);
  const [userTeamMemberships, setUserTeamMemberships] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch user and check if logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      setUser(user);
      
      // Fetch user teams
      const { data: teamMembers, error: memberError } = await supabase
        .from('team_members')
        .select(`
          *,
          teams:team_id (*)
        `)
        .eq('user_id', user.id);
      
      if (memberError) {
        console.error('Error fetching team memberships:', memberError);
        toast({
          title: "Fout bij ophalen teams",
          description: memberError.message,
          variant: "destructive",
        });
        return;
      }
      
      setUserTeamMemberships(teamMembers || []);
      
      // Find admin team memberships
      const adminMemberships = teamMembers?.filter(tm => tm.role === 'admin') || [];
      if (adminMemberships.length > 0) {
        setIsAdmin(true);
        
        // Get full team details
        const { data: teams, error: teamsError } = await supabase
          .from('teams')
          .select('*')
          .in('id', adminMemberships.map(tm => tm.team_id));
        
        if (teamsError) {
          console.error('Error fetching teams:', teamsError);
        } else {
          setUserTeams(teams || []);
          
          // Select first team by default if available
          if (teams && teams.length > 0 && !selectedTeamId) {
            setSelectedTeamId(teams[0].id);
          }
        }
      }
      
      setLoadingTeams(false);
    };
    
    checkUser();
  }, [navigate, toast]);

  // Create a new team
  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || !user) return;
    
    try {
      // Create team
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert([
          { name: newTeamName, created_by: user.id }
        ])
        .select('id')
        .single();
      
      if (teamError) throw teamError;
      
      // Add creator as admin
      const { error: memberError } = await supabase
        .from('team_members')
        .insert([
          { 
            team_id: team.id, 
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
      
      // Success
      toast({
        title: "Team aangemaakt",
        description: `Team '${newTeamName}' is succesvol aangemaakt.`,
      });
      
      setNewTeamName('');
      
      // Refresh teams
      const { data: teams } = await supabase
        .from('teams')
        .select('*')
        .eq('created_by', user.id);
      
      setUserTeams(teams || []);
      if (teams && teams.length > 0) {
        setSelectedTeamId(teams[0].id);
        setIsAdmin(true);
      }
      
    } catch (error: any) {
      console.error('Error creating team:', error);
      toast({
        title: "Fout bij aanmaken team",
        description: error.message || "Er is een fout opgetreden bij het aanmaken van het team.",
        variant: "destructive",
      });
    }
  };

  // Generate invite code
  const handleGenerateInvite = async (role: string, permissions: any) => {
    if (!selectedTeamId || !user) return;
    
    try {
      // Generate a random code
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      // Set expiration to 7 days from now
      const expiresAt = addDays(new Date(), 7).toISOString();
      
      // Create the invite
      const { error } = await supabase
        .from('invites')
        .insert([
          { 
            team_id: selectedTeamId, 
            code, 
            created_by: user.id,
            role,
            permissions,
            expires_at: expiresAt
          }
        ]);
      
      if (error) throw error;
      
      // Success
      setInviteCode(code);
      toast({
        title: "Uitnodigingscode aangemaakt",
        description: "De code is 7 dagen geldig.",
      });
      
    } catch (error: any) {
      console.error('Error generating invite:', error);
      toast({
        title: "Fout bij aanmaken uitnodiging",
        description: error.message || "Er is een fout opgetreden bij het aanmaken van de uitnodiging.",
        variant: "destructive",
      });
    }
  };

  // Join team with invite code
  const handleJoinTeam = async () => {
    if (!inviteCode.trim() || !user) return;
    
    try {
      // Find the invite
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
      
      // Check if invite is expired
      if (new Date(invite.expires_at) < new Date()) {
        throw new Error("Deze uitnodigingscode is verlopen");
      }
      
      // Check if already a member
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', invite.team_id)
        .eq('user_id', user.id)
        .single();
      
      if (existingMember) {
        throw new Error("Je bent al lid van dit team");
      }
      
      // Add user to team
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
      
      // Success
      toast({
        title: "Succesvol toegevoegd",
        description: "Je bent toegevoegd aan het team.",
      });
      
      setInviteCode('');
      
      // Refresh page after joining
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error: any) {
      console.error('Error joining team:', error);
      toast({
        title: "Fout bij deelnemen aan team",
        description: error.message || "Er is een fout opgetreden bij het deelnemen aan het team.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 pb-20">
      <h1 className="text-2xl font-bold">Beheer</h1>
      
      <Tabs defaultValue="teams">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="teams">Mijn teams</TabsTrigger>
          <TabsTrigger value="join">Team toetreden</TabsTrigger>
        </TabsList>
        
        <TabsContent value="teams" className="space-y-4 mt-4">
          {loadingTeams ? (
            <div className="flex justify-center py-8">Laden...</div>
          ) : userTeams.length > 0 ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Team selecteren</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {userTeams.map(team => (
                      <Button 
                        key={team.id}
                        variant={selectedTeamId === team.id ? "default" : "outline"}
                        className="justify-start"
                        onClick={() => setSelectedTeamId(team.id)}
                      >
                        <Users className="mr-2 h-4 w-4" />
                        {team.name}
                      </Button>
                    ))}
                  </div>
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
                              view_reports: false
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
                              view_reports: true
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
                            
                            <div className="flex flex-col items-center">
                              <Label className="mb-2">QR Code:</Label>
                              <QRCodeSVG 
                                value={`tiptop-invite:${inviteCode}`}
                                size={200}
                              />
                            </div>
                            
                            <Button
                              onClick={() => {
                                navigator.clipboard.writeText(inviteCode);
                                toast({
                                  title: "Gekopieerd",
                                  description: "Uitnodigingscode is gekopieerd naar het klembord.",
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
          )}
        </TabsContent>
        
        <TabsContent value="join" className="mt-4">
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Management;
