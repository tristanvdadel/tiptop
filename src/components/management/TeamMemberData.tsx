
import { useState, useEffect } from 'react';
import { useTeamId } from '@/hooks/useTeamId';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface TeamMemberDataProps {
  user: any;
  setUserTeams: (teams: any[]) => void;
  setUserTeamMemberships: (memberships: any[]) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  setError: (error: string | null) => void;
  setHasAnyTeam: (hasTeam: boolean) => void;
  setSelectedTeamId: (teamId: string | null) => void;
  setSelectedMembershipId: (membershipId: string | null) => void;
  retryLoading: () => void;
}

export const TeamMemberData = ({
  user,
  setUserTeams,
  setUserTeamMemberships,
  setIsAdmin,
  setError,
  setHasAnyTeam,
  setSelectedTeamId,
  setSelectedMembershipId,
  retryLoading
}: TeamMemberDataProps) => {
  const [loading, setLoading] = useState(true);
  const { fetchTeamId } = useTeamId();
  const { toast } = useToast();

  useEffect(() => {
    const loadTeamData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log("Fetching teams for user:", user.id);
        
        const { data: teams, error: teamsError } = await supabase
          .from('teams')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (teamsError) {
          console.error('Error fetching teams:', teamsError);
          throw teamsError;
        }
        
        console.log("Received teams:", teams?.length || 0);
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
            throw membershipsError;
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
      } catch (error: any) {
        console.error('Error loading team data:', error);
        setError(error.message || "Er is een fout opgetreden bij het ophalen van je teams");
        
        toast({
          title: "Fout bij laden teams",
          description: error.message || "Er is een fout opgetreden bij het ophalen van je teams.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadTeamData();
    }
  }, [user, setUserTeams, setUserTeamMemberships, setIsAdmin, setError, setHasAnyTeam, setSelectedTeamId, setSelectedMembershipId, toast]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p>Teams laden...</p>
        </div>
      </div>
    );
  }

  return null;
};
