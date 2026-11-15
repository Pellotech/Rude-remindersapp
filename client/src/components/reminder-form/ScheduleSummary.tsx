// Create Reminder form: the little summary bar once a date and time are picked.
import { format } from "date-fns";
import type { UseFormReturn } from "react-hook-form";
import { toZoned, formValueToInstant } from "@/lib/timeZone";
import type { ReminderFormData } from "./schema";

export function ScheduleSummary({ form, selectedVoice, voiceCharacters, attachmentsCount, selectedCategory }: {
  form: UseFormReturn<ReminderFormData>;
  selectedVoice: string;
  voiceCharacters: any[];
  attachmentsCount: number;
  selectedCategory: string;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 bg-reem-cream rounded-lg border border-reem-gold">
      {/* Left: time or day count */}
      <span className="text-sm font-medium text-reem-ink">
        {form.watch("isMultiDay")
          ? `${form.watch("selectedDays")?.length || 0} days selected`
          : form.watch("scheduledFor")
            ? format(toZoned(formValueToInstant(form.watch("scheduledFor") || "")), "EEE, MMM d • h:mm a")
            : ""}
      </span>

      {/* Right: compact icon indicators */}
      <div className="flex items-center gap-2 text-reem-gold">
        <span className="text-xs font-medium">🔔 Lv.{form.watch("rudenessLevel")}</span>

        {selectedVoice && selectedVoice !== "default" && (
          <span className="text-xs font-medium">
            🎙️ {(voiceCharacters as any[]).find((v: any) => v.id === selectedVoice)?.name?.split(" ")[0] || "Voice"}
          </span>
        )}

        {attachmentsCount > 0 && (
          <span className="text-xs font-medium">📷 x{attachmentsCount}</span>
        )}

        {selectedCategory && (
          <span className="text-xs">💬</span>
        )}

        {form.watch("isMultiDay") && (form.watch("selectedDays")?.length || 0) > 0 && (
          <span className="text-xs font-medium">📅 x{form.watch("selectedDays")?.length}</span>
        )}
      </div>
    </div>
  );
}
