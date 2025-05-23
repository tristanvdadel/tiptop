
import { supabase } from "@/integrations/supabase/client";
import { TeamMember } from '@/contexts/AppContext';

/**
 * Saves a team member and their hour registrations to the database
 */
export const saveTeamMember = async (teamId: string, member: TeamMember) => {
  const { id, name, hours, balance, hourRegistrations } = member;
  
  try {
    console.log(`saveTeamMember: Saving member ${name} (${id}) to team ${teamId}`);
    console.log(`saveTeamMember: Member data:`, { hours, balance, registrationsCount: hourRegistrations?.length || 0 });
    
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
      
      if (createError) {
        console.error('Error creating team member:', createError);
        throw createError;
      }
      
      console.log('Team member created successfully:', newMember);
      
      // After creating the team member, handle hour registrations if any
      if (hourRegistrations && hourRegistrations.length > 0) {
        console.log(`Adding ${hourRegistrations.length} hour registrations for new member ${name}`);
        const { error: regsError } = await supabase
          .from('hour_registrations')
          .insert(hourRegistrations.map(reg => ({
            id: reg.id,
            team_member_id: id,
            hours: reg.hours,
            date: reg.date,
            processed: false
          })));
        
        if (regsError) {
          console.error('Error adding hour registrations:', regsError);
          throw regsError;
        }
        
        console.log('Hour registrations added successfully');
      }
      
      return newMember;
    }
    
    // For existing members, update details
    console.log(`Updating existing team member ${name} (ID: ${id})`);
    const { data: updatedMember, error: memberError } = await supabase
      .from('team_members')
      .update({
        hours,
        balance
      })
      .eq('id', id)
      .select()
      .single();
    
    if (memberError) {
      console.error('Error updating team member:', memberError);
      throw memberError;
    }
    
    console.log('Team member updated successfully:', updatedMember);
    
    // Handle hour registrations if any
    if (hourRegistrations && hourRegistrations.length > 0) {
      // Get existing registrations
      console.log(`Syncing ${hourRegistrations.length} hour registrations for member ${name}`);
      const { data: existingRegs, error: getRegsError } = await supabase
        .from('hour_registrations')
        .select('id')
        .eq('team_member_id', id);
      
      if (getRegsError) {
        console.error('Error fetching existing hour registrations:', getRegsError);
        throw getRegsError;
      }
      
      const existingRegIds = existingRegs.map(r => r.id);
      const currentRegIds = hourRegistrations.map(r => r.id);
      
      // Find registrations to delete
      const regsToDelete = existingRegIds.filter(id => !currentRegIds.includes(id));
      
      if (regsToDelete.length > 0) {
        console.log(`Deleting ${regsToDelete.length} outdated hour registrations`);
        const { error: deleteError } = await supabase
          .from('hour_registrations')
          .delete()
          .in('id', regsToDelete);
        
        if (deleteError) {
          console.error('Error deleting hour registrations:', deleteError);
          throw deleteError;
        }
        
        console.log('Outdated hour registrations deleted successfully');
      }
      
      // Upsert all current registrations
      console.log(`Upserting ${hourRegistrations.length} hour registrations`);
      const { error: upsertError } = await supabase
        .from('hour_registrations')
        .upsert(hourRegistrations.map(reg => ({
          id: reg.id,
          team_member_id: id,
          hours: reg.hours,
          date: reg.date,
          processed: false
        })));
      
      if (upsertError) {
        console.error('Error upserting hour registrations:', upsertError);
        throw upsertError;
      }
      
      console.log('Hour registrations upserted successfully');
    }
    
    console.log(`saveTeamMember: Successfully saved team member ${name} (${id})`);
    return updatedMember;
  } catch (error) {
    console.error('Error saving team member:', error);
    throw error;
  }
};
