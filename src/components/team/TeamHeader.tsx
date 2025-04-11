
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Users } from 'lucide-react';
import { useTeam } from '@/contexts/TeamContext';

const TeamHeader: React.FC = () => {
  const { loading, handleRefresh } = useTeam();

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Users size={20} />
        <h1 className="text-xl font-bold">Team members</h1>
      </div>
      
      <Button 
        variant="outline" 
        size="sm"
        onClick={handleRefresh}
        disabled={loading}
      >
        <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Loading...' : 'Refresh'}
      </Button>
    </div>
  );
};

export default TeamHeader;
