import { Link } from "wouter";
import { ChevronLeft, ChevronRight, User, Bell, CreditCard } from "lucide-react";
import { SettingsIntro } from "@/components/SettingsIntro";
import { useIntroTour } from "@/components/IntroTour";

interface SettingsRowProps {
  icon: React.ReactNode;
  title: string;
  href: string;
}

function SettingsRow({ icon, title, href }: SettingsRowProps) {
  return (
    <Link href={href}>
      <div 
        className="flex items-center justify-between px-4 py-3.5 bg-[#1C1C1E] hover:bg-[#2C2C2E] transition-colors cursor-pointer"
        data-testid={`settings-row-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <div className="flex items-center gap-3">
          <div className="text-[#8E8E93]">
            {icon}
          </div>
          <span className="text-white text-[15px]">{title}</span>
        </div>
        <ChevronRight className="h-4 w-4 text-[#48484A]" />
      </div>
    </Link>
  );
}

export default function SettingsLanding() {
  const { showIntro, closeIntro } = useIntroTour({
    storageKey: 'settingsIntroShownCount',
    maxShows: 3,
  });

  return (
    <div className="min-h-screen bg-black">
      <SettingsIntro isOpen={showIntro} onClose={closeIntro} />
      <div className="max-w-lg mx-auto">
        <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-[#38383A] safe-area-header">
          <div className="flex items-center px-4 py-3">
            <Link href="/">
              <div className="flex items-center text-[#0A84FF] cursor-pointer" data-testid="button-back">
                <ChevronLeft className="h-5 w-5" />
                <span className="text-[17px]">Back</span>
              </div>
            </Link>
          </div>
          <h1 className="text-[34px] font-bold text-white px-4 pb-2">Settings</h1>
        </div>

        <div className="py-6 space-y-8">
          <div className="overflow-hidden rounded-xl mx-4">
            <SettingsRow 
              icon={<User className="h-5 w-5" />}
              title="Personal Information"
              href="/settings/personal"
            />
            <div className="h-px bg-[#38383A] ml-12" />
            <SettingsRow 
              icon={<Bell className="h-5 w-5" />}
              title="Notifications"
              href="/settings/notifications"
            />
            <div className="h-px bg-[#38383A] ml-12" />
            <SettingsRow 
              icon={<CreditCard className="h-5 w-5" />}
              title="Payment & Billing"
              href="/settings/billing"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
