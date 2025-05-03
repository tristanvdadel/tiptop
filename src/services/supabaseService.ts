
import { supabase } from "@/integrations/supabase/client";
import { Period, TeamMember, PayoutData } from '@/contexts/AppContext';

/**
 * Saves a period and its associated tips to the database
 */
export const savePeriod = async (teamId: string, period: Period) => {
  try {
    console.log(`Saving period ${period.id} for team ${teamId}`);
    const { id, startDate, endDate, isActive, isPaid, notes, name, autoCloseDate, tips, averageTipPerHour } = period;
    
    // First update or insert the period
    const { data: updatedPeriod, error: periodError } = await supabase
      .from('periods')
      .upsert({
        id,
        team_id: teamId,
        start_date: startDate,
        end_date: endDate,
        is_active: isActive,
        is_paid: isPaid,
        notes,
        name,
        auto_close_date: autoCloseDate,
        average_tip_per_hour: averageTipPerHour
      })
      .select()
      .single();
    
    if (periodError) {
      console.error('Error saving period:', periodError);
      throw periodError;
    }
    
    // Then handle tips (if any)
    if (tips && tips.length > 0) {
      // Get existing tips
      const { data: existingTips, error: getTipsError } = await supabase
        .from('tips')
        .select('id')
        .eq('period_id', id);
      
      if (getTipsError) {
        console.error('Error getting existing tips:', getTipsError);
        throw getTipsError;
      }
      
      const existingTipIds = existingTips.map(t => t.id);
      const currentTipIds = tips.map(t => t.id);
      
      // Find tips to delete (in existing but not in current)
      const tipsToDelete = existingTipIds.filter(id => !currentTipIds.includes(id));
      
      if (tipsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('tips')
          .delete()
          .in('id', tipsToDelete);
        
        if (deleteError) {
          console.error('Error deleting tips:', deleteError);
          throw deleteError;
        }
      }
      
      // Upsert all current tips
      const { error: upsertError } = await supabase
        .from('tips')
        .upsert(tips.map(tip => ({
          id: tip.id,
          period_id: id,
          amount: tip.amount,
          date: tip.date,
          note: tip.note,
          added_by: tip.addedBy
        })));
      
      if (upsertError) {
        console.error('Error upserting tips:', upsertError);
        throw upsertError;
      }
    }
    
    console.log(`Successfully saved period ${period.id} with ${tips?.length || 0} tips`);
    return updatedPeriod;
  } catch (error) {
    console.error('Error in savePeriod:', error);
    throw error;
  }
};

/**
 * Saves a team member and their hour registrations to the database
 */
export const saveTeamMember = async (teamId: string, member: TeamMember) => {
  try {
    console.log(`Saving team member ${member.id} for team ${teamId}`);
    const { id, hours, balance, hourRegistrations } = member;
    
    // First check if this is a database team member or a local one
    const { data: existingMember, error: checkError } = await supabase
      .from('team_members')
      .select('id, user_id')
      .eq('id', id)
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing team member:', checkError);
      throw checkError;
    }
    
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
    
    if (memberError) {
      console.error('Error updating team member:', memberError);
      throw memberError;
    }
    
    // Handle hour registrations if any
    if (hourRegistrations && hourRegistrations.length > 0) {
      // Get existing registrations
      const { data: existingRegs, error: getRegsError } = await supabase
        .from('hour_registrations')
        .select('id')
        .eq('team_member_id', id);
      
      if (getRegsError) {
        console.error('Error getting existing hour registrations:', getRegsError);
        throw getRegsError;
      }
      
      const existingRegIds = existingRegs.map(r => r.id);
      const currentRegIds = hourRegistrations.map(r => r.id);
      
      // Find registrations to delete
      const regsToDelete = existingRegIds.filter(id => !currentRegIds.includes(id));
      
      if (regsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('hour_registrations')
          .delete()
          .in('id', regsToDelete);
        
        if (deleteError) {
          console.error('Error deleting hour registrations:', deleteError);
          throw deleteError;
        }
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
      
      if (upsertError) {
        console.error('Error upserting hour registrations:', upsertError);
        throw upsertError;
      }
    }
    
    console.log(`Successfully saved team member ${member.id} with ${hourRegistrations?.length || 0} hour registrations`);
    return updatedMember;
  } catch (error) {
    console.error('Error in saveTeamMember:', error);
    throw error;
  }
};

/**
 * Saves a payout and its distributions to the database
 */
export const savePayout = async (teamId: string, payout: PayoutData) => {
  try {
    console.log(`Saving payout ${payout.id} for team ${teamId}`);
    const { id, date, payerName, payoutTime, distribution, periodIds } = payout;
    
    // First insert or update the payout
    const { data: updatedPayout, error: payoutError } = await supabase
      .from('payouts')
      .upsert({
        id,
        team_id: teamId,
        date,
        payer_name: payerName,
        payout_time: payoutTime
      })
      .select()
      .single();
    
    if (payoutError) {
      console.error('Error upserting payout:', payoutError);
      throw payoutError;
    }
    
    // Then handle the distribution
    if (distribution && distribution.length > 0) {
      // First delete any existing distributions
      const { error: deleteDistError } = await supabase
        .from('payout_distributions')
        .delete()
        .eq('payout_id', id);
      
      if (deleteDistError) {
        console.error('Error deleting payout distributions:', deleteDistError);
        throw deleteDistError;
      }
      
      // Insert new distributions
      const { error: insertDistError } = await supabase
        .from('payout_distributions')
        .insert(distribution.map(dist => ({
          payout_id: id,
          team_member_id: dist.memberId,
          amount: dist.amount,
          actual_amount: dist.actualAmount,
          balance: dist.balance
        })));
      
      if (insertDistError) {
        console.error('Error inserting payout distributions:', insertDistError);
        throw insertDistError;
      }
    }
    
    // Handle period associations
    if (periodIds && periodIds.length > 0) {
      // First delete any existing period associations
      const { error: deletePeriodError } = await supabase
        .from('payout_periods')
        .delete()
        .eq('payout_id', id);
      
      if (deletePeriodError) {
        console.error('Error deleting payout periods:', deletePeriodError);
        throw deletePeriodError;
      }
      
      // Insert new period associations
      const { error: insertPeriodError } = await supabase
        .from('payout_periods')
        .insert(periodIds.map(periodId => ({
          payout_id: id,
          period_id: periodId
        })));
      
      if (insertPeriodError) {
        console.error('Error inserting payout periods:', insertPeriodError);
        throw insertPeriodError;
      }
    }
    
    console.log(`Successfully saved payout ${payout.id} with ${distribution?.length || 0} distributions and ${periodIds?.length || 0} periods`);
    return updatedPayout;
  } catch (error) {
    console.error('Error in savePayout:', error);
    throw error;
  }
};

/**
 * Saves team settings to the database
 */
export const saveTeamSettings = async (teamId: string, settings: any) => {
  try {
    console.log(`Saving team settings for team ${teamId}`);
    const { autoClosePeriods, periodDuration, alignWithCalendar, closingTime } = settings;
    
    const { data, error } = await supabase
      .from('team_settings')
      .upsert({
        team_id: teamId,
        auto_close_periods: autoClosePeriods,
        period_duration: periodDuration,
        align_with_calendar: alignWithCalendar,
        closing_time: closingTime
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error saving team settings:', error);
      throw error;
    }
    
    console.log('Successfully saved team settings');
    return data;
  } catch (error) {
    console.error('Error in saveTeamSettings:', error);
    throw error;
  }
};
