
import { useState, useEffect, useCallback, useContext, createContext, ReactNode } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getUserTeamsSafe } from "@/services/teamService";

interface TeamIdContextType {
  teamId: string | null;
  loading: boolean;
  error: string | null;
  fetchTeamId: () => Promise<string | null>;
}

const TeamIdContext = createContext<TeamIdContextType | undefined>(undefined);

/**
 * Provider component that fetches and manages team ID state globally
 */
export const TeamIdProvider = ({ children }: { children: ReactNode }) => {
  const [localTeamId, setLocalTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch team ID if not available
  const fetchTeamId = useCallback(async () => {
    // Check local storage first for immediate UI response
    const cachedTeamId = localStorage.getItem('last_team_id');
    if (cachedTeamId && !localTeamId) {
      console.log("TeamIdProvider: Using cached team ID:", cachedTeamId);
      setLocalTeamId(cachedTeamId);
    }

    try {
      setError(null);
      
      console.log("TeamIdProvider: Fetching team ID from API");
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log("TeamIdProvider: No session found");
        setLoading(false);
        return null;
      }
      
      // Use the safe function to fetch teams
      const teams = await getUserTeamsSafe(session.user.id);
      
      if (teams && teams.length > 0) {
        console.log("TeamIdProvider: Found team ID from API:", teams[0].id);
        setLocalTeamId(teams[0].id);
        
        // Cache the team ID for future use
        localStorage.setItem('last_team_id', teams[0].id);
        
        return teams[0].id;
      } else {
        console.log("TeamIdProvider: No teams found for user");
        setError("Geen teams gevonden");
        return null;
      }
    } catch (error) {
      console.error("Error fetching team ID:", error);
      setError("Fout bij ophalen team");
      return null;
    } finally {
      setLoading(false);
    }
  }, [localTeamId, toast]);

  // Initialize team ID on mount
  useEffect(() => {
    fetchTeamId();
  }, [fetchTeamId]);

  // Don't show loading state if we have a cached team ID
  const value = {
    teamId: localTeamId,
    loading: loading && !localTeamId,
    error,
    fetchTeamId,
  };

  return (
    <TeamIdContext.Provider value={value}>
      {children}
    </TeamIdContext.Provider>
  );
};

/**
 * Hook to provide consistent team ID access across pages
 * Uses the shared context or fallbacks to context/API if needed
 */
export const useTeamId = (contextTeamId?: string | null) => {
  const context = useContext(TeamIdContext);
  
  if (!context) {
    throw new Error('useTeamId must be used within a TeamIdProvider');
  }
  
  // If a contextTeamId is provided, use it, otherwise use the one from context
  return {
    teamId: contextTeamId || context.teamId,
    loading: contextTeamId ? false : context.loading,
    error: contextTeamId ? null : context.error,
    fetchTeamId: context.fetchTeamId
  };
};

export default useTeamId;
