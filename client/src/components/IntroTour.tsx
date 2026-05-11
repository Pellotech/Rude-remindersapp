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
import { ArrowRight, CheckCircle } from "lucide-react";
import { getPlatformInfo } from "@/utils/platformDetection";
import logoImage from "@assets/translusant_logo2_1767108484844.png";

const RUDY_BASE = "/rudy/";
const RUDY_ARMS_CROSSED = `${RUDY_BASE}Rudy_confident_arms_crossed_transparent.png`;
const RUDY_POINTING = `${RUDY_BASE}Rudy_punching_forward_transparent.png`;
const RUDY_SITTING = `${RUDY_BASE}Rudy_sitting_upright_transparent.png`;
const RUDY_THUMBS_UP = `${RUDY_BASE}Rudy_thumbs_up_smile_transparent.png`;

interface IntroTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IntroTour({ isOpen, onClose }: IntroTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { isAndroid, isIOS } = getPlatformInfo();

  const totalSlides = 6;

  const nextStep = () => {
    if (currentStep < totalSlides - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipTour = () => {
    onClose();
  };

  useEffect(() => {
    if (isOpen) setCurrentStep(0);
  }, [isOpen]);

  const dialogMaxHeight = isAndroid
    ? 'calc(100vh - 220px)'
    : isIOS
    ? 'calc(100vh - 140px)'
    : '85vh';

  const renderSlide = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center">
            <img src={logoImage} alt="Rude Reminders" style={{ width: 52, height: 'auto', margin: '0 auto 12px' }} />
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
              <div style={{
                background: 'white',
                border: '1.5px solid #111827',
                borderRadius: 12,
                padding: '8px 14px',
                color: '#b70d0d',
                fontWeight: 700,
                fontSize: 14,
                marginBottom: 10,
                display: 'inline-block',
              }}>
                You said you'd do it. So do it.
              </div>
            </div>
            <img
              key={`rudy-${currentStep}`}
              src={RUDY_ARMS_CROSSED}
              alt="Rudy"
              style={{
                width: 140,
                height: 'auto',
                margin: '0 auto 16px',
                display: 'block',
                mixBlendMode: 'multiply',
                animation: 'rudyEntrance 0.5s ease-out',
              }}
            />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
              Meet Rudy. Your new accountability partner.
            </h2>
            <p style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.5 }}>
              He doesn't sugarcoat. He doesn't let you off the hook. Rude Reminders delivers blunt, funny, AI-generated reminders that actually get you moving.
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
                mixBlendMode: 'multiply',
                animation: 'rudyEntrance 0.5s ease-out',
              }}
            />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 6 }}>
              Choose your weapon
            </h2>
            <p style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.5, marginBottom: 14 }}>
              Pick how hard Rudy comes at you. Dial up or down any time.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' }}>
              {[
                { bg: '#38BDF8', color: '#111827', text: '😊 Gentle — Hey, don\'t forget your workout!' },
                { bg: '#22C55E', color: '#ffffff', text: '🙂 Motivational — Time to get moving, you\'ve got this!' },
                { bg: '#FDE047', color: '#111827', text: '😏 Sarcastic — Oh wow, still haven\'t done it. Shocking.' },
                { bg: '#F97316', color: '#ffffff', text: '😠 Harsh — Stop making excuses and just do it.' },
                { bg: '#b70d0d', color: '#ffffff', text: '🤬 Savage — You absolute couch potato. Get. Up. Now.' },
              ].map((pill, i) => (
                <div
                  key={i}
                  style={{
                    background: pill.bg,
                    color: pill.color,
                    borderRadius: 12,
                    padding: '8px 14px',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {pill.text}
                </div>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="text-center">
            <img
              key={`rudy-${currentStep}`}
              src={RUDY_SITTING}
              alt="Rudy"
              style={{
                width: 110,
                height: 'auto',
                margin: '0 auto 12px',
                display: 'block',
                mixBlendMode: 'multiply',
                animation: 'rudyEntrance 0.5s ease-out',
              }}
            />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 6 }}>
              Hey first-timer 👋
            </h2>
            <p style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.4, marginBottom: 12 }}>
              Here's how to set your first reminder:
            </p>
            <div style={{ textAlign: 'left' }}>
              {[
                'Write what you want to be reminded about in the box below',
                'Flip through the book — pick a date, an hour, and a quarter-minute',
                'Choose your rudeness level — Gentle to Savage',
                'Add some spice: a picture, a voice character, a quote, and more',
                'Hit Create Reminder… and watch out 🔥',
              ].map((step, i) => (
                <div
                  key={i}
                  style={{
                    background: '#FDF3E3',
                    border: '1.5px solid #C9A063',
                    borderRadius: 12,
                    padding: '10px 14px',
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div style={{
                    background: '#C9A063',
                    color: '#111827',
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    fontWeight: 700,
                    fontSize: 13,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{step}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 14, color: '#4B5563', marginTop: 12 }}>
              That's it. Rudy handles the rest.
            </p>
          </div>
        );

      case 3:
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
                mixBlendMode: 'multiply',
                animation: 'rudyEntrance 0.5s ease-out',
              }}
            />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
              Your reminders, all in one place
            </h2>
            <p style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.5, marginBottom: 12 }}>
              The Manage tab shows every reminder you've set. Tap Done or Missed to log it. Every action feeds your habit streak.
            </p>
            <div style={{
              background: 'white',
              border: '1.5px solid #C9A063',
              borderRadius: 14,
              padding: '12px 16px',
              textAlign: 'left',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ fontSize: 14, color: '#111827', fontWeight: 500 }}>🏋️ Gym session</span>
                <span style={{ fontSize: 11, color: '#6B7280' }}>Today 7:00 AM</span>
                <button style={{
                  background: '#22C55E',
                  color: 'white',
                  borderRadius: 20,
                  fontSize: 11,
                  padding: '4px 10px',
                  border: 'none',
                  fontWeight: 600,
                }}>✅ Done</button>
              </div>
              <div style={{ height: 1, background: '#F0E8D8' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ fontSize: 14, color: '#111827', fontWeight: 500 }}>💊 Take vitamins</span>
                <span style={{ fontSize: 11, color: '#6B7280' }}>Today 9:00 AM</span>
                <button style={{
                  background: '#b70d0d',
                  color: 'white',
                  borderRadius: 20,
                  fontSize: 11,
                  padding: '4px 10px',
                  border: 'none',
                  fontWeight: 600,
                }}>Missed</button>
              </div>
            </div>
          </div>
        );

      case 4: {
        const aboveHeights = [20, 30, 0, 40, 25, 0, 35];
        const belowHeights = [0, 0, 15, 0, 0, 20, 0];
        return (
          <div className="text-center">
            <img
              key={`rudy-${currentStep}`}
              src={RUDY_SITTING}
              alt="Rudy"
              style={{
                width: 110,
                height: 'auto',
                margin: '0 auto 12px',
                display: 'block',
                mixBlendMode: 'multiply',
                animation: 'rudyEntrance 0.5s ease-out',
              }}
            />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
              Watch yourself actually change
            </h2>
            <p style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.5, marginBottom: 12 }}>
              Science says 66 days builds a real habit (Phillippa Lally, UCL). The Analytics tab tracks every completion and miss.
            </p>
            <div style={{
              background: '#FDF3E3',
              border: '1.5px solid #C9A063',
              borderRadius: 12,
              padding: '10px 16px',
              fontSize: 13,
              color: '#6B3410',
              fontWeight: 600,
              textAlign: 'center',
              marginBottom: 10,
            }}>
              Day 1 → Day 66 → Automatic
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              height: 60,
              gap: 4,
              marginTop: 8,
              borderBottom: '2px solid #374151',
            }}>
              {aboveHeights.map((above, i) => (
                <div key={i} style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  height: '100%',
                }}>
                  {above > 0 ? (
                    <div style={{
                      background: '#C53B3B',
                      borderRadius: '3px 3px 0 0',
                      height: above,
                      width: '100%',
                    }} />
                  ) : null}
                </div>
              ))}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 4,
            }}>
              {belowHeights.map((below, i) => (
                <div key={i} style={{ flex: 1 }}>
                  {below > 0 ? (
                    <div style={{
                      background: '#9CA3AF',
                      borderRadius: '0 0 3px 3px',
                      height: below,
                      width: '100%',
                    }} />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 5:
        return (
          <div className="text-center">
            <img
              key={`rudy-${currentStep}`}
              src={RUDY_ARMS_CROSSED}
              alt="Rudy"
              style={{
                width: 110,
                height: 'auto',
                margin: '0 auto 12px',
                display: 'block',
                mixBlendMode: 'multiply',
                animation: 'rudyEntrance 0.5s ease-out',
              }}
            />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
              Make it personal
            </h2>
            <p style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.5, marginBottom: 12 }}>
              Premium unlocks photo attachments and motivational quotes added to every reminder.
            </p>
            <div style={{ display: 'flex', flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <div style={{
                background: '#FDF3E3',
                border: '1.5px solid #C9A063',
                borderRadius: 12,
                padding: 14,
                flex: 1,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 26 }}>📷</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginTop: 4 }}>Photo Attachments</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>Attach a photo to make it impossible to ignore</div>
              </div>
              <div style={{
                background: '#FDF3E3',
                border: '1.5px solid #C9A063',
                borderRadius: 12,
                padding: 14,
                flex: 1,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 26 }}>💬</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginTop: 4 }}>Motivational Quotes</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>Words from history's greatest minds</div>
              </div>
            </div>
            <p style={{ color: '#8E8E93', fontSize: 13, textAlign: 'center', marginTop: 10 }}>
              Start free. Upgrade when you're ready.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-md p-0 overflow-hidden flex flex-col bg-white border-2 border-[#C9A063] rounded-[16px]"
        style={{ maxHeight: dialogMaxHeight }}
      >
        <style>{`
          @keyframes rudyEntrance {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        <DialogHeader className="sr-only">
          <DialogTitle>Welcome to Rude Reminders</DialogTitle>
          <DialogDescription>
            A short tour of how to create reminders, set rudeness levels, and track your habit progress.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mb-5">
            {Array.from({ length: totalSlides }).map((_, index) => (
              <div
                key={index}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: index === currentStep ? 24 : 8,
                  background: index === currentStep ? '#C9A063' : index < currentStep ? '#22C55E' : '#E5E7EB',
                }}
              />
            ))}
          </div>

          {renderSlide()}
        </div>

        <DialogFooter className="flex flex-row items-center justify-between p-3 border-t border-[#F0E8D8] bg-white">
          <Button variant="ghost" onClick={skipTour} size="sm" className="text-[#6B7280]">
            Skip
          </Button>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={prevStep} size="sm" className="border-[#C9A063] text-[#6B3410]">
                Back
              </Button>
            )}
            <Button
              onClick={nextStep}
              size="sm"
              className="flex items-center gap-2 bg-[#C9A063] hover:bg-[#b08d52] text-white font-semibold"
            >
              {currentStep === totalSlides - 1 ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Get Started
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

// Hook to manage intro tour state — shows the popup for the first `maxShows` visits
export function useIntroTour(opts?: { storageKey?: string; maxShows?: number }) {
  const storageKey = opts?.storageKey ?? 'introTourShownCount';
  const maxShows = opts?.maxShows ?? 1;
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    // Backwards compat: migrate the legacy boolean flag for the main intro tour
    if (storageKey === 'introTourShownCount') {
      const legacy = localStorage.getItem('hasSeenIntroTour');
      if (legacy === 'true' && !localStorage.getItem(storageKey)) {
        localStorage.setItem(storageKey, String(maxShows));
      }
    }
    const count = parseInt(localStorage.getItem(storageKey) || '0', 10);
    if (count < maxShows) {
      const timer = setTimeout(() => setShowIntro(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [storageKey, maxShows]);

  const closeIntro = () => {
    setShowIntro(false);
    const count = parseInt(localStorage.getItem(storageKey) || '0', 10);
    localStorage.setItem(storageKey, String(count + 1));
  };

  const showIntroManually = () => {
    setShowIntro(true);
  };

  return {
    showIntro,
    closeIntro,
    showIntroManually
  };
}
