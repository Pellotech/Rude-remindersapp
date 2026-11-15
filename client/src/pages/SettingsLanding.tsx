import { Link } from "wouter";
import { ChevronLeft, ChevronRight, User, Bell, CreditCard, Mic, Shield, LifeBuoy, Type } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isAdminEmail } from "@/lib/admin";
import { SettingsIntro } from "@/components/SettingsIntro";
import { useIntroTour } from "@/components/IntroTour";
import { getPlatformInfo } from "@/utils/platformDetection";

// Siri only exists on iPhone/iPad — hide the option everywhere else (Android, web).
const showSiri = getPlatformInfo().isIOS;

interface SettingsRowProps {
  icon: React.ReactNode;
  title: string;
  href: string;
}

function SettingsRow({ icon, title, href }: SettingsRowProps) {
  return (
    <Link href={href}>
      <div 
        className="flex items-center justify-between px-4 py-3.5 bg-ui-card hover:bg-ui-raised transition-colors cursor-pointer"
        data-testid={`settings-row-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <div className="flex items-center gap-3">
          <div className="text-ui-label-2">
            {icon}
          </div>
          <span className="text-white text-body">{title}</span>
        </div>
        <ChevronRight className="h-4 w-4 text-ui-tertiary" />
      </div>
    </Link>
  );
}

export default function SettingsLanding() {
  const { user } = useAuth();
  const isAdmin = isAdminEmail((user as any)?.email);
  const { showIntro, closeIntro } = useIntroTour({
    storageKey: 'settingsIntroShownCount',
    maxShows: 1,
  });

  return (
    <div className="min-h-screen bg-black">
      <SettingsIntro isOpen={showIntro} onClose={closeIntro} />
      <div className="max-w-lg mx-auto">
        <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-ui-separator safe-area-header">
          <div className="flex items-center px-4 py-3">
            <Link href="/">
              <div className="flex items-center text-ui-link cursor-pointer" data-testid="button-back">
                <ChevronLeft className="h-5 w-5" />
                <span className="text-body-lg">Back</span>
              </div>
            </Link>
          </div>
          <h1 className="text-title-lg font-bold text-white px-4 pb-2">Settings</h1>
        </div>

        <div className="py-6 space-y-8">
          <div className="overflow-hidden rounded-xl mx-4">
            <SettingsRow 
              icon={<User className="h-5 w-5" />}
              title="Personal Information"
              href="/settings/personal"
            />
            <div className="h-px bg-ui-separator ml-12" />
            <SettingsRow 
              icon={<Bell className="h-5 w-5" />}
              title="Notifications"
              href="/settings/notifications"
            />
            <div className="h-px bg-ui-separator ml-12" />
            <SettingsRow
              icon={<Type className="h-5 w-5" />}
              title="Text Size & Time Zone"
              href="/settings/display"
            />
            <div className="h-px bg-ui-separator ml-12" />
            {showSiri && (
              <>
                <SettingsRow
                  icon={<Mic className="h-5 w-5" />}
                  title="Siri & Shortcuts"
                  href="/settings/siri"
                />
                <div className="h-px bg-ui-separator ml-12" />
              </>
            )}
            <SettingsRow
              icon={<CreditCard className="h-5 w-5" />}
              title="Payment & Billing"
              href="/settings/billing"
            />
            {isAdmin && (
              <>
                <div className="h-px bg-ui-separator ml-12" />
                <SettingsRow
                  icon={<Shield className="h-5 w-5 text-reem-gold" />}
                  title="Developer Space"
                  href="/dev"
                />
              </>
            )}
          </div>

          {/* Help — its own section, always last */}
          <div className="overflow-hidden rounded-xl mx-4">
            <SettingsRow
              icon={<LifeBuoy className="h-5 w-5 text-reem-gold" />}
              title="Help & Support"
              href="/settings/help"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
