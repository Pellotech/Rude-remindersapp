/**
 * Makes sure every upcoming reminder has a phone notification scheduled.
 *
 * Why: reminders made OUTSIDE the app — by Siri, or on another device — exist on the
 * server but the phone was never told to alert for them. Each time the app opens or
 * comes back to the front, this quietly schedules any that are missing.
 * (Silent: no toasts, and it never asks for permission — it only works if it's granted.)
 */
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { apiRequest } from "@/lib/queryClient";
import { uuidToNumericId, ensureReminderChannel, REMINDER_CHANNEL_ID } from "@/components/MobileNotifications";

const IOS_PENDING_LIMIT = 60; // iOS keeps at most 64 pending notifications per app
let running = false;

export async function resyncReminderNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform() || running) return;
  running = true;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") return;

    const reminders: any[] = (await apiRequest("/api/reminders", { method: "GET" })) || [];
    const pending = await LocalNotifications.getPending();
    const pendingIds = new Set(pending.notifications.map((n) => Number(n.id)));
    const soon = Date.now() + 5000;

    const missing = reminders
      .filter((r) => !r.completed && !r.notAccomplished && r.scheduledFor && new Date(r.scheduledFor).getTime() > soon)
      .filter((r) => !pendingIds.has(uuidToNumericId(r.id)))
      .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
      .slice(0, Math.max(0, IOS_PENDING_LIMIT - pendingIds.size));

    if (!missing.length) return;
    await ensureReminderChannel();
    await LocalNotifications.schedule({
      notifications: missing.map((r) => ({
        title: r.title || r.originalMessage || "Reminder",
        body: (r.rudeMessage || r.originalMessage || "") + (r.motivationalQuote ? `\n\n💪 ${r.motivationalQuote}` : ""),
        id: uuidToNumericId(r.id),
        schedule: { at: new Date(r.scheduledFor) },
        sound: "beep.wav",
        attachments: [],
        actionTypeId: "OPEN_REMINDER",
        channelId: REMINDER_CHANNEL_ID,
        extra: {
          reminderId: r.id,
          hasMotivation: !!r.motivationalQuote,
          hasAttachments: false,
          shouldPlayVoice: r.voiceNotification,
          voiceCharacter: r.voiceCharacter || "default",
        },
      })),
    });
    console.log(`[Resync] scheduled ${missing.length} missing reminder notification(s)`);
  } catch (e) {
    console.warn("[Resync] skipped:", e);
  } finally {
    running = false;
  }
}
