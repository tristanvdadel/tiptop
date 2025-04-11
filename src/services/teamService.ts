
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches all team data including members, periods, payouts, and settings
 */
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
      
      // Set hasAccount to true if the member has a user_id
      const hasAccount = !!member.user_id;
      
      return {
        ...member,
        name,
        hasAccount,
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

/**
 * Saves team settings to the database
 */
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
