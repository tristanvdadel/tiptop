
import { ReactNode } from 'react';
import Navbar from './Navbar';
import { useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const isFastTip = location.pathname === '/fast-tip';

  return (
    <div className="min-h-screen flex flex-col">
      {!isFastTip && <Navbar />}
      <main className="flex-grow container mx-auto px-4 pb-16 pt-4 w-full">
        {children}
      </main>
    </div>
  );
};

export default Layout;

