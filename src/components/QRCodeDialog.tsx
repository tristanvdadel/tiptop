
import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Download, Copy, ScanFace, Share2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface QRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  note: string;
}

export const QRCodeDialog = ({ open, onOpenChange, amount: initialAmount, note: initialNote }: QRCodeDialogProps) => {
  const [amount, setAmount] = useState<number>(initialAmount || 0);
  const [note, setNote] = useState<string>(initialNote || '');
  const [qrPaymentUrl, setQrPaymentUrl] = useState<string>('');
  const { toast } = useToast();

  // Update the local state when props change
  useEffect(() => {
    if (open) {
      setAmount(initialAmount || 0);
      setNote(initialNote || '');
    }
  }, [open, initialAmount, initialNote]);

  // Generate payment URL for the QR code
  useEffect(() => {
    // Generate a proper payment URL
    // Example format: "https://tikkie.me/pay/Tikkie/xxxxxxx"
    // For this example, we'll create a custom URL that could be used with a payment app

    // In a real application, you would want to integrate with a payment service
    // This would generate a proper payment request URL
    // For now, we'll just create a demonstrative "intent" URL
    
    const encodedNote = encodeURIComponent(note || 'Fooi betaling');
    const amountInCents = Math.round(amount * 100);
    const paymentUrl = `toptip://pay?amount=${amountInCents}&description=${encodedNote}&recipient=Artiest`;
    
    setQrPaymentUrl(paymentUrl);
  }, [amount, note]);

  // Function to download the QR code as an image
  const handleDownload = () => {
    const canvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    // Convert the SVG to a canvas and then to an image
    const svgElement = document.getElementById('qr-code-svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width * 2;  // Increase size for better quality
      canvas.height = img.height * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Draw a white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw the QR code
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Create download link
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `fooi-qr-${amount}.png`;
      link.href = dataUrl;
      link.click();
    };
    img.src = svgUrl;
  };

  // Function to copy payment link to clipboard
  const handleCopyLink = () => {
    navigator.clipboard.writeText(qrPaymentUrl)
      .then(() => {
        toast({
          title: "Link gekopieerd",
          description: "De betaallink is naar je klembord gekopieerd.",
        });
      })
      .catch((error) => {
        toast({
          title: "Fout",
          description: "Kon de link niet kopiëren.",
          variant: "destructive",
        });
        console.error("Failed to copy link:", error);
      });
  };

  // Function to share the QR code (if supported)
  const handleShare = async () => {
    if (!navigator.share) {
      toast({
        title: "Niet ondersteund",
        description: "Delen wordt niet ondersteund op dit apparaat.",
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.share({
        title: "Fooi QR code",
        text: `Scan deze QR code om ${formatCurrency(amount)} fooi te betalen${note ? ` - ${note}` : ''}`,
        url: qrPaymentUrl,
      });
      toast({
        title: "Gedeeld",
        description: "De QR code is succesvol gedeeld.",
      });
    } catch (error) {
      toast({
        title: "Fout bij delen",
        description: "Er is een fout opgetreden bij het delen.",
        variant: "destructive",
      });
      console.error("Error sharing:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-yellow-50 border-yellow-200 shadow-amber-200/30 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-amber-900 flex items-center gap-2">
            <ScanFace className="h-5 w-5 text-amber-500" />
            Fooi QR Code
          </DialogTitle>
          <DialogDescription className="text-amber-700">
            Maak een QR code voor een fooi betaalverzoek. Ideaal voor straatmuzikanten en artiesten.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="amount" className="text-amber-900">Bedrag</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-800">€</span>
              <Input
                id="amount"
                type="number"
                value={amount === 0 ? '' : amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                min="0"
                step="0.50"
                className="pl-8 bg-white border-amber-200 focus:border-amber-400 focus:ring-amber-400"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="note" className="text-amber-900">Notitie (optioneel)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Bijvoorbeeld: Dank voor de muziek!"
              className="mt-1 bg-white border-amber-200 focus:border-amber-400 focus:ring-amber-400"
              rows={2}
            />
          </div>
          
          {/* QR Code Display */}
          <div className="flex justify-center py-4">
            <div className="bg-white p-4 rounded-lg shadow-md">
              <div id="qr-code-svg">
                <QRCodeSVG 
                  value={qrPaymentUrl} 
                  size={200}
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                  level="H"
                  includeMargin={true}
                />
              </div>
              <canvas id="qr-code-canvas" style={{ display: 'none' }} />
              <p className="text-center mt-2 text-amber-900 font-medium">
                {formatCurrency(amount)}
              </p>
              {note && (
                <p className="text-center text-sm text-amber-700 mt-1">
                  {note}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            className="flex-1 border-amber-300 text-amber-800 hover:bg-amber-100"
            onClick={handleCopyLink}
          >
            <Copy className="mr-2 h-4 w-4" />
            Kopieer Link
          </Button>
          <Button 
            variant="outline"
            className="flex-1 border-amber-300 text-amber-800 hover:bg-amber-100"
            onClick={handleDownload}
          >
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button 
            variant="goldGradient" 
            className="flex-1"
            onClick={handleShare}
          >
            <Share2 className="mr-2 h-4 w-4" />
            Delen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
