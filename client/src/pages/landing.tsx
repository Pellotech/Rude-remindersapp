import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone, Clock, Volume2, Mail, Zap } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <Megaphone className="text-rude-red-600 text-4xl mr-4" />
              <h1 className="text-4xl font-bold text-gray-900">Rude Reminder</h1>
            </div>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Finally, a reminder app that tells it like it is. Get brutally honest notifications 
              that actually motivate you to get things done.
            </p>
            <Button 
              size="lg" 
              className="bg-rude-red-600 hover:bg-rude-red-700 text-white px-8 py-3 text-lg"
              onClick={() => window.location.href = '/api/login'}
            >
              Get Started - It's Free
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Why Choose Rude Reminder?
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Because gentle nudges don't work. Sometimes you need a verbal slap to get moving.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <Zap className="text-rude-red-600 text-2xl mb-2" />
              <CardTitle>Adjustable Rudeness</CardTitle>
              <CardDescription>
                Choose your poison: from gentle encouragement to savage roasting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                5 levels of motivation from "You've got this! 💪" to "Stop being such a useless lump!"
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Volume2 className="text-rude-red-600 text-2xl mb-2" />
              <CardTitle>Voice Reminders</CardTitle>
              <CardDescription>
                Hear your shame out loud with text-to-speech notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Nothing like having your computer call you a procrastinator at full volume
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Mail className="text-rude-red-600 text-2xl mb-2" />
              <CardTitle>Multiple Channels</CardTitle>
              <CardDescription>
                Browser, voice, and email notifications to ensure you can't escape
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                We'll find you wherever you're hiding from your responsibilities
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Clock className="text-rude-red-600 text-2xl mb-2" />
              <CardTitle>Smart Scheduling</CardTitle>
              <CardDescription>
                Set precise times and dates for your public humiliation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Schedule your shame sessions exactly when you need that extra push
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Megaphone className="text-rude-red-600 text-2xl mb-2" />
              <CardTitle>Real-time Notifications</CardTitle>
              <CardDescription>
                Instant delivery of your personalized verbal beatdowns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                No delays, no excuses - your reminder will find you the moment it's time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="text-rude-red-600 text-2xl mb-2" />
              <CardTitle>Actually Works</CardTitle>
              <CardDescription>
                Unlike other reminder apps, this one hurts just enough to motivate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Scientifically proven* that being insulted by your own calendar increases productivity
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-rude-red-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Brutally Productive?</h2>
          <p className="text-xl mb-8 text-rude-red-100">
            Join thousands of users who've stopped making excuses and started getting things done.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            className="bg-white text-rude-red-600 hover:bg-gray-100 px-8 py-3 text-lg font-semibold"
            onClick={() => window.location.href = '/api/login'}
          >
            Start Getting Roasted Today
          </Button>
          <p className="text-sm text-rude-red-200 mt-4">
            * Not actually scientifically proven, but it feels true
          </p>
        </div>
      </div>
    </div>
  );
}
