import { PublicApiError, type PublicChatClient, type PublicWidgetConfig, type StreamEvent } from '../../lib/chatTypes';
import type { ChatMessage } from '../../lib/types';

/**
 * Widget client for the deployed public-chat Lambda function URL. Requests
 * carry only the public widget key and, for an existing chat, the
 * conversation id plus the visitor's own token. Message replies stream back
 * as newline-delimited JSON events.
 */

const CONFIG_CACHE_MS = 5 * 60_000;
const OFFLINE_MESSAGE = 'Can\u2019t reach the assistant right now. Check your connection and try again.';

function readCache(key: string): PublicWidgetConfig | null {
  try {
    const raw = sessionStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as { at: number; config: PublicWidgetConfig }) : null;
    return parsed && Date.now() - parsed.at < CONFIG_CACHE_MS ? parsed.config : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, config: PublicWidgetConfig) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), config }));
  } catch {
    // Storage can be unavailable (privacy mode, sandboxed iframes); caching is optional.
  }
}

async function errorFrom(res: Response): Promise<PublicApiError> {
  const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
  const message = typeof body?.error === 'string' ? body.error : `The assistant is unavailable (HTTP ${res.status}).`;
  return new PublicApiError(message, res.status);
}

export function createHttpChatClient(endpoint: string): PublicChatClient {
  async function post(body: Record<string, unknown>): Promise<Response> {
    try {
      // text/plain keeps this a CORS "simple request", so browsers skip the preflight round trip.
      return await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(body) });
    } catch {
      throw new PublicApiError(OFFLINE_MESSAGE);
    }
  }

  async function call<T>(body: Record<string, unknown>): Promise<T> {
    const res = await post(body);
    if (!res.ok) throw await errorFrom(res);
    return (await res.json()) as T;
  }

  return {
    simulated: false,

    async getConfig(widgetKey) {
      const cacheKey = `aos-support:config:${widgetKey}`;
      const cached = readCache(cacheKey);
      if (cached) return cached;
      const raw = await call<Partial<Record<keyof PublicWidgetConfig, unknown>>>({ action: 'config', widgetKey });
      const config: PublicWidgetConfig = {
        widgetKey,
        businessName: typeof raw.businessName === 'string' ? raw.businessName : 'Support',
        greeting: typeof raw.greeting === 'string' && raw.greeting ? raw.greeting : 'Hi! How can I help?',
        brandColor: typeof raw.brandColor === 'string' && /^#[0-9a-f]{6}$/i.test(raw.brandColor) ? raw.brandColor : '#4f46e5',
        suggestedQuestions: Array.isArray(raw.suggestedQuestions) ? raw.suggestedQuestions.filter((q): q is string => typeof q === 'string') : [],
      };
      writeCache(cacheKey, config);
      return config;
    },

    start(widgetKey, pageUrl) {
      return call({ action: 'start', widgetKey, pageUrl });
    },

    async getTranscript(widgetKey, ref) {
      try {
        const { messages } = await call<{ messages: ChatMessage[] }>({ action: 'transcript', widgetKey, ...ref });
        return messages;
      } catch (e) {
        if (e instanceof PublicApiError && e.status === 404) return null;
        throw e;
      }
    },

    async *sendMessage(widgetKey, ref, text) {
      const res = await post({ action: 'message', widgetKey, ...ref, text });
      if (!res.ok || !res.body) throw await errorFrom(res);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        let newline: number;
        while ((newline = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (line) yield JSON.parse(line) as StreamEvent;
        }
        if (done) break;
      }
      if (buffer.trim()) yield JSON.parse(buffer) as StreamEvent;
    },

    async submitHandoff(widgetKey, ref, input) {
      await call({ action: 'handoff', widgetKey, ...ref, handoff: input });
    },
  };
}
