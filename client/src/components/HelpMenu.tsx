import { useState } from "react";
import { Button } from "@/components/ui/button";
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
        className="bg-white shadow-lg border-[#C9A063] hover:bg-[#C9A063]/10 px-3 py-1.5 text-sm font-medium text-[#111827]"
        data-testid="button-help"
      >
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
