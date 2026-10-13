// Cloudflare Worker: thin proxy between the Spendly app and the Claude API.
// The API key lives only here (as a secret), never inside the app.

const MODEL = 'claude-haiku-5-5';
const MAX_CONTEXT_CHARS = 200_000;

const SYSTEM = `You are the assistant inside Spendly, a personal expense tracker app.
Answer questions about the user's spending using ONLY the JSON data provided below.

Rules:
- All totals in the data are already calculated. Quote them directly; do not re-add numbers yourself unless you must combine two or three values, and then double-check.
- "monthlySummaries" covers the last 12 months with per-category totals. "recentExpenses" lists individual items (latest first). If a question needs older line items than are available, say so.
- Use the currency symbol from the data. Format amounts like ₹1,250.
- Be concise: 1-4 short sentences, or a short list for breakdowns. No markdown headers.
- If the data does not contain the answer, say so plainly. Never invent expenses.
- Today's date is given in the data; use it to resolve "this month", "last week", etc.
- You can give brief, practical saving tips when asked, but stay grounded in the data.`;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// Anthropic requires the first message to be from the user and roles to alternate.
function normalize(messages) {
  const out = [];
  for (const m of messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') continue;
    const content = m.content.slice(0, 2000);
    if (!content.trim()) continue;
    if (out.length === 0 && m.role !== 'user') continue;
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.content += '\n' + content;
    else out.push({ role: m.role, content });
  }
  return out;
}

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405);

    // Optional shared token: set APP_TOKEN as a secret and the same value in the app to block casual abuse.
    if (env.APP_TOKEN && request.headers.get('x-app-token') !== env.APP_TOKEN) {
      return json({ error: 'Unauthorized' }, 401);
    }
    if (!env.ANTHROPIC_API_KEY) return json({ error: 'Server is missing ANTHROPIC_API_KEY' }, 500);

    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

    const messages = normalize(Array.isArray(body.messages) ? body.messages.slice(-10) : []);
    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
      return json({ error: 'No question provided' }, 400);
    }

    const contextText = JSON.stringify(body.context ?? {});
    if (contextText.length > MAX_CONTEXT_CHARS) return json({ error: 'Context too large' }, 413);

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: env.MODEL || MODEL,
        max_tokens: 600,
        system: `${SYSTEM}\n\n<expense_data>\n${contextText}\n</expense_data>`,
        messages,
      }),
    });

    if (!upstream.ok) {
      const t = await upstream.text();
      console.log('Upstream error', upstream.status, t);
      return json({ error: `AI service error (${upstream.status})` }, 502);
    }
    const data = await upstream.json();
    const reply = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    return json({ reply });
  },
};
