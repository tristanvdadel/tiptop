
import React, { useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { PayoutSummary } from '@/components/PayoutSummary';
import TeamMemberList from '@/components/team/TeamMemberList';
import PeriodSelector from '@/components/team/PeriodSelector';
import { TeamProvider, useTeam } from '@/contexts/TeamContext';
import TeamHeader from '@/components/team/TeamHeader';
import ImportActions from '@/components/team/ImportActions';
import TipDistributionSection from '@/components/team/TipDistributionSection';
import LoadingIndicator from '@/components/team/LoadingIndicator';
import { checkTeamMembersWithAccounts } from '@/services/teamDataService';
import { supabase } from '@/integrations/supabase/client';

const TeamContent: React.FC = () => {
  const {
    teamMembers,
    addTeamMember,
    removeTeamMember,
    updateTeamMemberHours,
    deleteHourRegistration,
    refreshTeamData,
    updateTeamMemberName,
    periods,
    teamId
  } = useApp();
  
  const { 
    loading, 
    dataInitialized, 
    handleRefresh, 
    selectedPeriods, 
    togglePeriodSelection,
    sortedTeamMembers
  } = useTeam();
  
  const location = useLocation();
  const navigate = useNavigate();
  const [showPayoutSummary, setShowPayoutSummary] = React.useState(false);

  // Load team data on initial mount
  useEffect(() => {
    let isMounted = true;
    
    const loadInitialData = async () => {
      if (dataInitialized) {
        console.log("Team.tsx: Data already initialized, skipping initial load");
        return;
      }
      
      if (!teamId) {
        console.error("Team.tsx: No team ID found, cannot load data");
        return;
      }
      
      try {
        console.log("Team.tsx: Initial data loading for team:", teamId);
        await handleRefresh();
        if (isMounted) {
          console.log("Team.tsx: Initial data loaded successfully");
        }
      } catch (error) {
        console.error("Error loading team data:", error);
      }
    };
    
    console.log("Team.tsx: Initializing component, loading data");
    loadInitialData();
    
    return () => {
      isMounted = false;
    };
  }, [dataInitialized, handleRefresh, teamId]);

  // Set up real-time updates for periods and team members
  useEffect(() => {
    if (!teamId) {
      console.log("Team.tsx: No team ID for real-time updates");
      return;
    }

    console.log("Team.tsx: Setting up real-time updates for team:", teamId);
    
    // Listen for period changes
    const periodChannel = supabase
      .channel('team-periods-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // All events
          schema: 'public',
          table: 'periods',
          filter: `team_id=eq.${teamId}`
        },
        async (payload) => {
          console.log('Team.tsx: Real-time period update received:', payload);
          try {
            // Refresh team data to update the UI
            await refreshTeamData();
            console.log('Team.tsx: Data refreshed after period update');
          } catch (error) {
            console.error('Team.tsx: Error refreshing data after period update:', error);
          }
        }
      )
      .subscribe();
    
    // Listen for tip changes that might affect periods
    const tipChannel = supabase
      .channel('team-tips-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // All events
          schema: 'public',
          table: 'tips',
          // No filter here as we can't easily filter by team_id for tips
          // We'll filter in the callback
        },
        async (payload) => {
          console.log('Team.tsx: Real-time tip update received:', payload);
          
          // Check if this tip belongs to one of our periods
          const tipPeriodId = payload.new?.period_id || payload.old?.period_id;
          const isPeriodOurs = periods.some(p => p.id === tipPeriodId);
          
          if (isPeriodOurs) {
            try {
              await refreshTeamData();
              console.log('Team.tsx: Data refreshed after tip update in our period');
            } catch (error) {
              console.error('Team.tsx: Error refreshing data after tip update:', error);
            }
          } else {
            console.log('Team.tsx: Ignoring tip update for period not in our team');
          }
        }
      )
      .subscribe();
    
    // Listen for hour registrations changes
    const hourChannel = supabase
      .channel('team-hours-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // All events
          schema: 'public',
          table: 'hour_registrations',
          // We'll filter by team_member_id in the callback
        },
        async (payload) => {
          console.log('Team.tsx: Real-time hour registration update received:', payload);
          
          // Check if this hour registration belongs to one of our team members
          const hourTeamMemberId = payload.new?.team_member_id || payload.old?.team_member_id;
          const isTeamMemberOurs = teamMembers.some(m => m.id === hourTeamMemberId);
          
          if (isTeamMemberOurs) {
            try {
              await refreshTeamData();
              console.log('Team.tsx: Data refreshed after hour registration update for our team member');
            } catch (error) {
              console.error('Team.tsx: Error refreshing data after hour update:', error);
            }
          } else {
            console.log('Team.tsx: Ignoring hour update for team member not in our team');
          }
        }
      )
      .subscribe();
    
    // Cleanup function
    return () => {
      console.log("Team.tsx: Cleaning up real-time subscriptions");
      supabase.removeChannel(periodChannel);
      supabase.removeChannel(tipChannel);
      supabase.removeChannel(hourChannel);
    };
  }, [teamId, periods, teamMembers, refreshTeamData]);

  // Check URL parameters for showing the payout summary
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const showSummary = urlParams.get('payoutSummary') === 'true';
    console.log("Team.tsx: URL param 'payoutSummary':", showSummary);
    setShowPayoutSummary(showSummary);
    
    if (!showSummary) {
      // Clear period selection when not showing payout summary
      console.log("Team.tsx: Clearing period selection");
      togglePeriodSelection('');
    }
  }, [location.search, togglePeriodSelection]);

  // Update team members with account status
  useEffect(() => {
    let isMounted = true;

    const updateTeamMembersWithAccounts = async () => {
      if (teamMembers.length === 0) {
        console.log("Team.tsx: No team members to check for accounts");
        return;
      }
      
      try {
        console.log("Team.tsx: Checking team members with accounts, count:", teamMembers.length);
        if (isMounted) {
          await checkTeamMembersWithAccounts(teamMembers);
          console.log("Team.tsx: Team members with accounts checked successfully");
        }
      } catch (error) {
        console.error("Error checking team members with accounts:", error);
      }
    };
    
    updateTeamMembersWithAccounts();
    
    return () => {
      isMounted = false;
    };
  }, [teamMembers]);

  // Show payout summary if payoutSummary URL param is present
  if (showPayoutSummary) {
    return (
      <div className="pb-16">
        <PayoutSummary onClose={() => {
          console.log("Team.tsx: Closing payout summary");
          setShowPayoutSummary(false);
          navigate('/team');
        }} />
      </div>
    );
  }

  // Show loading animation during first load process
  if (loading && !dataInitialized) {
    console.log("Team.tsx: Showing loading indicator");
    return <LoadingIndicator />;
  }

  const unpaidClosedPeriods = periods.filter(period => !period.isPaid && !period.isActive).length > 0;
  console.log("Team.tsx: Has unpaid closed periods:", unpaidClosedPeriods);

  return (
    <div className="pb-16">
      <TeamHeader />
      
      <TeamMemberList 
        teamMembers={sortedTeamMembers}
        addTeamMember={addTeamMember}
        removeTeamMember={removeTeamMember}
        updateTeamMemberHours={updateTeamMemberHours}
        deleteHourRegistration={deleteHourRegistration}
        updateTeamMemberName={updateTeamMemberName}
      />
      
      <ImportActions />
      
      <PeriodSelector 
        periods={periods}
        selectedPeriods={selectedPeriods}
        onTogglePeriodSelection={togglePeriodSelection}
      />
      
      {periods.filter(period => !period.isPaid && !period.isActive).length > 0 && 
        <TipDistributionSection />
      }
    </div>
  );
};

const Team: React.FC = () => {
  console.log("Team.tsx: Rendering Team component with TeamProvider");
  return (
    <TeamProvider>
      <TeamContent />
    </TeamProvider>
  );
};

export default Team;
