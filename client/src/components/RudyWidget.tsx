import { useState, useEffect, useRef } from "react";

const RUDY_IMAGES = {
  idle:           "/rudy/Rudy_leaning_2_transparent.png",
  idleSwap:       "/rudy/Rudy_idle_smile_transparent.png",
  sittingFloor:   "/rudy/Rudy_sitting_floor_transparent.png",
  sittingUpright: "/rudy/Rudy_sitting_upright_transparent.png",
  sittingBench:   "/rudy/Rudy_sitting_bench_transparent.png",
  creating:       "/rudy/Rudy_standing_angry_transparent.png",
  done:           "/rudy/Rudy_thumbs_up_smile_transparent.png",
  missed:         "/rudy/Rudy_idle_main_pose_transparent.png",
  tap:            "/rudy/Rudy_pushing_transparent.png",
};

const IDLE_CYCLE = [RUDY_IMAGES.idle, RUDY_IMAGES.sittingFloor, RUDY_IMAGES.idleSwap];

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

const getRudyLine = (category: keyof typeof RUDY_LINES): string => {
  const cat = RUDY_LINES[category];
  const useRude = Math.random() < 0.7;
  const pool = useRude ? cat.rude : cat.positive;
  return pool[Math.floor(Math.random() * pool.length)];
};

const TITLE_REACTIONS_RUDE = [
  (t: string) => `"${t}"? Interesting life choice.`,
  (t: string) => `"${t}". Bold. We'll see.`,
  (t: string) => `Oh, "${t}". Another one.`,
];
const TITLE_REACTIONS_POSITIVE = [
  (t: string) => `"${t}". Okay. Let's see if you actually do it.`,
  (t: string) => `"${t}". Setting intentions. I respect it.`,
];

const getTitleReaction = (title: string): string => {
  const useRude = Math.random() < 0.7;
  const pool = useRude ? TITLE_REACTIONS_RUDE : TITLE_REACTIONS_POSITIVE;
  return pool[Math.floor(Math.random() * pool.length)](title);
};

export type RudyEventType =
  | "reminder_created"
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
  | null;

const EVENT_IMAGE: Record<NonNullable<RudyEventType>, string> = {
  reminder_created:     RUDY_IMAGES.done,
  streak:               RUDY_IMAGES.done,
  manage_did_it:        RUDY_IMAGES.done,
  manage_didnt_do_it:   RUDY_IMAGES.missed,
  manage_overdue:       RUDY_IMAGES.sittingBench,
  manage_load:          RUDY_IMAGES.sittingBench,
  slider_1:             RUDY_IMAGES.sittingUpright,
  slider_2:             RUDY_IMAGES.sittingUpright,
  slider_3:             RUDY_IMAGES.sittingUpright,
  slider_4:             RUDY_IMAGES.missed,
  slider_5:             RUDY_IMAGES.missed,
  date_today:           RUDY_IMAGES.sittingFloor,
  date_tomorrow:        RUDY_IMAGES.sittingFloor,
  date_future:          RUDY_IMAGES.done,
  voice:                RUDY_IMAGES.creating,
  photo:                RUDY_IMAGES.creating,
  quotes:               RUDY_IMAGES.creating,
  analytics_this_week:  RUDY_IMAGES.sittingUpright,
  analytics_10_weeks:   RUDY_IMAGES.sittingBench,
  analytics_this_year:  RUDY_IMAGES.done,
  analytics_graph_dip:  RUDY_IMAGES.missed,
};

const EVENT_LINE_KEY: Record<NonNullable<RudyEventType>, keyof typeof RUDY_LINES> = {
  reminder_created:     "reminderCreated",
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
};

export interface RudyWidgetProps {
  nudgeEvent?: RudyEventType;
  nudgeKey?: number;
  onNudgeHandled?: () => void;
  taskTitle?: string;
}

export default function RudyWidget({ nudgeEvent, nudgeKey, onNudgeHandled, taskTitle }: RudyWidgetProps) {
  const [rudyImg, setRudyImg] = useState(IDLE_CYCLE[0]);
  const [bubbleText, setBubbleText] = useState(() => getRudyLine("idle"));
  const [bubbleVisible, setBubbleVisible] = useState(true);

  const idleCycleIdxRef = useRef(0);
  const modeRef         = useRef<"idle" | "tapped" | "event" | "title">("idle");
  const timersRef       = useRef<ReturnType<typeof setTimeout>[]>([]);
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function addTimer(fn: () => void, delay: number) {
    const id = setTimeout(fn, delay);
    timersRef.current.push(id);
    return id;
  }

  function clearAllTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  function returnToIdle() {
    setBubbleVisible(false);
    addTimer(() => {
      setRudyImg(IDLE_CYCLE[idleCycleIdxRef.current]);
      setBubbleText(getRudyLine("idle"));
      setBubbleVisible(true);
      modeRef.current = "idle";
    }, 350);
  }

  // Idle image cycle every 12 seconds (3-image rotation)
  useEffect(() => {
    const interval = setInterval(() => {
      if (modeRef.current !== "idle") return;
      const next = (idleCycleIdxRef.current + 1) % IDLE_CYCLE.length;
      idleCycleIdxRef.current = next;
      setRudyImg(IDLE_CYCLE[next]);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // Idle bubble rotation every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (modeRef.current !== "idle") return;  // guard FIRST — never touch bubble when in event/title/tapped mode
      setBubbleVisible(false);
      const tid = setTimeout(() => {
        if (modeRef.current !== "idle") return;
        setBubbleText(getRudyLine("idle"));
        setBubbleVisible(true);
      }, 350);
      timersRef.current.push(tid);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // taskTitle — 800ms debounce, takes priority over nudgeEvent
  useEffect(() => {
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    if (!taskTitle) {
      if (modeRef.current === "title") returnToIdle();
      return;
    }
    titleDebounceRef.current = setTimeout(() => {
      clearAllTimers();
      modeRef.current = "title";
      setRudyImg(RUDY_IMAGES.creating);
      const line = taskTitle.trim().length >= 3
        ? getTitleReaction(taskTitle.trim())
        : getRudyLine("creating_generic");
      setBubbleVisible(false);
      addTimer(() => {
        setBubbleText(line);
        setBubbleVisible(true);
      }, 200);
    }, 800);
    return () => {
      if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    };
  }, [taskTitle]);

  // nudgeEvent handler — re-runs whenever nudgeKey changes, even for repeat events
  useEffect(() => {
    if (!nudgeEvent) return;
    if (modeRef.current === "title") return;
    clearAllTimers();
    modeRef.current = "event";
    setRudyImg(EVENT_IMAGE[nudgeEvent]);
    const line = getRudyLine(EVENT_LINE_KEY[nudgeEvent]);
    setBubbleVisible(false);
    addTimer(() => {
      setBubbleText(line);
      setBubbleVisible(true);
    }, 200);
    addTimer(() => {
      returnToIdle();
      addTimer(() => onNudgeHandled?.(), 400);
    }, 3000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nudgeEvent, nudgeKey]);

  function handleTap() {
    if (modeRef.current === "event") return;
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    clearAllTimers();
    modeRef.current = "tapped";
    setRudyImg(RUDY_IMAGES.tap);
    const line = getRudyLine("tapped");
    setBubbleVisible(false);
    addTimer(() => {
      setBubbleText(line);
      setBubbleVisible(true);
    }, 150);
    addTimer(() => {
      setRudyImg(IDLE_CYCLE[idleCycleIdxRef.current]);
    }, 1200);
    addTimer(() => returnToIdle(), 3000);
  }

  return (
    <div
      onClick={handleTap}
      className="flex items-center bg-[#FDF3E3] border border-[#C9A063] rounded-[12px] px-3 mt-2 gap-3"
      style={{ height: "90px", cursor: "pointer", userSelect: "none" }}
    >
      <img
        src={rudyImg}
        alt="Rudy"
        style={{
          width: "64px",
          height: "64px",
          objectFit: "contain",
          flexShrink: 0,
          mixBlendMode: "multiply",
        }}
      />
      <div
        className="flex-1 bg-white rounded-full px-4 py-2"
        style={{
          border: "1px solid #E5D5B0",
          minHeight: "40px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <p
          className="text-[11px] text-[#111827] leading-snug"
          style={{
            opacity: bubbleVisible ? 1 : 0,
            transition: "opacity 0.35s ease",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as const,
            overflow: "hidden",
          }}
        >
          {bubbleText}
        </p>
      </div>
    </div>
  );
}
