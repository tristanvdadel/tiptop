
import { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getUserTeamsSafe } from "@/services/teamService";

/**
 * Hook to provide consistent team ID access across pages
 * Implements fallback mechanisms to retrieve team ID either from context, cache, or API
 */
export const useTeamId = (contextTeamId?: string | null) => {
  const [localTeamId, setLocalTeamId] = useState<string | null>(contextTeamId || null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch team ID if not provided via context
  const fetchTeamId = useCallback(async () => {
    if (contextTeamId) {
      console.log("useTeamId: Using team ID from context:", contextTeamId);
      setLocalTeamId(contextTeamId);
      return contextTeamId;
    }

    // Check local storage first
    const cachedTeamId = localStorage.getItem('last_team_id');
    if (cachedTeamId) {
      console.log("useTeamId: Using cached team ID:", cachedTeamId);
      setLocalTeamId(cachedTeamId);
      return cachedTeamId;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log("useTeamId: Team ID not found in context, fetching from API");
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log("useTeamId: No session found");
        setError("Niet ingelogd");
        setLoading(false);
        return null;
      }
      
      // Use the safe function to fetch teams
      const teams = await getUserTeamsSafe(session.user.id);
      
      if (teams && teams.length > 0) {
        console.log("useTeamId: Found team ID from API:", teams[0].id);
        setLocalTeamId(teams[0].id);
        
        // Cache the team ID for future use
        localStorage.setItem('last_team_id', teams[0].id);
        
        return teams[0].id;
      } else {
        console.log("useTeamId: No teams found for user");
        setError("Geen teams gevonden");
        return null;
      }
    } catch (error) {
      console.error("Error fetching team ID:", error);
      setError("Fout bij ophalen team");
      toast({
        title: "Fout bij laden",
        description: "Kon team gegevens niet ophalen",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [contextTeamId, toast]);

  useEffect(() => {
    if (!localTeamId) {
      fetchTeamId();
    }
  }, [localTeamId, fetchTeamId]);

  return {
    teamId: localTeamId,
    loading,
    error,
    fetchTeamId,
  };
};

export default useTeamId;
