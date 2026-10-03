import type { KnowledgeItem, MessageIntent, RetrievalMatch } from './knowledge';

/**
 * Deterministic keyword retrieval over a single business's approved entries.
 * Used by the local simulated assistant and by the production Lambda to pick
 * which approved entries (if any) are sent to the model.
 */

const STOPWORDS = new Set(
  (
    'a an the is are am was were be been do does did you your yours i im me my we our us they them it its ' +
    'this that these those to of for on in at by and or but if so can could would will should may might ' +
    'what when which who whom how why there here with about any some have has had just please tell know ' +
    'like hi hello hey thanks thank up out from into than then also too very really much many get got'
  ).split(/\s+/),
);

/** Tokens that carry little meaning alone; they can support a match but never create one. */
const WEAK_TOKENS = new Set([
  'price',
  'offer',
  'sell',
  'buy',
  'make',
  'option',
  'need',
  'want',
  'available',
  'thing',
  'anything',
  'kind',
  'type',
  'take',
  'accept',
  'good',
  'best',
  'new',
  'today',
  'tomorrow',
  'day',
  'week',
  'one',
  'where',
  'find',
]);

const SYNONYM_GROUPS: string[][] = [
  ['hour', 'open', 'close', 'closing', 'opening', 'schedule', 'time'],
  ['price', 'cost', 'charge', 'fee', 'expensive', 'cheap', 'pricing', 'rate'],
  ['deliver', 'delivery', 'ship', 'shipping', 'doordash', 'courier'],
  ['park', 'parking', 'garage', 'lot'],
  ['gluten', 'celiac', 'coeliac', 'wheat'],
  ['vegan', 'plant', 'dairy'],
  ['allergen', 'allergy', 'allergic', 'nut', 'peanut', 'tree'],
  ['pay', 'payment', 'card', 'cash', 'venmo', 'credit', 'debit'],
  ['cater', 'catering', 'event', 'party', 'office'],
  ['location', 'locat', 'address', 'direction'],
  ['phone', 'call', 'number'],
  ['email', 'mail'],
  ['holiday', 'thanksgiving', 'christmas', 'easter'],
  ['wholesale', 'restaurant', 'cafe', 'bulk'],
  ['repair', 'fix', 'broken', 'flat'],
  ['rental', 'rent', 'hire'],
  ['tune', 'tuneup', 'overhaul'],
  ['ebike', 'electric'],
  ['warranty', 'guarantee'],
  ['wait', 'turnaround', 'long', 'quick', 'fast', 'soon'],
];

const CANONICAL = new Map<string, string>();
for (const group of SYNONYM_GROUPS) {
  for (const word of group) CANONICAL.set(stem(word), group[0]);
}

function stem(raw: string): string {
  let w = raw.toLowerCase().replace(/'s$/, '');
  if (w.length > 4 && w.endsWith('ies')) w = `${w.slice(0, -3)}y`;
  else if (w.length > 5 && w.endsWith('ing')) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith('ed')) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  return w;
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(text: string): string[] {
  const out: string[] = [];
  for (const raw of normalizeText(text).split(' ')) {
    if (!raw || STOPWORDS.has(raw)) continue;
    const s = stem(raw);
    if (s.length < 2 || STOPWORDS.has(s)) continue;
    out.push(CANONICAL.get(s) ?? s);
  }
  return out;
}

function tokenSet(parts: string[]): Set<string> {
  return new Set(parts.flatMap((p) => tokenize(p)));
}

export interface RetrievalOptions {
  limit?: number;
  minScore?: number;
}

export const DEFAULT_MIN_SCORE = 0.4;

/**
 * Score approved items against a visitor question. Draft items are never
 * considered. An item qualifies only if at least one meaningful (non-weak)
 * query token appears in its keywords or question.
 */
export function retrieveApproved(
  items: readonly KnowledgeItem[],
  query: string,
  { limit = 3, minScore = DEFAULT_MIN_SCORE }: RetrievalOptions = {},
): RetrievalMatch[] {
  const queryTokens = [...new Set(tokenize(query))];
  if (queryTokens.length === 0) return [];

  const denominator = queryTokens.reduce((sum, t) => sum + (WEAK_TOKENS.has(t) ? 1 : 3), 0);
  const matches: RetrievalMatch[] = [];

  for (const item of items) {
    if (item.status !== 'approved') continue;
    const keywordTokens = tokenSet(item.keywords);
    const questionTokens = tokenSet([item.question]);
    const answerTokens = tokenSet([item.answer]);

    let weight = 0;
    let strongHit = false;
    for (const t of queryTokens) {
      const weak = WEAK_TOKENS.has(t);
      if (keywordTokens.has(t)) {
        weight += weak ? 1 : 3;
        strongHit ||= !weak;
      } else if (questionTokens.has(t)) {
        weight += weak ? 1 : 2.5;
        strongHit ||= !weak;
      } else if (answerTokens.has(t)) {
        weight += weak ? 0.5 : 1;
      }
    }

    const score = Math.min(1, weight / denominator);
    if (strongHit && score >= minScore) matches.push({ item, score });
  }

  return matches.sort((a, b) => b.score - a.score).slice(0, limit);
}

const HUMAN_PATTERN =
  /\b(human|real person|a person|someone|staff|employee|manager|owner|representative|agent|talk to|speak (to|with)|call me|contact (you|the team|someone)|reach (you|someone))\b/;

export function detectIntent(text: string): MessageIntent {
  const t = normalizeText(text);
  if (!t) return 'question';
  if (HUMAN_PATTERN.test(t)) return 'human';
  if (/^(hi|hello|hey|hiya|howdy|good (morning|afternoon|evening))( there)?$/.test(t)) return 'greeting';
  if (/^(thanks|thank you|thx|ty|cheers|great thanks|ok thanks|perfect thanks)( (so much|a lot))?$/.test(t)) return 'thanks';
  return 'question';
}
