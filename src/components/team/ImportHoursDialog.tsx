
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Upload, FileUp, Check, FileX } from "lucide-react";
import * as XLSX from 'xlsx';
import ImportedHoursReview from './ImportedHoursReview';
import { useApp } from '@/contexts/AppContext';

interface ImportHoursDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File) => void;
}

interface ExtractedHour {
  name: string;
  hours: number;
  date: string;
  exists: boolean;
}

const ImportHoursDialog: React.FC<ImportHoursDialogProps> = ({
  isOpen,
  onClose,
  onImport
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [extractedHours, setExtractedHours] = useState<ExtractedHour[]>([]);
  const [showReview, setShowReview] = useState(false);
  const { toast } = useToast();
  const { teamMembers } = useApp();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (uploadedFile: File) => {
    // Currently supporting CSV and Excel files
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!validTypes.includes(uploadedFile.type)) {
      toast({
        title: "Ongeldig bestandstype",
        description: "Upload een CSV of Excel bestand.",
        variant: "destructive"
      });
      return;
    }
    setFile(uploadedFile);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const processExcelFile = async () => {
    if (!file) return;
    
    setIsUploading(true);
    try {
      const fileData = await file.arrayBuffer();
      const wb = XLSX.read(fileData);
      const firstSheet = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<any>(firstSheet);

      // Try to detect name and hours columns
      const headers = Object.keys(data[0] || {});
      const nameColumnCandidates = headers.filter(h => 
        /naam|name|persoon|medewerker|employee/i.test(h)
      );
      const hoursColumnCandidates = headers.filter(h => 
        /uren|uur|hours|hour/i.test(h)
      );
      
      const nameColumn = nameColumnCandidates[0] || headers[0];
      const hoursColumn = hoursColumnCandidates[0] || headers[1];

      // Extract hours data
      const currentDate = new Date().toISOString().split('T')[0];
      const existingNames = new Set(teamMembers.map(m => m.name.toLowerCase()));
      
      const extractedData = data
        .filter(row => row[nameColumn] && row[hoursColumn]) // Only rows with name and hours
        .map(row => {
          const name = String(row[nameColumn]).trim();
          const hours = parseFloat(String(row[hoursColumn]).replace(',', '.'));
          return {
            name,
            hours: isNaN(hours) ? 0 : hours,
            date: currentDate,
            exists: existingNames.has(name.toLowerCase())
          };
        });

      if (extractedData.length === 0) {
        toast({
          title: "Geen data gevonden",
          description: "Kon geen bruikbare data vinden in het bestand. Controleer of er namen en uren in staan.",
          variant: "destructive"
        });
        setIsUploading(false);
        return;
      }

      setExtractedHours(extractedData);
      setShowReview(true);
    } catch (error) {
      console.error("Error processing Excel file:", error);
      toast({
        title: "Fout bij verwerken",
        description: "Er is een fout opgetreden bij het verwerken van het bestand.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmHours = (confirmedHours: ExtractedHour[]) => {
    setShowReview(false);
    // Call onImport to allow parent component to handle the imported hours
    onImport(file!);
    // Reset state
    setFile(null);
    setExtractedHours([]);
    onClose();
  };

  const removeFile = () => {
    setFile(null);
  };

  if (showReview) {
    return (
      <ImportedHoursReview
        isOpen={isOpen}
        onClose={() => setShowReview(false)}
        importedHours={extractedHours}
        onConfirm={handleConfirmHours}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Uren importeren</DialogTitle>
          <DialogDescription>
            Upload een CSV of Excel bestand met uren registratie.
          </DialogDescription>
        </DialogHeader>

        {!file ? (
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center ${
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center gap-4">
              <Upload className="h-10 w-10 text-muted-foreground/70" />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Sleep een bestand hierheen of klik om te bladeren
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Ondersteunde formaten: CSV, Excel
                </p>
              </div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  accept=".csv,.xls,.xlsx"
                  onChange={handleFileChange}
                />
                <Button variant="outline" type="button" size="sm">
                  Bestand selecteren
                </Button>
              </label>
            </div>
          </div>
        ) : (
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileUp className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(0)} KB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeFile}
                className="h-8 w-8 p-0"
              >
                <FileX className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="sm:justify-between items-center">
          <div className="flex items-center text-xs text-amber-600">
            <AlertCircle className="h-4 w-4 mr-1" />
            Zorg dat de namen overeenkomen met je teamleden
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isUploading}>
              Annuleren
            </Button>
            <Button 
              onClick={processExcelFile} 
              disabled={!file || isUploading}
              className="gap-2"
            >
              {isUploading ? (
                <>Verwerken...</>
              ) : (
                <>
                  <Check className="h-4 w-4" /> 
                  Verwerken
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportHoursDialog;
