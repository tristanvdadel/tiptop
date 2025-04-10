import { createContext, useContext, useState, useCallback } from 'react';
import { TeamMember, HourRegistration } from './types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generateId } from './utils';

type TeamMemberContextType = {
  teamMembers: TeamMember[];
  fetchTeamMembers: () => Promise<void>;
  addTeamMember: (name: string) => Promise<boolean>;
  removeTeamMember: (id: string) => Promise<void>;
  updateTeamMemberHours: (id: string, hours: number) => Promise<void>;
  deleteHourRegistration: (memberId: string, registrationId: string) => Promise<void>;
  updateTeamMemberBalance: (memberId: string, balance: number) => Promise<void>;
  clearTeamMemberHours: (memberId: string) => Promise<void>;
  updateTeamMemberName: (memberId: string, newName: string) => Promise<boolean>;
};

const TeamMemberContext = createContext<TeamMemberContextType | undefined>(undefined);

export const TeamMemberProvider = ({ children, teamId }: { children: React.ReactNode, teamId: string | null }) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const { toast } = useToast();

  const fetchTeamMembers = useCallback(async () => {
    if (!teamId) return;
    
    try {
      const { data: teamMembersData, error: teamMembersError } = await supabase
        .from('team_members')
        .select('id, user_id, role, permissions, balance, hours')
        .eq('team_id', teamId);
      
      if (teamMembersError) {
        console.error('Error fetching team members:', teamMembersError);
        return;
      }
      
      const userProfiles: Record<string, { first_name?: string; last_name?: string }> = {};
      
      for (const member of teamMembersData) {
        if (member.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', member.user_id)
            .single();
          
          if (profile) {
            userProfiles[member.user_id] = profile;
          }
        }
      }
      
      const members = await Promise.all(teamMembersData.map(async (member) => {
        const { data: hourRegistrations } = await supabase
          .from('hour_registrations')
          .select('id, hours, date')
          .eq('team_member_id', member.id);
        
        let name = 'Onbekend';
        if (member.user_id && userProfiles[member.user_id]) {
          const profile = userProfiles[member.user_id];
          if (profile.first_name || profile.last_name) {
            name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
          }
        }
        
        return {
          id: member.id,
          name,
          hours: member.hours || 0,
          balance: member.balance || 0,
          hourRegistrations: hourRegistrations || [],
          user_id: member.user_id,
          team_id: teamId,
        };
      }));
      
      setTeamMembers(members);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  }, [teamId]);

  const addTeamMember = useCallback(async (name: string) => {
    if (!teamId) {
      toast({
        title: "Geen team",
        description: "Je moet eerst een team aanmaken of lid worden van een team.",
        variant: "destructive"
      });
      return false;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Niet ingelogd",
          description: "Je moet ingelogd zijn om teamleden toe te voegen.",
          variant: "destructive"
        });
        return false;
      }
      
      const { data: existingMembers, error: checkError } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', user.id);
        
      if (checkError) {
        console.error('Error checking existing team members:', checkError);
        throw checkError;
      }
      
      if (existingMembers && existingMembers.length > 0) {
        toast({
          title: "Al lid van team",
          description: "Je bent al lid van dit team.",
          variant: "destructive"
        });
        return false;
      }
      
      const { data: newMember, error } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: user.id,
          role: 'member',
          permissions: {
            add_tips: true,
            add_hours: true,
            view_team: true,
            view_reports: true
          }
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error adding team member:', error);
        toast({
          title: "Fout bij toevoegen",
          description: "Er is een fout opgetreden bij het toevoegen van het teamlid.",
          variant: "destructive"
        });
        return false;
      }
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ first_name: name })
        .eq('id', user.id);
      
      if (profileError) {
        console.error('Error updating profile name:', profileError);
      }
      
      const teamMember: TeamMember = {
        id: newMember.id,
        name: name,
        hours: 0,
        balance: 0,
        hourRegistrations: [],
        user_id: user.id,
        team_id: teamId
      };
      
      setTeamMembers(prev => [...prev, teamMember]);
      
      toast({
        title: "Teamlid toegevoegd",
        description: `${name} is toegevoegd aan het team.`,
      });
      
      return true;
    } catch (error) {
      console.error('Error adding team member:', error);
      toast({
        title: "Fout bij toevoegen",
        description: "Er is een fout opgetreden bij het toevoegen van het teamlid.",
        variant: "destructive"
      });
      return false;
    }
  }, [teamId, toast, setTeamMembers]);

  const removeTeamMember = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error removing team member:', error);
        toast({
          title: "Fout bij verwijderen teamlid",
          description: "Er is een fout opgetreden bij het verwijderen van het teamlid.",
          variant: "destructive"
        });
        return;
      }
      
      setTeamMembers(prev => prev.filter(member => member.id !== id));
      
      toast({
        title: "Teamlid verwijderd",
        description: "Het teamlid is succesvol verwijderd.",
      });
    } catch (error) {
      console.error('Error removing team member:', error);
      toast({
        title: "Fout bij verwijderen teamlid",
        description: "Er is een fout opgetreden bij het verwijderen van het teamlid.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const updateTeamMemberHours = useCallback(async (id: string, hours: number) => {
    try {
      const { data: registration, error: regError } = await supabase
        .from('hour_registrations')
        .insert({
          team_member_id: id,
          hours,
          date: new Date().toISOString()
        })
        .select()
        .single();
      
      if (regError) {
        console.error('Error adding hour registration:', regError);
        toast({
          title: "Fout bij registreren uren",
          description: "Er is een fout opgetreden bij het registreren van de uren.",
          variant: "destructive"
        });
        return;
      }
      
      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select('hours')
        .eq('id', id)
        .single();
      
      if (memberError) {
        console.error('Error fetching team member hours:', memberError);
        return;
      }
      
      const currentHours = memberData.hours || 0;
      const newTotalHours = currentHours + hours;
      
      const { error: updateError } = await supabase
        .from('team_members')
        .update({ hours: newTotalHours })
        .eq('id', id);
      
      if (updateError) {
        console.error('Error updating team member hours:', updateError);
        return;
      }
      
      setTeamMembers(prev => 
        prev.map(member => {
          if (member.id === id) {
            const existingRegistrations = member.hourRegistrations || [];
            
            const newRegistration: HourRegistration = {
              id: registration.id,
              hours,
              date: registration.date,
              team_member_id: id
            };
            
            const newRegistrations = [...existingRegistrations, newRegistration];
            
            return { 
              ...member, 
              hours: newTotalHours,
              hourRegistrations: newRegistrations 
            };
          }
          return member;
        })
      );
      
      toast({
        title: "Uren toegevoegd",
        description: `${hours} uren zijn toegevoegd.`,
      });
    } catch (error) {
      console.error('Error updating team member hours:', error);
      toast({
        title: "Fout bij toevoegen uren",
        description: "Er is een fout opgetreden bij het toevoegen van uren.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const deleteHourRegistration = useCallback(async (memberId: string, registrationId: string) => {
    try {
      const { data: registration, error: getError } = await supabase
        .from('hour_registrations')
        .select('hours')
        .eq('id', registrationId)
        .single();
      
      if (getError) {
        console.error('Error fetching hour registration:', getError);
        return;
      }
      
      const hoursToRemove = registration.hours;
      
      const { error: deleteError } = await supabase
        .from('hour_registrations')
        .delete()
        .eq('id', registrationId);
      
      if (deleteError) {
        console.error('Error deleting hour registration:', deleteError);
        return;
      }
      
      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select('hours')
        .eq('id', memberId)
        .single();
      
      if (memberError) {
        console.error('Error fetching team member hours:', memberError);
        return;
      }
      
      const currentHours = memberData.hours || 0;
      const newTotalHours = Math.max(0, currentHours - hoursToRemove);
      
      const { error: updateError } = await supabase
        .from('team_members')
        .update({ hours: newTotalHours })
        .eq('id', memberId);
      
      if (updateError) {
        console.error('Error updating team member hours:', updateError);
        return;
      }
      
      setTeamMembers(prev => 
        prev.map(member => {
          if (member.id === memberId) {
            const filteredRegistrations = member.hourRegistrations?.filter(
              reg => reg.id !== registrationId
            ) || [];
            
            return { 
              ...member, 
              hours: newTotalHours,
              hourRegistrations: filteredRegistrations 
            };
          }
          return member;
        })
      );
      
      toast({
        title: "Uren verwijderd",
        description: `${hoursToRemove} uren zijn verwijderd.`,
      });
    } catch (error) {
      console.error('Error deleting hour registration:', error);
      toast({
        title: "Fout bij verwijderen uren",
        description: "Er is een fout opgetreden bij het verwijderen van uren.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const updateTeamMemberBalance = useCallback(async (memberId: string, balance: number) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ balance })
        .eq('id', memberId);
      
      if (error) {
        console.error('Error updating team member balance:', error);
        return;
      }
      
      setTeamMembers(prev => 
        prev.map(member => 
          member.id === memberId ? { ...member, balance } : member
        )
      );
    } catch (error) {
      console.error('Error updating team member balance:', error);
    }
  }, []);

  const clearTeamMemberHours = useCallback(async (memberId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('team_members')
        .update({ hours: 0 })
        .eq('id', memberId);
      
      if (updateError) {
        console.error('Error clearing team member hours:', updateError);
        return;
      }
      
      const { error: deleteError } = await supabase
        .from('hour_registrations')
        .delete()
        .eq('team_member_id', memberId);
      
      if (deleteError) {
        console.error('Error deleting hour registrations:', deleteError);
        return;
      }
      
      setTeamMembers(prev => 
        prev.map(member => 
          member.id === memberId ? { ...member, hours: 0, hourRegistrations: [] } : member
        )
      );
      
      toast({
        title: "Uren gewist",
        description: "Alle uren zijn succesvol gewist.",
      });
    } catch (error) {
      console.error('Error clearing team member hours:', error);
      toast({
        title: "Fout bij wissen uren",
        description: "Er is een fout opgetreden bij het wissen van uren.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const updateTeamMemberName = useCallback(async (memberId: string, newName: string): Promise<boolean> => {
    try {
      const member = teamMembers.find(m => m.id === memberId);
      
      if (member?.user_id) {
        const { error } = await supabase
          .from('profiles')
          .update({ first_name: newName })
          .eq('id', member.user_id);
        
        if (error) {
          console.error('Error updating profile name:', error);
          toast({
            title: "Fout bij wijzigen naam",
            description: "Er is een fout opgetreden bij het wijzigen van de naam.",
            variant: "destructive"
          });
          return false;
        }
      } else {
        toast({
          title: "Naam wijzigen niet ondersteund",
          description: "Het wijzigen van namen voor niet-gebruikers wordt nog niet ondersteund.",
          variant: "destructive"
        });
        return false;
      }
      
      setTeamMembers(prev => 
        prev.map(member => 
          member.id === memberId ? { ...member, name: newName } : member
        )
      );
      
      toast({
        title: "Naam gewijzigd",
        description: `Naam is gewijzigd naar ${newName}.`,
      });
      
      return true;
    } catch (error) {
      console.error('Error updating team member name:', error);
      toast({
        title: "Fout bij wijzigen naam",
        description: "Er is een fout opgetreden bij het wijzigen van de naam.",
        variant: "destructive"
      });
      return false;
    }
  }, [teamMembers, toast]);

  return (
    <TeamMemberContext.Provider value={{
      teamMembers,
      fetchTeamMembers,
      addTeamMember,
      removeTeamMember,
      updateTeamMemberHours,
      deleteHourRegistration,
      updateTeamMemberBalance,
      clearTeamMemberHours,
      updateTeamMemberName,
    }}>
      {children}
    </TeamMemberContext.Provider>
  );
};

export const useTeamMember = () => {
  const context = useContext(TeamMemberContext);
  if (context === undefined) {
    throw new Error('useTeamMember must be used within a TeamMemberProvider');
  }
  return context;
};
