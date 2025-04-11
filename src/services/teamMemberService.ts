
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
    
    // If it's a local member with no user_id, we skip saving to database
    if (!existingMember || !existingMember.user_id) {
      console.log('Skipping save for local team member:', id);
      return null;
    }
    
    // Update team member details
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
