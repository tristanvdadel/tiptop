
import React from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { useTeam } from '@/contexts/TeamContext';
import ImportHoursDialog from '@/components/team/ImportHoursDialog';
import { useToast } from "@/hooks/use-toast";

const ImportActions: React.FC = () => {
  const { 
    showImportDialog, 
    importedHours, 
    handleImportHours, 
    handleFileImport, 
    handleConfirmImportedHours, 
    closeImportDialog 
  } = useTeam();
  
  const { toast } = useToast();

  const handleImport = async (file: File) => {
    try {
      console.log("ImportActions: Starting file import process");
      await handleFileImport(file);
      console.log("ImportActions: File processed successfully");
      return Promise.resolve();
    } catch (error) {
      console.error("ImportActions: Error during import:", error);
      toast({
        title: "Import fout",
        description: "Er is een fout opgetreden bij het importeren van het bestand.",
        variant: "destructive"
      });
      return Promise.reject(error);
    }
  };

  return (
    <>
      <div className="flex justify-end my-4">
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={handleImportHours}
        >
          <Upload size={16} />
          Import uren
        </Button>
      </div>
      
      <ImportHoursDialog 
        isOpen={showImportDialog}
        onClose={closeImportDialog}
        onImport={handleImport}
        onConfirm={handleConfirmImportedHours}
        importedHours={importedHours}
      />
    </>
  );
};

export default ImportActions;
