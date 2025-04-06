
import { ReactNode } from 'react';
import Navbar from './Navbar';
import { useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const isFastTip = location.pathname === '/fast-tip';
  
  // Check if we're in the payout summary view
  const isPayoutSummary = location.search.includes('payoutSummary=true');

  return (
    <div className="min-h-screen flex flex-col">
      {!isFastTip && !isPayoutSummary && <Navbar />}
      <main className="flex-grow container mx-auto px-4 pb-20 pt-4 w-full">
        {children}
      </main>
    </div>
  );
};

export default Layout;
