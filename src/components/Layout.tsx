
import { ReactNode } from 'react';
import Navbar from './Navbar';
import { useLocation } from 'react-router-dom';
import { useToast } from "@/hooks/use-toast";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { toast } = useToast();
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
      <main className="flex-grow container mx-auto px-4 pb-20 pt-4 w-full">
        {children}
      </main>
    </div>
  );
};

export default Layout;
