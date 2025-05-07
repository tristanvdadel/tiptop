
import { supabase } from "@/integrations/supabase/client";
import { TeamMember } from '@/types/models';

/**
 * Fetch team members for a team
 */
export const fetchTeamMembers = async (teamId: string) => {
  try {
    // Fetch team members
    const { data: members, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId);
      
    if (error) throw error;
    
    // Map to application model format
    const mappedMembers: TeamMember[] = members.map(member => ({
      id: member.id,
      teamId: member.team_id,
      name: member.name || `Member ${member.id.substring(0, 5)}`,
      hours: member.hours || 0,
      user_id: member.user_id,
      role: member.role,
      permissions: member.permissions,
      created_at: member.created_at,
      balance: member.balance || 0,
    }));
    
    return mappedMembers;
  } catch (error) {
    console.error("Error fetching team members:", error);
    throw error;
  }
};

/**
 * Save a team member
 */
export const saveTeamMember = async (member: Omit<TeamMember, "id">) => {
  try {
    const { data, error } = await supabase
      .from('team_members')
      .insert([{
        team_id: member.teamId,
        name: member.name,
        hours: member.hours,
        user_id: member.user_id,
        role: member.role || 'member',
        permissions: member.permissions,
        balance: member.balance || 0
      }])
      .select()
      .single();
      
    if (error) throw error;
    
    // Map database response to application model
    return {
      id: data.id,
      teamId: data.team_id,
      name: data.name || `Member ${data.id.substring(0, 5)}`,
      hours: data.hours || 0,
      user_id: data.user_id,
      role: data.role,
      permissions: data.permissions,
      created_at: data.created_at,
      balance: data.balance || 0
    } as TeamMember;
  } catch (error) {
    console.error("Error saving team member:", error);
    throw error;
  }
};

/**
 * Update a team member
 */
export const updateTeamMember = async (memberId: string, member: Partial<TeamMember>) => {
  try {
    const updateData: any = {};
    
    // Only include fields that exist in member and map to database columns
    if (member.name !== undefined) updateData.name = member.name;
    if (member.hours !== undefined) updateData.hours = member.hours;
    if (member.role !== undefined) updateData.role = member.role;
    if (member.permissions !== undefined) updateData.permissions = member.permissions;
    if (member.balance !== undefined) updateData.balance = member.balance;
    
    const { data, error } = await supabase
      .from('team_members')
      .update(updateData)
      .eq('id', memberId)
      .select()
      .single();
      
    if (error) throw error;
    
    // Map database response to application model
    return {
      id: data.id,
      teamId: data.team_id,
      name: data.name || `Member ${data.id.substring(0, 5)}`,
      hours: data.hours || 0,
      user_id: data.user_id,
      role: data.role,
      permissions: data.permissions,
      created_at: data.created_at,
      balance: data.balance || 0
    } as TeamMember;
  } catch (error) {
    console.error(`Error updating team member ${memberId}:`, error);
    throw error;
  }
};

/**
 * Delete a team member
 */
export const deleteTeamMember = async (memberId: string) => {
  try {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId);
      
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error(`Error deleting team member ${memberId}:`, error);
    throw error;
  }
};
