
import AccountSettings from "@/components/settings/AccountSettings";
import PeriodSettings from "@/components/settings/PeriodSettings";
import AppSettings from "@/components/settings/AppSettings";
import AboutSection from "@/components/settings/AboutSection";

const Settings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Instellingen</h1>
      </div>
      
      <AccountSettings />
      <PeriodSettings />
      <AppSettings />
      <AboutSection />
    </div>
  );
};

export default Settings;
