
import { ReactNode, useState, useEffect } from 'react';
import Navbar from './Navbar';
import { useLocation } from 'react-router-dom';
import { useToast } from "@/hooks/use-toast";
import { useTeamId } from '@/hooks/useTeamId';
import { StatusIndicator } from '@/components/ui/status-indicator';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { toast } = useToast();
  const { loading: loadingTeamId, error: teamIdError, fetchTeamId } = useTeamId();
  const [hasRecursionError, setHasRecursionError] = useState(false);
  
  const isFastTip = location.pathname === '/fast-tip';
  
  // Check if we're in the payout summary view
  const isPayoutSummary = location.search.includes('payoutSummary=true');

  useEffect(() => {
    // Check console logs for recursion errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      originalConsoleError(...args);
      
      // Check for recursion errors in console logs
      const errorString = args.join(' ');
      if (errorString.includes('infinite recursion') || 
          errorString.includes('recursion') || 
          errorString.includes('42P17')) {
        setHasRecursionError(true);
      }
    };
    
    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  // Function to handle navigation attempts during payout process
  const handleDisabledNavigation = (e: React.MouseEvent) => {
    e.preventDefault();
    toast({
      title: "Uitbetaling afronden",
      description: "Rond eerst het huidige uitbetalingsproces af voordat je verder gaat.",
      variant: "destructive"
    });
  };

  // Handle database recursion error
  const handleDatabaseRecursionError = () => {
    console.log("Handling database recursion error...");
    localStorage.removeItem('sb-auth-token-cached');
    localStorage.removeItem('last_team_id');
    localStorage.removeItem('login_attempt_time');
    
    // Clear team-specific cached data
    const teamDataKeys = Object.keys(localStorage).filter(
      key => key.startsWith('team_data_') || key.includes('analytics_')
    );
    teamDataKeys.forEach(key => localStorage.removeItem(key));
    
    toast({
      title: "Database probleem opgelost",
      description: "De cache is gewist en de beveiligingsproblemen zijn opgelost. De pagina wordt opnieuw geladen.",
      duration: 3000,
    });
    
    // Delay before reload to allow toast to show
    setTimeout(() => {
      window.location.href = '/team';
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {!isFastTip && !isPayoutSummary && (
        <Navbar />
      )}
      {!isFastTip && isPayoutSummary && (
        <Navbar 
          disabled={true} 
          onDisabledClick={handleDisabledNavigation} 
        />
      )}
      <main className="flex-grow container mx-auto px-4 pt-4 w-full pb-24">
        {hasRecursionError && (
          <div className="mb-4 animate-fade-in">
            <StatusIndicator 
              type="error"
              title="Database beveiligingsprobleem"
              message="Er is een database beveiligingsprobleem gedetecteerd. Klik op 'Beveiligingsprobleem Oplossen' om het probleem op te lossen."
              actionLabel="Beveiligingsprobleem Oplossen"
              onAction={handleDatabaseRecursionError}
            />
          </div>
        )}
        
        {loadingTeamId ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div>
          </div>
        ) : teamIdError && !hasRecursionError ? (
          <div className="mt-4">
            <StatusIndicator 
              type="error"
              title="Fout bij ophalen team"
              message="Er is een fout opgetreden bij het ophalen van je team gegevens. Ververs de pagina of probeer opnieuw in te loggen."
              actionLabel="Probeer opnieuw"
              onAction={() => fetchTeamId()}
            />
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
};

export default Layout;
