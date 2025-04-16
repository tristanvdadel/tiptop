
import { ReactNode } from 'react';
import Navbar from './Navbar';
import { useLocation } from 'react-router-dom';
import { useToast } from "@/hooks/use-toast";
import { useTeamId } from '@/hooks/useTeamId';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { toast } = useToast();
  const { loading: loadingTeamId } = useTeamId();
  
  const isFastTip = location.pathname === '/fast-tip';
  
  // Check if we're in the payout summary view
  const isPayoutSummary = location.search.includes('payoutSummary=true');

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
        {loadingTeamId ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
};

export default Layout;
