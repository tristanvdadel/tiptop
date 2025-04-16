import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches all team data including members, periods, payouts, and settings
 */
export const fetchTeamData = async (teamId: string) => {
  if (!teamId) {
    console.error('fetchTeamData: Called with empty teamId');
    return null;
  }

  try {
    console.log('fetchTeamData: Starting to fetch team data for team ID:', teamId);
    
    // Fetch team members with detailed error handling
    const { data: teamMembers, error: teamMembersError } = await supabase
      .from('team_members')
      .select('id, user_id, role, permissions, hours, balance')
      .eq('team_id', teamId);
    
    if (teamMembersError) {
      console.error('fetchTeamData: Error fetching team members:', teamMembersError);
      throw teamMembersError;
    }
    
    if (!teamMembers || !Array.isArray(teamMembers)) {
      console.error('fetchTeamData: Invalid team members response format');
      throw new Error('Invalid team members response format');
    }
    
    console.log(`fetchTeamData: Successfully fetched ${teamMembers.length} team members`);
    
    // Fetch periods with detailed error handling
    const { data: periods, error: periodsError } = await supabase
      .from('periods')
      .select('*')
      .eq('team_id', teamId);
    
    if (periodsError) {
      console.error('fetchTeamData: Error fetching periods:', periodsError);
      throw periodsError;
    }
    
    if (!periods || !Array.isArray(periods)) {
      console.error('fetchTeamData: Invalid periods response format');
      throw new Error('Invalid periods response format');
    }
    
    console.log(`fetchTeamData: Successfully fetched ${periods.length} periods`);
    
    // Check if we have any periods before fetching tips
    let allTips = [];
    if (periods.length > 0) {
      // Fetch all tips in a single query
      const { data: fetchedTips, error: allTipsError } = await supabase
        .from('tips')
        .select('*')
        .in('period_id', periods.map(p => p.id));
        
      if (allTipsError) {
        console.error('fetchTeamData: Error fetching all tips:', allTipsError);
        throw allTipsError;
      }
      
      if (!fetchedTips || !Array.isArray(fetchedTips)) {
        console.warn('fetchTeamData: Invalid tips response format, using empty array');
        allTips = [];
      } else {
        allTips = fetchedTips;
        console.log(`fetchTeamData: Successfully fetched ${allTips.length} tips`);
      }
    }
    
    // Map tips to their respective periods
    const periodsWithTips = periods.map(period => ({
      ...period,
      tips: allTips.filter(tip => tip.period_id === period.id) || []
    }));
    
    // Collect all user_ids to fetch profiles
    const userIds = teamMembers
      .map(member => member.user_id)
      .filter(Boolean);
    
    // Only fetch profiles if we have valid user IDs
    let profiles = [];
    if (userIds.length > 0) {
      const { data: fetchedProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);
        
      if (profilesError) {
        console.error('fetchTeamData: Error fetching profiles:', profilesError);
        throw profilesError;
      }
      
      if (!fetchedProfiles || !Array.isArray(fetchedProfiles)) {
        console.warn('fetchTeamData: Invalid profiles response format, using empty array');
        profiles = [];
      } else {
        profiles = fetchedProfiles;
        console.log(`fetchTeamData: Successfully fetched ${profiles.length} profiles`);
      }
    }
    
    // Fetch all hour registrations for team members
    let allHourRegistrations = [];
    if (teamMembers.length > 0) {
      const { data: fetchedHourRegs, error: hourRegsError } = await supabase
        .from('hour_registrations')
        .select('*')
        .in('team_member_id', teamMembers.map(m => m.id));
        
      if (hourRegsError) {
        console.error('fetchTeamData: Error fetching hour registrations:', hourRegsError);
        throw hourRegsError;
      }
      
      if (!fetchedHourRegs || !Array.isArray(fetchedHourRegs)) {
        console.warn('fetchTeamData: Invalid hour registrations response format, using empty array');
        allHourRegistrations = [];
      } else {
        allHourRegistrations = fetchedHourRegs;
        console.log(`fetchTeamData: Successfully fetched ${allHourRegistrations.length} hour registrations`);
      }
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
    
    // Fetch payouts with better error handling
    const { data: payouts, error: payoutsError } = await supabase
      .from('payouts')
      .select('*')
      .eq('team_id', teamId);
    
    if (payoutsError) {
      console.error('fetchTeamData: Error fetching payouts:', payoutsError);
      throw payoutsError;
    }
    
    // Default to empty array for payouts
    const processedPayouts = payouts || [];
    
    // Process payouts only if we have any
    let payoutsWithDistribution = [];
    if (processedPayouts.length > 0) {
      // Get all payout ids for further queries
      const payoutIds = processedPayouts.map(p => p.id);
      
      // Fetch all distributions in a single query
      const { data: allDistributions, error: allDistError } = await supabase
        .from('payout_distributions')
        .select('*')
        .in('payout_id', payoutIds);
        
      if (allDistError) {
        console.error('fetchTeamData: Error fetching all distributions:', allDistError);
        throw allDistError;
      }
      
      // Fetch all payout periods in a single query
      const { data: allPayoutPeriods, error: allPPError } = await supabase
        .from('payout_periods')
        .select('*')
        .in('payout_id', payoutIds);
        
      if (allPPError) {
        console.error('fetchTeamData: Error fetching all payout periods:', allPPError);
        throw allPPError;
      }
      
      // Build payouts with distributions and periods
      payoutsWithDistribution = processedPayouts.map(payout => {
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
      
      console.log(`fetchTeamData: Successfully processed ${payoutsWithDistribution.length} payouts`);
    }
    
    // Fetch team settings with defensive coding
    let settings = null;
    
    try {
      const { data: fetchedSettings, error: settingsError } = await supabase
        .from('team_settings')
        .select('*')
        .eq('team_id', teamId)
        .maybeSingle();
      
      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error('fetchTeamData: Error fetching team settings:', settingsError);
        // Don't throw here - continue with null settings
      } else {
        settings = fetchedSettings;
        console.log('fetchTeamData: Successfully fetched team settings');
      }
    } catch (settingsError) {
      console.error('fetchTeamData: Unexpected error fetching team settings:', settingsError);
      // Continue with null settings
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
