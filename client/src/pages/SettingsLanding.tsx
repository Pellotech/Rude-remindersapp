import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackNavigation } from "@/components/BackNavigation";
import { Link } from "wouter";
import { 
  UserCircle, 
  Bell, 
  Palette, 
  CreditCard,
  ChevronRight,
  Calendar
} from "lucide-react";

export default function SettingsLanding() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <BackNavigation customBackLabel="Back to Home" />

      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-muted-foreground">Choose a category to customize your experience</p>
      </div>

      {/* Settings Categories */}
      <div className="grid gap-4">
        <Link href="/settings/personal">
          <Card className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCircle className="h-5 w-5 text-blue-600" />
                  Personal Information
                </div>
                <ChevronRight className="h-4 w-4" />
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage your profile, gender identity, and cultural preferences
              </p>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/settings/notifications">
          <Card className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-green-600" />
                  Notification Preferences
                </div>
                <ChevronRight className="h-4 w-4" />
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Choose how you want to receive reminders and notifications
              </p>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/settings/appearance">
          <Card className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-purple-600" />
                  Appearance
                </div>
                <ChevronRight className="h-4 w-4" />
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Customize theme, interface options, and alarm sounds
              </p>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/settings/billing">
          <Card className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-orange-600" />
                  Payment & Billing
                </div>
                <ChevronRight className="h-4 w-4" />
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage subscription, payment methods, and billing history
              </p>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}