
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// Define types
export type TeamMember = {
  id: string;
  name: string;
  hours: number;
  tipAmount?: number;
};

export type TipEntry = {
  id: string;
  amount: number;
  date: string;
  note?: string;
  addedBy: string;
};

export type Period = {
  id: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  tips: TipEntry[];
  totalTip?: number;
};

type AppContextType = {
  // State
  currentPeriod: Period | null;
  periods: Period[];
  teamMembers: TeamMember[];
  tier: 'free' | 'team' | 'pro';
  
  // Actions
  addTip: (amount: number, note?: string) => void;
  addTeamMember: (name: string) => void;
  removeTeamMember: (id: string) => void;
  updateTeamMemberHours: (id: string, hours: number) => void;
  startNewPeriod: () => void;
  endCurrentPeriod: () => void;
  calculateTipDistribution: () => TeamMember[];
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [tier] = useState<'free' | 'team' | 'pro'>('free');

  // Load data from localStorage on mount
  useEffect(() => {
    const storedPeriods = localStorage.getItem('periods');
    const storedTeamMembers = localStorage.getItem('teamMembers');
    
    if (storedPeriods) {
      const parsedPeriods = JSON.parse(storedPeriods);
      setPeriods(parsedPeriods);
      
      // Set current period if there's an active one
      const active = parsedPeriods.find((p: Period) => p.isActive);
      if (active) {
        setCurrentPeriod(active);
      }
    }
    
    if (storedTeamMembers) {
      setTeamMembers(JSON.parse(storedTeamMembers));
    }
  }, []);

  // Save data to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('periods', JSON.stringify(periods));
  }, [periods]);

  useEffect(() => {
    localStorage.setItem('teamMembers', JSON.stringify(teamMembers));
  }, [teamMembers]);

  // Generate a unique ID
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  // Add a new tip entry
  const addTip = (amount: number, note?: string) => {
    if (!currentPeriod) {
      startNewPeriod();
    }
    
    const newTip: TipEntry = {
      id: generateId(),
      amount,
      date: new Date().toISOString(),
      note,
      addedBy: 'current-user', // This would come from auth in a real app
    };
    
    const updatedPeriod = {
      ...currentPeriod!,
      tips: [...currentPeriod!.tips, newTip],
    };
    
    setCurrentPeriod(updatedPeriod);
    
    // Update in the periods array
    setPeriods(prev => 
      prev.map(p => p.id === updatedPeriod.id ? updatedPeriod : p)
    );
  };

  // Add a new team member
  const addTeamMember = (name: string) => {
    // Check if we're at the limit for free tier (5 members)
    if (tier === 'free' && teamMembers.length >= 5) {
      alert('Je hebt het maximale aantal teamleden bereikt voor de Free tier.');
      return;
    }
    
    const newMember: TeamMember = {
      id: generateId(),
      name,
      hours: 0,
    };
    
    setTeamMembers(prev => [...prev, newMember]);
  };

  // Remove a team member
  const removeTeamMember = (id: string) => {
    setTeamMembers(prev => prev.filter(member => member.id !== id));
  };

  // Update a team member's hours
  const updateTeamMemberHours = (id: string, hours: number) => {
    setTeamMembers(prev => 
      prev.map(member => 
        member.id === id ? { ...member, hours } : member
      )
    );
  };

  // Start a new period
  const startNewPeriod = () => {
    // End the current period if there is one
    if (currentPeriod && currentPeriod.isActive) {
      endCurrentPeriod();
    }
    
    const newPeriod: Period = {
      id: generateId(),
      startDate: new Date().toISOString(),
      isActive: true,
      tips: [],
    };
    
    setCurrentPeriod(newPeriod);
    setPeriods(prev => [...prev, newPeriod]);
  };

  // End the current period
  const endCurrentPeriod = () => {
    if (!currentPeriod) return;
    
    const endedPeriod = {
      ...currentPeriod,
      endDate: new Date().toISOString(),
      isActive: false,
    };
    
    setCurrentPeriod(null);
    
    // Update in the periods array
    setPeriods(prev => 
      prev.map(p => p.id === endedPeriod.id ? endedPeriod : p)
    );
  };

  // Calculate tip distribution based on hours worked
  const calculateTipDistribution = () => {
    if (!currentPeriod || !currentPeriod.tips.length || !teamMembers.length) {
      return [];
    }
    
    const totalTip = currentPeriod.tips.reduce((sum, tip) => sum + tip.amount, 0);
    const totalHours = teamMembers.reduce((sum, member) => sum + member.hours, 0);
    
    // If no hours recorded, can't distribute
    if (totalHours === 0) {
      return [];
    }
    
    return teamMembers.map(member => {
      const tipShare = totalHours > 0 
        ? (member.hours / totalHours) * totalTip 
        : 0;
        
      return {
        ...member,
        tipAmount: parseFloat(tipShare.toFixed(2)),
      };
    });
  };

  return (
    <AppContext.Provider
      value={{
        currentPeriod,
        periods,
        teamMembers,
        tier,
        addTip,
        addTeamMember,
        removeTeamMember,
        updateTeamMemberHours,
        startNewPeriod,
        endCurrentPeriod,
        calculateTipDistribution,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
