import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, History } from 'lucide-react';
import { supabase, getUserEmail, getUserTeams } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

import TeamManagement from '@/components/management/TeamManagement';
import NoTeam from '@/components/management/NoTeam';
import PermissionsTab from '@/components/management/PermissionsTab';
import PayoutsTab from '@/components/management/PayoutsTab';

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
          const { data: teams, error: teamsError } = await getUserTeams(user.id);
          
          if (teamsError) {
            console.error('Error in getUserTeams:', teamsError);
            throw teamsError;
          }
          
          console.log("Received teams from getUserTeams:", teams?.length || 0);
          if (teams && Array.isArray(teams) && teams.length > 0) {
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
            setHasAnyTeam(false);
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
          .rpc('get_team_members_safe', { team_id_param: selectedTeamId });
          
        if (membersError) {
          console.error('Error fetching team members using RPC:', membersError);
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
          description: typeof error === 'object' && error !== null && 'message' in error ? 
            (error as Error).message : 
            "Er is een fout opgetreden bij het ophalen van teamleden.",
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
        .insert([{ name: newTeamName, created_by: user.id }])
        .select()
        .single();
      
      if (teamError) {
        console.error("Team creation error:", teamError);
        throw teamError;
      }
      
      console.log("Team created:", team);
      
      const { data: memberData, error: memberError } = await supabase
        .rpc('add_team_member', {
          team_id_param: team.id,
          user_id_param: user.id,
          role_param: 'admin',
          permissions_param: {
            add_tips: true,
            edit_tips: true,
            add_hours: true,
            view_team: true,
            view_reports: true,
            close_periods: true,
            manage_payouts: true
          }
        });
      
      if (memberError) {
        console.error("Error with RPC add_team_member:", memberError);
        throw memberError;
      }
      
      toast({
        title: "Team aangemaakt",
        description: `Team '${newTeamName}' is succesvol aangemaakt.`
      });
      
      setNewTeamName('');
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error: any) {
      console.error('Error creating team:', error);
      toast({
        title: "Fout bij aanmaken team",
        description: error.message || "Er is een fout opgetreden bij het aanmaken van het team.",
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
      
    } catch (error: any) {
      console.error('Error joining team:', error);
      toast({
        title: "Fout bij deelnemen aan team",
        description: error.message || "Er is een fout opgetreden bij het deelnemen aan het team.",
        variant: "destructive"
      });
    }
  };

  const handleTeamChange = (teamId: string) => {
    setSelectedTeamId(teamId);
    
    const membership = userTeamMemberships.find(tm => tm.team_id === teamId);
    if (membership) {
      setSelectedMembershipId(membership.id);
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
            <button className="btn-link text-blue-500" onClick={retryLoading}>
              Opnieuw proberen
            </button>
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
          {userTeams.length > 0 ? (
            <TeamManagement
              user={user}
              userTeams={userTeams}
              teamMembers={teamMembers}
              userTeamMemberships={userTeamMemberships}
              loadingTeams={loadingTeams}
              loadingMembers={loadingMembers}
              selectedTeamId={selectedTeamId}
              selectedMembershipId={selectedMembershipId}
              isAdmin={isAdmin}
              error={error}
              onTeamChange={handleTeamChange}
              onRetryLoading={retryLoading}
            />
          ) : (
            <NoTeam
              loadingTeams={loadingTeams}
              error={error}
              handleJoinTeam={handleJoinTeam}
              handleCreateTeam={handleCreateTeam}
              newTeamName={newTeamName}
              setNewTeamName={setNewTeamName}
              inviteCode={inviteCode}
              setInviteCode={setInviteCode}
            />
          )}
        </TabsContent>
        
        <TabsContent value="permissions" className="mt-4">
          <PermissionsTab 
            selectedTeamId={selectedTeamId}
            isAdmin={isAdmin}
          />
        </TabsContent>
        
        <TabsContent value="payouts" className="mt-4">
          <PayoutsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Management;
