import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import TeamOverview from '@/components/TeamOverview';
import useTeamId from '@/hooks/useTeamId';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const TeamManagement = ({
  user,
  userTeams,
  teamMembers,
  userTeamMemberships,
  loadingTeams,
  loadingMembers,
  selectedTeamId,
  selectedMembershipId,
  isAdmin,
  error,
  onTeamChange,
  onRetryLoading
}: {
  user: any;
  userTeams: any[];
  teamMembers: any[];
  userTeamMemberships: any[];
  loadingTeams: boolean;
  loadingMembers: boolean;
  selectedTeamId: string | null;
  selectedMembershipId: string | null;
  isAdmin: boolean;
  error: string | null;
  onTeamChange: (teamId: string) => void;
  onRetryLoading: () => void;
}) => {
  const { teamId: localTeamId } = useTeamId(selectedTeamId);
  const { toast } = useToast();

  // Use the team ID from our hook as fallback
  const effectiveTeamId = selectedTeamId || localTeamId;

  // Handle team-related operations
  const handleLeaveTeam = async () => {
    if (!selectedMembershipId) return;
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', selectedMembershipId);

      if (error) {
        console.error('Error leaving team:', error);
        throw error;
      }

      toast({
        title: "Team verlaten",
        description: "Je hebt het team verlaten.",
      });

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error leaving team:', error);
      toast({
        title: "Fout bij verlaten team",
        description: "Er is een fout opgetreden bij het verlaten van het team.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTeam = async () => {
    if (!effectiveTeamId) return;
    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', effectiveTeamId);

      if (error) {
        console.error('Error deleting team:', error);
        throw error;
      }

      toast({
        title: "Team verwijderd",
        description: "Het team is succesvol verwijderd.",
      });

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error deleting team:', error);
      toast({
        title: "Fout bij verwijderen team",
        description: "Er is een fout opgetreden bij het verwijderen van het team.",
        variant: "destructive"
      });
    }
  };

  const handleRenameTeam = async (teamId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('teams')
        .update({ name: newName })
        .eq('id', teamId);

      if (error) {
        console.error('Error renaming team:', error);
        throw error;
      }

      toast({
        title: "Team hernoemd",
        description: "Het team is succesvol hernoemd.",
      });

      // Refresh the page to reflect the changes
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error renaming team:', error);
      toast({
        title: "Fout bij hernoemen team",
        description: "Er is een fout opgetreden bij het hernoemen van het team.",
        variant: "destructive"
      });
    }
  };

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Fout bij laden van teams</AlertTitle>
        <AlertDescription>
          <p className="mb-2">{error}</p>
          <Button variant="outline" size="sm" onClick={onRetryLoading}>
            Opnieuw proberen
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (loadingTeams) {
    return <Card><CardContent className="p-8 text-center">Teams laden...</CardContent></Card>;
  }

  return (
    <TeamOverview
      userTeams={userTeams}
      teamMembers={teamMembers}
      loadingMembers={loadingMembers}
      selectedTeamId={effectiveTeamId}
      selectedMembershipId={selectedMembershipId}
      onTeamChange={onTeamChange}
      onLeaveTeam={handleLeaveTeam}
      onDeleteTeam={handleDeleteTeam}
      onRenameTeam={handleRenameTeam}
    />
  );
};

export default TeamManagement;
