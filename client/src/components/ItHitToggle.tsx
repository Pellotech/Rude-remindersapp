import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, parseApiError } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface ItHitToggleProps {
  reminderId?: string;
  hitConfirmed?: boolean | null;
  hitAt?: string | Date | null;
}

// Quick-pick reasons shown when someone taps "Nahh" — same idea as "why don't
// you want to see this ad" pickers. Optional: dismissing the menu without
// picking one still counts as a plain "Nahh" with no reason attached.
const NAHH_REASONS = ["Not funny", "Doing too much", "Repetitive"];

// "Let us know did It Hit or Nahh" — the one-tap feedback row shown on both
// the main reminder card (RichReminderNotification) and the Share preview
// card (ShareButton). Lives in exactly one place so a future change to this
// behavior only needs to happen once.
export function ItHitToggle({ reminderId, hitConfirmed, hitAt }: ItHitToggleProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hitAnswer, setHitAnswer] = useState<boolean | null>(hitAt ? !!hitConfirmed : null);

  useEffect(() => {
    setHitAnswer(hitAt ? !!hitConfirmed : null);
  }, [reminderId, hitAt, hitConfirmed]);

  const hitMutation = useMutation({
    mutationFn: async ({ hit, comment }: { hit: boolean; comment?: string }) => {
      if (!reminderId) throw new Error("No reminder to mark");
      return apiRequest(`/api/reminders/${reminderId}/hit`, {
        method: "PATCH",
        body: { hit, comment } as any,
      });
    },
    onSuccess: (_data, { hit }) => {
      setHitAnswer(hit);
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
    },
    onError: (error: Error) => {
      const errorData = parseApiError(error.message);
      toast({
        title: "Couldn't save that",
        description: errorData?.error || "Something went wrong saving your feedback. Please try again.",
        variant: "destructive",
      });
    },
  });

  const answered = hitAnswer !== null;
  const disabledBase = hitMutation.isPending || answered || !reminderId;

  return (
    <div className="flex items-center justify-center gap-1.5 flex-wrap text-xs text-gray-500">
      <span>Let us know did</span>
      <button
        onClick={() => hitMutation.mutate({ hit: true })}
        disabled={disabledBase}
        className={`px-2 py-0.5 rounded-full text-xs font-semibold border transition-colors ${
          hitAnswer === true
            ? "bg-[#22C55E] text-white border-[#22C55E]"
            : "bg-white text-[#1B2A5E] border-[#C9A063] hover:bg-[#FDF3E3] disabled:opacity-50"
        }`}
        data-testid="button-it-hit"
      >
        It Hit 🎯
      </button>
      <span>or</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            disabled={disabledBase}
            className={`px-2 py-0.5 rounded-full text-xs font-semibold border transition-colors ${
              hitAnswer === false
                ? "bg-gray-400 text-white border-gray-400"
                : "bg-white text-[#1B2A5E] border-[#C9A063] hover:bg-[#FDF3E3] disabled:opacity-50"
            }`}
            data-testid="button-hit-nahh"
          >
            Nahh 😒
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="min-w-[10rem]">
          {NAHH_REASONS.map((reason) => (
            <DropdownMenuItem
              key={reason}
              onClick={() => hitMutation.mutate({ hit: false, comment: reason })}
              data-testid={`option-nahh-${reason.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {reason}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem
            onClick={() => hitMutation.mutate({ hit: false })}
            className="text-gray-500"
            data-testid="option-nahh-skip"
          >
            Skip
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
