import { useState } from 'react';
import { useLocation } from 'wouter';
import { Crown, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type FeatureKey, isFeatureAvailable, isFeatureDisabled } from '@/config/featureFlags';

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  featureLabel: string;
}

function PaywallModal({ open, onClose, featureLabel }: PaywallModalProps) {
  const [, setLocation] = useLocation();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-[20px] p-6 mx-4 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-[#FEF2F2] rounded-full flex items-center justify-center">
            <Lock className="h-8 w-8 text-[#C53B3B]" />
          </div>
          <h2 className="text-xl font-bold text-[#111827]">Premium Feature</h2>
          <p className="text-[#6B7280] text-sm">
            <strong>{featureLabel}</strong> is available with a Premium subscription. Upgrade to unlock this and other premium features.
          </p>
          <div className="space-y-2 pt-2">
            <Button
              onClick={() => { onClose(); setLocation('/subscribe'); }}
              className="w-full bg-[#C53B3B] hover:bg-[#A83232] text-white rounded-[14px] h-[48px]"
            >
              <Crown className="h-5 w-5 mr-2" />
              Unlock Premium
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              className="w-full text-[#6B7280] rounded-[14px] h-[44px]"
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface UsePaywallGateResult {
  gate: (action: () => void) => void;
  modal: JSX.Element;
}

export function usePaywallGate(featureKey: FeatureKey, featureLabel: string, hasProAccess: boolean): UsePaywallGateResult {
  const [showModal, setShowModal] = useState(false);

  const gate = (action: () => void) => {
    if (isFeatureDisabled(featureKey)) {
      return;
    }

    if (isFeatureAvailable(featureKey, hasProAccess)) {
      action();
      return;
    }

    console.log(`[PaywallGate] Feature locked: ${featureKey}, screen: ReminderForm`);
    setShowModal(true);
  };

  const modal = (
    <PaywallModal
      open={showModal}
      onClose={() => setShowModal(false)}
      featureLabel={featureLabel}
    />
  );

  return { gate, modal };
}
