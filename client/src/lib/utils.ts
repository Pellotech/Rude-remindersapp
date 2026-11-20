import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"
import { fontSizes } from "./theme"

// Teach tailwind-merge our text sizes (text-body-lg …) so it doesn't mistake
// them for text colours and drop one when both are used together.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: Object.keys(fontSizes) }],
    },
  },
})

/** Quotes already arrive as "…" - Author; only add quotation marks if missing. */
export function quoteForDisplay(quote: string): string {
  const q = quote.trim();
  return /^["“«„「『]/.test(q) ? q : `“${q}”`;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
