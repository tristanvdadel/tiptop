
import { ReactNode, useState, useEffect, useCallback } from 'react';
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
  const { hasError, errorMessage, handleSecurityRecursionIssue } = useAppData();
  
  const isFastTip = location.pathname === '/fast-tip';
  
  // Check if we're in the payout summary view
  const isPayoutSummary = location.search.includes('payoutSummary=true');
  
  // Check for recursion errors in error message
  const hasRecursionError = errorMessage?.includes('recursie') || 
                           errorMessage?.includes('beveiligingsprobleem');

  // Function to handle navigation attempts during payout process
  const handleDisabledNavigation = (e: React.MouseEvent) => {
    e.preventDefault();
    toast({
      title: "Uitbetaling afronden",
      description: "Rond eerst het huidige uitbetalingsproces af voordat je verder gaat.",
      variant: "destructive"
    });
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
              onAction={handleSecurityRecursionIssue}
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
