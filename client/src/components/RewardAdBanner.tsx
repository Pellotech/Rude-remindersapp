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

  const cardStyle = { backgroundColor: '#DCFCE7' };
  const iconStyle = { backgroundColor: '#C9A063' };

  if (needsMoreReminders) {
    return (
      <Card className="mb-3 border-2 border-[#C9A063]" style={cardStyle}>
        <CardContent className="p-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex items-center justify-center h-7 w-7 rounded-full shrink-0" style={iconStyle}>
                <Bell className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-[#111827]">Limit reached — </span>
                <span className="text-xs text-[#111827]">watch an ad for 3 bonus reminders</span>
              </div>
            </div>
            <Button 
              size="sm"
              onClick={handleWatchAd}
              className="shrink-0 h-7 px-2 text-xs bg-[#C9A063] hover:bg-[#b38a50] text-white"
              data-testid="watch-ad-for-reminders"
            >
              <Gift className="h-3 w-3 mr-1" />
              Watch Ad
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isNearLimit && !hasTemporaryPremiumVoices) {
    return (
      <Card className="mb-3 border-2 border-[#C9A063]" style={cardStyle}>
        <CardContent className="p-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex items-center justify-center h-7 w-7 rounded-full shrink-0" style={iconStyle}>
                <Volume2 className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-[#111827]">Unlock voices — </span>
                <span className="text-xs text-[#111827]">premium voices for 30 min</span>
              </div>
            </div>
            <Button 
              size="sm"
              onClick={handleWatchAd}
              className="shrink-0 h-7 px-2 text-xs bg-[#C9A063] hover:bg-[#b38a50] text-white"
              data-testid="watch-ad-for-voices"
            >
              <Play className="h-3 w-3 mr-1" />
              Watch Ad
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-3 border-2 border-[#C9A063]" style={cardStyle}>
      <CardContent className="p-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex items-center justify-center h-7 w-7 rounded-full shrink-0" style={iconStyle}>
              <Star className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-[#111827]">Earn Free Rewards — </span>
              <span className="text-xs text-[#111827]">watch ads for bonus reminders or premium features</span>
            </div>
          </div>
          <Button 
            size="sm"
            onClick={handleWatchAd}
            className="shrink-0 h-7 px-2 text-xs bg-[#C9A063] hover:bg-[#b38a50] text-white"
            data-testid="watch-ad-general"
          >
            <Gift className="h-3 w-3 mr-1" />
            Earn
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
