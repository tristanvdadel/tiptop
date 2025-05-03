
import { useState, useEffect } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useLocation, Navigate } from "react-router-dom";
import { Coins } from 'lucide-react';

// Import refactored components
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import PasswordResetDialog from '@/components/auth/PasswordResetDialog';
import EmailVerificationSuccess from '@/components/auth/EmailVerificationSuccess';

const Login = () => {
  const [activeTab, setActiveTab] = useState("login");
  const [emailVerificationStatus, setEmailVerificationStatus] = useState<'pending' | 'verified' | null>(null);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'register') {
      setActiveTab('register');
    }
  }, [location]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailVerified = params.get('emailVerified');
    
    if (emailVerified === 'true') {
      setEmailVerificationStatus('verified');
    }
  }, [location]);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: number;
    
    const fastSessionCheck = async () => {
      try {
        console.log("Performing fast session check");
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error in session check:', error);
          if (isMounted) {
            setSessionChecked(true);
          }
          return;
        }
        
        if (data.session && isMounted) {
          console.log("User already logged in, redirecting immediately");
          setAuthenticated(true);
        }
        
        if (isMounted) {
          setSessionChecked(true);
        }
      } catch (error) {
        console.error('Unexpected error in fast session check:', error);
        if (isMounted) {
          setSessionChecked(true);
        }
      }
    };
    
    // Reduce timeout from 1500ms to 1000ms for faster response
    timeoutId = window.setTimeout(() => {
      if (isMounted && !sessionChecked) {
        console.log("Session check timeout - forcing completion");
        setSessionChecked(true);
      }
    }, 1000);
    
    fastSessionCheck();
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  if (authenticated) {
    return <Navigate to="/" replace />;
  }

  if (emailVerificationStatus === 'verified') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-100/30 via-amber-50/40 to-amber-100/30 p-4 relative">
        <EmailVerificationSuccess onBackToLogin={() => setEmailVerificationStatus(null)} />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-100/30 via-amber-50/40 to-amber-100/30 p-4 relative">
      <div className="w-full max-w-md space-y-8 z-10">
        <div className="text-center flex flex-col items-center">
          <div className="flex items-center gap-2 mb-4">
            <Coins className="h-10 w-10 text-amber-500 animate-bounce" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-500 to-amber-400 bg-clip-text text-transparent animate-pulse">TipTop</h1>
          </div>
          <p className="text-muted-foreground mt-2 animate-fade-in">Beheer en verdeel fooi voor teams</p>
        </div>
        
        <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-amber-300/30 to-amber-200/30 backdrop-blur-sm">
            <TabsTrigger value="login" className="rounded-md hover:bg-amber-200/50 transition-colors">Inloggen</TabsTrigger>
            <TabsTrigger value="register" className="rounded-md hover:bg-amber-200/50 transition-colors">Registreren</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <Card className="bg-white/30 backdrop-blur-lg border-border/20 shadow-lg hover:shadow-amber-300/30 transition-shadow">
              <CardHeader>
                <CardTitle>Inloggen</CardTitle>
                <CardDescription>
                  Vul je gegevens in om in te loggen bij je account
                </CardDescription>
              </CardHeader>
              <LoginForm onResetPasswordClick={() => setResetPasswordOpen(true)} />
            </Card>
          </TabsContent>
          
          <TabsContent value="register">
            <Card className="bg-white/30 backdrop-blur-lg border-border/20 shadow-lg hover:shadow-amber-300/30 transition-shadow">
              <CardHeader>
                <CardTitle>Nieuw account</CardTitle>
                <CardDescription>
                  Maak een account aan om fooi te beheren
                </CardDescription>
              </CardHeader>
              <RegisterForm />
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <PasswordResetDialog 
        open={resetPasswordOpen} 
        onOpenChange={setResetPasswordOpen} 
      />
    </div>
  );
};

export default Login;
