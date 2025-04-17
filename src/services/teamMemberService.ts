
import { supabase } from '@/integrations/supabase/client';
import { TeamMember } from '@/types';
import { saveTeamMember } from './supabase/teamMemberService';

/**
 * Saves a team member to the database.
 */
export const saveTeamMember = async (teamId: string, name: string, hourlyRate: number) => {
  try {
    console.log(`Saving team member for team ${teamId}`);
    
    // Create or update a team member
    const { data, error } = await supabase
      .from('team_members')
      .insert([
        { 
          team_id: teamId,
          name, 
          hourly_rate: hourlyRate,
        }
      ])
      .select()
      .single();
    
    if (error) {
      console.error('Error saving team member:', error);
      throw error;
    }
    
    // Transform to application format
    return {
      id: data.id,
      name: data.name,
      hourlyRate: data.hourly_rate || 0,
      balance: data.balance || 0,
      hours: data.hours || 0,
    };
  } catch (error) {
    console.error('Error in saveTeamMember:', error);
    throw error;
  }
};

/**
 * Delete a team member
 */
export const deleteTeamMember = async (teamMemberId: string) => {
  try {
    console.log(`Deleting team member ${teamMemberId}`);
    
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', teamMemberId);
    
    if (error) {
      console.error('Error deleting team member:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteTeamMember:', error);
    throw error;
  }
};
