
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, AlertTriangle, Database, RefreshCw, Home, ArrowLeft, LogOut, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ErrorCardProps {
  type: 'error' | 'noTeam' | 'dbPolicy';
  message: string | null;
  onRetry?: () => void;
}

const ErrorCard: React.FC<ErrorCardProps> = ({ type, message, onRetry }) => {
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    try {
      // Wis alle cache en sessiegegevens voor een schone start
      localStorage.removeItem('sb-auth-token-cached');
      localStorage.removeItem('last_team_id');
      localStorage.removeItem('analytics_last_refresh');
      
      // Specifieke teamcache wissen
      const teamIds = Object.keys(localStorage).filter(key => key.startsWith('team_data_refresh_'));
      teamIds.forEach(key => localStorage.removeItem(key));
      
      // Uitloggen bij Supabase
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error("Error during logout:", error);
      // Force reload to the login page if signOut fails
      window.location.href = '/login';
    }
  };

  const handleFixSecurityRecursion = () => {
    // Gericht de database security policy recursie oplossen
    localStorage.removeItem('sb-auth-token-cached');
    localStorage.removeItem('last_team_id');
    // Alle team-gerelateerde cache wissen
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('team_data_') || key.includes('analytics_')) {
        localStorage.removeItem(key);
      }
    });
    // Doorsturen naar login met recursie-parameter
    window.location.href = '/login?error=recursion';
  };

  if (type === 'dbPolicy') {
    return (
      <div className="space-y-6">
        <Card className="border-amber-400">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <Database className="h-10 w-10 text-amber-500" />
              <div>
                <h3 className="text-lg font-medium">Database Beveiligingsprobleem</h3>
                <p className="text-muted-foreground mt-1">
                  {message || "Er is een structureel probleem met de database beveiligingsregels (recursie in RLS policies)."}
                </p>
                <Alert className="mt-3 bg-amber-50 border-amber-200 text-left">
                  <AlertDescription className="text-sm">
                    Dit is geen tijdelijk probleem, maar een structurele fout in de beveiligingsregels van de database.
                    De fout ontstaat door een oneindige lus (recursie) in de Row Level Security policies.
                  </AlertDescription>
                </Alert>
              </div>
              <div className="flex flex-col md:flex-row gap-3">
                <Button variant="outline" onClick={() => navigate('/')}>
                  <Home className="h-4 w-4 mr-2" />
                  Terug naar Dashboard
                </Button>
                {onRetry && (
                  <Button onClick={onRetry} className="gap-2 bg-amber-500 hover:bg-amber-600">
                    <RefreshCw className="h-4 w-4" />
                    Gegevens Verversen
                  </Button>
                )}
                <Button variant="outline" onClick={handleFixSecurityRecursion} className="gap-2 border-amber-500 text-amber-700">
                  <FileText className="h-4 w-4" />
                  Beveiligingsprobleem Oplossen
                </Button>
                <Button variant="outline" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Uitloggen
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (type === 'error') {
    return (
      <div className="space-y-6">
        <Card className="border-destructive/50">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <div>
                <h3 className="text-lg font-medium">Fout bij laden</h3>
                <p className="text-muted-foreground mt-1">{message || "Er is een fout opgetreden bij het laden van de analysegegevens."}</p>
                <p className="text-sm text-muted-foreground mt-3">
                  Als dit probleem blijft optreden, probeer dan uit te loggen en opnieuw in te loggen.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                {onRetry && (
                  <Button onClick={onRetry} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Opnieuw proberen
                  </Button>
                )}
                <Button variant="outline" onClick={() => navigate('/')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Terug naar Dashboard
                </Button>
                <Button variant="outline" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Uitloggen
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-amber-300">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
            <div>
              <h3 className="text-lg font-medium">Geen team gevonden</h3>
              <p className="text-muted-foreground mt-1">{message || "Je moet eerst een team aanmaken of lid worden van een team voordat je analyses kunt bekijken."}</p>
              <p className="text-sm text-muted-foreground mt-3">
                Ga naar Teambeheer om een team aan te maken of lid te worden van een bestaand team.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => navigate('/management')} className="bg-amber-500 hover:bg-amber-600">
                Naar Teambeheer
              </Button>
              {onRetry && (
                <Button variant="outline" onClick={onRetry} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Gegevens Verversen
                </Button>
              )}
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Uitloggen
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorCard;
