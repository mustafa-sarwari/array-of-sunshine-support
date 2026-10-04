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

  it.each(['Do you have keto cakes?', 'Are you open on Christmas?', 'Do you have sugar-free cupcakes?', 'Are you open on Easter Sunday?'])(
    'hands off %j: the qualifier is in no approved entry',
    (q) => {
      expect(retrieveApproved(maple, q)).toEqual([]);
    },
  );

  it('still answers ordinary cake and hours questions', () => {
    expect(topId(maple, 'Do you have cakes?')).toBe('kb_maple_custom_cakes');
    expect(topId(maple, 'What are your opening hours?')).toBe('kb_maple_hours');
  });

  it('answers a qualified question when an approved entry covers the qualifier', () => {
    const christmas = { ...maple.find((k) => k.id === 'kb_maple_hours')!, id: 'kb_xmas', question: 'Christmas hours', answer: 'We close at noon on Christmas Eve and are closed on Christmas Day.', keywords: ['christmas', 'open'] };
    expect(topId([...maple, christmas], 'Are you open on Christmas?')).toBe('kb_xmas');
  });

  it('does not treat different holidays as the same question', () => {
    const approved = maple.map((k) => (k.id === 'kb_maple_holiday' ? { ...k, status: 'approved' as const } : k));
    expect(topId(approved, 'Can I preorder a Thanksgiving pie?')).toBe('kb_maple_holiday');
    expect(retrieveApproved(approved, 'Are you open on Easter?')).toEqual([]);
  });

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

  it.each(['hi mustafa', 'Hi Mustafa!', 'Good morning, Rosa', 'hello there'])('treats %j as a greeting', (t) => {
    expect(detectIntent(t)).toBe('greeting');
  });

  it.each(['thanks mustafa', 'Thank you so much, Rosa!', 'thanks a lot'])('treats %j as thanks', (t) => {
    expect(detectIntent(t)).toBe('thanks');
  });

  it.each(['hi, are you open on Sunday?', 'hello, do you have keto cakes', 'thanks, do you deliver?', 'hi delivery', 'hey parking', 'thanks pricing'])('treats %j as a question', (t) => {
    expect(detectIntent(t)).toBe('question');
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
