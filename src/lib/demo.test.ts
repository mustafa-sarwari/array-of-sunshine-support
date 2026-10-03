import { beforeEach, describe, expect, it } from 'vitest';
import { __setDbForTests, getDb } from './db';
import type { DemoSession } from './demoAuth';
import * as owner from './ownerApi';
import * as pub from './publicApi';
import { buildSeed, HARBOR_ID, MAPLE_ID } from './seed';

const mapleOwner: DemoSession = { ownerId: 'owner_maple', email: 'owner@maplestreetbakery.demo', displayName: 'Rosa', issuedAt: '' };
const harborOwner: DemoSession = { ownerId: 'owner_harbor', email: 'owner@harborbikes.demo', displayName: 'Dev', issuedAt: '' };
const MAPLE_KEY = 'pk_demo_maple_7c1f2a';
const HARBOR_KEY = 'pk_demo_harbor_93be41';

async function ask(widgetKey: string, ref: pub.VisitorConversation, text: string) {
  let reply = '';
  let outcome = '';
  for await (const ev of pub.sendVisitorMessage(widgetKey, ref, text, { delayMs: 0 })) {
    if (ev.type === 'delta') reply += ev.text;
    else if (ev.type === 'done') outcome = ev.outcome;
  }
  return { reply, outcome };
}

beforeEach(() => {
  __setDbForTests(buildSeed());
});

describe('owner API derives the business from identity', () => {
  it('scopes every list to the signed-in owner', () => {
    expect(owner.listKnowledge(mapleOwner).every((k) => k.businessId === MAPLE_ID)).toBe(true);
    expect(owner.listKnowledge(harborOwner).every((k) => k.businessId === HARBOR_ID)).toBe(true);
    expect(owner.listConversations(harborOwner).every((c) => c.businessId === HARBOR_ID)).toBe(true);
    expect(owner.listInquiries(mapleOwner).every((i) => i.businessId === MAPLE_ID)).toBe(true);
    expect(owner.listUnanswered(harborOwner).every((u) => u.businessId === HARBOR_ID)).toBe(true);
  });

  it("cannot read or modify another business's records by id", () => {
    expect(owner.getConversation(mapleOwner, 'conv_harbor_001')).toBeUndefined();
    expect(() => owner.deleteKnowledge(mapleOwner, 'kb_harbor_tuneup')).toThrow(owner.AccessError);
    expect(() =>
      owner.saveKnowledge(mapleOwner, { kind: 'faq', question: 'Hijack', answer: 'Not allowed here.', keywords: [], status: 'approved' }, 'kb_harbor_tuneup'),
    ).toThrow(owner.AccessError);
    expect(() => owner.setInquiryStatus(harborOwner, 'inq_maple_001', 'resolved')).toThrow(owner.AccessError);
    expect(getDb().knowledge.find((k) => k.id === 'kb_harbor_tuneup')?.question).toBe('Tune-up packages and prices');
  });

  it('rejects missing sessions and unlinked accounts', () => {
    expect(() => owner.listKnowledge(null)).toThrow(owner.AccessError);
    expect(() => owner.listKnowledge({ ...mapleOwner, ownerId: 'someone_else' })).toThrow(owner.AccessError);
  });

  it('creates new entries under the derived business', () => {
    const saved = owner.saveKnowledge(mapleOwner, {
      kind: 'faq',
      question: 'Do you offer baking classes?',
      answer: 'Yes, kids baking classes run on the first Saturday of each month.',
      keywords: ['class', 'classes', 'baking class'],
      status: 'approved',
    }, undefined, 'unq_maple_001');
    expect(saved.businessId).toBe(MAPLE_ID);
    expect(getDb().unanswered.find((u) => u.id === 'unq_maple_001')?.status).toBe('resolved');
  });
});

describe('public widget API', () => {
  it('answers only from approved info and records unanswered questions', async () => {
    const ref = pub.startConversation(MAPLE_KEY);
    const a = await ask(MAPLE_KEY, ref, 'Are you open on Sunday?');
    expect(a.outcome).toBe('answered');
    expect(a.reply).toContain('Sunday 8:00 am to 2:00 pm');

    const b = await ask(MAPLE_KEY, ref, 'How much is a tune-up?');
    expect(b.outcome).toBe('handoff_offered');
    expect(b.reply).not.toContain('$75');
    expect(getDb().unanswered.some((u) => u.businessId === MAPLE_ID && u.question === 'How much is a tune-up?')).toBe(true);
  });

  it('only lets a visitor read their own conversation', async () => {
    const mine = pub.startConversation(MAPLE_KEY);
    await ask(MAPLE_KEY, mine, 'Do you deliver?');
    expect(pub.getVisitorTranscript(MAPLE_KEY, mine)).toHaveLength(2);
    expect(pub.getVisitorTranscript(MAPLE_KEY, { ...mine, visitorToken: 'guess' })).toBeNull();
    expect(pub.getVisitorTranscript(HARBOR_KEY, mine)).toBeNull();
    expect(pub.getVisitorTranscript(MAPLE_KEY, { conversationId: 'conv_maple_001', visitorToken: 'wrong' })).toBeNull();
  });

  it('exposes no private data in the widget config', () => {
    const cfg = pub.getWidgetConfig(MAPLE_KEY);
    expect(Object.keys(cfg).sort()).toEqual(['brandColor', 'businessName', 'greeting', 'suggestedQuestions', 'widgetKey']);
    expect(() => pub.getWidgetConfig('pk_unknown')).toThrow(pub.PublicApiError);
  });

  it('creates an inquiry on handoff', () => {
    const ref = pub.startConversation(HARBOR_KEY);
    pub.submitHandoff(HARBOR_KEY, ref, { name: 'Ana', email: 'ana@example.com', message: 'Used bikes?' });
    const inq = getDb().inquiries.find((i) => i.conversationId === ref.conversationId);
    expect(inq?.businessId).toBe(HARBOR_ID);
    expect(() => pub.submitHandoff(HARBOR_KEY, ref, { name: '', email: 'bad', message: '' })).toThrow(pub.PublicApiError);
  });
});
