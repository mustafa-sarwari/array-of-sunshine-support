import type { KnowledgeEntry, KnowledgeItem } from '../../../shared/knowledge';
import { getDb } from '../../lib/db';
import type { DemoSession } from '../../lib/demoAuth';
import * as api from '../../lib/ownerApi';
import type { Conversation } from '../../lib/types';
import type { ConversationSummary, DashboardStats, OwnerDataSource, OwnerIdentity } from '../types';

const WEEK = 7 * 24 * 60 * 60 * 1000;

function toEntry(k: KnowledgeItem): KnowledgeEntry {
  return { id: k.id, kind: k.kind, question: k.question, answer: k.answer, keywords: k.keywords, status: k.status, updatedAt: k.updatedAt };
}

export function summarize(c: Conversation): ConversationSummary {
  const count = (pred: (m: Conversation['messages'][number]) => boolean) => c.messages.filter(pred).length;
  return {
    id: c.id,
    visitorLabel: c.visitorLabel,
    status: c.status,
    pageUrl: c.pageUrl,
    firstQuestion: c.messages.find((m) => m.role === 'visitor')?.text.slice(0, 200),
    messageCount: c.messages.length,
    visitorMessageCount: count((m) => m.role === 'visitor'),
    answeredCount: count((m) => m.role === 'assistant' && m.outcome === 'answered'),
    handoffOfferedCount: count((m) => m.role === 'assistant' && m.outcome === 'handoff_offered'),
    startedAt: c.startedAt,
    updatedAt: c.updatedAt,
  };
}

/** Owner data for the local demo. Same rules as the owner-api Lambda, backed by localStorage. */
export function createLocalOwnerData(identity: OwnerIdentity): OwnerDataSource {
  const session: DemoSession = { ownerId: identity.id, email: identity.email, displayName: identity.displayName, issuedAt: '' };

  return {
    async getMyBusiness() {
      const b = api.getMyBusiness(session);
      return { ...b, allowedOrigins: [...b.allowedOrigins], previewPath: `/demo/${b.slug}` };
    },
    async updateBusinessProfile(input) {
      api.updateBusinessProfile(session, input);
    },
    async getDashboardStats(): Promise<DashboardStats> {
      const db = getDb();
      const conversations = api.listConversations(session, db).map(summarize);
      const answeredReplies = conversations.reduce((n, c) => n + c.answeredCount, 0);
      return {
        conversationsTotal: conversations.length,
        conversationsLast7Days: conversations.filter((c) => Date.now() - new Date(c.updatedAt).getTime() < WEEK).length,
        answeredReplies,
        ratedReplies: answeredReplies + conversations.reduce((n, c) => n + c.handoffOfferedCount, 0),
        newInquiries: api.listInquiries(session, db).filter((i) => i.status === 'new').length,
        openUnanswered: api.listUnanswered(session, db).filter((u) => u.status === 'open').length,
        approvedAnswers: api.listKnowledge(session, db).filter((k) => k.status === 'approved').length,
      };
    },
    async listKnowledge() {
      return api.listKnowledge(session).map(toEntry);
    },
    async saveKnowledge(input, id, resolvesUnansweredId) {
      return toEntry(api.saveKnowledge(session, input, id, resolvesUnansweredId));
    },
    async deleteKnowledge(id) {
      api.deleteKnowledge(session, id);
    },
    async listConversations({ limit = 50, nextToken } = {}) {
      const all = api.listConversations(session);
      const start = Number(nextToken ?? 0) || 0;
      const end = start + limit;
      return { items: all.slice(start, end).map(summarize), nextToken: end < all.length ? String(end) : undefined };
    },
    async getConversation(id) {
      const c = api.getConversation(session, id);
      return c ? { summary: summarize(c), messages: c.messages } : null;
    },
    async setConversationStatus(id, status) {
      api.setConversationStatus(session, id, status);
    },
    async listInquiries() {
      return api.listInquiries(session);
    },
    async setInquiryStatus(id, status) {
      api.setInquiryStatus(session, id, status);
    },
    async listUnanswered() {
      return api.listUnanswered(session);
    },
    async setUnansweredStatus(id, status) {
      api.setUnansweredStatus(session, id, status);
    },
  };
}
