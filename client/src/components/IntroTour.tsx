
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Star, 
  Calendar,
  Settings,
  Smartphone,
  Volume2,
  Image,
  Zap,
  Crown,
  ArrowRight,
  CheckCircle
} from "lucide-react";

interface IntroTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IntroTour({ isOpen, onClose }: IntroTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const features = [
    {
      icon: <Crown className="h-6 w-6 text-yellow-600" />,
      title: "Unlimited AI Responses with Premium",
      description: "Get culturally-aware, contextually relevant rude reminders powered by advanced AI. From gentle nudges to hilariously rude wake-up calls - choose your perfect motivation level!",
      badge: "Premium Feature",
      badgeColor: "bg-yellow-100 text-yellow-800"
    },
    {
      icon: <Calendar className="h-6 w-6 text-blue-600" />,
      title: "7-Day Free Trial",
      description: "Experience all premium features for a full week! Create unlimited reminders, access all voice characters, and enjoy AI-generated responses completely free.",
      badge: "New Users",
      badgeColor: "bg-blue-100 text-blue-800"
    },
    {
      icon: <Star className="h-6 w-6 text-purple-600" />,
      title: "5-Level Rudeness Scale",
      description: "From polite reminders to savage motivation! Choose how 'rude' you want your reminders to be - our unique selling point that makes productivity fun.",
      badge: "Unique Feature",
      badgeColor: "bg-purple-100 text-purple-800"
    },
    {
      icon: <Volume2 className="h-6 w-6 text-green-600" />,
      title: "10 Premium Voice Characters",
      description: "Drill Sergeant, Life Coach, Sarcastic Friend, Motivational Speaker, and more! Each voice has unique personality traits to match your mood.",
      badge: "Voice Features",
      badgeColor: "bg-green-100 text-green-800"
    },
    {
      icon: <MessageSquare className="h-6 w-6 text-indigo-600" />,
      title: "Cultural & Historical Quotes",
      description: "Get personalized motivational quotes from 25+ historical figures based on your cultural background and gender preferences. From Gandhi to Maya Angelou!",
      badge: "Personalization",
      badgeColor: "bg-indigo-100 text-indigo-800"
    },
    {
      icon: <Image className="h-6 w-6 text-pink-600" />,
      title: "Photo & Video Attachments",
      description: "Add up to 5 photos or videos to your reminders for extra motivation. Perfect for goal photos, progress pics, or visual inspiration.",
      badge: "Multimedia",
      badgeColor: "bg-pink-100 text-pink-800"
    },
    {
      icon: <Smartphone className="h-6 w-6 text-orange-600" />,
      title: "Native Mobile Apps",
      description: "iOS and Android apps with push notifications, camera integration, and offline functionality. Your reminders follow you everywhere!",
      badge: "Mobile Ready",
      badgeColor: "bg-orange-100 text-orange-800"
    },
    {
      icon: <Settings className="h-6 w-6 text-gray-600" />,
      title: "Powerful Settings & Customization",
      description: "Customize everything! Set personal info for tailored content, choose notification preferences, themes, and advanced reminder options.",
      badge: "Customization",
      badgeColor: "bg-gray-100 text-gray-800"
    }
  ];

  const nextStep = () => {
    if (currentStep < features.length - 1) {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-600" />
            Welcome to Rude Daily Reminders!
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Discover what makes our app uniquely motivational
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {features.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-8 rounded-full transition-colors ${
                  index === currentStep 
                    ? 'bg-blue-600' 
                    : index < currentStep 
                      ? 'bg-green-500' 
                      : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Current feature */}
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {features[currentStep].icon}
                  <CardTitle className="text-lg">
                    {features[currentStep].title}
                  </CardTitle>
                </div>
                <Badge className={features[currentStep].badgeColor}>
                  {features[currentStep].badge}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                {features[currentStep].description}
              </p>
            </CardContent>
          </Card>

          {/* Step counter */}
          <div className="text-center text-sm text-muted-foreground">
            Feature {currentStep + 1} of {features.length}
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button variant="ghost" onClick={skipTour}>
            Skip Tour
          </Button>
          
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={prevStep}>
                Previous
              </Button>
            )}
            <Button onClick={nextStep} className="flex items-center gap-2">
              {currentStep === features.length - 1 ? (
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

// Hook to manage intro tour state
export function useIntroTour() {
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    // Check if user has seen the intro before
    const hasSeenIntro = localStorage.getItem('hasSeenIntroTour');
    if (!hasSeenIntro) {
      // Show intro after a short delay to let the page load
      const timer = setTimeout(() => {
        setShowIntro(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const closeIntro = () => {
    setShowIntro(false);
    localStorage.setItem('hasSeenIntroTour', 'true');
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
