import Constants from 'expo-constants';
import { buildChatContext } from './chatContext';

export type ChatMsg = { role: 'user' | 'assistant'; content: string };

export function chatProxyUrl(): string {
  const extra = (Constants.expoConfig?.extra ?? {}) as { chatProxyUrl?: string };
  return (extra.chatProxyUrl ?? '').trim();
}

function chatToken(): string {
  const extra = (Constants.expoConfig?.extra ?? {}) as { chatAppToken?: string };
  return (extra.chatAppToken ?? '').trim();
}

export const chatConfigured = () => chatProxyUrl().length > 0;

export async function askBot(history: ChatMsg[], currency: string, budget: number): Promise<string> {
  const url = chatProxyUrl();
  if (!url) throw new Error('Chatbot is not configured yet.');
  const context = await buildChatContext(currency, budget);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(chatToken() ? { 'x-app-token': chatToken() } : {}),
    },
    // Keep only the last 10 turns to stay small and cheap.
    body: JSON.stringify({ messages: history.slice(-10), context }),
  });
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json()).error ?? ''; } catch { /* ignore */ }
    throw new Error(detail || `Server error (${res.status})`);
  }
  const data = (await res.json()) as { reply?: string };
  return data.reply ?? 'Sorry, I could not come up with an answer.';
}
