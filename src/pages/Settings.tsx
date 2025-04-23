
import { LoadingState } from "@/components/ui/loading-state";
import AccountSettings from "@/components/settings/AccountSettings";
import PeriodSettings from "@/components/settings/PeriodSettings";
import AppSettings from "@/components/settings/AppSettings";
import AboutSection from "@/components/settings/AboutSection";
import { useApp } from "@/contexts/AppContext";
import { useState, useEffect } from "react";

const Settings = () => {
  const { isLoading, error } = useApp();
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    // Set data ready after initial loading is complete
    if (!isLoading) {
      setDataReady(true);
    }
  }, [isLoading]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Instellingen</h1>
      </div>
      
      <LoadingState isLoading={!dataReady} minDuration={500} instant={!isLoading}>
        <AccountSettings />
        <PeriodSettings />
        <AppSettings />
        <AboutSection />
      </LoadingState>
      
      {error && (
        <div className="p-4 mt-4 border border-red-300 bg-red-50 text-red-800 rounded-md">
          <p className="font-medium">Er is een fout opgetreden bij het laden van de instellingen.</p>
          <p className="text-sm">{error?.message || 'Onbekende fout'}</p>
        </div>
      )}
    </div>
  );
};

export default Settings;
