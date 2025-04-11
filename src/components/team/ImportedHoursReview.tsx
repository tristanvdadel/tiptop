
import React, { useState } from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface ImportedHour {
  name: string;
  hours: number;
  date: string;
  exists: boolean; // Whether the team member already exists
}

interface ImportedHoursReviewProps {
  isOpen: boolean;
  onClose: () => void;
  importedHours: ImportedHour[];
  onConfirm: (hours: ImportedHour[]) => void;
}

const ImportedHoursReview: React.FC<ImportedHoursReviewProps> = ({
  isOpen,
  onClose,
  importedHours,
  onConfirm
}) => {
  const [hours, setHours] = useState<ImportedHour[]>(importedHours);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleHoursChange = (index: number, newHours: number) => {
    const updated = [...hours];
    updated[index].hours = newHours;
    setHours(updated);
  };

  const handleNameChange = (index: number, newName: string) => {
    const updated = [...hours];
    updated[index].name = newName;
    setHours(updated);
  };

  const handleConfirm = () => {
    setIsProcessing(true);
    
    // This will later apply the changes to team members
    setTimeout(() => {
      onConfirm(hours);
      setIsProcessing(false);
      onClose();
      
      toast({
        title: "Uren verwerkt",
        description: "De geïmporteerde uren zijn verwerkt en toegevoegd aan de teamleden.",
      });
    }, 1000);
  };

  const newMembers = hours.filter(h => !h.exists).length;
  const existingMembers = hours.filter(h => h.exists).length;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Controleer geïmporteerde uren</SheetTitle>
          <SheetDescription>
            Controleer en bewerk de gegevens voordat je deze toevoegt aan je teamleden.
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex gap-4 my-4 text-sm">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>{existingMembers} bestaande leden</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span>{newMembers} nieuwe leden</span>
          </div>
        </div>

        <div className="my-4 max-h-[60vh] overflow-y-auto pr-4 -mr-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Naam</TableHead>
                <TableHead>Uren</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead className="w-[60px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hours.map((hour, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <input
                      type="text"
                      value={hour.name}
                      onChange={(e) => handleNameChange(index, e.target.value)}
                      className="w-full border-0 bg-transparent focus:ring-0 p-0 focus:outline-none"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      value={hour.hours}
                      onChange={(e) => handleHoursChange(index, parseFloat(e.target.value) || 0)}
                      className="w-16 border-0 bg-transparent focus:ring-0 p-0 focus:outline-none"
                      min="0"
                      step="0.5"
                    />
                  </TableCell>
                  <TableCell>{hour.date}</TableCell>
                  <TableCell>
                    {hour.exists ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <SheetFooter>
          <div className="flex w-full justify-between mt-4">
            <Button variant="outline" onClick={onClose}>
              Annuleren
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={isProcessing}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {isProcessing ? "Verwerken..." : "Uren toevoegen"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default ImportedHoursReview;
