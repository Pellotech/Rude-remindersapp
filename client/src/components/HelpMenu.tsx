import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  HelpCircle, 
  ChevronDown, 
  ChevronRight, 
  MessageSquare, 
  Settings, 
  Bell, 
  Smartphone,
  CreditCard,
  Shield
} from "lucide-react";

export function HelpMenu() {
  const [open, setOpen] = useState(false);
  const [openSections, setOpenSections] = useState({
    gettingStarted: false,
    reminders: false,
    settings: false,
    mobile: false,
    billing: false,
    troubleshooting: false,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <HelpCircle className="h-4 w-4 mr-2" />
          Help
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Help & Support
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Getting Started */}
          <Card>
            <Collapsible open={openSections.gettingStarted} onOpenChange={() => toggleSection('gettingStarted')}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Getting Started
                    </div>
                    {openSections.gettingStarted ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">What is Rude Daily Reminder?</h4>
                    <p className="text-sm text-muted-foreground">
                      A unique reminder app that transforms your boring tasks into hilariously brutal motivational messages. 
                      Set reminders and choose how "rude" you want them to be - from gentle nudges to savage wake-up calls.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Creating Your First Reminder</h4>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Click "Create Reminder" on the main page</li>
                      <li>Enter what you want to be reminded about</li>
                      <li>Set when you want the reminder</li>
                      <li>Choose your rudeness level (1-5 stars)</li>
                      <li>Optionally add photos, quotes, or voice characters</li>
                      <li>Hit "Create Rude Reminder" and you're done!</li>
                    </ol>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Rudeness Levels Explained</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li><strong>★☆☆☆☆ Gentle:</strong> Polite nudges and encouragement</li>
                      <li><strong>★★☆☆☆ Mild:</strong> Slightly sassy reminders</li>
                      <li><strong>★★★☆☆ Medium:</strong> Sarcastic and witty messages</li>
                      <li><strong>★★★★☆ Harsh:</strong> Brutally honest motivation</li>
                      <li><strong>★★★★★ Savage:</strong> No mercy, pure savage energy</li>
                    </ul>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Reminder Features */}
          <Card>
            <Collapsible open={openSections.reminders} onOpenChange={() => toggleSection('reminders')}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Reminder Features
                    </div>
                    {openSections.reminders ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Notification Types</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li><strong>Browser Notifications:</strong> Pop-up alerts on your computer/phone</li>
                      <li><strong>Voice Alerts:</strong> Spoken reminders with character voices</li>
                      <li><strong>Email Notifications:</strong> Backup reminders sent to your email</li>
                      <li><strong>Real-time Updates:</strong> Instant updates when the app is open</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Voice Characters</h4>
                    <p className="text-sm text-muted-foreground mb-2">Choose from different voice personalities:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li><strong>Default:</strong> Standard reminder voice</li>
                      <li><strong>Drill Sergeant:</strong> Military-style motivation</li>
                      <li><strong>Life Coach:</strong> Encouraging and supportive</li>
                      <li><strong>Sarcastic Friend:</strong> Witty and sassy tone</li>
                      <li><strong>Motivational Speaker:</strong> High-energy enthusiasm</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Photo & Video Attachments</h4>
                    <p className="text-sm text-muted-foreground">
                      Add up to 5 photos or videos to your reminders for extra motivation. 
                      Perfect for goal photos, progress pics, or visual cues that inspire you.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Cultural Motivational Quotes</h4>
                    <p className="text-sm text-muted-foreground">
                      Get personalized quotes from historical figures that match your cultural background and gender preferences. 
                      Choose from 25+ diverse quotes from leaders like Gandhi, Maya Angelou, Steve Jobs, and more.
                    </p>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Settings */}
          <Card>
            <Collapsible open={openSections.settings} onOpenChange={() => toggleSection('settings')}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Settings & Customization
                    </div>
                    {openSections.settings ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Personal Information</h4>
                    <p className="text-sm text-muted-foreground">
                      Set your name, email, gender, and cultural background to get personalized content and quotes.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Notification Preferences</h4>
                    <p className="text-sm text-muted-foreground">
                      Control how you receive alerts, set snooze duration, and choose which notification types you want.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Appearance</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li><strong>Theme:</strong> Switch between light, dark, or system theme</li>
                      <li><strong>Simplified Interface:</strong> Hide advanced features for a cleaner experience</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Alarm Sounds</h4>
                    <p className="text-sm text-muted-foreground">
                      Choose from playful, non-jarring alarm sounds that won't startle you awake. 
                      Perfect for gentle wake-ups and friendly reminders.
                    </p>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Mobile App */}
          <Card>
            <Collapsible open={openSections.mobile} onOpenChange={() => toggleSection('mobile')}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5" />
                      Mobile App Features
                    </div>
                    {openSections.mobile ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Native iOS & Android Apps</h4>
                    <p className="text-sm text-muted-foreground">
                      Download our native mobile apps for the best experience on your phone or tablet.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Mobile-Specific Features</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li><strong>Camera Integration:</strong> Take photos directly in the app</li>
                      <li><strong>Push Notifications:</strong> Get reminders even when the app is closed</li>
                      <li><strong>Offline Access:</strong> View and manage reminders without internet</li>
                      <li><strong>Touch Optimization:</strong> Larger buttons and mobile-friendly interface</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Cross-Platform Sync</h4>
                    <p className="text-sm text-muted-foreground">
                      Your reminders automatically sync between web, iOS, and Android versions. 
                      Start on your computer, get reminded on your phone!
                    </p>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Billing */}
          <Card>
            <Collapsible open={openSections.billing} onOpenChange={() => toggleSection('billing')}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Billing & Subscriptions
                    </div>
                    {openSections.billing ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Free vs Premium</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li><strong>Free Plan:</strong> Basic reminders, limited features</li>
                      <li><strong>Premium ($9.99/month):</strong> All features, unlimited reminders, advanced customization</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Managing Your Subscription</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>Upgrade or downgrade anytime in Settings → Payment & Billing</li>
                      <li>Add or remove payment methods</li>
                      <li>View billing history and download invoices</li>
                      <li>Cancel subscription (continues until end of billing period)</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Payment Security</h4>
                    <p className="text-sm text-muted-foreground">
                      All payments are processed securely through Stripe. We never store your credit card information.
                    </p>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Troubleshooting */}
          <Card>
            <Collapsible open={openSections.troubleshooting} onOpenChange={() => toggleSection('troubleshooting')}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Troubleshooting
                    </div>
                    {openSections.troubleshooting ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Notifications Not Working?</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>Make sure browser notifications are enabled</li>
                      <li>Check your notification settings in Settings → Notifications</li>
                      <li>For mobile: Ensure push notifications are allowed in phone settings</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Voice Not Playing?</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>Check if your browser allows audio autoplay</li>
                      <li>Make sure your device volume is turned up</li>
                      <li>Try clicking on the page first to enable audio</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">App Running Slowly?</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>Clear your browser cache and cookies</li>
                      <li>Make sure you have a stable internet connection</li>
                      <li>Try refreshing the page or restarting the app</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Still Need Help?</h4>
                    <p className="text-sm text-muted-foreground">
                      Contact support through Settings → Advanced → Export Data for technical issues, 
                      or reach out through our support channels for additional assistance.
                    </p>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}