import { afterEach, describe, expect, it, vi } from 'vitest';
import { PublicApiError, type StreamEvent } from '../../lib/chatTypes';
import { createHttpChatClient } from './chatClient';

const URL = 'https://chat.example.test/';
const REF = { conversationId: 'conv_test_0001', visitorToken: 'token' };

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('HTTP chat client', () => {
  it('parses NDJSON events split across network chunks', async () => {
    const fetchMock = vi.fn(async () => new Response(streamOf(['{"type":"delta","te', 'xt":"Hi "}\n{"type":"delta","text":"there"}\n{"type":"do', 'ne","outcome":"answered"}']), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const events: StreamEvent[] = [];
    for await (const e of createHttpChatClient(URL).sendMessage('pk_demo_test', REF, 'Hello?')) events.push(e);

    expect(events).toEqual([
      { type: 'delta', text: 'Hi ' },
      { type: 'delta', text: 'there' },
      { type: 'done', outcome: 'answered' },
    ]);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ action: 'message', widgetKey: 'pk_demo_test', ...REF, text: 'Hello?' });
    expect((init.headers as Record<string, string>)['Content-Type']).toMatch(/^text\/plain/);
  });

  it('surfaces the server error message and status', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'This website is not allowed to use this widget.' }), { status: 403 })));
    await expect(createHttpChatClient(URL).getConfig('pk_demo_test')).rejects.toMatchObject({
      message: 'This website is not allowed to use this widget.',
      status: 403,
    });
  });

  it('treats a missing conversation as null so the widget starts over', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Conversation not found.' }), { status: 404 })));
    await expect(createHttpChatClient(URL).getTranscript('pk_demo_test', REF)).resolves.toBeNull();
  });

  it('reports network failures as a friendly error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    await expect(createHttpChatClient(URL).start('pk_demo_test')).rejects.toBeInstanceOf(PublicApiError);
  });

  it('falls back to safe defaults for an unexpected brand color', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ businessName: 'Shop', brandColor: 'red;background:url(x)' }), { status: 200 })));
    const config = await createHttpChatClient(URL).getConfig('pk_demo_test');
    expect(config.brandColor).toBe('#4f46e5');
    expect(config.suggestedQuestions).toEqual([]);
  });
});
