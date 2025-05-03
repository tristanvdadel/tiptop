
import React from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { useTeam } from '@/contexts/TeamContext';
import ImportHoursDialog from '@/components/team/ImportHoursDialog';

const ImportActions: React.FC = () => {
  const { 
    showImportDialog, 
    importedHours, 
    handleImportHours, 
    handleFileImport, 
    handleConfirmImportedHours, 
    closeImportDialog 
  } = useTeam();

  return (
    <>
      <div className="flex justify-end my-4">
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={handleImportHours}
        >
          <Upload size={16} />
          Import hours
        </Button>
      </div>
      
      <ImportHoursDialog 
        isOpen={showImportDialog}
        onClose={closeImportDialog}
        onImport={handleFileImport}
        onConfirm={handleConfirmImportedHours}
        importedHours={importedHours}
      />
    </>
  );
};

export default ImportActions;
