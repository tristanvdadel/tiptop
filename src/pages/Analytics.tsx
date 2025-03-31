
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown } from 'lucide-react';

const Analytics = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>
      
      <Card className="border-tier-pro">
        <CardContent className="p-6 text-center">
          <Crown size={48} className="mx-auto mb-4 text-tier-pro" />
          <h2 className="text-xl font-medium mb-2">PRO-functie</h2>
          <p className="text-muted-foreground mb-6">
            Analytics is beschikbaar in de PRO-versie. Upgrade om toegang te krijgen tot geavanceerde statistieken, grafieken en exports.
          </p>
          <Button className="bg-tier-pro hover:bg-tier-pro/90 text-white">
            Upgraden naar PRO
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
