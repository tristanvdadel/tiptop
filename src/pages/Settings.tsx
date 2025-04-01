
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const Settings = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Instellingen</h1>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium">Abonnement</h3>
              <p className="text-sm text-muted-foreground">BASIC</p>
            </div>
            <Button variant="outline">Upgraden</Button>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium">E-mail</h3>
              <p className="text-sm text-muted-foreground">gebruiker@example.com</p>
            </div>
            <Button variant="outline">Wijzigen</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>App instellingen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <Label htmlFor="notifications">Notificaties</Label>
              <p className="text-sm text-muted-foreground">Ontvang meldingen over je fooien</p>
            </div>
            <Switch id="notifications" />
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <Label htmlFor="dark-mode">Donkere modus</Label>
              <p className="text-sm text-muted-foreground">Wissel tussen licht en donker thema</p>
            </div>
            <Switch id="dark-mode" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
