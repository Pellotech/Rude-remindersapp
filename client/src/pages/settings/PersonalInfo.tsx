import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BackNavigation } from "@/components/BackNavigation";
import { UserCircle, Users } from "lucide-react";

const ethnicityOptions = [
  { value: "american", label: "American" },
  { value: "african-american", label: "African American" },
  { value: "hispanic-latino", label: "Hispanic/Latino" },
  { value: "asian-american", label: "Asian American" },
  { value: "chinese", label: "Chinese" },
  { value: "indian", label: "Indian" },
  { value: "japanese", label: "Japanese" },
  { value: "korean", label: "Korean" },
  { value: "british", label: "British" },
  { value: "german", label: "German" },
  { value: "french", label: "French" },
  { value: "italian", label: "Italian" },
  { value: "spanish", label: "Spanish" },
  { value: "mexican", label: "Mexican" },
  { value: "brazilian", label: "Brazilian" },
  { value: "canadian", label: "Canadian" },
  { value: "australian", label: "Australian" },
  { value: "russian", label: "Russian" },
  { value: "middle-eastern", label: "Middle Eastern" },
  { value: "african", label: "African" },
  { value: "other", label: "Other" },
];

export default function PersonalInfo() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: user, isLoading } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (settings: any) =>
      apiRequest("/api/settings", "PUT", settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Personal information updated",
        description: "Your profile has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update personal information. Please try again.",
        variant: "destructive",
      });
    },
  });

  const [localSettings, setLocalSettings] = useState<any>({});

  useEffect(() => {
    if (user) {
      setLocalSettings({});
    }
  }, [user]);

  const saveSettings = () => {
    updateSettingsMutation.mutate(localSettings);
    setLocalSettings({});
  };

  const updateSetting = (key: string, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
  };

  const hasChanges = Object.keys(localSettings).length > 0;
  const currentSettings = { ...user, ...localSettings };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <BackNavigation customBackPath="/settings" customBackLabel="Back to Settings" showMainPageButton={true} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Personal Information</h1>
          <p className="text-muted-foreground">Manage your profile and personal preferences</p>
        </div>
        {hasChanges && (
          <Button 
            onClick={saveSettings} 
            disabled={updateSettingsMutation.isPending}
            className="bg-rude-red hover:bg-rude-red/90"
          >
            {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={currentSettings.firstName || ""}
                onChange={(e) => updateSetting("firstName", e.target.value)}
                placeholder="Enter your first name"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={currentSettings.lastName || ""}
                onChange={(e) => updateSetting("lastName", e.target.value)}
                placeholder="Enter your last name"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={currentSettings.email || ""}
              onChange={(e) => updateSetting("email", e.target.value)}
              placeholder="Enter your email"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                min="13"
                max="120"
                value={currentSettings.age || ""}
                onChange={(e) => updateSetting("age", e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Enter your age"
              />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={currentSettings.country || ""}
                onChange={(e) => updateSetting("country", e.target.value)}
                placeholder="Enter your country"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gender & Identity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="gender">Gender Identity</Label>
            <Select
              value={currentSettings.gender || ""}
              onValueChange={(value) => updateSetting("gender", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your gender identity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Gender-Specific Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Receive reminders tailored to your gender identity
              </p>
            </div>
            <Switch
              checked={currentSettings.genderSpecificReminders || false}
              onCheckedChange={(checked) => updateSetting("genderSpecificReminders", checked)}
            />
          </div>
        </CardContent>
      </Card>

      
    </div>
  );
}