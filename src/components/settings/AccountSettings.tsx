
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase, getUser } from "@/integrations/supabase/client";

// Import refactored components
import ProfileSection from "./account/ProfileSection";
import EmailSection from "./account/EmailSection";
import PasswordSection from "./account/PasswordSection";
import SubscriptionSection from "./account/SubscriptionSection";
import LogoutSection from "./account/LogoutSection";

const AccountSettings = () => {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userName, setUserName] = useState("Gebruiker");
  const [userEmail, setUserEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = await getUser();
        if (user) {
          setUserEmail(user.email || "");
          
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url, phone')
            .eq('id', user.id)
            .single();
          
          if (error) {
            console.error('Error fetching profile:', error);
            return;
          }
            
          if (profile) {
            setFirstName(profile.first_name || "");
            setLastName(profile.last_name || "");
            setPhone(profile.phone || "");
            
            if (profile.first_name || profile.last_name) {
              const fullName = [profile.first_name, profile.last_name]
                .filter(Boolean)
                .join(' ');
              
              if (fullName) {
                setUserName(fullName);
                localStorage.setItem('userName', fullName);
              }
            }
            
            if (profile.avatar_url) {
              setProfileImage(profile.avatar_url);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    fetchUserData();
    
    const storedName = localStorage.getItem('userName');
    if (storedName) {
      setUserName(storedName);
    }
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ProfileSection 
          profileImage={profileImage}
          userName={userName}
          userEmail={userEmail}
          firstName={firstName}
          lastName={lastName}
          phone={phone}
          setProfileImage={setProfileImage}
          setUserName={setUserName}
          setFirstName={setFirstName}
          setLastName={setLastName}
          setPhone={setPhone}
        />
        
        <EmailSection userEmail={userEmail} />
        
        <PasswordSection />
        
        <Separator />
        
        <SubscriptionSection />
        
        <Separator />
        
        <LogoutSection />
      </CardContent>
    </Card>
  );
};

export default AccountSettings;
