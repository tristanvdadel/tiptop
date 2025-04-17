
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, AlertTriangle, Database, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface ErrorCardProps {
  type: 'error' | 'noTeam' | 'dbPolicy';
  message: string | null;
  onRetry?: () => void;
}

const ErrorCard: React.FC<ErrorCardProps> = ({ type, message, onRetry }) => {
  const navigate = useNavigate();

  if (type === 'dbPolicy') {
    return (
      <div className="space-y-6">
        <Card className="border-amber-400">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <Database className="h-10 w-10 text-amber-500" />
              <div>
                <h3 className="text-lg font-medium">Database Configuratie Probleem</h3>
                <p className="text-muted-foreground mt-1">
                  {message || "Er is een tijdelijk probleem met de database rechten. Probeer het later opnieuw."}
                </p>
                <p className="text-sm text-muted-foreground mt-3">
                  We werken aan een oplossing. Probeer de pagina na een paar minuten te verversen.
                </p>
              </div>
              <div className="flex flex-col md:flex-row gap-3">
                <Button variant="outline" onClick={() => navigate('/')}>
                  Terug naar Dashboard
                </Button>
                {onRetry && (
                  <Button onClick={onRetry} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Opnieuw proberen
                  </Button>
                )}
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
              </div>
              <Button onClick={onRetry}>
                Opnieuw proberen
              </Button>
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
              <p className="text-muted-foreground mt-1">Je moet eerst een team aanmaken of lid worden van een team voordat je analyses kunt bekijken.</p>
            </div>
            <Button onClick={() => navigate('/management')}>
              Naar Teambeheer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorCard;
