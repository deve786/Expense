import { ASK_MODEL, hasApiKey, requestText } from './client';

const SYSTEM = 'You categorize personal expenses. Given an expense title and a list of '
  + 'allowed category names, reply with exactly one category name from the list that best '
  + 'fits it — verbatim, nothing else, no punctuation. If none fit well, reply with "Other".';

/**
 * Best-effort category guess for a title the local keyword list didn't recognize.
 * Returns null on any failure (no key configured, rate limit, network, an
 * unparsable reply) — the caller already has "Other" selected as a safe fallback,
 * so there's nothing to show the user beyond hiding the loading state.
 */
export async function guessCategoryWithAI(title: string, categoryNames: string[]): Promise<string | null> {
  if (!hasApiKey() || !title.trim() || categoryNames.length === 0) return null;
  try {
    const reply = await requestText({
      model: ASK_MODEL,
      system: SYSTEM,
      user: `Categories: ${categoryNames.join(', ')}\nExpense title: "${title.trim()}"`,
      retries: 0,
    });
    const clean = reply.trim().replace(/^["'.]+|["'.]+$/g, '');
    return categoryNames.find((n) => n.toLowerCase() === clean.toLowerCase()) ?? null;
  } catch {
    return null;
  }
}
