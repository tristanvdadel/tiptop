
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
  const { user, signIn, signUp, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if logged in
  if (user && !loading) {
    return <Navigate to="/" />;
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    
    try {
      await signIn(email, password);
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    
    if (password !== confirmPassword) {
      toast({
        title: 'Fout', 
        description: 'Wachtwoorden komen niet overeen',
        variant: 'destructive'
      });
      setIsLoading(false);
      return;
    }
    
    try {
      await signUp(email, password, firstName, lastName);
      // Don't navigate - user needs to verify email first
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-amber-100 px-4">
      <div className="w-full max-w-md">
        <Card className="border-amber-200 shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold text-amber-800">TipTop</CardTitle>
            <CardDescription className="text-amber-600">Beheer en verdeel fooien eenvoudig</CardDescription>
          </CardHeader>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Inloggen</TabsTrigger>
              <TabsTrigger value="register">Registreren</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleSignIn}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" name="email" type="email" placeholder="naam@voorbeeld.nl" required />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Wachtwoord</Label>
                    </div>
                    <Input id="password" name="password" type="password" required />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700" disabled={isLoading}>
                    {isLoading ? "Bezig..." : "Inloggen"}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
            <TabsContent value="register">
              <form onSubmit={handleSignUp}>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Voornaam</Label>
                      <Input id="firstName" name="firstName" placeholder="Voornaam" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Achternaam</Label>
                      <Input id="lastName" name="lastName" placeholder="Achternaam" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-register">E-mail</Label>
                    <Input id="email-register" name="email" type="email" placeholder="naam@voorbeeld.nl" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-register">Wachtwoord</Label>
                    <Input id="password-register" name="password" type="password" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Bevestig wachtwoord</Label>
                    <Input id="confirmPassword" name="confirmPassword" type="password" required />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700" disabled={isLoading}>
                    {isLoading ? "Bezig..." : "Registreren"}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
