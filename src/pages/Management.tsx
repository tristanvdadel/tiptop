
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, History, Link } from 'lucide-react';
import { supabase, getUserEmail, getUserTeams } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { addDays } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import PayoutHistory from '@/components/PayoutHistory';
import TeamMemberPermissions from '@/components/TeamMemberPermissions';
import TeamOverview from '@/components/TeamOverview';
import TeamInvite from '@/components/TeamInvite';
import TeamJoin from '@/components/TeamJoin';
import TeamCreate from '@/components/TeamCreate';

const Management = () => {
  const location = useLocation();
  const initialTabFromState = location.state?.initialTab;
  
  const [userTeams, setUserTeams] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [userTeamMemberships, setUserTeamMemberships] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasAnyTeam, setHasAnyTeam] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTabFromState || "teams");
  const [loadAttempts, setLoadAttempts] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (initialTabFromState) {
      setActiveTab(initialTabFromState);
    }
  }, [initialTabFromState]);

  const retryLoading = () => {
    setLoadAttempts(prev => prev + 1);
    setLoadingTeams(true);
    setError(null);
    toast({
      title: "Opnieuw laden",
      description: "Bezig met opnieuw ophalen van teams...",
    });
  };

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
        
        console.log("Fetching teams for user:", user.id, "Attempt:", loadAttempts);
        
        try {
          const { data: teams, error: teamsError } = await supabase
            .from('teams')
            .select('*');
          
          if (teamsError) {
            console.error('Error fetching teams directly:', teamsError);
            throw teamsError;
          }
          
          console.log("Received teams:", teams?.length || 0);
          if (teams && teams.length > 0) {
            setUserTeams(teams);
            setHasAnyTeam(true);
            setSelectedTeamId(teams[0].id);
            
            const { data: memberships, error: membershipsError } = await supabase
              .from('team_members')
              .select('id, team_id, role')
              .eq('user_id', user.id);
            
            if (membershipsError) {
              console.error('Error fetching memberships:', membershipsError);
            } else {
              setUserTeamMemberships(memberships || []);
              
              const firstTeamMembership = memberships?.find(m => m.team_id === teams[0].id);
              if (firstTeamMembership) {
                setSelectedMembershipId(firstTeamMembership.id);
              }
              
              const adminMemberships = memberships?.filter(tm => tm.role === 'admin') || [];
              setIsAdmin(adminMemberships.length > 0);
            }
          } else {
            console.log("No teams found directly, trying getUserTeams function");
            const { data: userTeamsData, error: userTeamsError } = await getUserTeams(user.id);
              
            if (userTeamsError) {
              console.error('Error in getUserTeams:', userTeamsError);
              throw userTeamsError;
            }
              
            console.log("Received teams from getUserTeams:", userTeamsData?.length || 0);
            if (userTeamsData && Array.isArray(userTeamsData) && userTeamsData.length > 0) {
              setUserTeams(userTeamsData);
              setHasAnyTeam(true);
              setSelectedTeamId(userTeamsData[0].id);
                
              const { data: memberships, error: membershipsError } = await supabase
                .from('team_members')
                .select('id, team_id, role')
                .eq('user_id', user.id);
                
              if (membershipsError) {
                console.error('Error fetching memberships:', membershipsError);
              } else {
                setUserTeamMemberships(memberships || []);
                  
                const firstTeamMembership = memberships?.find(m => m.team_id === userTeamsData[0].id);
                if (firstTeamMembership) {
                  setSelectedMembershipId(firstTeamMembership.id);
                }
                  
                const adminMemberships = memberships?.filter(tm => tm.role === 'admin') || [];
                setIsAdmin(adminMemberships.length > 0);
              }
            } else {
              setHasAnyTeam(false);
            }
          }
        } catch (err: any) {
          console.error('Error in team fetch:', err);
          setError(err.message || "Er is een fout opgetreden bij het ophalen van je teams");
        }
        
        setLoadingTeams(false);
      } catch (err: any) {
        console.error('Error checking user:', err);
        setError(err.message || "Er is een fout opgetreden bij het controleren van je gebruiker");
        setLoadingTeams(false);
      }
    };
    
    checkUser();
  }, [navigate, toast, loadAttempts]);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!selectedTeamId || !user) return;
      
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
        
        const userIds = members.map(member => member.user_id).filter(Boolean);
        
        let profiles = [];
        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, avatar_url')
            .in('id', userIds);
            
          if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
            throw profilesError;
          }
          
          profiles = profilesData || [];
        }

        const currentMembership = members.find(m => m.user_id === user.id);
        if (currentMembership) {
          setSelectedMembershipId(currentMembership.id);
        }
        
        const enrichedMembers = await Promise.all(members.map(async (member) => {
          const profile = profiles.find(p => p.id === member.user_id) || {};
          const userEmail = await getUserEmail(member.user_id);
          
          return {
            ...member,
            profile,
            email: userEmail
          };
        }));
        
        setTeamMembers(enrichedMembers);
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
        .select('id, role')
        .eq('team_id', selectedTeamId)
        .eq('role', 'admin');
        
      if (adminsError) throw adminsError;
      
      const isLastAdmin = teamAdmins && teamAdmins.length === 1 && 
                          teamAdmins[0] && teamAdmins[0].id === selectedMembershipId;
      
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

  const handleRenameTeam = async (teamId, newName) => {
    if (!teamId || !newName.trim() || !user) return;
    
    try {
      const { data: adminMembership, error: adminError } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
        
      if (adminError) {
        console.error("Error checking admin status:", adminError);
        throw new Error("Er is een fout opgetreden bij het verifiëren van je rechten.");
      }
      
      if (!adminMembership) {
        throw new Error("Je hebt geen rechten om de teamnaam te wijzigen.");
      }
      
      const { error: updateError } = await supabase
        .from('teams')
        .update({ name: newName.trim() })
        .eq('id', teamId);
        
      if (updateError) throw updateError;
      
      setUserTeams(prev => 
        prev.map(team => 
          team.id === teamId 
            ? { ...team, name: newName.trim() } 
            : team
        )
      );
      
      toast({
        title: "Teamnaam bijgewerkt",
        description: "De naam van het team is succesvol bijgewerkt.",
      });
      
    } catch (error) {
      console.error('Error renaming team:', error);
      toast({
        title: "Fout bij hernoemen team",
        description: error.message || "Er is een fout opgetreden bij het hernoemen van het team.",
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
          <AlertDescription className="space-y-3">
            <p>{error}</p>
            <Button variant="outline" onClick={retryLoading}>
              Opnieuw proberen
            </Button>
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
            Geschiedenis
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="teams" className="space-y-4 mt-4">
          {loadingTeams ? (
            <div className="flex justify-center py-8">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
                <p>Laden van teams...</p>
              </div>
            </div>
          ) : userTeams.length > 0 ? (
            <div className="space-y-6">
              <Carousel
                className="w-full"
                opts={{
                  align: "start",
                }}
              >
                <CarouselContent className="-ml-1">
                  <CarouselItem className="pl-1">
                    <div className="p-1">
                      <TeamOverview 
                        userTeams={userTeams}
                        teamMembers={teamMembers}
                        loadingMembers={loadingMembers}
                        selectedTeamId={selectedTeamId}
                        selectedMembershipId={selectedMembershipId}
                        onTeamChange={handleTeamChange}
                        onLeaveTeam={handleLeaveTeam}
                        onDeleteTeam={handleDeleteTeam}
                        onRenameTeam={handleRenameTeam}
                      />
                    </div>
                  </CarouselItem>
                </CarouselContent>
                <div className="hidden md:flex">
                  <CarouselPrevious className="left-1" />
                  <CarouselNext className="right-1" />
                </div>
              </Carousel>
              
              <TeamInvite 
                selectedTeamId={selectedTeamId}
                onGenerateInvite={handleGenerateInvite}
                inviteCode={inviteCode}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <TeamJoin 
                inviteCode={inviteCode}
                onInviteCodeChange={setInviteCode}
                onJoinTeam={handleJoinTeam}
              />
              
              <TeamCreate 
                newTeamName={newTeamName}
                onNewTeamNameChange={setNewTeamName}
                onCreateTeam={handleCreateTeam}
              />
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="permissions" className="mt-4">
          <Carousel
            className="w-full"
            opts={{
              align: "start",
            }}
          >
            <CarouselContent className="-ml-1">
              <CarouselItem className="pl-1">
                <div className="p-1">
                  <TeamMemberPermissions teamId={selectedTeamId} isAdmin={isAdmin} />
                </div>
              </CarouselItem>
            </CarouselContent>
            <div className="hidden md:flex">
              <CarouselPrevious className="left-1" />
              <CarouselNext className="right-1" />
            </div>
          </Carousel>
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
