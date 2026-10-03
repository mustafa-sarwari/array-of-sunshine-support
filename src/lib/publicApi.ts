import { getDb, updateDb } from './db';
import { newId, newSecret } from './ids';
import { generateSimulatedReply, streamWords } from './simulatedAi';
import { normalizeText } from '../../shared/retrieval';
import type { ChatMessage, MessageOutcome } from './types';

/**
 * Public widget API for the local demo. Mirrors amplify/functions/public-chat.
 * The widget only knows a public widget key plus the id and secret token of
 * the conversation it started. It can never list conversations, read other
 * visitors' messages, or see drafts, inquiries, or documents.
 */

export interface PublicWidgetConfig {
  widgetKey: string;
  businessName: string;
  greeting: string;
  brandColor: string;
  suggestedQuestions: string[];
}

export interface VisitorConversation {
  conversationId: string;
  visitorToken: string;
}

export type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; outcome: MessageOutcome; sources: { id: string; title: string }[] };

export class PublicApiError extends Error {}

export const MAX_VISITOR_MESSAGE_LENGTH = 500;
const MAX_MESSAGES_PER_CONVERSATION = 40;

function businessForKey(widgetKey: string) {
  const business = getDb().businesses.find((b) => b.widgetKey === widgetKey);
  if (!business) throw new PublicApiError('Unknown widget key.');
  return business;
}

function approvedItems(businessId: string) {
  return getDb().knowledge.filter((k) => k.businessId === businessId && k.status === 'approved');
}

function requireConversation(widgetKey: string, ref: VisitorConversation) {
  const business = businessForKey(widgetKey);
  const conv = getDb().conversations.find(
    (c) => c.id === ref.conversationId && c.businessId === business.id && c.visitorToken === ref.visitorToken,
  );
  if (!conv) throw new PublicApiError('Conversation not found.');
  return { business, conv };
}

export function getWidgetConfig(widgetKey: string): PublicWidgetConfig {
  const business = businessForKey(widgetKey);
  return {
    widgetKey,
    businessName: business.name,
    greeting: business.greeting,
    brandColor: business.brandColor,
    suggestedQuestions: approvedItems(business.id)
      .filter((k) => k.kind === 'faq')
      .slice(0, 3)
      .map((k) => k.question),
  };
}

export function startConversation(widgetKey: string, pageUrl?: string): VisitorConversation {
  const business = businessForKey(widgetKey);
  const conversationId = newId('conv');
  const visitorToken = newSecret();
  const now = new Date().toISOString();
  updateDb((db) => {
    db.conversations.push({
      id: conversationId,
      businessId: business.id,
      visitorToken,
      visitorLabel: `Visitor ${conversationId.slice(-4).toUpperCase()}`,
      startedAt: now,
      updatedAt: now,
      status: 'active',
      pageUrl,
      messages: [],
    });
  });
  return { conversationId, visitorToken };
}

/** Returns only this visitor's own transcript, or null if the token doesn't match. */
export function getVisitorTranscript(widgetKey: string, ref: VisitorConversation): ChatMessage[] | null {
  try {
    return requireConversation(widgetKey, ref).conv.messages;
  } catch {
    return null;
  }
}

export async function* sendVisitorMessage(
  widgetKey: string,
  ref: VisitorConversation,
  rawText: string,
  { delayMs = 28 }: { delayMs?: number } = {},
): AsyncGenerator<StreamEvent> {
  const text = rawText.trim().slice(0, MAX_VISITOR_MESSAGE_LENGTH);
  if (!text) throw new PublicApiError('Message is empty.');
  const { business, conv } = requireConversation(widgetKey, ref);
  if (conv.messages.length >= MAX_MESSAGES_PER_CONVERSATION) {
    throw new PublicApiError('This conversation has reached its message limit. Please start a new chat.');
  }

  const now = new Date().toISOString();
  updateDb((db) => {
    const c = db.conversations.find((x) => x.id === conv.id);
    c?.messages.push({ id: newId('msg'), role: 'visitor', text, createdAt: now });
    if (c) c.updatedAt = now;
  });

  const items = approvedItems(business.id);
  const reply = generateSimulatedReply(business.name, items, text);

  if (reply.unanswered) {
    updateDb((db) => {
      const normalized = normalizeText(text);
      const duplicate = db.unanswered.some(
        (u) => u.businessId === business.id && u.status === 'open' && normalizeText(u.question) === normalized,
      );
      if (!duplicate) {
        db.unanswered.push({
          id: newId('unq'),
          businessId: business.id,
          conversationId: conv.id,
          question: text,
          createdAt: now,
          status: 'open',
        });
      }
    });
  }

  for await (const chunk of streamWords(reply.text, delayMs)) {
    yield { type: 'delta', text: chunk };
  }

  const doneAt = new Date().toISOString();
  updateDb((db) => {
    const c = db.conversations.find((x) => x.id === conv.id);
    c?.messages.push({
      id: newId('msg'),
      role: 'assistant',
      text: reply.text,
      createdAt: doneAt,
      outcome: reply.outcome,
      sourceIds: reply.sourceIds,
    });
    if (c) c.updatedAt = doneAt;
  });

  yield {
    type: 'done',
    outcome: reply.outcome,
    sources: reply.sourceIds.map((id) => ({ id, title: items.find((k) => k.id === id)?.question ?? 'Approved answer' })),
  };
}

export interface HandoffInput {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

export function validateHandoff(input: HandoffInput): string[] {
  const errors: string[] = [];
  if (input.name.trim().length < 2) errors.push('Please add your name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) errors.push('Please add a valid email address.');
  if (input.message.trim().length < 3) errors.push('Please add a short message.');
  return errors;
}

export function submitHandoff(widgetKey: string, ref: VisitorConversation, input: HandoffInput): void {
  const errors = validateHandoff(input);
  if (errors.length) throw new PublicApiError(errors.join(' '));
  const { business, conv } = requireConversation(widgetKey, ref);
  const now = new Date().toISOString();
  updateDb((db) => {
    db.inquiries.push({
      id: newId('inq'),
      businessId: business.id,
      conversationId: conv.id,
      name: input.name.trim().slice(0, 100),
      email: input.email.trim().slice(0, 200),
      phone: input.phone?.trim().slice(0, 40) || undefined,
      message: input.message.trim().slice(0, 1000),
      status: 'new',
      createdAt: now,
    });
    const c = db.conversations.find((x) => x.id === conv.id);
    if (c) {
      c.status = 'handoff';
      c.updatedAt = now;
      c.messages.push({
        id: newId('msg'),
        role: 'system',
        text: `${input.name.trim()} asked the team to follow up at ${input.email.trim()}.`,
        createdAt: now,
      });
    }
  });
}
