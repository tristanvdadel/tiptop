import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getUserTeamsSafe } from '@/services/teamService';

interface TeamIdContextType {
  teamId: string | null;
  loading: boolean;
  error: Error | null;
  fetchTeamId: () => Promise<string | null>;
}

const TeamIdContext = createContext<TeamIdContextType>({
  teamId: null,
  loading: false,
  error: null,
  fetchTeamId: async () => null
});

export const TeamIdProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTeamId = useCallback(async (): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);

      // First check if we have a cached value
      const cachedTeamId = localStorage.getItem('last_team_id');
      if (cachedTeamId) {
        console.log('Using cached team ID:', cachedTeamId);
        setTeamId(cachedTeamId);
        setLoading(false);
        return cachedTeamId;
      }

      // Otherwise, check if the user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found');
        setLoading(false);
        return null;
      }

      try {
        // Try to get all teams for the user using the safe function
        const teams = await getUserTeamsSafe(user.id);
        
        if (teams && teams.length > 0) {
          console.log(`Found ${teams.length} teams, using first one:`, teams[0].id);
          const newTeamId = teams[0].id;
          setTeamId(newTeamId);
          localStorage.setItem('last_team_id', newTeamId);
          setLoading(false);
          return newTeamId;
        } else {
          console.log('No teams found for user');
          setLoading(false);
          return null;
        }
      } catch (err: any) {
        console.error('Error getting teams:', err);
        
        // Special handling for recursion errors
        if (err.message && (
          err.message.includes('recursion') ||
          err.message.includes('infinity') ||
          err.code === '42P17'
        )) {
          console.log('Detected recursion error, falling back to cached team ID if available');
          
          // If we detected a recursion error, try to use the cached team ID if available
          if (cachedTeamId) {
            setTeamId(cachedTeamId);
            setLoading(false);
            return cachedTeamId;
          }
        }
        
        throw err;
      }
    } catch (err: any) {
      console.error('Error fetching team ID:', err);
      setError(err instanceof Error ? err : new Error(err.message || 'Unknown error'));
      setLoading(false);
      return null;
    }
  }, []);

  useEffect(() => {
    fetchTeamId();
  }, [fetchTeamId]);

  return (
    <TeamIdContext.Provider value={{ teamId, loading, error, fetchTeamId }}>
      {children}
    </TeamIdContext.Provider>
  );
};

export const useTeamId = (initialTeamId?: string | null) => {
  const context = useContext(TeamIdContext);
  const [teamId, setTeamId] = useState<string | null>(initialTeamId || null);
  
  useEffect(() => {
    if (initialTeamId) {
      setTeamId(initialTeamId);
    } else if (context.teamId) {
      setTeamId(context.teamId);
    }
  }, [initialTeamId, context.teamId]);
  
  return {
    teamId: teamId || context.teamId,
    loading: context.loading,
    error: context.error,
    fetchTeamId: context.fetchTeamId
  };
};

export default useTeamId;
