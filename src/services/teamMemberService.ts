
import { supabase } from '@/integrations/supabase/client';
import { TeamMember } from '@/types';

/**
 * Fetch all team members for a team
 */
export const fetchAllTeamMembers = async (teamId: string) => {
  try {
    console.log(`Fetching team members for team ${teamId}`);
    
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        id,
        name,
        hourly_rate,
        balance,
        hours
      `)
      .eq('team_id', teamId);
    
    if (error) {
      console.error('Error fetching team members:', error);
      throw error;
    }
    
    // Transform to application format
    return data.map(member => ({
      id: member.id,
      name: member.name || `Member ${member.id.slice(0, 4)}`,
      hourlyRate: member.hourly_rate || 0,
      balance: member.balance || 0,
      hours: member.hours || 0,
    }));
  } catch (error) {
    console.error('Error in fetchAllTeamMembers:', error);
    return [];
  }
};

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
 * Update a team member
 */
export const updateTeamMember = async (teamMemberId: string, updates: Partial<TeamMember>) => {
  try {
    console.log(`Updating team member ${teamMemberId}`);
    
    // Convert from app format to DB format
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.hourlyRate !== undefined) dbUpdates.hourly_rate = updates.hourlyRate;
    if (updates.balance !== undefined) dbUpdates.balance = updates.balance;
    if (updates.hours !== undefined) dbUpdates.hours = updates.hours;
    
    const { data, error } = await supabase
      .from('team_members')
      .update(dbUpdates)
      .eq('id', teamMemberId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating team member:', error);
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
    console.error('Error in updateTeamMember:', error);
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
