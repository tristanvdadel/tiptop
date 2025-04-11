
import { supabase } from "@/integrations/supabase/client";
import { TeamMember } from '@/contexts/AppContext';

/**
 * Saves a team member and their hour registrations to the database
 */
export const saveTeamMember = async (teamId: string, member: TeamMember) => {
  const { id, name, hours, balance, hourRegistrations } = member;
  
  try {
    // First check if this is a database team member or a local one
    const { data: existingMember, error: checkError } = await supabase
      .from('team_members')
      .select('id, user_id')
      .eq('id', id)
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') throw checkError;
    
    // If it doesn't exist yet in the database, create it
    if (!existingMember) {
      console.log('Creating new team member in database:', name);
      
      const { data: newMember, error: createError } = await supabase
        .from('team_members')
        .insert([{
          id,
          team_id: teamId,
          user_id: null, // Local team members don't have a user_id
          role: 'member',
          hours,
          balance,
          permissions: {
            add_tips: false,
            edit_tips: false,
            add_hours: false,
            view_team: true,
            view_reports: false,
            close_periods: false,
            manage_payouts: false
          }
        }])
        .select()
        .single();
      
      if (createError) throw createError;
      
      // After creating the team member, handle hour registrations if any
      if (hourRegistrations && hourRegistrations.length > 0) {
        const { error: regsError } = await supabase
          .from('hour_registrations')
          .insert(hourRegistrations.map(reg => ({
            id: reg.id,
            team_member_id: id,
            hours: reg.hours,
            date: reg.date,
            processed: false
          })));
        
        if (regsError) throw regsError;
      }
      
      return newMember;
    }
    
    // For existing members, update details
    const { data: updatedMember, error: memberError } = await supabase
      .from('team_members')
      .update({
        hours,
        balance
      })
      .eq('id', id)
      .select()
      .single();
    
    if (memberError) throw memberError;
    
    // Handle hour registrations if any
    if (hourRegistrations && hourRegistrations.length > 0) {
      // Get existing registrations
      const { data: existingRegs, error: getRegsError } = await supabase
        .from('hour_registrations')
        .select('id')
        .eq('team_member_id', id);
      
      if (getRegsError) throw getRegsError;
      
      const existingRegIds = existingRegs.map(r => r.id);
      const currentRegIds = hourRegistrations.map(r => r.id);
      
      // Find registrations to delete
      const regsToDelete = existingRegIds.filter(id => !currentRegIds.includes(id));
      
      if (regsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('hour_registrations')
          .delete()
          .in('id', regsToDelete);
        
        if (deleteError) throw deleteError;
      }
      
      // Upsert all current registrations
      const { error: upsertError } = await supabase
        .from('hour_registrations')
        .upsert(hourRegistrations.map(reg => ({
          id: reg.id,
          team_member_id: id,
          hours: reg.hours,
          date: reg.date,
          processed: false
        })));
      
      if (upsertError) throw upsertError;
    }
    
    return updatedMember;
  } catch (error) {
    console.error('Error saving team member:', error);
    throw error;
  }
};
