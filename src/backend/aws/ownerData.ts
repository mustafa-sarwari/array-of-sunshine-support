import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import type { KnowledgeEntry, KnowledgeKind, KnowledgeStatus } from '../../../shared/knowledge';
import { SEED_BUSINESSES } from '../../lib/seed';
import type { ChatMessage, ConversationStatus, InquiryStatus, MessageOutcome, MessageRole, UnansweredStatus } from '../../lib/types';
import type { ConversationSummary, OwnerDataSource, OwnerInquiry, OwnerUnanswered } from '../types';

/**
 * Owner data from the AppSync API. Every call is signed with the owner's
 * Cognito user pool token; the owner-api Lambda resolves the business from
 * that token, so nothing here sends a businessId.
 */

type Result<T> = { data?: T | null; errors?: readonly { message: string }[] };

async function result<T>(op: Promise<Result<T>>): Promise<T | null> {
  const { data, errors } = await op;
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(' '));
  return data ?? null;
}

async function required<T>(op: Promise<Result<T>>): Promise<T> {
  const data = await result(op);
  if (data === null) throw new Error('The server returned no data.');
  return data;
}

const str = (v: string | null | undefined) => v ?? '';
const opt = (v: string | null | undefined) => v || undefined;
const strings = (v: readonly (string | null)[] | null | undefined) => (v ?? []).filter((x): x is string => typeof x === 'string');
const int = (v: number | null | undefined) => v ?? 0;
const present = <T>(v: T | null | undefined): v is T => v != null;
const items = <T>(v: readonly (T | null | undefined)[] | null | undefined): T[] => (v ?? []).filter(present);

/** Shape returned by the generated client: every field nullable, string unions widened to string. */
type Widen<V> = V extends string ? string : V extends readonly string[] ? readonly (string | null)[] : V;
type Raw<T> = { [K in keyof T]?: Widen<NonNullable<T[K]>> | null };

function toEntry(k: Raw<KnowledgeEntry>): KnowledgeEntry {
  return {
    id: str(k.id),
    kind: k.kind as KnowledgeKind,
    question: str(k.question),
    answer: str(k.answer),
    keywords: strings(k.keywords),
    status: k.status as KnowledgeStatus,
    updatedAt: str(k.updatedAt),
  };
}

function toSummary(c: Raw<ConversationSummary>): ConversationSummary {
  return {
    id: str(c.id),
    visitorLabel: str(c.visitorLabel),
    status: c.status as ConversationStatus,
    pageUrl: opt(c.pageUrl),
    firstQuestion: opt(c.firstQuestion),
    messageCount: int(c.messageCount),
    visitorMessageCount: int(c.visitorMessageCount),
    answeredCount: int(c.answeredCount),
    handoffOfferedCount: int(c.handoffOfferedCount),
    startedAt: str(c.startedAt),
    updatedAt: str(c.updatedAt),
  };
}

function toMessage(m: Raw<ChatMessage>): ChatMessage {
  return {
    id: str(m.id),
    role: m.role as MessageRole,
    text: str(m.text),
    createdAt: str(m.createdAt),
    outcome: (m.outcome || undefined) as MessageOutcome | undefined,
    sourceIds: strings(m.sourceIds),
  };
}

export function createAwsOwnerData(): OwnerDataSource {
  const client = generateClient<Schema>({ authMode: 'userPool' });
  const { queries, mutations } = client;

  return {
    async getMyBusiness() {
      const b = await required(queries.getMyBusiness());
      const demo = SEED_BUSINESSES.find((s) => s.widgetKey === b.widgetKey);
      return {
        name: b.name,
        tagline: str(b.tagline),
        phone: str(b.phone),
        email: str(b.email),
        address: str(b.address),
        greeting: str(b.greeting),
        brandColor: b.brandColor || '#4f46e5',
        widgetKey: b.widgetKey,
        allowedOrigins: strings(b.allowedOrigins),
        previewPath: demo ? `/demo/${demo.slug}` : undefined,
      };
    },
    async updateBusinessProfile(input) {
      await required(mutations.updateBusinessProfile(input));
    },
    async getDashboardStats() {
      return required(queries.getDashboardStats());
    },
    async listKnowledge() {
      return items(await result(queries.listKnowledge())).map(toEntry);
    },
    async saveKnowledge(input, id, resolvesUnansweredId) {
      return toEntry(await required(mutations.saveKnowledge({ ...input, id, resolvesUnansweredId })));
    },
    async deleteKnowledge(id) {
      await required(mutations.deleteKnowledge({ id }));
    },
    async listConversations({ limit, nextToken } = {}) {
      const page = await required(queries.listConversations({ limit, nextToken }));
      return { items: items(page.items).map(toSummary), nextToken: opt(page.nextToken) };
    },
    async getConversation(id) {
      const detail = await result(queries.getConversation({ id }));
      return detail ? { summary: toSummary(detail.summary), messages: items(detail.messages).map(toMessage) } : null;
    },
    async setConversationStatus(id, status) {
      await required(mutations.setConversationStatus({ id, status }));
    },
    async listInquiries() {
      return items(await result(queries.listInquiries())).map(
        (i): OwnerInquiry => ({
          id: i.id,
          conversationId: opt(i.conversationId),
          name: i.name,
          email: i.email,
          phone: opt(i.phone),
          message: i.message,
          status: i.status as InquiryStatus,
          createdAt: i.createdAt,
        }),
      );
    },
    async setInquiryStatus(id, status) {
      await required(mutations.setInquiryStatus({ id, status }));
    },
    async listUnanswered() {
      return items(await result(queries.listUnanswered())).map(
        (u): OwnerUnanswered => ({
          id: u.id,
          conversationId: opt(u.conversationId),
          question: u.question,
          status: u.status as UnansweredStatus,
          resolvedKnowledgeId: opt(u.resolvedKnowledgeId),
          createdAt: u.createdAt,
        }),
      );
    },
    async setUnansweredStatus(id, status) {
      await required(mutations.setUnansweredStatus({ id, status }));
    },
  };
}
