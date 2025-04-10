
import { Info, HelpCircle, BookOpen, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const AboutSection = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Over TipTop</CardTitle>
        <CardDescription>Hoe werkt onze app?</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <Info className="h-6 w-6 text-amber-500 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-lg">Fooi bijhouden</h3>
              <p className="text-muted-foreground">
                Voeg eenvoudig fooi toe per periode. Kies tussen dagelijkse, wekelijkse of maandelijkse periodes.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <HelpCircle className="h-6 w-6 text-blue-500 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-lg">Automatische periode-afsluiting</h3>
              <p className="text-muted-foreground">
                Stel in wanneer periodes automatisch worden afgesloten. Bepaal zelf het tijdstip en of deze worden uitgelijnd met de kalender.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <BookOpen className="h-6 w-6 text-green-500 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-lg">Team samenwerking</h3>
              <p className="text-muted-foreground">
                Maak onderdeel uit van een team, deel fooien en hou samen de administratie bij.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <FileText className="h-6 w-6 text-purple-500 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-lg">Transparante rapportage</h3>
              <p className="text-muted-foreground">
                Bekijk gedetailleerde analytics over je fooien, periode-overzichten en teamstatistieken.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AboutSection;
