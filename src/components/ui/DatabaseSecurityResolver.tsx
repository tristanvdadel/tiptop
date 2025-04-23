
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
}

const DatabaseSecurityResolver: React.FC<DatabaseSecurityResolverProps> = ({
  onResolved,
  variant = 'default',
  message,
  fullReset = false
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const handleResolveSecurity = async () => {
    try {
      // Clear all security-related cached data
      clearSecurityCache();
      
      toast({
        title: "Database probleem opgelost",
        description: "De cache is gewist. Je wordt opnieuw ingelogd om het probleem op te lossen.",
        duration: 3000,
      });
      
      // Log out current user to clear session state
      await supabase.auth.signOut();
      
      if (fullReset) {
        // More aggressive cache clearing
        localStorage.clear();
        sessionStorage.clear();
      }
      
      // Wait briefly to show the toast before redirecting
      setTimeout(() => {
        navigate('/login', { 
          replace: true,
          state: { securityResolved: true }
        });
        
        // Call optional callback
        if (onResolved) {
          onResolved();
        }
      }, 1000);
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
