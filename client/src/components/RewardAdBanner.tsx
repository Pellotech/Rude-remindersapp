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
      <Card className="mb-4 border-2 border-[#C9A063]" style={{ backgroundColor: '#FDF3E3' }}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-full" style={{ backgroundColor: '#C9A063' }}>
                <Bell className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-[#111827]">Reminder Limit Reached</h3>
                <p className="text-sm text-[#111827]">
                  Watch an ad to earn 3 bonus reminders this month!
                </p>
              </div>
            </div>
            <Button 
              onClick={handleWatchAd}
              className="bg-[#C53B3B] hover:bg-[#a83030] text-white"
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
      <Card className="mb-4 border-2 border-[#C9A063]" style={{ backgroundColor: '#FDF3E3' }}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-full" style={{ backgroundColor: '#C9A063' }}>
                <Volume2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-[#111827]">Unlock Premium Voices</h3>
                <p className="text-sm text-[#111827]">
                  Watch an ad to unlock premium voice characters for 30 minutes!
                </p>
              </div>
            </div>
            <Button 
              onClick={handleWatchAd}
              className="bg-[#C53B3B] hover:bg-[#a83030] text-white"
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

  return (
    <Card className="mb-4 border-2 border-[#C9A063]" style={{ backgroundColor: '#FDF3E3' }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-full" style={{ backgroundColor: '#C9A063' }}>
              <Star className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-[#111827]">Earn Free Rewards</h3>
              <p className="text-sm text-[#111827]">
                Watch ads to earn bonus reminders or unlock premium features temporarily!
              </p>
            </div>
          </div>
          <Button 
            onClick={handleWatchAd}
            className="bg-[#C53B3B] hover:bg-[#a83030] text-white"
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
