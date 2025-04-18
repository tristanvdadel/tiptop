
import React, { createContext, useContext, useState, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";

export interface ImportedHour {
  name: string;
  hours: number;
  date: string;
  exists: boolean;
}

interface ImportContextType {
  showImportDialog: boolean;
  importedHours: ImportedHour[];
  handleImportHours: () => void;
  handleFileImport: (file: File) => Promise<void>;
  handleConfirmImportedHours: (confirmedHours: ImportedHour[]) => void;
  closeImportDialog: () => void;
}

const ImportContext = createContext<ImportContextType | undefined>(undefined);

export const ImportProvider: React.FC<{ 
  children: React.ReactNode;
  addTeamMember: (name: string) => void;
  updateTeamMemberHours: (id: string, hours: number) => void;
  teamMembers: any[];
}> = ({ children, addTeamMember, updateTeamMemberHours, teamMembers }) => {
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importedHours, setImportedHours] = useState<ImportedHour[]>([]);
  const { toast } = useToast();

  const handleImportHours = useCallback(() => {
    console.log('Opening import hours dialog');
    setShowImportDialog(true);
  }, []);

  const closeImportDialog = useCallback(() => {
    console.log('Closing import hours dialog');
    setShowImportDialog(false);
  }, []);

  const handleFileImport = useCallback(async (file: File) => {
    try {
      console.log('Starting file import process:', file.name);
      setImportedHours([]); // Reset previous hours
      
      const { extractHoursFromExcel } = await import('@/services/excelService');
      console.log('Extracting hours from Excel file');
      const extractedData = await extractHoursFromExcel(file);
      
      if (extractedData.length === 0) {
        console.error("No usable data found in the file.");
        throw new Error("No usable data found in the file.");
      }
      
      console.log(`Extracted ${extractedData.length} hour entries from file`);
      
      const existingNames = new Set(teamMembers.map(m => m.name.toLowerCase()));
      const processedData = extractedData.map(item => ({
        ...item,
        exists: existingNames.has(item.name.toLowerCase())
      }));
      
      console.log('Processed extracted data:', processedData);
      setImportedHours(processedData);
      return Promise.resolve();
    } catch (error) {
      console.error("Error processing file:", error);
      return Promise.reject(error);
    }
  }, [teamMembers]);

  const handleConfirmImportedHours = useCallback((confirmedHours: ImportedHour[]) => {
    console.log(`Confirming import of ${confirmedHours.length} hour entries`);
    const { processImportedHours } = require('@/services/teamDataService');
    
    for (const hourData of confirmedHours) {
      console.log(`Processing hours for ${hourData.name}: ${hourData.hours} hours on ${hourData.date}`);
      processImportedHours(
        hourData, 
        teamMembers, 
        addTeamMember, 
        updateTeamMemberHours
      );
    }
    
    console.log('Import process completed');
    setShowImportDialog(false);
    
    toast({
      title: "Uren geïmporteerd",
      description: `${confirmedHours.length} uurregistraties succesvol geïmporteerd.`,
      duration: 3000,
    });
  }, [teamMembers, addTeamMember, updateTeamMemberHours, toast]);

  const value = {
    showImportDialog,
    importedHours,
    handleImportHours,
    handleFileImport,
    handleConfirmImportedHours,
    closeImportDialog,
  };

  return (
    <ImportContext.Provider value={value}>
      {children}
    </ImportContext.Provider>
  );
};

export const useImport = () => {
  const context = useContext(ImportContext);
  if (context === undefined) {
    throw new Error('useImport must be used within an ImportProvider');
  }
  return context;
};
