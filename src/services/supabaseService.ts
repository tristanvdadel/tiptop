
import { supabase } from "@/integrations/supabase/client";
import { Period, TeamMember, PayoutData, TipEntry, HourRegistration } from '@/contexts/AppContext';

export const fetchTeamData = async (teamId: string) => {
  try {
    // Fetch team members
    const { data: teamMembers, error: teamMembersError } = await supabase
      .from('team_members')
      .select('id, user_id, role, permissions, hours, balance')
      .eq('team_id', teamId);
    
    if (teamMembersError) throw teamMembersError;
    
    // Fetch periods
    const { data: periods, error: periodsError } = await supabase
      .from('periods')
      .select('*')
      .eq('team_id', teamId);
    
    if (periodsError) throw periodsError;
    
    // Fetch tips for each period
    const periodsWithTips = await Promise.all(periods.map(async (period) => {
      const { data: tips, error: tipsError } = await supabase
        .from('tips')
        .select('*')
        .eq('period_id', period.id);
      
      if (tipsError) throw tipsError;
      
      return {
        ...period,
        tips: tips || []
      };
    }));
    
    // Fetch hour registrations for each team member
    const teamMembersWithDetails = await Promise.all(teamMembers.map(async (member) => {
      const { data: hourRegistrations, error: hourRegError } = await supabase
        .from('hour_registrations')
        .select('*')
        .eq('team_member_id', member.id);
      
      if (hourRegError) throw hourRegError;
      
      // Fetch profile info to get member name
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', member.user_id)
        .single();
      
      const name = profile ? 
        `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 
        'Onbekend lid';
      
      return {
        ...member,
        name,
        hourRegistrations: hourRegistrations || []
      };
    }));
    
    // Fetch payouts
    const { data: payouts, error: payoutsError } = await supabase
      .from('payouts')
      .select('*')
      .eq('team_id', teamId);
    
    if (payoutsError) throw payoutsError;
    
    // Fetch distribution data for each payout
    const payoutsWithDistribution = await Promise.all(payouts.map(async (payout) => {
      const { data: distributions, error: distError } = await supabase
        .from('payout_distributions')
        .select('*')
        .eq('payout_id', payout.id);
      
      if (distError) throw distError;
      
      // Fetch which periods were included in this payout
      const { data: payoutPeriods, error: ppError } = await supabase
        .from('payout_periods')
        .select('period_id')
        .eq('payout_id', payout.id);
      
      if (ppError) throw ppError;
      
      // Calculate total amount from distributions
      const totalAmount = distributions.reduce((sum, dist) => sum + (dist.amount || 0), 0);
      
      return {
        id: payout.id,
        date: payout.date,
        payerName: payout.payer_name,
        payoutTime: payout.payout_time,
        totalAmount,
        periodIds: payoutPeriods.map(pp => pp.period_id),
        distribution: distributions.map(dist => ({
          memberId: dist.team_member_id,
          amount: dist.amount,
          actualAmount: dist.actual_amount,
          balance: dist.balance
        }))
      };
    }));
    
    // Fetch team settings
    const { data: settings, error: settingsError } = await supabase
      .from('team_settings')
      .select('*')
      .eq('team_id', teamId)
      .single();
    
    if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
    
    return {
      teamMembers: teamMembersWithDetails,
      periods: periodsWithTips,
      payouts: payoutsWithDistribution,
      settings
    };
    
  } catch (error) {
    console.error('Error fetching team data:', error);
    throw error;
  }
};

export const savePeriod = async (teamId: string, period: Period) => {
  const { id, startDate, endDate, isActive, isPaid, notes, name, autoCloseDate, tips, averageTipPerHour } = period;
  
  try {
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
    
    if (periodError) throw periodError;
    
    // Then handle tips (if any)
    if (tips && tips.length > 0) {
      // Get existing tips
      const { data: existingTips, error: getTipsError } = await supabase
        .from('tips')
        .select('id')
        .eq('period_id', id);
      
      if (getTipsError) throw getTipsError;
      
      const existingTipIds = existingTips.map(t => t.id);
      const currentTipIds = tips.map(t => t.id);
      
      // Find tips to delete (in existing but not in current)
      const tipsToDelete = existingTipIds.filter(id => !currentTipIds.includes(id));
      
      if (tipsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('tips')
          .delete()
          .in('id', tipsToDelete);
        
        if (deleteError) throw deleteError;
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
      
      if (upsertError) throw upsertError;
    }
    
    return updatedPeriod;
  } catch (error) {
    console.error('Error saving period:', error);
    throw error;
  }
};

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

export const savePayout = async (teamId: string, payout: PayoutData) => {
  try {
    // First create or update the payout record
    const { data: payoutRecord, error: payoutError } = await supabase
      .from('payouts')
      .upsert({
        id: payout.id,
        team_id: teamId,
        date: payout.date,
        payer_name: payout.payerName,
        payout_time: payout.payoutTime || new Date().toISOString()
      })
      .select()
      .single();
    
    if (payoutError) throw payoutError;
    
    // Save payout distributions
    if (payout.distribution && payout.distribution.length > 0) {
      const { error: distError } = await supabase
        .from('payout_distributions')
        .upsert(payout.distribution.map(dist => ({
          payout_id: payout.id,
          team_member_id: dist.memberId,
          amount: dist.amount,
          actual_amount: dist.actualAmount,
          balance: dist.balance
        })));
      
      if (distError) throw distError;
    }
    
    // Save payout periods links
    if (payout.periodIds && payout.periodIds.length > 0) {
      const { error: periodsError } = await supabase
        .from('payout_periods')
        .upsert(payout.periodIds.map(periodId => ({
          payout_id: payout.id,
          period_id: periodId
        })));
      
      if (periodsError) throw periodsError;
      
      // Mark periods as paid
      const { error: updateError } = await supabase
        .from('periods')
        .update({ is_paid: true })
        .in('id', payout.periodIds);
      
      if (updateError) throw updateError;
    }
    
    return payoutRecord;
  } catch (error) {
    console.error('Error saving payout:', error);
    throw error;
  }
};

export const saveTeamSettings = async (teamId: string, settings: any) => {
  try {
    const { data, error } = await supabase
      .from('team_settings')
      .upsert({
        team_id: teamId,
        auto_close_periods: settings.autoClosePeriods,
        period_duration: settings.periodDuration,
        align_with_calendar: settings.alignWithCalendar,
        closing_time: settings.closingTime
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving team settings:', error);
    throw error;
  }
};
