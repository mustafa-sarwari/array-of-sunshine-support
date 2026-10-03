import { describe, expect, it } from 'vitest';
import { buildSeed, HARBOR_ID, MAPLE_ID } from '../src/lib/seed';
import { buildSystemPrompt, HANDOFF_SENTINEL } from './prompt';
import { detectIntent, retrieveApproved } from './retrieval';

const db = buildSeed(Date.parse('2026-10-01T12:00:00Z'));
const maple = db.knowledge.filter((k) => k.businessId === MAPLE_ID);
const harbor = db.knowledge.filter((k) => k.businessId === HARBOR_ID);

function topId(items: typeof maple, q: string) {
  return retrieveApproved(items, q)[0]?.item.id;
}

describe('retrieveApproved', () => {
  it.each([
    ['Are you open on Sunday?', 'kb_maple_hours'],
    ['What time do you close on Saturday?', 'kb_maple_hours'],
    ['Do you have gluten free bread?', 'kb_maple_gluten_free'],
    ['Can I order a birthday cake?', 'kb_maple_custom_cakes'],
    ['Where can I park?', 'kb_maple_parking'],
    ['Do you deliver?', 'kb_maple_delivery'],
    ['Do you take Apple Pay?', 'kb_maple_payment'],
    ['I have a peanut allergy', 'kb_maple_allergens'],
    ['Any vegan options?', 'kb_maple_vegan'],
    ['Where are you located?', 'kb_maple_location'],
  ])('answers %j from %s', (q, id) => {
    expect(topId(maple, q)).toBe(id);
  });

  it.each(['Do you offer baking classes?', 'Are you hiring?', 'Do you have keto cupcakes?', 'How do I order a bike part?', 'How much does it cost?'])(
    'finds no approved answer for %j',
    (q) => {
      expect(retrieveApproved(maple, q)).toEqual([]);
    },
  );

  it('never uses draft entries', () => {
    expect(maple.find((k) => k.id === 'kb_maple_holiday')?.status).toBe('draft');
    expect(retrieveApproved(maple, 'Can I preorder a Thanksgiving pie?').map((m) => m.item.id)).not.toContain('kb_maple_holiday');
  });

  it('keeps businesses separate', () => {
    expect(retrieveApproved(maple, 'How much is a tune-up?')).toEqual([]);
    expect(topId(harbor, 'How much is a tune-up?')).toBe('kb_harbor_tuneup');
    expect(retrieveApproved(harbor, 'Can I order a birthday cake?')).toEqual([]);
  });
});

describe('detectIntent', () => {
  it('detects greetings, thanks, and human requests', () => {
    expect(detectIntent('Hello!')).toBe('greeting');
    expect(detectIntent('thank you so much')).toBe('thanks');
    expect(detectIntent('Can I talk to a real person?')).toBe('human');
    expect(detectIntent('Do you deliver?')).toBe('question');
  });
});

describe('buildSystemPrompt', () => {
  it('includes only the supplied entries and the handoff sentinel', () => {
    const prompt = buildSystemPrompt('Maple Street Bakery', [maple[0]]);
    expect(prompt).toContain(maple[0].answer);
    expect(prompt).not.toContain(maple[1].answer);
    expect(prompt).toContain(HANDOFF_SENTINEL);
  });
});
