
import { useState, useEffect, useCallback } from 'react';
import { useTeamId } from '@/hooks/useTeamId';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Database } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  // Function to handle database recursion error
  const handleDatabaseRecursionError = useCallback(() => {
    console.log("Handling database recursion error...");
    localStorage.removeItem('sb-auth-token-cached');
    localStorage.removeItem('last_team_id');
    localStorage.removeItem('login_attempt_time');
    
    // Clear team-specific cached data
    const teamDataKeys = Object.keys(localStorage).filter(
      key => key.startsWith('team_data_') || key.includes('analytics_')
    );
    teamDataKeys.forEach(key => localStorage.removeItem(key));
    
    toast({
      title: "Database probleem opgelost",
      description: "De cache is gewist en de beveiligingsproblemen zijn opgelost. De pagina wordt opnieuw geladen.",
      duration: 3000,
    });
    
    // Delay before reload to allow toast to show
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  }, [toast]);

  // Attempt to load teams using the RPC safe function
  const loadTeamsSafely = async (userId: string) => {
    try {
      console.log('🚀 Calling RPC function to get teams safely', { userId });
      const { data, error } = await supabase
        .rpc('get_user_teams_safe', { user_id_param: userId });
      
      if (error) {
        console.error('❌ getUserTeamsSafe RPC Error:', error);
        throw error;
      }
      
      console.log('✅ Teams retrieved successfully via RPC:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('❌ Failed to get teams with RPC:', error);
      return null;
    }
  };

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
        
        // First attempt with regular query
        const { data: teams, error: teamsError } = await supabase
          .from('teams')
          .select('*')
          .order('created_at', { ascending: false });
        
        // Check if we got a recursion error and try the safe RPC function
        if (teamsError && (
          teamsError.message.includes('recursion') || 
          teamsError.message.includes('infinity') ||
          teamsError.code === '42P17'
        )) {
          console.log('Detected recursion error, trying RPC function');
          setShowRecursionAlert(true);
          
          // Try to get teams with the RPC function
          const safeTeams = await loadTeamsSafely(user.id);
          
          if (safeTeams) {
            // Process teams from the safe RPC function
            if (safeTeams.length > 0) {
              setUserTeams(safeTeams);
              setHasAnyTeam(true);
              setSelectedTeamId(safeTeams[0].id);
              
              // Now try to get memberships safely
              try {
                const { data: memberships, error: membershipsError } = await supabase
                  .rpc('get_team_members_safe', { team_id_param: safeTeams[0].id });
                
                if (membershipsError) {
                  throw membershipsError;
                }
                
                // Filter to user's own memberships
                const userMemberships = memberships?.filter(m => m.user_id === user.id) || [];
                
                setUserTeamMemberships(userMemberships);
                
                const firstTeamMembership = userMemberships.find(m => m.team_id === safeTeams[0].id);
                if (firstTeamMembership) {
                  setSelectedMembershipId(firstTeamMembership.id);
                }
                
                const adminMemberships = userMemberships.filter(tm => tm.role === 'admin') || [];
                setIsAdmin(adminMemberships.length > 0);
              } catch (error) {
                console.error('Failed to get memberships safely:', error);
                setError('Probleem bij het ophalen van teamlidmaatschappen');
              }
            } else {
              setHasAnyTeam(false);
            }
            
            // We recovered using the RPC function, but should still show the recursion alert
            return;
          }
          
          // If RPC failed too, show the error message
          setError('Database beveiligingsprobleem gedetecteerd. Klik op "Herstel Database" om het probleem op te lossen.');
          return;
        } else if (teamsError) {
          // Non-recursion error
          console.error('Error fetching teams:', teamsError);
          throw teamsError;
        }
        
        // If we get here, the regular query worked
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
        
        // Check specifically for recursion errors
        if (error.message && (
          error.message.includes('recursion') || 
          error.message.includes('infinity') ||
          error.code === '42P17'
        )) {
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
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle>Database beveiligingsprobleem</AlertTitle>
        <AlertDescription className="space-y-4">
          <p>Er is een probleem met de database beveiliging gedetecteerd (recursie in RLS policy). Dit probleem kan het laden van gegevens blokkeren.</p>
          <Button onClick={handleDatabaseRecursionError} variant="outline" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Herstel Database
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};
