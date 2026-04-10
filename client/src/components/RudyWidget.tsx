import { useState, useEffect, useRef } from "react";

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
};

const IDLE_CYCLE = [
  RUDY_IMAGES.idle,
  RUDY_IMAGES.sittingFloor,
  RUDY_IMAGES.idleSwap,
  RUDY_IMAGES.sittingForwardArmsCrossed,
  RUDY_IMAGES.standingArmsCrossedSideways,
  RUDY_IMAGES.fistBumpStandingSmirk,
];

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
      "Oh look, choosing the soft option. Typical.",
      "Gentle mode. For people who like being ignored.",
    ],
    positive: [
      "Gentle is still showing up. That counts.",
      "Starting soft is still starting. Respect.",
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
  if (niceMode) {
    const pool = cat.positive;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  const useRude = Math.random() < 0.7;
  const pool = useRude ? cat.rude : cat.positive;
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
  streak:               RUDY_IMAGES.fistBumpStandingAngry,
  manage_did_it:        RUDY_IMAGES.fistBumpSitting,
  manage_didnt_do_it:   RUDY_IMAGES.sittingForwardArmsCrossed,
  manage_overdue:       RUDY_IMAGES.sittingBench,
  manage_load:          RUDY_IMAGES.sittingForwardArmsCrossed,
  slider_1:             RUDY_IMAGES.standingArmsCrossedSideways,
  slider_2:             RUDY_IMAGES.standingArmsCrossedSideways,
  slider_3:             RUDY_IMAGES.sittingUpright,
  slider_4:             RUDY_IMAGES.fistBumpStandingAngry,
  slider_5:             RUDY_IMAGES.fistBumpStandingAngry,
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
  nudgeEvent?: RudyEventType;
  nudgeKey?: number;
  onNudgeHandled?: () => void;
  showReactionBubble?: boolean;
  showPremiumButton?: boolean;
  onPremiumPress?: () => void;
}

export default function RudyWidget({ nudgeEvent, nudgeKey, onNudgeHandled, showReactionBubble, showPremiumButton, onPremiumPress }: RudyWidgetProps) {

  // ─── Nice Mode ─────────────────────────────────────────────────────────────
  const [niceMode, setNiceMode] = useState(() => localStorage.getItem('rudy_nice_mode') === 'true');
  useEffect(() => {
    const handleStorage = () => setNiceMode(localStorage.getItem('rudy_nice_mode') === 'true');
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // ─── SYSTEM 3: Idle image cycle ────────────────────────────────────────────
  const idleCycleIdxRef = useRef(0);
  const isActiveRef     = useRef(false); // true while an event/tap image is showing
  const [rudyImg, setRudyImg] = useState(IDLE_CYCLE[0]);

  // ─── SYSTEM 1: Slogan — runs every 20s, never interrupted ──────────────────
  const [sloganText, setSloganText] = useState(() => getRudyLine("idle", localStorage.getItem('rudy_nice_mode') === 'true'));

  // ─── SYSTEM 2: Reaction — shows on trigger, hides after 8s ────────────────
  const [reactionText, setReactionText]       = useState("");
  const [reactionVisible, setReactionVisible] = useState(false);
  const reactionTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFireTimeRef   = useRef(0); // cooldown — prevents rapid-fire spam

  // Keep onNudgeHandled in a ref so timers never close over a stale value
  const onNudgeHandledRef = useRef(onNudgeHandled);
  useEffect(() => { onNudgeHandledRef.current = onNudgeHandled; }, [onNudgeHandled]);

  // ─── SYSTEM 1: Slogan interval ─────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setSloganText(getRudyLine("idle", niceMode));
    }, 20000);
    return () => clearInterval(interval);
  }, [niceMode]);

  // ─── SYSTEM 3: Idle image cycle interval ───────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (isActiveRef.current) return;
      const next = (idleCycleIdxRef.current + 1) % IDLE_CYCLE.length;
      idleCycleIdxRef.current = next;
      setRudyImg(IDLE_CYCLE[next]);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // ─── SYSTEM 2: fireReaction helper ─────────────────────────────────────────
  // image: optional Rudy image to show during reaction (restored after)
  // callHandled: whether to call onNudgeHandled when reaction expires
  // force: skip cooldown (used for important events like reminder_created)
  function fireReaction(text: string, image?: string, callHandled = false, force = false) {
    console.log('fireReaction called:', text, '| visible:', reactionVisible, '| force:', force);
    const now = Date.now();
    // 2-second cooldown — ignore rapid-fire taps and slider drags
    if (!force && reactionVisible && now - lastFireTimeRef.current < 2000) {
      console.log('fireReaction BLOCKED by cooldown');
      return;
    }
    lastFireTimeRef.current = now;
    if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    if (image) {
      isActiveRef.current = true;
      setRudyImg(image);
    }
    setReactionText(text);
    setReactionVisible(true);
    reactionTimerRef.current = setTimeout(() => {
      setReactionVisible(false);
      if (image) {
        isActiveRef.current = false;
        setRudyImg(IDLE_CYCLE[idleCycleIdxRef.current]);
      }
      if (callHandled) onNudgeHandledRef.current?.();
    }, 8000);
  }

  // ─── Nudge events ──────────────────────────────────────────────────────────
  useEffect(() => {
    console.log('Rudy nudge fired:', nudgeEvent, nudgeKey);
    if (!nudgeEvent) return;
    const line  = getRudyLine(EVENT_LINE_KEY[nudgeEvent], niceMode);
    const force = HIGH_PRIORITY.has(nudgeEvent);
    fireReaction(line, EVENT_IMAGE[nudgeEvent], true, force);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nudgeEvent, nudgeKey]);

  // ─── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    };
  }, []);

  // ─── Tap handler ───────────────────────────────────────────────────────────
  function handleTap() {
    fireReaction("You give me a dap, now let's get to work.", RUDY_IMAGES.fistBumpStandingSmirk, false);
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      onClick={handleTap}
      style={{
        minHeight: "120px",
        background: "#FDF3E3",
        border: "1px solid #C9A063",
        borderRadius: "12px",
        padding: "10px 12px",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "10px",
        position: "relative",
        cursor: "pointer",
        userSelect: "none",
        marginTop: "8px",
      }}
    >
      {/* ── Rudy image (80×80, blend mode) ─────────────────────────────────── */}
      <img
        src={rudyImg}
        alt="Rudy"
        style={{
          width: "80px",
          height: "80px",
          objectFit: "contain",
          flexShrink: 0,
          alignSelf: "center",
          mixBlendMode: "multiply",
        }}
      />

      {/* ── Bubble column ───────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, minWidth: 0 }}>

        {/* SLOGAN BUBBLE — top, always visible, never interrupted */}
        <div
          style={{
            position: "relative",
            background: "white",
            border: "2px solid black",
            borderRadius: "12px",
            padding: "8px 12px",
          }}
        >
          {/* Triangle outer — black border */}
          <div style={{
            position: "absolute",
            left: "-10px",
            top: "50%",
            transform: "translateY(-50%)",
            width: 0,
            height: 0,
            borderTop: "8px solid transparent",
            borderBottom: "8px solid transparent",
            borderRight: "10px solid black",
          }} />
          {/* Triangle inner — white fill */}
          <div style={{
            position: "absolute",
            left: "-7px",
            top: "50%",
            transform: "translateY(-50%)",
            width: 0,
            height: 0,
            borderTop: "6px solid transparent",
            borderBottom: "6px solid transparent",
            borderRight: "8px solid white",
          }} />
          <p style={{
            fontSize: "12px",
            color: "black",
            fontStyle: "italic",
            margin: 0,
            lineHeight: "1.35",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as const,
            overflow: "hidden",
          }}>
            {sloganText}
          </p>
        </div>

        {/* REACTION BUBBLE / PREMIUM BUTTON — bottom slot */}
        {showPremiumButton ? (
          <button
            onClick={(e) => { e.stopPropagation(); onPremiumPress?.(); }}
            style={{
              backgroundColor: '#C53B3B',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '8px 14px',
              fontWeight: 'bold',
              fontSize: '12px',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            🔥 Go Premium
          </button>
        ) : showReactionBubble !== false ? (
          <div
            style={{
              visibility: reactionVisible ? "visible" : "hidden",
              position: "relative",
              background: "white",
              border: "2px solid black",
              borderRadius: "12px",
              padding: "8px 12px",
            }}
          >
            {/* Triangle outer — black border */}
            <div style={{
              position: "absolute",
              left: "-10px",
              top: "50%",
              transform: "translateY(-50%)",
              width: 0,
              height: 0,
              borderTop: "8px solid transparent",
              borderBottom: "8px solid transparent",
              borderRight: "10px solid black",
            }} />
            {/* Triangle inner — white fill */}
            <div style={{
              position: "absolute",
              left: "-7px",
              top: "50%",
              transform: "translateY(-50%)",
              width: 0,
              height: 0,
              borderTop: "6px solid transparent",
              borderBottom: "6px solid transparent",
              borderRight: "8px solid white",
            }} />
            <p style={{
              fontSize: "12px",
              color: "#C53B3B",
              fontWeight: "bold",
              margin: 0,
              lineHeight: "1.35",
            }}>
              {reactionText}
            </p>
          </div>
        ) : null}

      </div>
    </div>
  );
}
