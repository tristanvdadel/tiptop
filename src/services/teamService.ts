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
    
    // Fetch tips for each period
    const periodsWithTips = await Promise.all(periods.map(async (period) => {
      const { data: tips, error: tipsError } = await supabase
        .from('tips')
        .select('*')
        .eq('period_id', period.id);
      
      if (tipsError) {
        console.error('Error fetching tips for period', period.id, ':', tipsError);
        throw tipsError;
      }
      
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
      
      if (hourRegError) {
        console.error('Error fetching hour registrations for member', member.id, ':', hourRegError);
        throw hourRegError;
      }
      
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
    
    if (payoutsError) {
      console.error('Error fetching payouts:', payoutsError);
      throw payoutsError;
    }
    
    // Fetch distribution data for each payout
    const payoutsWithDistribution = await Promise.all(payouts.map(async (payout) => {
      const { data: distributions, error: distError } = await supabase
        .from('payout_distributions')
        .select('*')
        .eq('payout_id', payout.id);
      
      if (distError) {
        console.error('Error fetching distributions for payout', payout.id, ':', distError);
        throw distError;
      }
      
      // Fetch which periods were included in this payout
      const { data: payoutPeriods, error: ppError } = await supabase
        .from('payout_periods')
        .select('period_id')
        .eq('payout_id', payout.id);
      
      if (ppError) {
        console.error('Error fetching payout periods for payout', payout.id, ':', ppError);
        throw ppError;
      }
      
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
