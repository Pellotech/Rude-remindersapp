import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift, Star, Volume2, Bell, Play } from 'lucide-react';
import { useAdMob } from '@/hooks/useAdMob';

interface RewardAdBannerProps {
  onRewardEarned: () => void;
  currentReminders: number;
  maxReminders: number;
  hasTemporaryPremiumVoices: boolean;
}

export function RewardAdBanner({ 
  onRewardEarned, 
  currentReminders, 
  maxReminders,
  hasTemporaryPremiumVoices 
}: RewardAdBannerProps) {
  const { showRewardAd, isAvailable, isInitialized } = useAdMob();
  
  if (!isAvailable || !isInitialized) {
    return null;
  }

  const isNearLimit = currentReminders / maxReminders > 0.8;
  const needsMoreReminders = currentReminders >= maxReminders;

  const handleWatchAd = async () => {
    const rewarded = await showRewardAd();
    if (rewarded) {
      onRewardEarned();
    }
  };

  if (needsMoreReminders) {
    return (
      <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200 mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 bg-orange-100 rounded-full">
                <Bell className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-orange-800">Reminder Limit Reached</h3>
                <p className="text-sm text-orange-700">
                  Watch an ad to earn 3 bonus reminders this month!
                </p>
              </div>
            </div>
            <Button 
              onClick={handleWatchAd}
              className="bg-orange-600 hover:bg-orange-700 text-white"
              data-testid="watch-ad-for-reminders"
            >
              <Gift className="h-4 w-4 mr-2" />
              Watch Ad
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isNearLimit && !hasTemporaryPremiumVoices) {
    return (
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 bg-purple-100 rounded-full">
                <Volume2 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-purple-800">Unlock Premium Voices</h3>
                <p className="text-sm text-purple-700">
                  Watch an ad to unlock premium voice characters for 30 minutes!
                </p>
              </div>
            </div>
            <Button 
              onClick={handleWatchAd}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              data-testid="watch-ad-for-voices"
            >
              <Play className="h-4 w-4 mr-2" />
              Watch Ad
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default earn rewards banner
  return (
    <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 bg-green-100 rounded-full">
              <Star className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-800">Earn Free Rewards</h3>
              <p className="text-sm text-green-700">
                Watch ads to earn bonus reminders or unlock premium features temporarily!
              </p>
            </div>
          </div>
          <Button 
            onClick={handleWatchAd}
            variant="outline"
            className="border-green-300 text-green-700 hover:bg-green-100"
            data-testid="watch-ad-general"
          >
            <Gift className="h-4 w-4 mr-2" />
            Earn Rewards
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}