import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { tr, trList } from "@/i18n";
import { useQuery } from "@tanstack/react-query";

import { palette } from "@/lib/theme";
const RUDY_IMAGES = {
  idle:                       "/rudy/Rudy_leaning_2_transparent.png",
  idleSwap:                   "/rudy/Rudy_idle_smile_transparent.png",
  sittingFloor:               "/rudy/Rudy_sitting_floor_transparent.png",
  sittingUpright:             "/rudy/Rudy_sitting_upright_transparent.png",
  sittingBench:               "/rudy/Rudy_sitting_bench_transparent.png",
  creating:                   "/rudy/Rudy_standing_angry_transparent.png",
  done:                       "/rudy/Rudy_thumbs_up_smile_transparent.png",
  missed:                     "/rudy/Rudy_idle_main_pose_transparent.png",
  tap:                        "/rudy/Rudy_pushing_transparent.png",
  sittingForwardArmsCrossed:  "/rudy/Rudy_sitting_forward_arms_crossed_transparent.png",
  standingArmsCrossedSideways:"/rudy/Rudy_standing_arms_crossed_sideways_transparent.png",
  fistBumpStandingAngry:      "/rudy/big_fist_bump_standing_transparent.png",
  fistBumpStandingSmirk:      "/rudy/fist_bump_standing_transparent.png",
  fistBumpSitting:            "/rudy/fist_bump_sitting_transparent.png",
  punching:                   "/rudy/Rudy_punching_forward_transparent.png",
};

// Reem sits here between reactions, and walks with this image
const PERCH_IMAGE = RUDY_IMAGES.sittingUpright;
const WALK_IMAGE = "/rudy/Rudy_walking_transparent.png";

const RUDY_LINES = {
  idle: {
    rude: [
      "Oh great, you're back. What do you want?",
      "Still here? Bold choice.",
      "*stares at you judgmentally*",
      "You and your 'plans'... cute.",
      "Don't look at me like that.",
      "Another reminder? Sure. That'll fix you.",
      "Most apps remind you. We hold you accountable.",
      "We'll roast you into your best self.",
    ],
    positive: [
      "You showed up. That already puts you ahead of most people.",
      "Good to see you. Now let's get something done.",
      "Every reminder you set is a promise to yourself. Respect.",
      "Started with a laugh. Built a habit.",
      "Your goals deserve more than a gentle nudge.",
    ],
  },
  tapped: {
    rude: [
      "Oi. You tapped me. Now go do something.",
      "Stop poking me and go finish your tasks.",
      "What are you waiting for? Create a reminder.",
      "I'm watching you. Don't disappoint me.",
      "You think this is a game? It is. And you're losing.",
    ],
    positive: [
      "Hey! Bold move. Now channel that energy into your tasks.",
      "You found me. Now go find your motivation.",
      "Tapped for luck. Now go earn it.",
    ],
  },
  creating_generic: {
    rude: [
      "Writing it down won't make you do it...",
      "Oh wow, a reminder. Revolutionary.",
      "Sure, add another one. Sure.",
      "We both know how this ends.",
      "Ooh, ambitious. Love the optimism. Really.",
    ],
    positive: [
      "Take your time. A good reminder is worth setting right.",
      "Every great habit started with someone writing it down.",
      "This is how it starts. One reminder at a time.",
    ],
  },
  reminderCreated: {
    rude: [
      "Nice one. Now actually do it.",
      "Reminder set. No excuses now.",
      "It's in the system. I'm watching.",
    ],
    positive: [
      "Locked in. Now the only thing left is to actually do it.",
      "Set and ready. Future you says thanks.",
      "That's step one. Keep going.",
    ],
  },
  managedidIt: {
    rude: [
      "...Fine. I guess you did the thing.",
      "Okay I'll admit it. You actually did it.",
      "Don't get too smug. There's still tomorrow.",
      "I'm mildly less disappointed. Mildly.",
      "One task. Don't celebrate yet.",
    ],
    positive: [
      "That's what I'm talking about. Keep that energy.",
      "Genuinely proud. Don't tell anyone I said that.",
      "You showed up for yourself. That's the whole game.",
      "Look at you actually doing the thing. Respect.",
    ],
  },
  manageDidntDoIt: {
    rude: [
      "Called it.",
      "Shocked. Truly shocked. Not.",
      "Oh no. Anyway.",
      "I've seen this movie before.",
      "This is my surprised face.",
      "It's giving 'expected'.",
    ],
    positive: [
      "Hey. You logged it honestly. That takes guts. Tomorrow.",
      "Missing one doesn't break a habit. Getting back up does.",
      "Honesty is the first step. Tomorrow is still yours.",
    ],
  },
  streak: {
    rude: [
      "Look at you. Almost forming a habit.",
      "Consistency. Didn't think you had it in you.",
    ],
    positive: [
      "A streak worth protecting. Don't blow it now.",
      "This is what showing up looks like. Keep going.",
    ],
  },
  slider_1: {
    rude: [
      "Sympathy mode. Fine, I'll hold your hand... this once.",
      "Going soft on yourself? I'll allow it. Today.",
    ],
    positive: [
      "Rough day? I've got you. Small steps still count.",
      "Being kind to yourself is still showing up. Proud of you.",
    ],
  },
  slider_2: {
    rude: [
      "Okay, a little nudge. Baby steps.",
      "Motivational. The participation trophy of rudeness.",
    ],
    positive: [
      "Motivational is underrated. Steady wins the race.",
      "A consistent nudge beats a one-time shove. Smart.",
    ],
  },
  slider_3: {
    rude: [
      "Now we're talking. Mediocrity detector activated.",
      "Sarcastic. So you want honesty with a smile. Smart.",
    ],
    positive: [
      "Sarcastic but effective. You clearly know yourself.",
      "Level 3. The sweet spot for most people.",
    ],
  },
  slider_4: {
    rude: [
      "Ooh someone wants tough love. Respect.",
      "Harsh mode. Finally someone who can handle the truth.",
    ],
    positive: [
      "Harsh mode means you're serious. Respect that.",
      "You want real accountability. That's rare.",
    ],
  },
  slider_5: {
    rude: [
      "SAVAGE mode. I like you. You're unhinged.",
      "Full savage. Your future self is already scared.",
    ],
    positive: [
      "Savage. You don't mess around. Neither will I.",
      "Full send. I respect the commitment.",
    ],
  },
  dateToday: {
    rude: [
      "Leaving it to today? Bold. Or lazy. Probably lazy.",
      "Today. Cutting it close as usual, aren't we.",
    ],
    positive: [
      "Today is the only day that's guaranteed. Smart.",
      "No delay. I respect the urgency.",
    ],
  },
  dateTomorrow: {
    rude: [
      "Tomorrow. The most popular day to start things.",
      "Ah yes. Tomorrow. Where dreams go to procrastinate.",
    ],
    positive: [
      "Planning ahead by one day still counts as planning.",
      "Tomorrow works. Just don't let it become next week.",
    ],
  },
  dateFuture: {
    rude: [
      "Planning ahead? Who ARE you?",
      "Look at you, scheduling like a functioning adult. Suspicious.",
    ],
    positive: [
      "Future planning. That's genuinely rare. Keep it up.",
      "Thinking ahead. You might actually be serious about this.",
    ],
  },
  multipleDaysOn: {
    rude: [
      "Multiple days? Look at you, overcommitting already.",
      "Ambitious. We'll see how long that lasts.",
      "Multiple reminders. Bold strategy. Don't bail.",
      "So we're doing this every day now? Let's see you follow through.",
      "Multiple days selected. The excuses are already lining up.",
    ],
    positive: [
      "Multiple days. Now that's how you build a habit.",
      "Look at you planning ahead. Genuinely impressed.",
      "Multiple days selected. This is how it's done.",
      "Consistency is everything. You just proved you get it.",
      "This is exactly how habits get built. Keep going.",
    ],
  },
  multipleDaysOff: {
    rude: [
      "Just one day? Playing it safe as usual.",
      "One day at a time. Manageable. Barely.",
      "Back to one day. Commitment not included.",
      "Scaled it back, huh. Expected.",
    ],
    positive: [
      "One focused day. Quality over quantity. Smart.",
      "One day, full commitment. That works too.",
      "Single day, full focus. Let's make it count.",
      "Sometimes one is all you need. Make it matter.",
    ],
  },
  voice: {
    rude: [
      "Pick a voice. Nothing says accountability like being roasted out loud.",
      "Voice reminders. So you can hear how bad you're slacking.",
    ],
    positive: [
      "A voice reminder hits different. Good call.",
      "Hearing it out loud makes it real. Smart move.",
    ],
  },
  photo: {
    rude: [
      "Add a photo. Your dog didn't ask to be your motivation but here we are.",
      "Post your kid, your pet, your dreams. Don't let them down. I'm watching.",
    ],
    positive: [
      "A photo makes it real. Smart psychological move.",
      "Attaching a face to the goal. That's next level.",
    ],
  },
  quotes: {
    rude: [
      "A motivational quote? Sure. Words have never stopped anyone from procrastinating before.",
      "Pick a quote. Feel inspired. Still do nothing. Classic.",
    ],
    positive: [
      "A good quote can shift your whole mindset. Nice touch.",
      "Words matter. Pair them with action and you're unstoppable.",
    ],
  },
  manageLoad: {
    rude: [
      "Here's your history. Tell the truth. I'm watching.",
      "Manage tab. Where excuses go to die.",
      "All your reminders. All your choices. Own them.",
    ],
    positive: [
      "Your history is right here. Own every entry.",
      "Every entry is data. Use it to get better.",
      "All your choices are here. Make them count.",
    ],
  },
  manageOverdue: {
    rude: [
      "That one's overdue. We don't talk about that one.",
      "Still sitting there unfinished? Bold strategy. Not working though.",
    ],
    positive: [
      "Overdue just means unfinished, not impossible.",
      "It's not too late. Log it and move forward.",
    ],
  },
  analyticsThisWeek: {
    rude: [
      "One week. That's all you've given me. Show me something.",
      "Seven days of data. The jury is still out on you.",
    ],
    positive: [
      "A week of data. You're already building something.",
      "Seven days in. Every streak starts here.",
    ],
  },
  analytics10Weeks: {
    rude: [
      "Ten weeks. This is where habits are actually built. Pay attention.",
      "The 66-day window. Science says this is where it clicks. Don't blow it.",
    ],
    positive: [
      "Ten weeks in the making. This is where it gets real.",
      "You're in the habit formation zone. Keep showing up.",
    ],
  },
  analyticsThisYear: {
    rude: [
      "A whole year of data. Either you're crushing it or you owe me an explanation.",
      "Full year view. This is your legacy. Make it worth looking at.",
    ],
    positive: [
      "A full year of showing up. That's genuinely rare.",
      "Twelve months of data. You built something real here.",
    ],
  },
  analyticsGraphDip: {
    rude: [
      "That dip in the graph? That's you giving up. Fix it.",
      "The line went down. I noticed. Just saying.",
    ],
    positive: [
      "Every dip is just a bounce waiting to happen.",
      "The dip doesn't define you. What you do next does.",
    ],
  },
};

const getRudyLine = (category: keyof typeof RUDY_LINES, niceMode = false): string => {
  const cat = RUDY_LINES[category];
  const pick = (kind: "rude" | "positive"): string[] => {
    const translated = trList(`reemLines.${category}.${kind}`);
    return translated.length ? translated : cat[kind];
  };
  if (niceMode) {
    const pool = pick("positive");
    return pool[Math.floor(Math.random() * pool.length)];
  }
  const useRude = Math.random() < 0.7;
  const pool = pick(useRude ? "rude" : "positive");
  return pool[Math.floor(Math.random() * pool.length)];
};


export type RudyEventType =
  | "reminder_created"
  | "creating_generic"
  | "streak"
  | "manage_did_it"
  | "manage_didnt_do_it"
  | "manage_overdue"
  | "manage_load"
  | "slider_1"
  | "slider_2"
  | "slider_3"
  | "slider_4"
  | "slider_5"
  | "date_today"
  | "date_tomorrow"
  | "date_future"
  | "voice"
  | "photo"
  | "quotes"
  | "analytics_this_week"
  | "analytics_10_weeks"
  | "analytics_this_year"
  | "analytics_graph_dip"
  | "multiple_days_on"
  | "multiple_days_off"
  | null;

const EVENT_IMAGE: Record<NonNullable<RudyEventType>, string> = {
  reminder_created:     RUDY_IMAGES.fistBumpSitting,
  creating_generic:     RUDY_IMAGES.creating,
  streak:               RUDY_IMAGES.fistBumpSitting,
  manage_did_it:        RUDY_IMAGES.fistBumpSitting,
  manage_didnt_do_it:   RUDY_IMAGES.sittingForwardArmsCrossed,
  manage_overdue:       RUDY_IMAGES.sittingBench,
  manage_load:          RUDY_IMAGES.sittingForwardArmsCrossed,
  slider_1:             RUDY_IMAGES.standingArmsCrossedSideways,
  slider_2:             RUDY_IMAGES.standingArmsCrossedSideways,
  slider_3:             RUDY_IMAGES.sittingUpright,
  slider_4:             RUDY_IMAGES.punching,
  slider_5:             RUDY_IMAGES.tap,
  date_today:           RUDY_IMAGES.sittingFloor,
  date_tomorrow:        RUDY_IMAGES.sittingFloor,
  date_future:          RUDY_IMAGES.done,
  voice:                RUDY_IMAGES.creating,
  photo:                RUDY_IMAGES.creating,
  quotes:               RUDY_IMAGES.creating,
  analytics_this_week:  RUDY_IMAGES.sittingUpright,
  analytics_10_weeks:   RUDY_IMAGES.sittingBench,
  analytics_this_year:  RUDY_IMAGES.done,
  analytics_graph_dip:  RUDY_IMAGES.standingArmsCrossedSideways,
  multiple_days_on:     RUDY_IMAGES.fistBumpStandingSmirk,
  multiple_days_off:    RUDY_IMAGES.idle,
};

const EVENT_LINE_KEY: Record<NonNullable<RudyEventType>, keyof typeof RUDY_LINES> = {
  reminder_created:     "reminderCreated",
  creating_generic:     "creating_generic",
  streak:               "streak",
  manage_did_it:        "managedidIt",
  manage_didnt_do_it:   "manageDidntDoIt",
  manage_overdue:       "manageOverdue",
  manage_load:          "manageLoad",
  slider_1:             "slider_1",
  slider_2:             "slider_2",
  slider_3:             "slider_3",
  slider_4:             "slider_4",
  slider_5:             "slider_5",
  date_today:           "dateToday",
  date_tomorrow:        "dateTomorrow",
  date_future:          "dateFuture",
  voice:                "voice",
  photo:                "photo",
  quotes:               "quotes",
  analytics_this_week:  "analyticsThisWeek",
  analytics_10_weeks:   "analytics10Weeks",
  analytics_this_year:  "analyticsThisYear",
  analytics_graph_dip:  "analyticsGraphDip",
  multiple_days_on:     "multipleDaysOn",
  multiple_days_off:    "multipleDaysOff",
};

// Events important enough to override the cooldown and always show immediately
const HIGH_PRIORITY = new Set<RudyEventType>(["reminder_created", "manage_did_it", "manage_didnt_do_it"]);

export interface RudyWidgetProps {
  /** Something the user just did (premium gets a matching reaction). */
  nudgeEvent?: RudyEventType;
  nudgeKey?: number;
  onNudgeHandled?: () => void;
  /** Premium: event-specific reactions. Free: Reem's slogans plus the Go Premium button. */
  isPremium?: boolean;
  onPremiumPress?: () => void;
  /** Colour of the bubble edge (follows the rudeness level). */
  borderColor?: string;
}

type Stage = "hidden" | "walkIn" | "talking" | "walkOut";

const WALK_IN_MS = 700;
const WALK_OUT_MS = 550;
const TALK_MS = 7000;
// Free users: walk in for page activity at most this often (taps on Reem always work)
const FREE_EVENT_COOLDOWN_MS = 60_000;

const popInEnabled = () => {
  try { return localStorage.getItem('reem_pop_in') !== 'false'; } catch { return true; }
};

/**
 * Reem: sits on the edge of the banner, and walks in from the left with a
 * speech bubble when the user does something (or taps him), then walks back.
 *
 * Renders two things:
 *  - the perch: small sitting Reem, absolutely placed so he sits on the line
 *    where the banner meets the page (the parent must be position: relative
 *    and start 32px below the banner — HomeHeader handles this)
 *  - the pop-in: a fixed overlay on the left of the screen (portal to <body>)
 */
export default function RudyWidget({ nudgeEvent, nudgeKey, onNudgeHandled, isPremium = false, onPremiumPress, borderColor }: RudyWidgetProps) {

  // ─── Nice Mode ─────────────────────────────────────────────────────────────
  const [niceMode, setNiceMode] = useState(() => localStorage.getItem('rudy_nice_mode') === 'true');

  const { data: userData } = useQuery<any>({ queryKey: ["/api/auth/user"] });
  useEffect(() => {
    if ((userData as any)?.niceMode !== undefined) {
      setNiceMode((userData as any).niceMode);
      localStorage.setItem('rudy_nice_mode', (userData as any).niceMode ? 'true' : 'false');
    }
  }, [(userData as any)?.niceMode]);

  useEffect(() => {
    const handler = (e: Event) => setNiceMode((e as CustomEvent).detail);
    window.addEventListener('rudy_nice_mode_changed', handler);
    return () => window.removeEventListener('rudy_nice_mode_changed', handler);
  }, []);

  // ─── Pop-in state ──────────────────────────────────────────────────────────
  const [stage, setStage] = useState<Stage>("hidden");
  const stageRef = useRef<Stage>("hidden");
  const [line, setLine] = useState("");
  const [pose, setPose] = useState<string>(RUDY_IMAGES.idle);
  const [withPremium, setWithPremium] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lastFreeShowRef = useRef(0);
  const onNudgeHandledRef = useRef(onNudgeHandled);
  useEffect(() => { onNudgeHandledRef.current = onNudgeHandled; }, [onNudgeHandled]);

  const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const go = (next: Stage) => { stageRef.current = next; setStage(next); };
  const clearTimers = () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; };
  const later = (fn: () => void, ms: number) => { timersRef.current.push(setTimeout(fn, ms)); };

  const leave = () => {
    clearTimers();
    if (stageRef.current === "hidden") return;
    go("walkOut");
    later(() => { go("hidden"); onNudgeHandledRef.current?.(); }, reducedMotion ? 150 : WALK_OUT_MS);
  };

  /** Bring Reem in (or, if he's already out, just change what he says). */
  const popIn = (text: string, image: string, premiumButton: boolean) => {
    setLine(text);
    setPose(image);
    setWithPremium(premiumButton);
    clearTimers();
    if (stageRef.current === "talking" || stageRef.current === "walkIn") {
      if (stageRef.current === "talking") later(leave, TALK_MS);
      else later(() => { go("talking"); later(leave, TALK_MS); }, WALK_IN_MS);
      return;
    }
    go("walkIn");
    later(() => { go("talking"); later(leave, TALK_MS); }, reducedMotion ? 50 : WALK_IN_MS);
  };

  // ─── Something happened on the page ────────────────────────────────────────
  useEffect(() => {
    if (!nudgeEvent) return;
    if (!popInEnabled()) { onNudgeHandledRef.current?.(); return; }
    if (isPremium) {
      popIn(getRudyLine(EVENT_LINE_KEY[nudgeEvent], niceMode), EVENT_IMAGE[nudgeEvent], false);
    } else {
      const now = Date.now();
      if (now - lastFreeShowRef.current < FREE_EVENT_COOLDOWN_MS) { onNudgeHandledRef.current?.(); return; }
      lastFreeShowRef.current = now;
      popIn(getRudyLine("idle", niceMode), RUDY_IMAGES.idle, true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nudgeEvent, nudgeKey]);

  useEffect(() => () => clearTimers(), []);

  // ─── Tapping the sitting Reem always brings him in ─────────────────────────
  const handlePerchTap = () => {
    popIn(
      isPremium ? "You gave me a fist bump, now let's get things done." : getRudyLine("idle", niceMode),
      isPremium ? RUDY_IMAGES.fistBumpStandingSmirk : RUDY_IMAGES.idle,
      !isPremium,
    );
  };

  const edge = borderColor || "#111";
  const visible = stage !== "hidden";
  const walking = stage === "walkIn" || stage === "walkOut";

  const perch = (
    <button
      type="button"
      onClick={handlePerchTap}
      aria-label="Reem"
      data-testid="reem-perch"
      className="reem-perch"
      style={{ opacity: visible ? 0 : 1 }}
    >
      <img src={PERCH_IMAGE} alt="" draggable={false} />
    </button>
  );

  const popInLayer = visible && typeof document !== 'undefined' ? createPortal(
    <div className={`reem-pop reem-pop-${stage}`} dir="ltr" data-testid="reem-pop">
      <img
        src={walking ? WALK_IMAGE : pose}
        alt="Reem"
        className={`reem-pop-figure${stage === "walkOut" ? " reem-pop-flip" : ""}`}
        onClick={() => stage === "talking" && handlePerchTap()}
        draggable={false}
      />
      {stage === "talking" && (
        <div className="reem-pop-bubble" style={{ borderColor: edge }} onClick={leave} role="status">
          <span className="reem-pop-tail" style={{ borderRightColor: edge }} />
          <span className="reem-pop-tail-inner" />
          <p className="reem-pop-line" dir="auto">{line}</p>
          {withPremium && (
            <>
              <p className="reem-pop-teaser">{tr("reem.teaser")}</p>
              <button
                type="button"
                className="reem-pop-premium"
                onClick={(e) => { e.stopPropagation(); leave(); onPremiumPress?.(); }}
              >
                {tr("reem.goPremium")}
              </button>
            </>
          )}
        </div>
      )}
    </div>,
    document.body,
  ) : null;

  return (
    <>
      {perch}
      {popInLayer}
    </>
  );
}
