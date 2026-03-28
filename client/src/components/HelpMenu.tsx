import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HelpCenter } from "./HelpCenter";
import { IntroTour } from "@/components/IntroTour";

export function HelpMenu() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isIntroOpen, setIsIntroOpen] = useState(false);

  return (
    <>
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => setIsHelpOpen(true)}
        className="bg-white shadow-lg border-[#C9A063] hover:bg-[#C9A063]/10 px-3 py-1.5 text-sm font-medium text-[#111827]"
        data-testid="button-help"
      >
        Help
      </Button>

      <HelpCenter 
        isOpen={isHelpOpen} 
        onClose={() => setIsHelpOpen(false)}
        onStartTour={() => {
          setIsHelpOpen(false);
          setIsIntroOpen(true);
        }}
      />

      <IntroTour
        isOpen={isIntroOpen}
        onClose={() => setIsIntroOpen(false)}
      />
    </>
  );
}
