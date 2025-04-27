
import { useState, useEffect, useCallback } from 'react';
import { useTeamId } from '@/hooks/useTeamId';
import { supabase, isRecursionError, clearSecurityCache } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  const [loadStarted, setLoadStarted] = useState(false);
  const [showRecursionAlert, setShowRecursionAlert] = useState(false);
  const { fetchTeamId } = useTeamId();
  const { toast } = useToast();
  const [retryAttempts, setRetryAttempts] = useState(0);

  const handleDatabaseRecursionError = useCallback(() => {
    console.log("Handling database recursion error...");
    clearSecurityCache();
    
    setShowRecursionAlert(true);
    
    toast({
      title: "Database probleem gedetecteerd",
      description: "De cache wordt gewist om het beveiligingsprobleem op te lossen. Klik op 'Herstel Database' om het proces te voltooien.",
      duration: 5000,
    });
  }, [toast]);

  useEffect(() => {
    const loadTeamData = async () => {
      // Prevent multiple simultaneous loading attempts
      if (loadStarted) {
        return;
      }
      
      try {
        setLoadStarted(true);
        setLoading(true);
        setError(null);
        setShowRecursionAlert(false);
        
        if (!user || !user.id) {
          console.error('No user ID available');
          setHasAnyTeam(false);
          setError('Geen gebruiker gevonden');
          setLoadStarted(false);
          return;
        }
        
        console.log("Fetching teams for user:", user.id);
        
        // Use safe RPC function with retry mechanism
        let teams;
        let retryCount = 0;
        const maxRetries = 2;
        
        while (retryCount < maxRetries) {
          try {
            teams = await getUserTeamsSafe(user.id);
            break;
          } catch (teamsError: any) {
            console.error(`Error fetching teams (attempt ${retryCount + 1}):`, teamsError);
            
            if (isRecursionError(teamsError)) {
              handleDatabaseRecursionError();
              setLoadStarted(false);
              return;
            }
            
            retryCount++;
            if (retryCount < maxRetries) {
              console.log(`Retrying team fetch in 1 second... (attempt ${retryCount + 1})`);
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              throw teamsError;
            }
          }
        }
        
        if (teams && teams.length > 0) {
          console.log("Teams fetched successfully:", teams.length);
          setUserTeams(teams);
          setHasAnyTeam(true);
          setSelectedTeamId(teams[0].id);
          
          // Get memberships using safe RPC with retry mechanism
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
          } catch (membershipError: any) {
            console.error('Failed to get memberships:', membershipError);
            
            if (isRecursionError(membershipError)) {
              handleDatabaseRecursionError();
              setLoadStarted(false);
              return;
            } else {
              setError(membershipError.message || 'Fout bij ophalen van teamlidmaatschappen');
            }
          }
        } else {
          setHasAnyTeam(false);
        }
      } catch (error: any) {
        console.error('Error loading team data:', error);
        
        if (isRecursionError(error)) {
          handleDatabaseRecursionError();
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
        setLoadStarted(false);
      }
    };

    if (user && !loadStarted) {
      loadTeamData();
    }
    
    // Add automatic retry mechanic with exponential backoff if we hit errors
    if (retryAttempts > 0) {
      const retryTimeout = setTimeout(() => {
        if (user && !loadStarted) {
          console.log(`Auto-retrying team data load (attempt ${retryAttempts})`);
          loadTeamData();
          setRetryAttempts(prev => Math.max(0, prev - 1));
        }
      }, Math.min(10000, 1000 * Math.pow(2, retryAttempts - 1)));
      
      return () => clearTimeout(retryTimeout);
    }
  }, [user, setUserTeams, setUserTeamMemberships, setIsAdmin, setError, setHasAnyTeam, setSelectedTeamId, setSelectedMembershipId, toast, loadStarted, retryAttempts, handleDatabaseRecursionError]);

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
    return <DatabaseSecurityResolver fullReset={true} redirectPath="/team" />;
  }

  return null;
};
