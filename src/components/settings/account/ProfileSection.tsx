
import { useState } from "react";
import { User, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useForm } from "react-hook-form";
import { supabase, getUser } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";

const profileFormSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  name: z.string().min(1, "Naam is verplicht")
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface ProfileSectionProps {
  profileImage: string | null;
  userName: string;
  userEmail: string;
  phone: string;
  firstName: string;
  lastName: string;
  setProfileImage: (url: string) => void;
  setUserName: (name: string) => void;
  setFirstName: (name: string) => void;
  setLastName: (name: string) => void;
  setPhone: (phone: string) => void;
}

const ProfileSection = ({
  profileImage,
  userName,
  userEmail,
  phone,
  firstName,
  lastName,
  setProfileImage,
  setUserName,
  setFirstName,
  setLastName,
  setPhone
}: ProfileSectionProps) => {
  const { toast } = useToast();
  
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName,
      lastName,
      phone,
      name: userName
    }
  });

  // Update form values when props change
  React.useEffect(() => {
    profileForm.reset({
      firstName,
      lastName,
      phone,
      name: userName
    });
  }, [firstName, lastName, phone, userName, profileForm]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        if (e.target?.result) {
          setProfileImage(e.target.result as string);
          
          toast({
            title: "Profielfoto bijgewerkt",
            description: "Je nieuwe profielfoto is succesvol opgeslagen."
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSave = async (data: ProfileFormValues) => {
    try {
      const user = await getUser();
      if (!user) {
        throw new Error("Gebruiker niet gevonden");
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      setFirstName(data.firstName || "");
      setLastName(data.lastName || "");
      setPhone(data.phone || "");
      
      const fullName = [data.firstName, data.lastName]
        .filter(Boolean)
        .join(' ');
      
      const displayName = fullName || data.name;
      setUserName(displayName);
      localStorage.setItem('userName', displayName);
      
      toast({
        title: "Profiel bijgewerkt",
        description: "Je profielgegevens zijn succesvol opgeslagen."
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Fout bij opslaan",
        description: error.message || "Er is een fout opgetreden bij het opslaan van je profiel.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        {profileImage ? <Avatar className="h-14 w-14">
            <AvatarImage src={profileImage} alt="Profielfoto" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar> : <User className="h-14 w-14 p-2 rounded-full bg-muted text-muted-foreground" />}
        <div>
          <p className="font-medium">{userName}</p>
          <p className="text-sm text-muted-foreground">{userEmail}</p>
          {phone && <p className="text-sm text-muted-foreground"><Phone className="h-3 w-3 inline mr-1" />{phone}</p>}
        </div>
      </div>
      
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            Wijzigen
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Profiel wijzigen</DialogTitle>
            <DialogDescription>
              Pas je profielgegevens en foto aan.
            </DialogDescription>
          </DialogHeader>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(handleProfileSave)} className="space-y-4">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={profileForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Voornaam</FormLabel>
                        <FormControl>
                          <Input placeholder="Voornaam" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Achternaam</FormLabel>
                        <FormControl>
                          <Input placeholder="Achternaam" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={profileForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weergavenaam</FormLabel>
                      <FormControl>
                        <Input required {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={profileForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefoonnummer</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="+31 6 12345678" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="space-y-2">
                  <Label htmlFor="picture">Profielfoto</Label>
                  <Input id="picture" type="file" accept="image/*" onChange={handleImageUpload} className="w-full" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => document.querySelector('dialog')?.close()}>
                  Annuleren
                </Button>
                <Button type="submit">Opslaan</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileSection;
