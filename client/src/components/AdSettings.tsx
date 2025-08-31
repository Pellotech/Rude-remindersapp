import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff, Settings, Shield, Clock, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdSettingsProps {
  isPremium: boolean;
}

export function AdSettings({ isPremium }: AdSettingsProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    bannerAdsEnabled: true,
    interstitialFrequency: 'normal', // 'low', 'normal', 'high'
    rewardAdsEnabled: true,
    personalizedAds: true,
  });

  const handleSaveSettings = () => {
    // Save to localStorage for demo purposes
    localStorage.setItem('adSettings', JSON.stringify(settings));
    toast({
      title: "Ad Settings Saved",
      description: "Your advertising preferences have been updated.",
    });
  };

  if (isPremium) {
    return (
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Shield className="h-5 w-5" />
            Ad-Free Experience
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-green-700">
            As a premium user, you enjoy an ad-free experience. Thank you for supporting the app!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Ad Preferences
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Customize your advertising experience while using the free version
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Banner Ads */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Banner Ads</Label>
            <p className="text-xs text-muted-foreground">
              Show banner advertisements at the bottom of the screen
            </p>
          </div>
          <Switch
            checked={settings.bannerAdsEnabled}
            onCheckedChange={(checked) => 
              setSettings(prev => ({ ...prev, bannerAdsEnabled: checked }))
            }
            data-testid="banner-ads-toggle"
          />
        </div>

        <Separator />

        {/* Interstitial Frequency */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Interstitial Ad Frequency</Label>
          <p className="text-xs text-muted-foreground">
            How often to show full-screen ads between actions
          </p>
          <Select
            value={settings.interstitialFrequency}
            onValueChange={(value) => 
              setSettings(prev => ({ ...prev, interstitialFrequency: value }))
            }
          >
            <SelectTrigger data-testid="interstitial-frequency-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Low (Every 10 actions)
                </div>
              </SelectItem>
              <SelectItem value="normal">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Normal (Every 5 actions)
                </div>
              </SelectItem>
              <SelectItem value="high">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  High (Every 3 actions)
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Reward Ads */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Reward Ads
            </Label>
            <p className="text-xs text-muted-foreground">
              Allow ads that give you bonus features and reminders
            </p>
          </div>
          <Switch
            checked={settings.rewardAdsEnabled}
            onCheckedChange={(checked) => 
              setSettings(prev => ({ ...prev, rewardAdsEnabled: checked }))
            }
            data-testid="reward-ads-toggle"
          />
        </div>

        <Separator />

        {/* Personalized Ads */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Personalized Ads</Label>
            <p className="text-xs text-muted-foreground">
              Show ads based on your interests and app usage patterns
            </p>
          </div>
          <Switch
            checked={settings.personalizedAds}
            onCheckedChange={(checked) => 
              setSettings(prev => ({ ...prev, personalizedAds: checked }))
            }
            data-testid="personalized-ads-toggle"
          />
        </div>

        <Separator />

        {/* Info Section */}
        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
            Why we show ads
          </h4>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Advertisements help us keep the app free and support ongoing development. 
            You can always upgrade to Premium for an ad-free experience with additional features.
          </p>
        </div>

        {/* Save Button */}
        <Button 
          onClick={handleSaveSettings}
          className="w-full"
          data-testid="save-ad-settings"
        >
          Save Ad Preferences
        </Button>
      </CardContent>
    </Card>
  );
}