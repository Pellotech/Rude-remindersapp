import { log as slog } from "../utils/logger";

/**
 * moderationService — screens text for genuinely harmful content before it's
 * saved as a reminder, and screens AI-generated reminder text before it's
 * sent to a user.
 *
 * Uses OpenAI's free Moderation endpoint (omni-moderation-latest). Only a
 * deliberately narrow set of categories triggers a block — ordinary
 * rudeness, dark humor, and mild profanity (which this app relies on) are
 * NOT touched. Blocked categories: real-world violence, sexual content
 * involving minors, self-harm encouragement/instructions, illegal activity,
 * and credible threats.
 *
 * Design choices, on purpose:
 *  - Fails OPEN, not closed. If the OpenAI call errors (network issue, rate
 *    limit, misconfigured key) or OPENAI_API_KEY isn't set, content is
 *    allowed through and the failure is logged. A moderation outage should
 *    never be able to take down the app's core "create a reminder" feature.
 *  - Sexual content involving minors gets no special-cased message anywhere
 *    in the app — it's rejected with the exact same generic wording as every
 *    other blocked category, so nothing in the UI reveals what was detected.
 */

// Categories worth a hard block. Deliberately narrow — see file header.
// Note: "hate" (dehumanizing/discriminatory language targeting a protected
// group — religion, race, gender, etc.) is blocked even without an explicit
// threat. General religious/political irreverence, criticism, or dark humor
// is NOT what this category catches — OpenAI's classifier targets genuinely
// hateful, dehumanizing language, not mockery or disagreement.
const BLOCKED_CATEGORIES = new Set([
  "violence",
  "violence/graphic",
  "sexual/minors",
  "hate",
  "self-harm",
  "self-harm/intent",
  "self-harm/instructions",
  "illicit",
  "illicit/violent",
  "harassment/threatening",
  "hate/threatening",
]);

interface ModerationResult {
  flagged: boolean;
  categories: string[];
}

interface OpenAIModerationResponse {
  results: Array<{
    flagged: boolean;
    categories: Record<string, boolean>;
  }>;
}

let warnedMissingKey = false;

/**
 * Checks a piece of text against the blocked categories.
 * Returns { flagged: false, categories: [] } if the text is empty, the
 * check can't run (no key), or the API call fails — see file header on why
 * this fails open rather than closed.
 */
export async function checkContent(text: string): Promise<ModerationResult> {
  const trimmed = (text || "").trim();
  if (!trimmed) {
    return { flagged: false, categories: [] };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      slog.error("moderation_not_configured", {
        message: "OPENAI_API_KEY is not set — content moderation is disabled. Add it in Replit Secrets.",
      });
    }
    return { flagged: false, categories: [] };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "omni-moderation-latest",
        input: trimmed,
      }),
    });

    if (!response.ok) {
      throw new Error(`Moderation API error: ${response.status} ${response.statusText}`);
    }

    const data: OpenAIModerationResponse = await response.json();
    const result = data.results?.[0];
    if (!result) {
      return { flagged: false, categories: [] };
    }

    const triggeredCategories = Object.entries(result.categories)
      .filter(([category, isFlagged]) => isFlagged && BLOCKED_CATEGORIES.has(category))
      .map(([category]) => category);

    return {
      flagged: triggeredCategories.length > 0,
      categories: triggeredCategories,
    };
  } catch (error) {
    slog.error("moderation_check_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    // Fail open — see file header.
    return { flagged: false, categories: [] };
  }
}

export const moderationService = { checkContent };
