
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

  // Using service layer for safer data access
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
        
        // Use the safe RPC function directly
        const { data: teams, error: teamsRpcError } = await supabase
          .rpc('get_user_teams_safe', { user_id_param: user.id });
        
        if (teamsRpcError) {
          console.error('Error fetching teams with safe RPC:', teamsRpcError);
          
          // Check for recursion errors
          if (teamsRpcError.message?.includes('recursion') || 
              teamsRpcError.message?.includes('infinity') ||
              teamsRpcError.code === '42P17') {
            setShowRecursionAlert(true);
            setError('Database beveiligingsprobleem gedetecteerd. Klik op "Herstel Database" om het probleem op te lossen.');
          } else {
            setError(teamsRpcError.message || 'Fout bij ophalen van teams');
          }
          return;
        }
        
        // Process teams data
        if (teams && teams.length > 0) {
          setUserTeams(teams);
          setHasAnyTeam(true);
          setSelectedTeamId(teams[0].id);
          
          // Get memberships using RPC
          try {
            const { data: memberships, error: membershipError } = await supabase
              .rpc('get_team_members_safe', { team_id_param: teams[0].id });
            
            if (membershipError) {
              throw membershipError;
            }
            
            // Filter to user's own memberships
            const userMemberships = memberships?.filter((m: any) => m.user_id === user.id) || [];
            setUserTeamMemberships(userMemberships);
            
            const firstTeamMembership = userMemberships.find((m: any) => m.team_id === teams[0].id);
            if (firstTeamMembership) {
              setSelectedMembershipId(firstTeamMembership.id);
            }
            
            const adminMemberships = userMemberships.filter((tm: any) => tm.role === 'admin') || [];
            setIsAdmin(adminMemberships.length > 0);
          } catch (error: any) {
            console.error('Failed to get memberships:', error);
            
            if (error.message?.includes('recursion') || 
                error.message?.includes('infinity') ||
                error.code === '42P17') {
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
        
        if (error.message?.includes('recursion') || 
            error.message?.includes('infinity') ||
            error.code === '42P17') {
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
