
import React from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Download } from 'lucide-react';

interface ImportActionsProps {
  onImportHours: (data: any[]) => void;
  onExportData: () => void;
}

const ImportActions: React.FC<ImportActionsProps> = ({
  onImportHours,
  onExportData
}) => {
  return (
    <div className="flex justify-end gap-2 my-4">
      <Button 
        variant="outline" 
        className="flex items-center gap-2"
        onClick={() => onImportHours([])}
      >
        <Upload size={16} />
        Import uren
      </Button>
      <Button 
        variant="outline" 
        className="flex items-center gap-2"
        onClick={onExportData}
      >
        <Download size={16} />
        Export data
      </Button>
    </div>
  );
};

export default ImportActions;
