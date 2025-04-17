
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface ErrorCardProps {
  error: string;
}

const ErrorCard: React.FC<ErrorCardProps> = ({ error }) => {
  return (
    <Card className="border-destructive/50">
      <CardContent className="p-6">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <div>
            <h3 className="text-lg font-medium">Fout bij laden</h3>
            <p className="text-muted-foreground mt-1">{error}</p>
            <p className="text-sm text-muted-foreground mt-3">
              Als dit probleem blijft optreden, probeer dan uit te loggen en opnieuw in te loggen.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ErrorCard;
