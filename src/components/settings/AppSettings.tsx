
import { Bell, Moon, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";

const AppSettings = () => {
  const { theme, toggleTheme } = useTheme();
  const [language, setLanguage] = useState("nl");

  return (
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
          <Switch id="darkMode" checked={theme === "dark"} onCheckedChange={toggleTheme} />
        </div>
        
        <Separator />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Globe className="h-4 w-4" />
            <Label htmlFor="language">Taal</Label>
          </div>
          <Select defaultValue={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecteer taal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nl">Nederlands</SelectItem>
              <SelectItem value="en">Engels</SelectItem>
              <SelectItem value="de">Duits</SelectItem>
              <SelectItem value="fr">Frans</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};

export default AppSettings;
