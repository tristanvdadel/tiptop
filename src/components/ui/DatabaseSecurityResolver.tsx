
import React from 'react';
import { Database, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { supabase, clearSecurityCache } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from 'react-router-dom';

interface DatabaseSecurityResolverProps {
  onResolved?: () => void;
  variant?: 'default' | 'destructive' | 'inline';
  message?: string;
  fullReset?: boolean;
  redirectPath?: string;
}

const DatabaseSecurityResolver: React.FC<DatabaseSecurityResolverProps> = ({
  onResolved,
  variant = 'default',
  message,
  fullReset = false,
  redirectPath = '/login'
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const handleResolveSecurity = async () => {
    try {
      console.log("Starting database security resolution process...");
      
      // Clear all security-related cached data with improved logging
      const cleared = clearSecurityCache();
      console.log("Security cache cleared:", cleared);
      
      toast({
        title: "Database probleem opgelost",
        description: "De cache is gewist. Je wordt opnieuw ingelogd om het probleem op te lossen.",
        duration: 3000,
      });
      
      // Log out current user to clear session state with better error handling
      try {
        await supabase.auth.signOut();
        console.log("User signed out successfully");
      } catch (signOutError) {
        console.error("Error during sign out:", signOutError);
        // Continue with resolution despite sign out errors
      }
      
      if (fullReset) {
        // More aggressive cache clearing with specific keys
        console.log("Performing full reset of localStorage and sessionStorage");
        
        // Specifically target cache keys that might cause issues
        const problematicKeys = [
          'sb-auth-token',
          'sb-auth-token-cached',
          'last_team_id',
          'login_attempt_time'
        ];
        
        problematicKeys.forEach(key => {
          if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
            console.log(`Removed from localStorage: ${key}`);
          }
        });
        
        // Clear team-specific data more carefully
        const teamDataKeys = Object.keys(localStorage).filter(
          key => key.startsWith('team_data_') || key.includes('analytics_')
        );
        
        teamDataKeys.forEach(key => {
          localStorage.removeItem(key);
          console.log(`Removed team data key: ${key}`);
        });
        
        // Clear session storage more carefully
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('supabase') || key.includes('team_') || key.includes('auth_')) {
            sessionStorage.removeItem(key);
            console.log(`Removed from sessionStorage: ${key}`);
          }
        });
      }
      
      // Wait briefly to show the toast before redirecting
      setTimeout(() => {
        console.log(`Redirecting to ${redirectPath} to resolve security issues`);
        navigate(redirectPath, { 
          replace: true,
          state: { securityResolved: true }
        });
        
        // Call optional callback
        if (onResolved) {
          onResolved();
        }
      }, 1500); // Increased from 1000 to 1500 to ensure toast visibility
    } catch (error) {
      console.error("Error resolving security issue:", error);
      toast({
        title: "Fout bij oplossen",
        description: "Er is een fout opgetreden. Probeer de pagina te verversen.",
        variant: "destructive",
      });
    }
  };
  
  // Inline minimal variant
  if (variant === 'inline') {
    return (
      <div className="flex items-center space-x-2 text-sm">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <span className="text-amber-700">Database beveiligingsprobleem</span>
        <Button 
          onClick={handleResolveSecurity} 
          variant="outline" 
          size="sm" 
          className="h-7 px-2"
        >
          <Database className="h-3 w-3 mr-1" />
          Oplossen
        </Button>
      </div>
    );
  }

  return (
    <Alert variant={variant === 'destructive' ? "destructive" : "default"} className={variant === 'default' ? "border-amber-300 bg-amber-50" : ""}>
      <AlertTriangle className="h-5 w-5" />
      <AlertTitle>Database beveiligingsprobleem</AlertTitle>
      <AlertDescription className="space-y-4">
        <p>{message || "Er is een probleem met de database beveiliging gedetecteerd (recursie in RLS policy). Dit probleem kan het laden van gegevens blokkeren."}</p>
        <Button onClick={handleResolveSecurity} variant="outline" className="flex items-center gap-2">
          <Database className="h-4 w-4" />
          Beveiligingsprobleem Oplossen
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default DatabaseSecurityResolver;
