import { getDb, updateDb } from './db';
import type { DemoSession } from './demoAuth';
import { newId } from './ids';
import type {
  Business,
  Conversation,
  ConversationStatus,
  DemoDatabase,
  Inquiry,
  InquiryStatus,
  KnowledgeItem,
  UnansweredQuestion,
  UnansweredStatus,
} from './types';
import { cleanKeywords, validateKnowledge, type KnowledgeInput } from './validation';

export { validateKnowledge, type KnowledgeInput };

/**
 * Owner-facing API for the local demo. Mirrors amplify/functions/owner-api:
 * no function accepts a businessId. The business is resolved from the
 * signed-in identity's membership record, and every record looked up by id is
 * re-checked against that business.
 */

export class AccessError extends Error {}

export function requireBusinessId(session: DemoSession | null, db: DemoDatabase = getDb()): string {
  if (!session) throw new AccessError('Not signed in.');
  const membership = db.memberships.find((m) => m.ownerId === session.ownerId);
  if (!membership) throw new AccessError('This account is not linked to a business.');
  return membership.businessId;
}

function byNewest<T extends { updatedAt?: string; createdAt?: string }>(a: T, b: T) {
  return (b.updatedAt ?? b.createdAt ?? '').localeCompare(a.updatedAt ?? a.createdAt ?? '');
}

export function getMyBusiness(session: DemoSession | null, db: DemoDatabase = getDb()): Business {
  const businessId = requireBusinessId(session, db);
  const business = db.businesses.find((b) => b.id === businessId);
  if (!business) throw new AccessError('Business not found.');
  return business;
}

export type BusinessProfileInput = Pick<
  Business,
  'name' | 'tagline' | 'phone' | 'email' | 'address' | 'greeting' | 'brandColor'
>;

export function updateBusinessProfile(session: DemoSession | null, input: BusinessProfileInput): void {
  const businessId = requireBusinessId(session);
  updateDb((db) => {
    const b = db.businesses.find((x) => x.id === businessId);
    if (!b) throw new AccessError('Business not found.');
    Object.assign(b, {
      name: input.name.trim(),
      tagline: input.tagline.trim(),
      phone: input.phone.trim(),
      email: input.email.trim(),
      address: input.address.trim(),
      greeting: input.greeting.trim(),
      brandColor: /^#[0-9a-f]{6}$/i.test(input.brandColor) ? input.brandColor : b.brandColor,
    });
  });
}

// ---------- Knowledge ----------

export function listKnowledge(session: DemoSession | null, db: DemoDatabase = getDb()): KnowledgeItem[] {
  const businessId = requireBusinessId(session, db);
  return db.knowledge.filter((k) => k.businessId === businessId).sort(byNewest);
}

export function saveKnowledge(
  session: DemoSession | null,
  input: KnowledgeInput,
  id?: string,
  resolvesUnansweredId?: string,
): KnowledgeItem {
  const businessId = requireBusinessId(session);
  const errors = validateKnowledge(input);
  if (errors.length) throw new Error(errors.join(' '));

  let saved!: KnowledgeItem;
  updateDb((db) => {
    const clean = {
      kind: input.kind,
      question: input.question.trim(),
      answer: input.answer.trim(),
      keywords: cleanKeywords(input.keywords),
      status: input.status,
      updatedAt: new Date().toISOString(),
    };
    if (id) {
      const existing = db.knowledge.find((k) => k.id === id && k.businessId === businessId);
      if (!existing) throw new AccessError('Entry not found.');
      Object.assign(existing, clean);
      saved = existing;
    } else {
      saved = { id: newId('kb'), businessId, ...clean };
      db.knowledge.push(saved);
    }
    if (id && clean.status === 'approved') {
      for (const q of db.unanswered) if (q.businessId === businessId && q.resolvedKnowledgeId === id) q.status = 'resolved';
    }
    if (resolvesUnansweredId && clean.status === 'approved') {
      const q = db.unanswered.find((u) => u.id === resolvesUnansweredId && u.businessId === businessId);
      if (q) {
        q.status = 'resolved';
        q.resolvedKnowledgeId = saved.id;
      }
    } else if (resolvesUnansweredId) {
      const q = db.unanswered.find(u => u.id === resolvesUnansweredId && u.businessId === businessId);
      if (q) q.resolvedKnowledgeId = saved.id;
    }
  });
  return saved;
}

export function deleteKnowledge(session: DemoSession | null, id: string): void {
  const businessId = requireBusinessId(session);
  updateDb((db) => {
    const before = db.knowledge.length;
    db.knowledge = db.knowledge.filter((k) => !(k.id === id && k.businessId === businessId));
    if (db.knowledge.length === before) throw new AccessError('Entry not found.');
  });
}

// ---------- Conversations ----------

export function listConversations(session: DemoSession | null, db: DemoDatabase = getDb()): Conversation[] {
  const businessId = requireBusinessId(session, db);
  return db.conversations.filter((c) => c.businessId === businessId).sort(byNewest);
}

export function getConversation(
  session: DemoSession | null,
  id: string,
  db: DemoDatabase = getDb(),
): Conversation | undefined {
  const businessId = requireBusinessId(session, db);
  return db.conversations.find((c) => c.id === id && c.businessId === businessId);
}

export function setConversationStatus(session: DemoSession | null, id: string, status: ConversationStatus): void {
  const businessId = requireBusinessId(session);
  updateDb((db) => {
    const c = db.conversations.find((x) => x.id === id && x.businessId === businessId);
    if (!c) throw new AccessError('Conversation not found.');
    c.status = status;
  });
}

// ---------- Inquiries ----------

export function listInquiries(session: DemoSession | null, db: DemoDatabase = getDb()): Inquiry[] {
  const businessId = requireBusinessId(session, db);
  return db.inquiries.filter((i) => i.businessId === businessId).sort(byNewest);
}

export function setInquiryStatus(session: DemoSession | null, id: string, status: InquiryStatus): void {
  const businessId = requireBusinessId(session);
  updateDb((db) => {
    const i = db.inquiries.find((x) => x.id === id && x.businessId === businessId);
    if (!i) throw new AccessError('Inquiry not found.');
    i.status = status;
  });
}

// ---------- Unanswered ----------

export function listUnanswered(session: DemoSession | null, db: DemoDatabase = getDb()): UnansweredQuestion[] {
  const businessId = requireBusinessId(session, db);
  return db.unanswered.filter((u) => u.businessId === businessId).sort(byNewest);
}

export function setUnansweredStatus(session: DemoSession | null, id: string, status: UnansweredStatus): void {
  const businessId = requireBusinessId(session);
  updateDb((db) => {
    const u = db.unanswered.find((x) => x.id === id && x.businessId === businessId);
    if (!u) throw new AccessError('Question not found.');
    u.status = status;
  });
}
