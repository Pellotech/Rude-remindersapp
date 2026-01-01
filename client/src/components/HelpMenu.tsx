import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { HelpCenter } from "./HelpCenter";
import { useIntroTour } from "@/components/IntroTour";

export function HelpMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { showIntroManually } = useIntroTour();

  return (
    <>
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => setIsOpen(true)}
        className="bg-white shadow-lg border-[#C9A063] hover:bg-[#C9A063]/10"
        data-testid="button-help"
      >
        <HelpCircle className="h-4 w-4 mr-2 text-[#C9A063]" />
        Help
      </Button>

      <HelpCenter 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)}
        onStartTour={showIntroManually}
      />
    </>
  );
}
