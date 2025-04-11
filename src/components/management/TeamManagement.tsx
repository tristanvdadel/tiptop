
import { useState, useEffect } from 'react';
import { supabase, getUserEmail } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import TeamOverview from '@/components/TeamOverview';
import TeamInvite from '@/components/TeamInvite';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TeamManagementProps {
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
}

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
}: TeamManagementProps) => {
  const [inviteCode, setInviteCode] = useState('');
  const { toast } = useToast();

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
      
    } catch (error: any) {
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
      
    } catch (error: any) {
      console.error('Error deleting team:', error);
      toast({
        title: "Fout bij verwijderen team",
        description: error.message || "Er is een fout opgetreden bij het verwijderen van het team.",
        variant: "destructive"
      });
    }
  };

  const handleRenameTeam = async (teamId: string, newName: string) => {
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
      
      toast({
        title: "Teamnaam bijgewerkt",
        description: "De naam van het team is succesvol bijgewerkt.",
      });
      
    } catch (error: any) {
      console.error('Error renaming team:', error);
      toast({
        title: "Fout bij hernoemen team",
        description: error.message || "Er is een fout opgetreden bij het hernoemen van het team.",
        variant: "destructive"
      });
    }
  };

  const handleGenerateInvite = async (role: string, permissions: any) => {
    if (!selectedTeamId || !user) return;
    
    try {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
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
            expires_at: expiresAt.toISOString()
          }
        ]);
      
      if (error) throw error;
      
      setInviteCode(code);
      toast({
        title: "Uitnodigingscode aangemaakt",
        description: "De code is 7 dagen geldig."
      });
      
    } catch (error: any) {
      console.error('Error generating invite:', error);
      toast({
        title: "Fout bij aanmaken uitnodiging",
        description: error.message || "Er is een fout opgetreden bij het aanmaken van de uitnodiging.",
        variant: "destructive"
      });
    }
  };

  if (loadingTeams) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p>Laden van teams...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Fout bij laden van teams</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>{error}</p>
          <Button variant="outline" onClick={onRetryLoading}>
            Opnieuw proberen
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (userTeams.length === 0) {
    return null;
  }

  return (
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
                onTeamChange={onTeamChange}
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
  );
};

export default TeamManagement;
