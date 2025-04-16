
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { TeamIdProvider } from "@/hooks/useTeamId";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import FastTip from "./pages/FastTip";
import Periods from "./pages/Periods";
import Team from "./pages/Team";
import MyOverview from "./pages/MyOverview";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Splash from "./pages/Splash";
import Management from "./pages/Management";
import AuthGuard from "./components/AuthGuard";

// Create the query client with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000, // 30 seconds stale time to reduce refetches
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TeamIdProvider>
          <AppProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  {/* Public routes */}
                  <Route path="/splash" element={<Splash />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/fast-tip" element={<FastTip />} />
                  
                  {/* Protected routes */}
                  <Route path="/" element={<AuthGuard><Layout><Index /></Layout></AuthGuard>} />
                  <Route path="/periods" element={<AuthGuard><Layout><Periods /></Layout></AuthGuard>} />
                  <Route path="/team" element={<AuthGuard><Layout><Team /></Layout></AuthGuard>} />
                  <Route path="/management" element={<AuthGuard><Layout><Management /></Layout></AuthGuard>} />
                  <Route path="/my-overview" element={<AuthGuard><Layout><MyOverview /></Layout></AuthGuard>} />
                  <Route path="/analytics" element={<AuthGuard><Layout><Analytics /></Layout></AuthGuard>} />
                  <Route path="/settings" element={<AuthGuard><Layout><Settings /></Layout></AuthGuard>} />
                  <Route path="*" element={<AuthGuard><Layout><NotFound /></Layout></AuthGuard>} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </AppProvider>
        </TeamIdProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
