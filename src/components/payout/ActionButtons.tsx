
import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, Home, Copy, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ActionButtonsProps {
  isEditing: boolean;
  balancesUpdated: boolean;
  saveChanges: () => void;
  handleCopyToClipboard: () => void;
  downloadCSV: () => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  isEditing,
  balancesUpdated,
  saveChanges,
  handleCopyToClipboard,
  downloadCSV
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex justify-end space-x-2 pt-4">
      {!balancesUpdated && isEditing ? (
        <Button variant="default" className="bg-green-500 hover:bg-green-600" onClick={saveChanges}>
          <Save className="h-4 w-4 mr-2" />
          Uitbetaling afronden
        </Button>
      ) : balancesUpdated ? (
        <Button variant="goldGradient" onClick={() => navigate('/')}>
          <Home className="h-4 w-4 mr-2" />
          Naar startpagina
        </Button>
      ) : (
        <>
          <Button variant="outline" onClick={handleCopyToClipboard}>
            <Copy className="h-4 w-4 mr-2" />
            Kopiëren
          </Button>
          <Button variant="outline" onClick={downloadCSV}>
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
        </>
      )}
    </div>
  );
};

export default ActionButtons;
