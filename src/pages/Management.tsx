
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from 'react-router-dom';
import TeamMemberPermissions from "@/components/TeamMemberPermissions";
import PayoutHistory from "@/components/PayoutHistory";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Management = () => {
  const [activeTab, setActiveTab] = useState("permissions");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Check if there's an initialTab in the location state
    if (location.state?.initialTab) {
      setActiveTab(location.state.initialTab);
    }
    
    // Fetch the user's teams and permissions on component mount
    fetchUserTeamInfo();
  }, [location.state]);

  const fetchUserTeamInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get the user's team memberships
      const { data: teamMemberships, error } = await supabase
        .from('team_members')
        .select(`
          team_id,
          role,
          teams:team_id (id, name)
        `)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching team info:', error);
        return;
      }

      if (teamMemberships) {
        setSelectedTeamId(teamMemberships.team_id);
        setIsAdmin(teamMemberships.role === 'admin');
      }
    } catch (error) {
      console.error('Error in fetchUserTeamInfo:', error);
      toast({
        title: "Error",
        description: "Failed to load user team information",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Team Management</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="permissions">Team Permissions</TabsTrigger>
          <TabsTrigger value="payouts">Payout History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="permissions">
          <TeamMemberPermissions teamId={selectedTeamId} isAdmin={isAdmin} />
        </TabsContent>
        
        <TabsContent value="payouts">
          <PayoutHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Management;
