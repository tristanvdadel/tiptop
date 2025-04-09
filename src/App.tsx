
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import Layout from '@/components/Layout';
import NotFound from '@/pages/NotFound';
import Index from '@/pages/Index';
import Team from '@/pages/Team';
import Analytics from '@/pages/Analytics';
import Settings from '@/pages/Settings';
import Periods from '@/pages/Periods';
import FastTip from '@/pages/FastTip';
import MyOverview from '@/pages/MyOverview';
import Management from '@/pages/Management';
import Login from '@/pages/Login';
import Splash from '@/pages/Splash';
import { AppProvider } from '@/contexts/AppContext';
import { SyncProvider } from '@/contexts/AppContextSync';
import { Toaster } from '@/components/ui/toaster';
import AuthGuard from '@/components/AuthGuard';

import './App.css';

function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <SyncProvider>
          <Router>
            <Routes>
              <Route path="/splash" element={<Splash />} />
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<AuthGuard><Layout><Outlet /></Layout></AuthGuard>}>
                <Route index element={<Index />} />
                <Route path="team" element={<Team />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="settings" element={<Settings />} />
                <Route path="periods" element={<Periods />} />
                <Route path="fast-tip" element={<FastTip />} />
                <Route path="my-overview" element={<MyOverview />} />
                <Route path="management" element={<Management />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Router>
          <Toaster />
        </SyncProvider>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
