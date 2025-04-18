
import { supabase } from '@/integrations/supabase/client';
import { TeamMember } from '@/types';

/**
 * Fetch all team members for a team
 */
export const fetchAllTeamMembers = async (teamId: string) => {
  try {
    console.log(`Fetching team members for team ${teamId}`);
    
    // First get the team member records
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        id,
        balance,
        hours,
        role,
        user_id,
        profiles:user_id (
          first_name,
          last_name
        )
      `)
      .eq('team_id', teamId);
    
    if (error) {
      console.error('Error fetching team members:', error);
      throw error;
    }
    
    // Transform to application format
    return data.map(member => {
      // Generate a name from the profile if available, or use a placeholder
      const firstName = member.profiles?.first_name || '';
      const lastName = member.profiles?.last_name || '';
      const displayName = firstName && lastName 
        ? `${firstName} ${lastName}` 
        : firstName || lastName || `Member ${member.id.slice(0, 4)}`;
      
      return {
        id: member.id,
        name: displayName,
        hourlyRate: 10, // Default hourly rate since it's not in the database
        balance: member.balance || 0,
        hours: member.hours || 0,
        hasAccount: !!member.user_id
      };
    });
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
    
    // Create user profile (placeholder)
    // In a real implementation, we'd handle user creation differently
    const userId = crypto.randomUUID();
    
    // Create team member with role = 'member'
    const { data, error } = await supabase
      .from('team_members')
      .insert([
        { 
          team_id: teamId,
          user_id: userId, 
          role: 'member' // This is required by the schema
        }
      ])
      .select()
      .single();
    
    if (error) {
      console.error('Error saving team member:', error);
      throw error;
    }
    
    // Create a profile with the name
    const nameParts = name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: userId,
        first_name: firstName,
        last_name: lastName
      }]);
    
    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Continue anyway as this is non-critical
    }
    
    // Transform to application format
    return {
      id: data.id,
      name: name,
      hourlyRate: hourlyRate,
      balance: data.balance || 0,
      hours: data.hours || 0,
      hasAccount: true
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
    
    // First get the current team member record
    const { data: member, error: fetchError } = await supabase
      .from('team_members')
      .select('id, user_id, balance, hours')
      .eq('id', teamMemberId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching team member:', fetchError);
      throw fetchError;
    }
    
    // Update team member record
    const dbUpdates: any = {};
    if (updates.balance !== undefined) dbUpdates.balance = updates.balance;
    if (updates.hours !== undefined) dbUpdates.hours = updates.hours;
    
    if (Object.keys(dbUpdates).length > 0) {
      const { error: updateError } = await supabase
        .from('team_members')
        .update(dbUpdates)
        .eq('id', teamMemberId);
      
      if (updateError) {
        console.error('Error updating team member:', updateError);
        throw updateError;
      }
    }
    
    // Update profile name if needed
    if (updates.name && member.user_id) {
      const nameParts = updates.name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName
        })
        .eq('id', member.user_id);
      
      if (profileError) {
        console.error('Error updating profile:', profileError);
        // Continue anyway as this is non-critical
      }
    }
    
    // Return updated team member
    return {
      id: member.id,
      name: updates.name || 'Unknown member',
      hourlyRate: updates.hourlyRate || 10,
      balance: updates.balance !== undefined ? updates.balance : member.balance || 0,
      hours: updates.hours !== undefined ? updates.hours : member.hours || 0,
      hasAccount: !!member.user_id
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
