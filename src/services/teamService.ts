import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches all team data including members, periods, payouts, and settings
 * Optimized for better performance
 */
export const fetchTeamData = async (teamId: string) => {
  if (!teamId) {
    console.error('fetchTeamData: Called with empty teamId');
    return null;
  }

  try {
    console.log('fetchTeamData: Starting to fetch team data for team ID:', teamId);
    
    // Use Promise.all to fetch basic data in parallel
    const [teamMembersResult, periodsResult] = await Promise.all([
      // Fetch team members with detailed error handling
      supabase
        .from('team_members')
        .select('id, user_id, role, permissions, hours, balance')
        .eq('team_id', teamId),
      
      // Fetch periods with detailed error handling
      supabase
        .from('periods')
        .select('*')
        .eq('team_id', teamId)
    ]);
    
    const { data: teamMembers, error: teamMembersError } = teamMembersResult;
    const { data: periods, error: periodsError } = periodsResult;
    
    if (teamMembersError) {
      console.error('fetchTeamData: Error fetching team members:', teamMembersError);
      throw teamMembersError;
    }
    
    if (!teamMembers || !Array.isArray(teamMembers)) {
      console.error('fetchTeamData: Invalid team members response format');
      throw new Error('Invalid team members response format');
    }
    
    if (periodsError) {
      console.error('fetchTeamData: Error fetching periods:', periodsError);
      throw periodsError;
    }
    
    if (!periods || !Array.isArray(periods)) {
      console.error('fetchTeamData: Invalid periods response format');
      throw new Error('Invalid periods response format');
    }
    
    console.log(`fetchTeamData: Successfully fetched ${teamMembers.length} team members and ${periods.length} periods`);
    
    // Second batch of parallel requests for remaining data
    const [allTipsResult, profilesResult, hourRegistrationsResult, payoutsResult, settingsResult] = await Promise.all([
      // Only fetch tips if there are periods
      periods.length > 0 ? 
        supabase
          .from('tips')
          .select('*')
          .in('period_id', periods.map(p => p.id)) : 
        { data: [], error: null },
      
      // Only fetch profiles if there are team members with user_ids
      teamMembers.length > 0 ?
        supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', teamMembers.map(member => member.user_id).filter(Boolean)) :
        { data: [], error: null },
      
      // Only fetch hour registrations if there are team members
      teamMembers.length > 0 ?
        supabase
          .from('hour_registrations')
          .select('*')
          .in('team_member_id', teamMembers.map(m => m.id)) :
        { data: [], error: null },
      
      // Fetch payouts
      supabase
        .from('payouts')
        .select('*')
        .eq('team_id', teamId),
      
      // Fetch team settings
      supabase
        .from('team_settings')
        .select('*')
        .eq('team_id', teamId)
        .maybeSingle()
    ]);
    
    const { data: allTips, error: allTipsError } = allTipsResult;
    const { data: profiles, error: profilesError } = profilesResult;
    const { data: allHourRegistrations, error: hourRegsError } = hourRegistrationsResult;
    const { data: payouts, error: payoutsError } = payoutsResult;
    const { data: settings, error: settingsError } = settingsResult;
    
    // Handle any errors from the second batch of requests
    if (allTipsError && periods.length > 0) {
      console.error('fetchTeamData: Error fetching all tips:', allTipsError);
    }
    
    if (profilesError && teamMembers.length > 0) {
      console.error('fetchTeamData: Error fetching profiles:', profilesError);
    }
    
    if (hourRegsError && teamMembers.length > 0) {
      console.error('fetchTeamData: Error fetching hour registrations:', hourRegsError);
    }
    
    if (payoutsError) {
      console.error('fetchTeamData: Error fetching payouts:', payoutsError);
    }
    
    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('fetchTeamData: Error fetching team settings:', settingsError);
    }
    
    // Map tips to their respective periods
    const periodsWithTips = periods.map(period => ({
      ...period,
      tips: (allTips || []).filter(tip => tip.period_id === period.id) || []
    }));
    
    // Build team members with details
    const teamMembersWithDetails = teamMembers.map(member => {
      // Find profile for this member
      const profile = (profiles || []).find(p => p.id === member.user_id);
      
      // Generate name from profile or default
      const name = profile ? 
        `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 
        'Onbekend lid';
      
      // Set hasAccount to true if the member has a user_id
      const hasAccount = !!member.user_id;
      
      // Find hour registrations for this member
      const hourRegistrations = (allHourRegistrations || []).filter(
        reg => reg.team_member_id === member.id
      );
      
      return {
        ...member,
        name,
        hasAccount,
        hourRegistrations
      };
    });
    
    // Process payouts - Only fetch detailed data if there are any payouts
    let payoutsWithDistribution = [];
    if (payouts && payouts.length > 0) {
      // Get all payout ids for further queries
      const payoutIds = payouts.map(p => p.id);
      
      // Fetch all distributions and payout periods in parallel
      const [distributionsResult, payoutPeriodsResult] = await Promise.all([
        supabase
          .from('payout_distributions')
          .select('*')
          .in('payout_id', payoutIds),
          
        supabase
          .from('payout_periods')
          .select('*')
          .in('payout_id', payoutIds)
      ]);
      
      const { data: allDistributions, error: allDistError } = distributionsResult;
      const { data: allPayoutPeriods, error: allPPError } = payoutPeriodsResult;
      
      if (allDistError) {
        console.error('fetchTeamData: Error fetching all distributions:', allDistError);
      }
      
      if (allPPError) {
        console.error('fetchTeamData: Error fetching all payout periods:', allPPError);
      }
      
      // Build payouts with distributions and periods
      payoutsWithDistribution = payouts.map(payout => {
        // Find distributions for this payout
        const distributions = (allDistributions || []).filter(
          dist => dist.payout_id === payout.id
        );
        
        // Find payout periods for this payout
        const payoutPeriods = (allPayoutPeriods || []).filter(
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
    }
    
    const result = {
      teamMembers: teamMembersWithDetails,
      periods: periodsWithTips,
      payouts: payoutsWithDistribution,
      settings
    };
    
    console.log('fetchTeamData: Successfully completed fetching all team data');
    
    return result;
    
  } catch (error) {
    console.error('fetchTeamData: Fatal error in fetchTeamData:', error);
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
export const getUserTeamsSafe = async (userId?: string) => {
  try {
    // If no userId is provided, try to use the cached team information
    if (!userId) {
      const cachedTeams = localStorage.getItem('user_teams');
      if (cachedTeams) {
        console.log('Using cached teams data');
        return JSON.parse(cachedTeams);
      }
      
      // If no cache and no userId, check current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.log('No session found and no userId provided');
        return [];
      }
      
      userId = session.user.id;
    }
    
    console.log('Fetching teams for user using safe function:', userId);
    
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
      
      if (directData) {
        // Cache the result
        localStorage.setItem('user_teams', JSON.stringify(directData));
      }
      
      return directData || [];
    }
    
    if (data) {
      // Cache the result
      localStorage.setItem('user_teams', JSON.stringify(data));
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
