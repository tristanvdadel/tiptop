
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from 'lucide-react';

interface EmailVerificationSuccessProps {
  onBackToLogin: () => void;
}

const EmailVerificationSuccess = ({ onBackToLogin }: EmailVerificationSuccessProps) => {
  return (
    <Card className="w-full max-w-md bg-white/30 backdrop-blur-lg border-border/20 shadow-lg">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle className="h-12 w-12 text-green-500" />
        </div>
        <CardTitle>E-mail geverifieerd</CardTitle>
        <CardDescription>
          Je e-mail is succesvol geactiveerd. Je kunt nu inloggen.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button 
          onClick={onBackToLogin} 
          variant="goldGradient"
          className="w-full"
        >
          Terug naar inloggen
        </Button>
      </CardContent>
    </Card>
  );
};

export default EmailVerificationSuccess;
