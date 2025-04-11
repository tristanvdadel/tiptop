
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const SubscriptionSection = () => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <CreditCard className="h-4 w-4 text-muted-foreground" />
        <span>Abonnement</span>
      </div>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            Beheren
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Abonnement beheren</DialogTitle>
            <DialogDescription>
              Bekijk en wijzig je huidige abonnement.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <h4 className="font-medium">Huidige abonnement</h4>
              <p className="text-sm text-muted-foreground">TipTop - €25/maand</p>
              <p className="text-xs text-muted-foreground">Eerste maand is gratis</p>
              <p className="text-xs text-muted-foreground">Volgende factuurdatum: 15 juni 2024</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline">Annuleren</Button>
            <Button>Abonnement wijzigen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionSection;
