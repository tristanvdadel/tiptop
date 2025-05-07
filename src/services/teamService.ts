
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches all team data including members, periods, payouts, and settings
 */
export const fetchTeamData = async (teamId: string) => {
  try {
    console.log('Starting to fetch team data for team ID:', teamId);
    
    // Fetch team members
    const { data: teamMembers, error: teamMembersError } = await supabase
      .from('team_members')
      .select('id, user_id, role, permissions, hours, balance')
      .eq('team_id', teamId);
    
    if (teamMembersError) {
      console.error('Error fetching team members:', teamMembersError);
      throw teamMembersError;
    }
    
    // Fetch periods
    const { data: periods, error: periodsError } = await supabase
      .from('periods')
      .select('*')
      .eq('team_id', teamId);
    
    if (periodsError) {
      console.error('Error fetching periods:', periodsError);
      throw periodsError;
    }
    
    // Fetch all tips in a single query instead of per period
    const { data: allTips, error: allTipsError } = await supabase
      .from('tips')
      .select('*')
      .in('period_id', periods.map(p => p.id));
      
    if (allTipsError) {
      console.error('Error fetching all tips:', allTipsError);
      throw allTipsError;
    }
    
    // Map tips to their respective periods
    const periodsWithTips = periods.map(period => ({
      ...period,
      tips: allTips.filter(tip => tip.period_id === period.id) || []
    }));
    
    // Collect all user_ids to fetch profiles in a single query
    const userIds = teamMembers
      .map(member => member.user_id)
      .filter(Boolean);
      
    // Fetch all profiles in a single query
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', userIds);
      
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }
    
    // Fetch all hour registrations in a single query
    const { data: allHourRegistrations, error: hourRegsError } = await supabase
      .from('hour_registrations')
      .select('*')
      .in('team_member_id', teamMembers.map(m => m.id));
      
    if (hourRegsError) {
      console.error('Error fetching hour registrations:', hourRegsError);
      throw hourRegsError;
    }
    
    // Build team members with details
    const teamMembersWithDetails = teamMembers.map(member => {
      // Find profile for this member
      const profile = profiles.find(p => p.id === member.user_id);
      
      // Generate name from profile or default
      const name = profile ? 
        `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 
        'Onbekend lid';
      
      // Set hasAccount to true if the member has a user_id
      const hasAccount = !!member.user_id;
      
      // Find hour registrations for this member
      const hourRegistrations = allHourRegistrations.filter(
        reg => reg.team_member_id === member.id
      );
      
      return {
        ...member,
        name,
        hasAccount,
        hourRegistrations
      };
    });
    
    // Fetch payouts
    const { data: payouts, error: payoutsError } = await supabase
      .from('payouts')
      .select('*')
      .eq('team_id', teamId);
    
    if (payoutsError) {
      console.error('Error fetching payouts:', payoutsError);
      throw payoutsError;
    }
    
    // Get all payout ids for further queries
    const payoutIds = payouts.map(p => p.id);
    
    // Fetch all distributions in a single query
    const { data: allDistributions, error: allDistError } = await supabase
      .from('payout_distributions')
      .select('*')
      .in('payout_id', payoutIds);
      
    if (allDistError) {
      console.error('Error fetching all distributions:', allDistError);
      throw allDistError;
    }
    
    // Fetch all payout periods in a single query
    const { data: allPayoutPeriods, error: allPPError } = await supabase
      .from('payout_periods')
      .select('*')
      .in('payout_id', payoutIds);
      
    if (allPPError) {
      console.error('Error fetching all payout periods:', allPPError);
      throw allPPError;
    }
    
    // Build payouts with distributions and periods
    const payoutsWithDistribution = payouts.map(payout => {
      // Find distributions for this payout
      const distributions = allDistributions.filter(
        dist => dist.payout_id === payout.id
      );
      
      // Find payout periods for this payout
      const payoutPeriods = allPayoutPeriods.filter(
        pp => pp.payout_id === payout.id
      );
      
      // Calculate total amount from distributions
      const totalAmount = distributions.reduce(
        (sum, dist) => sum + (dist.amount || 0), 
        0
      );
      
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
    });
    
    // Fetch team settings
    const { data: settings, error: settingsError } = await supabase
      .from('team_settings')
      .select('*')
      .eq('team_id', teamId)
      .single();
    
    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Error fetching team settings:', settingsError);
      throw settingsError;
    }
    
    const result = {
      teamMembers: teamMembersWithDetails,
      periods: periodsWithTips,
      payouts: payoutsWithDistribution,
      settings
    };
    
    console.log('Successfully fetched team data:', 
      `${teamMembersWithDetails.length} team members, `,
      `${periodsWithTips.length} periods, `,
      `${payoutsWithDistribution.length} payouts`);
    
    return result;
    
  } catch (error) {
    console.error('Error in fetchTeamData:', error);
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

/**
 * Creates a new team and adds the creator as an admin member
 */
export const createTeam = async (name: string, userId: string) => {
  try {
    console.log("Creating team with name:", name, "for user:", userId);
    
    // First create the team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert([{ name, created_by: userId }])
      .select()
      .single();
    
    if (teamError) {
      console.error("Team creation error:", teamError);
      throw teamError;
    }
    
    console.log("Team created:", team);
    
    // Use RPC function to add team member to avoid infinite recursion
    try {
      const { data: memberData, error: memberError } = await supabase
        .rpc('add_team_member', {
          team_id_param: team.id,
          user_id_param: userId,
          role_param: 'admin',
          permissions_param: {
            add_tips: true,
            edit_tips: true,
            add_hours: true,
            view_team: true,
            view_reports: true,
            close_periods: true,
            manage_payouts: true
          }
        });
      
      if (memberError) {
        console.error("Error with RPC add_team_member:", memberError);
        throw memberError;
      }
      
      console.log("Team member added via RPC function, ID:", memberData);
      return team;
    } catch (memberError) {
      console.error("Failed to add team member:", memberError);
      // If RPC fails but team was created, still return the team
      return team;
    }
  } catch (error) {
    console.error("Error in createTeam:", error);
    throw error;
  }
};

/**
 * Gets all teams for a user using the safe RPC function
 */
export const getUserTeamsSafe = async (userId: string) => {
  try {
    console.log('Fetching teams for user using safe function:', userId);
    
    if (!userId) {
      console.error('getUserTeamsSafe called with empty userId');
      return [];
    }
    
    // Try the RPC function first
    const { data, error } = await supabase
      .rpc('get_user_teams_safe', { user_id_param: userId });
    
    if (error) {
      console.error('Error with RPC get_user_teams_safe:', error);
      
      // Fallback to direct query if RPC fails
      const { data: directData, error: directError } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (directError) {
        console.error('Fallback direct query failed:', directError);
        throw directError;
      }
      
      return directData || [];
    }
    
    console.log('Successfully fetched teams for user:', data ? data.length : 0, 'teams');
    return data || [];
  } catch (error) {
    console.error('Error in getUserTeamsSafe:', error);
    throw error;
  }
};

/**
 * Gets all team members for a team using the safe RPC function
 */
export const getTeamMembersSafe = async (teamId: string) => {
  try {
    console.log('Fetching team members using safe function:', teamId);
    
    if (!teamId) {
      console.error('getTeamMembersSafe called with empty teamId');
      return [];
    }
    
    // Try the RPC function first
    const { data, error } = await supabase
      .rpc('get_team_members_safe', { team_id_param: teamId });
    
    if (error) {
      console.error('Error with RPC get_team_members_safe:', error);
      
      // Fallback to direct query if RPC fails
      const { data: directData, error: directError } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId);
      
      if (directError) {
        console.error('Fallback direct query failed:', directError);
        throw directError;
      }
      
      return directData || [];
    }
    
    console.log('Successfully fetched team members:', data ? data.length : 0, 'members');
    return data || [];
  } catch (error) {
    console.error('Error in getTeamMembersSafe:', error);
    throw error;
  }
};
