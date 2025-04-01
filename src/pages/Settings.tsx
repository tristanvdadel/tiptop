
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LogOut, Bell, Moon, User, Edit } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

const Settings = () => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Instellingen</h1>
        <p className="text-muted-foreground">Beheer je account en app voorkeuren</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Beheer je account instellingen</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <User className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Gebruiker</p>
                <p className="text-sm text-muted-foreground">gebruiker@example.com</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <Edit className="h-3.5 w-3.5" />
              <span>Bewerken</span>
            </Button>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <LogOut className="h-4 w-4 text-muted-foreground" />
              <span>Uitloggen</span>
            </div>
            <Button variant="destructive" size="sm">
              Uitloggen
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>App instellingen</CardTitle>
          <CardDescription>Pas je app-ervaring aan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4" />
              <Label htmlFor="notifications">Notificaties</Label>
            </div>
            <Switch id="notifications" defaultChecked />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Moon className="h-4 w-4" />
              <Label htmlFor="darkMode">Donkere modus</Label>
            </div>
            <Switch 
              id="darkMode" 
              checked={theme === "dark"}
              onCheckedChange={toggleTheme}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
