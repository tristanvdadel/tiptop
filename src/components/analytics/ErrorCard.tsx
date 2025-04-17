
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, AlertTriangle, Database, RefreshCw, Home, ArrowLeft, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface ErrorCardProps {
  type: 'error' | 'noTeam' | 'dbPolicy';
  message: string | null;
  onRetry?: () => void;
}

const ErrorCard: React.FC<ErrorCardProps> = ({ type, message, onRetry }) => {
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    try {
      localStorage.removeItem('sb-auth-token-cached');
      localStorage.removeItem('last_team_id');
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error("Error during logout:", error);
      // Force reload to the login page if signOut fails
      window.location.href = '/login';
    }
  };

  if (type === 'dbPolicy') {
    return (
      <div className="space-y-6">
        <Card className="border-amber-400">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <Database className="h-10 w-10 text-amber-500" />
              <div>
                <h3 className="text-lg font-medium">Database Synchronisatie Probleem</h3>
                <p className="text-muted-foreground mt-1">
                  {message || "Er is een tijdelijk probleem met de database synchronisatie. Probeer de pagina te verversen."}
                </p>
                <p className="text-sm text-muted-foreground mt-3">
                  Dit probleem kan optreden door een recursie in de beveiligingsregels van de database. 
                  De app zal automatisch proberen te herstellen, maar je kunt ook uitloggen en opnieuw inloggen om het te verhelpen.
                </p>
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
