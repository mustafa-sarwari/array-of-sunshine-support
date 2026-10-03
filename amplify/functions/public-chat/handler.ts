import { randomBytes, randomUUID } from 'node:crypto';
import type { Writable } from 'node:stream';
import { BedrockRuntimeClient, ConverseStreamCommand, type Message } from '@aws-sdk/client-bedrock-runtime';
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { LambdaFunctionURLEvent } from 'aws-lambda';
import type { KnowledgeItem } from '../../../shared/knowledge';
import { HANDOFF_SENTINEL, buildSystemPrompt, handoffMessage } from '../../../shared/prompt';
import { detectIntent, normalizeText, retrieveApproved } from '../../../shared/retrieval';
import { TABLE_NAME, ddb, hashToken, keys, stripKeys, tokenMatches, ttlFromNow } from '../lib/table';

/**
 * Public widget endpoint (Lambda function URL, RESPONSE_STREAM, no auth).
 *
 * The browser sends only: a public widget key, and for an existing chat the
 * conversation id plus the visitor token it received when the chat started.
 * The business is resolved from the widget key on the server. This endpoint
 * can never list conversations, read another visitor's messages, read draft
 * entries, inquiries, or documents. Bedrock is only called when retrieval
 * finds approved entries, and only those entries are sent to the model.
 */

declare const awslambda: {
  streamifyResponse(
    handler: (event: LambdaFunctionURLEvent, responseStream: Writable) => Promise<void>,
  ): unknown;
  HttpResponseStream: {
    from(stream: Writable, metadata: { statusCode: number; headers?: Record<string, string> }): Writable;
  };
};

const bedrock = new BedrockRuntimeClient({});
const MODEL_ID = process.env.MODEL_ID ?? 'amazon.nova-lite-v1:0';
const MAX_OUTPUT_TOKENS = Number(process.env.MAX_OUTPUT_TOKENS ?? 400);
const RETENTION_DAYS = Number(process.env.CONVERSATION_RETENTION_DAYS ?? 180);
const RATE_LIMIT = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 20);
const MAX_MESSAGE_CHARS = 500;
const MAX_MESSAGES_PER_CONVERSATION = 40;
const HISTORY_TURNS = 6;

type Action = 'config' | 'start' | 'transcript' | 'message' | 'handoff';

interface Body {
  action?: Action;
  widgetKey?: string;
  conversationId?: string;
  visitorToken?: string;
  text?: string;
  handoff?: { name?: string; email?: string; phone?: string; message?: string };
}

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function respond(stream: Writable, status: number, body: unknown) {
  const out = awslambda.HttpResponseStream.from(stream, { statusCode: status, headers: { 'Content-Type': 'application/json' } });
  out.write(JSON.stringify(body));
  out.end();
}

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function enforceRateLimit(ip: string) {
  const minute = Math.floor(Date.now() / 60_000);
  const res = await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `RATE#${ip}#${minute}`, SK: 'RATE' },
      UpdateExpression: 'ADD hits :one SET #ttl = if_not_exists(#ttl, :ttl)',
      ExpressionAttributeNames: { '#ttl': 'ttl' },
      ExpressionAttributeValues: { ':one': 1, ':ttl': Math.floor(Date.now() / 1000) + 120 },
      ReturnValues: 'UPDATED_NEW',
    }),
  );
  if (Number(res.Attributes?.hits ?? 0) > RATE_LIMIT) throw new HttpError(429, 'Too many requests. Please wait a minute.');
}

async function loadBusiness(widgetKey: string, origin: string | undefined) {
  if (!/^pk_[a-zA-Z0-9_]{6,64}$/.test(widgetKey)) throw new HttpError(400, 'Invalid widget key.');
  const map = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: keys.widget(widgetKey) }));
  const businessId = map.Item?.businessId as string | undefined;
  if (!businessId) throw new HttpError(404, 'Unknown widget key.');
  const profile = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: keys.profile(businessId) }));
  if (!profile.Item) throw new HttpError(404, 'Unknown widget key.');
  const allowed = (profile.Item.allowedOrigins as string[] | undefined) ?? [];
  if (!origin || !allowed.includes(origin)) throw new HttpError(403, 'This website is not allowed to use this widget.');
  return { businessId, profile: profile.Item };
}

async function loadConversation(businessId: string, conversationId: string, visitorToken: string) {
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(conversationId)) throw new HttpError(400, 'Invalid conversation.');
  const res = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: keys.conversation(businessId, conversationId), ConsistentRead: true }));
  if (!res.Item || !tokenMatches(visitorToken, res.Item.visitorTokenHash as string)) throw new HttpError(404, 'Conversation not found.');
  return res.Item;
}

async function loadMessages(businessId: string, conversationId: string, limit = 100) {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': keys.messagesPk(businessId, conversationId) },
      ScanIndexForward: false,
      Limit: limit,
    }),
  );
  return (res.Items ?? []).reverse();
}

async function approvedKnowledge(businessId: string): Promise<KnowledgeItem[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :kb)',
      FilterExpression: '#s = :approved',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':pk': keys.business(businessId), ':kb': 'KB#', ':approved': 'approved' },
    }),
  );
  return (res.Items ?? []) as KnowledgeItem[];
}

async function putMessage(
  businessId: string,
  conversationId: string,
  msg: { role: string; text: string; outcome?: string; sourceIds?: string[] },
) {
  const createdAt = new Date().toISOString();
  const id = `msg_${randomUUID()}`;
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: { PK: keys.messagesPk(businessId, conversationId), SK: `MSG#${createdAt}#${id}`, id, createdAt, ttl: ttlFromNow(RETENTION_DAYS), ...msg },
    }),
  );
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: keys.conversation(businessId, conversationId),
      UpdateExpression: 'SET updatedAt = :u, GSI1SK = :u ADD messageCount :one',
      ExpressionAttributeValues: { ':u': createdAt, ':one': 1 },
    }),
  );
}

async function recordUnanswered(businessId: string, conversationId: string, question: string) {
  const id = `unq_${randomUUID()}`;
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: { ...keys.unanswered(businessId, id), id, conversationId, question, normalized: normalizeText(question), status: 'open', createdAt: new Date().toISOString() },
    }),
  );
}

/** Streams the model reply. Holds back the first characters so the handoff sentinel is never shown. */
async function streamModelReply(
  out: Writable,
  businessName: string,
  sources: KnowledgeItem[],
  history: Message[],
): Promise<{ text: string; handoff: boolean }> {
  const response = await bedrock.send(
    new ConverseStreamCommand({
      modelId: MODEL_ID,
      system: [{ text: buildSystemPrompt(businessName, sources) }],
      messages: history,
      inferenceConfig: { maxTokens: MAX_OUTPUT_TOKENS, temperature: 0.1 },
    }),
  );

  let full = '';
  let flushed = 0;
  let decided = false;
  for await (const event of response.stream ?? []) {
    const delta = event.contentBlockDelta?.delta?.text;
    if (!delta) continue;
    full += delta;
    if (!decided) {
      if (full.trimStart().length < HANDOFF_SENTINEL.length && HANDOFF_SENTINEL.startsWith(full.trimStart())) continue;
      decided = true;
      if (full.trimStart().startsWith(HANDOFF_SENTINEL)) continue;
    }
    if (full.includes('[[')) continue;
    out.write(`${JSON.stringify({ type: 'delta', text: full.slice(flushed) })}\n`);
    flushed = full.length;
  }

  if (full.includes(HANDOFF_SENTINEL) || !full.trim()) return { text: full.replace(HANDOFF_SENTINEL, '').trim(), handoff: true };
  if (flushed < full.length) out.write(`${JSON.stringify({ type: 'delta', text: full.slice(flushed) })}\n`);
  return { text: full.trim(), handoff: false };
}

async function handleMessage(stream: Writable, businessId: string, profile: Record<string, unknown>, body: Body) {
  const text = clean(body.text, MAX_MESSAGE_CHARS);
  if (!text) throw new HttpError(400, 'Message is empty.');
  const conversationId = clean(body.conversationId, 64);
  const conv = await loadConversation(businessId, conversationId, clean(body.visitorToken, 128));
  if (Number(conv.messageCount ?? 0) >= MAX_MESSAGES_PER_CONVERSATION) throw new HttpError(429, 'This conversation has reached its message limit.');

  const businessName = String(profile.name);
  const previous = await loadMessages(businessId, conversationId, HISTORY_TURNS);
  await putMessage(businessId, conversationId, { role: 'visitor', text });

  const out = awslambda.HttpResponseStream.from(stream, {
    statusCode: 200,
    headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' },
  });
  const send = (event: unknown) => out.write(`${JSON.stringify(event)}\n`);

  let reply = '';
  let outcome: 'answered' | 'handoff_offered' | 'smalltalk' = 'answered';
  let sourceIds: string[] = [];
  const intent = detectIntent(text);

  try {
    if (intent === 'greeting' || intent === 'thanks') {
      outcome = 'smalltalk';
      reply = intent === 'greeting' ? `Hi there! I can help with questions about ${businessName}. What would you like to know?` : 'You\u2019re welcome! Anything else I can help with?';
      send({ type: 'delta', text: reply });
    } else if (intent === 'human') {
      outcome = 'handoff_offered';
      reply = `Of course. Share your name and how to reach you, and someone from ${businessName} will follow up.`;
      send({ type: 'delta', text: reply });
    } else {
      const matches = retrieveApproved(await approvedKnowledge(businessId), text, { limit: 5 });
      if (matches.length === 0) {
        outcome = 'handoff_offered';
        reply = handoffMessage(businessName);
        await recordUnanswered(businessId, conversationId, text);
        send({ type: 'delta', text: reply });
      } else {
        const history: Message[] = previous
          .filter((m) => m.role === 'visitor' || m.role === 'assistant')
          .map((m) => ({ role: m.role === 'visitor' ? 'user' : 'assistant', content: [{ text: String(m.text) }] }) as Message);
        while (history.length && history[0].role !== 'user') history.shift();
        history.push({ role: 'user', content: [{ text }] });

        const result = await streamModelReply(out, businessName, matches.map((m) => m.item), history);
        if (result.handoff) {
          outcome = 'handoff_offered';
          const fallback = handoffMessage(businessName);
          reply = result.text ? `${result.text}\n\n${fallback}` : fallback;
          await recordUnanswered(businessId, conversationId, text);
          send({ type: 'delta', text: result.text ? `\n\n${fallback}` : fallback });
        } else {
          reply = result.text;
          sourceIds = matches.map((m) => m.item.id);
        }
      }
    }
    await putMessage(businessId, conversationId, { role: 'assistant', text: reply, outcome, sourceIds });
    send({ type: 'done', outcome });
  } catch (e) {
    console.error('public-chat message error', { name: (e as Error).name, message: (e as Error).message });
    send({ type: 'error', message: 'Sorry, something went wrong. Please try again or ask to talk to a person.' });
  } finally {
    out.end();
  }
}

export const handler = awslambda.streamifyResponse(async (event, stream) => {
  try {
    if (event.requestContext.http.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
    const raw = event.isBase64Encoded ? Buffer.from(event.body ?? '', 'base64').toString('utf8') : (event.body ?? '');
    if (raw.length > 8_000) throw new HttpError(413, 'Request too large.');
    let body: Body;
    try {
      body = JSON.parse(raw || '{}') as Body;
    } catch {
      throw new HttpError(400, 'Invalid JSON.');
    }

    await enforceRateLimit(event.requestContext.http.sourceIp);
    const widgetKey = clean(body.widgetKey, 80);
    const { businessId, profile } = await loadBusiness(widgetKey, event.headers.origin ?? event.headers.Origin);

    switch (body.action) {
      case 'config': {
        const items = await approvedKnowledge(businessId);
        return respond(stream, 200, {
          businessName: profile.name,
          greeting: profile.greeting,
          brandColor: profile.brandColor,
          suggestedQuestions: items.filter((k) => k.kind === 'faq').slice(0, 3).map((k) => k.question),
        });
      }
      case 'start': {
        const conversationId = `conv_${randomUUID().replace(/-/g, '')}`;
        const visitorToken = randomBytes(24).toString('hex');
        const now = new Date().toISOString();
        await ddb.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: {
              ...keys.conversation(businessId, conversationId),
              GSI1PK: keys.conversationGsi(businessId),
              GSI1SK: now,
              id: conversationId,
              visitorTokenHash: hashToken(visitorToken),
              visitorLabel: `Visitor ${conversationId.slice(-4).toUpperCase()}`,
              status: 'active',
              messageCount: 0,
              startedAt: now,
              updatedAt: now,
              ttl: ttlFromNow(RETENTION_DAYS),
            },
          }),
        );
        return respond(stream, 200, { conversationId, visitorToken });
      }
      case 'transcript': {
        const conversationId = clean(body.conversationId, 64);
        await loadConversation(businessId, conversationId, clean(body.visitorToken, 128));
        const messages = (await loadMessages(businessId, conversationId)).map(stripKeys).map(({ sourceIds, ...m }) => (void sourceIds, m));
        return respond(stream, 200, { messages });
      }
      case 'message':
        return await handleMessage(stream, businessId, profile, body);
      case 'handoff': {
        const conversationId = clean(body.conversationId, 64);
        await loadConversation(businessId, conversationId, clean(body.visitorToken, 128));
        const name = clean(body.handoff?.name, 100);
        const email = clean(body.handoff?.email, 200);
        const message = clean(body.handoff?.message, 1000);
        if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 3) throw new HttpError(400, 'Please add your name, a valid email, and a message.');
        const id = `inq_${randomUUID()}`;
        await ddb.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: { ...keys.inquiry(businessId, id), id, conversationId, name, email, phone: clean(body.handoff?.phone, 40) || undefined, message, status: 'new', createdAt: new Date().toISOString() },
          }),
        );
        await ddb.send(
          new UpdateCommand({
            TableName: TABLE_NAME,
            Key: keys.conversation(businessId, conversationId),
            UpdateExpression: 'SET #s = :h',
            ExpressionAttributeNames: { '#s': 'status' },
            ExpressionAttributeValues: { ':h': 'handoff' },
          }),
        );
        await putMessage(businessId, conversationId, { role: 'system', text: `${name} asked the team to follow up at ${email}.` });
        return respond(stream, 200, { ok: true });
      }
      default:
        throw new HttpError(400, 'Unknown action.');
    }
  } catch (e) {
    if (e instanceof HttpError) return respond(stream, e.status, { error: e.message });
    console.error('public-chat error', { name: (e as Error).name, message: (e as Error).message });
    return respond(stream, 500, { error: 'Internal error' });
  }
});
