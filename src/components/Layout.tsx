
import { ReactNode, useCallback, useState, useEffect } from 'react';
import Navbar from './Navbar';
import { useLocation } from 'react-router-dom';
import { useToast } from "@/hooks/use-toast";
import { useTeamId } from '@/hooks/useTeamId';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { useAppData } from '@/contexts/AppDataContext';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { toast } = useToast();
  const { loading: loadingTeamId, error: teamIdError, fetchTeamId } = useTeamId();
  const { 
    hasError, 
    errorMessage, 
    handleSecurityRecursionIssue, 
    isLoading: dataLoading,
    connectionState 
  } = useAppData();
  
  const [showConnectionStatus, setShowConnectionStatus] = useState(false);
  
  // Only show connection status after persistent disconnection
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (connectionState === 'disconnected') {
      // Wait before showing disconnected state to prevent flickering
      timeoutId = setTimeout(() => {
        setShowConnectionStatus(true);
      }, 3000);
    } else {
      setShowConnectionStatus(false);
    }
    
    return () => clearTimeout(timeoutId);
  }, [connectionState]);
  
  const isFastTip = location.pathname === '/fast-tip';
  
  // Check if we're in the payout summary view
  const isPayoutSummary = location.search.includes('payoutSummary=true');
  
  // Detect recursion errors in error messages with improved detection
  const hasRecursionError = errorMessage?.toLowerCase().includes('recursie') || 
                            errorMessage?.toLowerCase().includes('beveiligingsprobleem') ||
                            errorMessage?.toLowerCase().includes('recursion') ||
                            (teamIdError && teamIdError.message?.toLowerCase().includes('recursion'));

  // Function to handle navigation attempts during payout process
  const handleDisabledNavigation = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    toast({
      title: "Uitbetaling afronden",
      description: "Rond eerst het huidige uitbetalingsproces af voordat je verder gaat.",
      variant: "destructive"
    });
  }, [toast]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-white to-amber-50/30">
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
        {/* Database recursion error handler */}
        {hasRecursionError && (
          <div className="mb-4 animate-fade-in">
            <StatusIndicator 
              type="error"
              title="Database beveiligingsprobleem"
              message="Er is een database beveiligingsprobleem gedetecteerd. Klik op 'Beveiligingsprobleem Oplossen' om het probleem op te lossen."
              actionLabel="Beveiligingsprobleem Oplossen"
              onAction={handleSecurityRecursionIssue}
            />
          </div>
        )}
        
        {/* Realtime connection status indicator - only show after persistent disconnection */}
        {connectionState === 'disconnected' && showConnectionStatus && (
          <div className="mb-4 animate-fade-in">
            <StatusIndicator 
              type="offline"
              title="Geen verbinding"
              message="Je bent offline. De pagina wordt automatisch bijgewerkt wanneer je weer online bent."
              minimal={true}
            />
          </div>
        )}
        
        {/* Loading state */}
        {(loadingTeamId || dataLoading) && !(teamIdError && !hasRecursionError) ? (
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
