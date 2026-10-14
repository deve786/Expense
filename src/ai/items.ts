import { ASK_MODEL, describeError, hasApiKey, requestText } from './client';
import { addAiLog } from './logger';

export interface ItemGuessOptions {
  title: string;
  category?: string;
  itemCount: number;
  existingNames?: string[];
}

/**
 * Uses Gemini to generate or extract clean, appropriate item names for an expense split into items.
 * If the user has already filled any item name, the AI's generated names replace them.
 */
export async function guessItemNamesWithAI(options: ItemGuessOptions): Promise<string[] | null> {
  const title = options.title.trim();
  const existing = (options.existingNames || []).map((n) => n.trim()).filter(Boolean);

  if (!hasApiKey()) return null;
  if (!title && existing.length === 0) return null;

  const count = Math.max(1, options.itemCount);
  const prompt = `Expense title: "${title || 'Expense'}"
Category: ${options.category || 'General'}
Items count requested: ${count}
Existing item names: ${JSON.stringify(options.existingNames || [])}

Task:
Generate clean, concise item names (1-3 words each, Title Case, e.g. "Pepperoni Pizza", "Garlic Bread", "Movie Ticket", "Coffee").
1. If the title lists or implies specific items (e.g. "burger and fries" or "milk, eggs, bread"), extract those item names.
2. If existing names were already filled by the user (even if rough or partial), replace them with proper, polished item names matching the context.
3. If title is a general store or category (e.g. "Starbucks", "Grocery run", "Pharmacy"), invent realistic item names matching the title and category.

Return ONLY a raw JSON array of strings containing the item names (at least ${count} items), like:
["Item Name 1", "Item Name 2"]
No markdown formatting, no backticks, no other text.`;

  try {
    const raw = await requestText({
      model: ASK_MODEL,
      system: 'You are an expense itemizer. Return only a raw JSON array of strings, nothing else.',
      user: prompt,
      retries: 0,
    });

    const clean = raw.replace(/```json|```/gi, '').trim();
    const arrayMatch = clean.match(/\[[\s\S]*\]/);
    if (!arrayMatch) throw new Error('AI response was not a valid JSON array');

    const parsed = JSON.parse(arrayMatch[0]);
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Empty array returned');

    const names = parsed.map((it) => String(it || '').trim()).filter(Boolean);
    if (names.length === 0) return null;

    addAiLog({
      type: 'categorize',
      title: `Split Items: "${title || existing.join(', ')}"`,
      status: 'success',
      result: names.join(', '),
      model: ASK_MODEL,
    });

    return names;
  } catch (err) {
    const errDesc = describeError(err);
    addAiLog({
      type: 'categorize',
      title: `Split Items: "${title}"`,
      status: 'error',
      error: errDesc,
      model: ASK_MODEL,
    });
    return null;
  }
}
