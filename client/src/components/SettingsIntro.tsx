import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Bell, User, CreditCard } from "lucide-react";
import { getPlatformInfo } from "@/utils/platformDetection";

const RUDY_BASE = "/rudy/";
const RUDY_SITTING = `${RUDY_BASE}Rudy_sitting_upright_transparent.png`;
const RUDY_POINTING = `${RUDY_BASE}Rudy_punching_forward_transparent.png`;
const RUDY_THUMBS_UP = `${RUDY_BASE}Rudy_thumbs_up_smile_transparent.png`;

interface SettingsIntroProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsIntro({ isOpen, onClose }: SettingsIntroProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { isAndroid, isIOS } = getPlatformInfo();
  const totalSlides = 3;

  useEffect(() => {
    if (isOpen) setCurrentStep(0);
  }, [isOpen]);

  const nextStep = () => {
    if (currentStep < totalSlides - 1) setCurrentStep(currentStep + 1);
    else onClose();
  };
  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const dialogMaxHeight = isAndroid
    ? 'calc(100vh - 220px)'
    : isIOS
    ? 'calc(100vh - 140px)'
    : '85vh';

  // Dark theme tokens to match SettingsLanding (`bg-black`, iOS dark rows)
  const surface = '#1C1C1E';
  const surfaceSoft = '#2C2C2E';
  const textPrimary = '#FFFFFF';
  const textSecondary = '#AEAEB2';
  const accent = '#C9A063';

  const renderSlide = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center">
            <img
              key={`rudy-${currentStep}`}
              src={RUDY_SITTING}
              alt="Rudy"
              style={{
                width: 120,
                height: 'auto',
                margin: '0 auto 12px',
                display: 'block',
                animation: 'rudyEntrance 0.5s ease-out',
              }}
            />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: textPrimary, marginBottom: 8 }}>
              Welcome to Settings
            </h2>
            <p style={{ fontSize: 14, color: textSecondary, lineHeight: 1.5 }}>
              This is where you make Rude Reminders truly yours — your info, your alerts, your plan. Take a quick spin so you know what's where.
            </p>
          </div>
        );

      case 1:
        return (
          <div className="text-center">
            <img
              key={`rudy-${currentStep}`}
              src={RUDY_POINTING}
              alt="Rudy"
              style={{
                width: 110,
                height: 'auto',
                margin: '0 auto 12px',
                display: 'block',
                animation: 'rudyEntrance 0.5s ease-out',
              }}
            />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: textPrimary, marginBottom: 8 }}>
              Notifications matter most
            </h2>
            <p style={{ fontSize: 13, color: textSecondary, lineHeight: 1.5, marginBottom: 12 }}>
              Reminders only work if they actually reach you. Open Notifications to make sure alerts, sounds, and Rudy's voice are all switched on.
            </p>
            <div style={{
              background: surface,
              border: `1.5px solid ${accent}`,
              borderRadius: 12,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              textAlign: 'left',
            }}>
              <Bell className="h-5 w-5" style={{ color: '#C53B3B', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: textPrimary, fontWeight: 500 }}>
                If you ever say "Rudy went silent" — this is the first place to check.
              </span>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="text-center">
            <img
              key={`rudy-${currentStep}`}
              src={RUDY_THUMBS_UP}
              alt="Rudy"
              style={{
                width: 110,
                height: 'auto',
                margin: '0 auto 12px',
                display: 'block',
                animation: 'rudyEntrance 0.5s ease-out',
              }}
            />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: textPrimary, marginBottom: 8 }}>
              Make Rudy yours
            </h2>
            <p style={{ fontSize: 13, color: textSecondary, lineHeight: 1.5, marginBottom: 12 }}>
              Personal Info lets Rudy use your name, gender, and cultural background so the reminders actually sound like they're for you. Billing is where you manage your plan.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
              <div style={{
                background: surface,
                border: `1.5px solid ${accent}`,
                borderRadius: 12,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <User className="h-5 w-5" style={{ color: accent, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: textPrimary, fontWeight: 500 }}>
                  Personal Info — name, gender, cultural background
                </span>
              </div>
              <div style={{
                background: surface,
                border: `1.5px solid ${accent}`,
                borderRadius: 12,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <CreditCard className="h-5 w-5" style={{ color: accent, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: textPrimary, fontWeight: 500 }}>
                  Payment & Billing — manage your plan any time
                </span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-md p-0 overflow-hidden flex flex-col rounded-[16px]"
        style={{ maxHeight: dialogMaxHeight, background: '#000000', border: `2px solid ${accent}` }}
      >
        <style>{`
          @keyframes rudyEntrance {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        <DialogHeader className="sr-only">
          <DialogTitle>Settings tour</DialogTitle>
          <DialogDescription>
            A short tour of the Settings screen — notifications, personal info, and billing.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="flex items-center justify-center gap-1.5 mb-5">
            {Array.from({ length: totalSlides }).map((_, index) => (
              <div
                key={index}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: index === currentStep ? 24 : 8,
                  background: index === currentStep ? accent : index < currentStep ? '#22C55E' : '#3A3A3C',
                }}
              />
            ))}
          </div>
          {renderSlide()}
        </div>

        <DialogFooter
          className="flex flex-row items-center justify-between p-3"
          style={{ borderTop: `1px solid ${surfaceSoft}`, background: '#000000' }}
        >
          <Button variant="ghost" onClick={onClose} size="sm" style={{ color: textSecondary }}>
            Skip
          </Button>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={prevStep} size="sm" style={{ borderColor: accent, color: accent, background: 'transparent' }}>
                Back
              </Button>
            )}
            <Button
              onClick={nextStep}
              size="sm"
              className="flex items-center gap-2 font-semibold"
              style={{ background: accent, color: '#111827' }}
            >
              {currentStep === totalSlides - 1 ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Got it
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
