
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, History } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";

import TeamManagement from '@/components/management/TeamManagement';
import NoTeam from '@/components/management/NoTeam';
import PermissionsTab from '@/components/management/PermissionsTab';
import PayoutsTab from '@/components/management/PayoutsTab';
import { TeamMemberData } from '@/components/management/TeamMemberData';
import { useTeamManagement } from '@/hooks/useTeamManagement';
import DatabaseSecurityResolver from '@/components/ui/DatabaseSecurityResolver';

const Management = () => {
  const location = useLocation();
  const initialTabFromState = location.state?.initialTab;
  const navigate = useNavigate();
  
  const [userTeams, setUserTeams] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [userTeamMemberships, setUserTeamMemberships] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasAnyTeam, setHasAnyTeam] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTabFromState || "teams");
  const [loadAttempts, setLoadAttempts] = useState(0);

  // Get the current user
  useEffect(() => {
    const getUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Error getting user:', error);
        setError('Kon de gebruiker niet ophalen');
      }
    };
    
    getUserData();
  }, []);

  const {
    newTeamName,
    setNewTeamName,
    inviteCode,
    setInviteCode,
    handleCreateTeam,
    handleJoinTeam
  } = useTeamManagement(user);

  const handleTeamChange = (teamId: string) => {
    setSelectedTeamId(teamId);
    
    const membership = userTeamMemberships.find(tm => tm.team_id === teamId);
    if (membership) {
      setSelectedMembershipId(membership.id);
    }
  };

  const retryLoading = () => {
    setLoadAttempts(prev => prev + 1);
    setError(null);
  };

  if (error && error.includes('beveiligingsprobleem')) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6 pb-20">
        <h1 className="text-2xl font-bold">Beheer</h1>
        <DatabaseSecurityResolver fullReset={true} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 pb-20">
      <h1 className="text-2xl font-bold">Beheer</h1>
      
      {user && (
        <TeamMemberData
          user={user}
          setUserTeams={setUserTeams}
          setUserTeamMemberships={setUserTeamMemberships}
          setIsAdmin={setIsAdmin}
          setError={setError}
          setHasAnyTeam={setHasAnyTeam}
          setSelectedTeamId={setSelectedTeamId}
          setSelectedMembershipId={setSelectedMembershipId}
          retryLoading={retryLoading}
        />
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
              loadingTeams={false}
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
              loadingTeams={false}
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
