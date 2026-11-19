// ─────────────────────────────────────────────────────────────────────────────
// THE ONE PLACE for the app's colours and text sizes.
//
// Change a value here and it changes everywhere:
//   • Tailwind classes   — bg-reem-gold, text-ui-label2, border-reem-cream/40,
//                          text-body-lg … (wired up in tailwind.config.ts)
//   • CSS variables      — var(--reem-gold), var(--ui-card) … (for index.css)
//   • Code               — palette.gold, palette.uiCard … (inline styles, charts)
//
// Keep this file free of imports: tailwind.config.ts loads it directly.
// ─────────────────────────────────────────────────────────────────────────────

export const palette = {
  // ── Brand ──────────────────────────────────────────────────────────────────
  gold: "#C9A063",        // main accent: borders, selected states, Reem's gold
  goldDark: "#B8904F",    // gold, pressed / darker edge
  cream: "#FDF3E3",       // warm background for cards and buttons
  creamLight: "#FDF8F0",
  creamDeep: "#F5EDE0",
  sand: "#F0E8D8",
  red: "#C53B3B",         // brand red: Upgrade, primary buttons
  redDark: "#A83232",
  redDeep: "#B70D0D",     // Savage level, selected book dot
  coral: "#FF6B6B",
  navy: "#1B2A5E",        // Create Reminder button
  brown: "#6B3410",       // the book cover

  // ── Text and lines on the light screens ───────────────────────────────────
  ink: "#111827",         // main dark text
  charcoal: "#1A1A1A",
  text: "#374151",
  textSoft: "#4B5563",
  textMuted: "#6B7280",
  textFaint: "#9CA3AF",
  line: "#EAEAEA",
  lineLight: "#E5E7EB",
  paper: "#F9FAFB",

  // ── Rudeness level colours (Sympathy → Harsh; Savage is redDeep) ──────────
  sky: "#38BDF8",
  green: "#22C55E",
  yellow: "#FDE047",
  orange: "#F97316",

  // ── Dark Settings screens (iPhone style) ──────────────────────────────────
  uiCard: "#1C1C1E",      // row / card background
  uiRaised: "#2C2C2E",    // row when pressed, raised panels
  uiSeparator: "#38383A", // lines between rows, unselected tiles
  uiTertiary: "#48484A",  // chevrons
  uiLabel2: "#8E8E93",    // grey secondary text
  uiLabel3: "#AEAEB2",
  uiLabel4: "#E5E5EA",
  uiLink: "#0A84FF",      // blue Back / links

  // ── Concrete Grey (the optional dark main screen; was "Zero Dark Thirty") ─
  concreteWall: "#25292E",   // page background: darkest grey-black
  concreteWidget: "#0E254A", // cards / widgets: deep navy blue
  concreteEdge: "#1B4184",   // widget borders, Voice/Photo/Quotes buttons
  concreteLight: "#CCCCCC",  // top banner, writing areas, Quick Reminder
  concreteOcean: "#2B65CF",  // Create Reminder button, selected tab
  concreteText: "#F7F8FA",   // text on widgets
  concreteMuted: "#979DA4",  // secondary text on widgets
} as const;

export type PaletteName = keyof typeof palette;

/** Rudeness level 1–5 → its colour (the slider, badges, share card, tour). */
export const rudenessColors: Record<number, string> = {
  1: palette.sky,
  2: palette.green,
  3: palette.yellow,
  4: palette.orange,
  5: palette.redDeep,
};

/** Text sizes, used as Tailwind classes: text-title-lg, text-body-lg, text-note … */
export const fontSizes = {
  "title-lg": "34px",   // big page titles (Settings, Notifications…)
  "title-md": "28px",
  "body-lg": "17px",    // Settings rows, main labels
  body: "15px",
  "body-sm": "14px",
  note: "13px",         // section headers, footnotes under rows
  caption: "12px",
  "caption-sm": "11px",
  tiny: "10px",
} as const;

// ── Helpers used by tailwind.config.ts ───────────────────────────────────────
const kebab = (s: string) => s.replace(/[A-Z0-9]/g, (c, i) => (i ? "-" : "") + c.toLowerCase());

/** { reem: { gold, "gold-dark", … }, ui: { card, raised, … } } for Tailwind. */
export function tailwindColors(): { reem: Record<string, string>; ui: Record<string, string> } {
  const reem: Record<string, string> = {};
  const ui: Record<string, string> = {};
  for (const [name, value] of Object.entries(palette)) {
    if (name.startsWith("ui")) ui[kebab(name.slice(2))] = value;
    else reem[kebab(name)] = value;
  }
  return { reem, ui };
}

/** { "--reem-gold": "#C9A063", "--ui-card": "#1C1C1E", … } for :root. */
export function cssVariables(): Record<string, string> {
  const { reem, ui } = tailwindColors();
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries(reem)) vars[`--reem-${k}`] = v;
  for (const [k, v] of Object.entries(ui)) vars[`--ui-${k}`] = v;
  return vars;
}
