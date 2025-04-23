
import { useState, useEffect, useCallback } from 'react';
import { useTeamId } from '@/hooks/useTeamId';
import { supabase, isRecursionError, clearSecurityCache } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUserTeamsSafe, getTeamMembersSafe } from '@/services/teamService';
import DatabaseSecurityResolver from '@/components/ui/DatabaseSecurityResolver';

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
  const [showRecursionAlert, setShowRecursionAlert] = useState(false);
  const { fetchTeamId } = useTeamId();
  const { toast } = useToast();

  const handleDatabaseRecursionError = useCallback(() => {
    console.log("Handling database recursion error...");
    clearSecurityCache();
    
    toast({
      title: "Database probleem opgelost",
      description: "De cache is gewist en de beveiligingsproblemen zijn opgelost. De pagina wordt opnieuw geladen.",
      duration: 3000,
    });
    
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  }, [toast]);

  useEffect(() => {
    const loadTeamData = async () => {
      try {
        setLoading(true);
        setError(null);
        setShowRecursionAlert(false);
        
        if (!user || !user.id) {
          console.error('No user ID available');
          setHasAnyTeam(false);
          setError('Geen gebruiker gevonden');
          return;
        }
        
        console.log("Fetching teams for user:", user.id);
        
        // Use safe RPC function instead of direct database query
        const teams = await getUserTeamsSafe(user.id);
        
        if (teams && teams.length > 0) {
          console.log("Teams fetched successfully:", teams.length);
          setUserTeams(teams);
          setHasAnyTeam(true);
          setSelectedTeamId(teams[0].id);
          
          // Get memberships using safe RPC
          try {
            const memberships = await getTeamMembersSafe(teams[0].id);
            
            const userMemberships = memberships?.filter(m => m.user_id === user.id) || [];
            setUserTeamMemberships(userMemberships);
            
            const firstTeamMembership = userMemberships.find(m => m.team_id === teams[0].id);
            if (firstTeamMembership) {
              setSelectedMembershipId(firstTeamMembership.id);
            }
            
            const adminMemberships = userMemberships.filter(tm => tm.role === 'admin') || [];
            setIsAdmin(adminMemberships.length > 0);
          } catch (error: any) {
            console.error('Failed to get memberships:', error);
            
            if (isRecursionError(error)) {
              setShowRecursionAlert(true);
              setError('Database beveiligingsprobleem gedetecteerd. Klik op "Herstel Database" om het probleem op te lossen.');
            } else {
              setError(error.message || 'Fout bij ophalen van teamlidmaatschappen');
            }
          }
        } else {
          setHasAnyTeam(false);
        }
      } catch (error: any) {
        console.error('Error loading team data:', error);
        
        if (isRecursionError(error)) {
          setShowRecursionAlert(true);
          setError('Database beveiligingsprobleem gedetecteerd. Klik op "Herstel Database" om het probleem op te lossen.');
        } else {
          setError(error.message || "Er is een fout opgetreden bij het ophalen van je teams");
          toast({
            title: "Fout bij laden teams",
            description: error.message || "Er is een fout opgetreden bij het ophalen van je teams.",
            variant: "destructive"
          });
        }
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

  if (showRecursionAlert) {
    return <DatabaseSecurityResolver fullReset={true} />;
  }

  return null;
};
