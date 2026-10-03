import type { KnowledgeItem } from '../../shared/knowledge';
import { handoffMessage } from '../../shared/prompt';
import { detectIntent, retrieveApproved } from '../../shared/retrieval';
import type { MessageOutcome } from './types';

/**
 * SIMULATED AI — no model is called. Replies are assembled from the
 * business's approved entries using the same retrieval step the production
 * Lambda runs before calling Amazon Bedrock.
 */

export interface SimulatedReply {
  text: string;
  outcome: MessageOutcome;
  sourceIds: string[];
  /** True when the visitor asked something the approved information can't answer. */
  unanswered: boolean;
}

export function generateSimulatedReply(
  businessName: string,
  items: readonly KnowledgeItem[],
  visitorText: string,
): SimulatedReply {
  const intent = detectIntent(visitorText);

  if (intent === 'greeting') {
    return {
      text: `Hi there! I can help with questions about ${businessName}. What would you like to know?`,
      outcome: 'smalltalk',
      sourceIds: [],
      unanswered: false,
    };
  }
  if (intent === 'thanks') {
    return { text: 'You\u2019re welcome! Anything else I can help with?', outcome: 'smalltalk', sourceIds: [], unanswered: false };
  }
  if (intent === 'human') {
    return {
      text: `Of course. Share your name and how to reach you, and someone from ${businessName} will follow up.`,
      outcome: 'handoff_offered',
      sourceIds: [],
      unanswered: false,
    };
  }

  const [best, second] = retrieveApproved(items, visitorText, { limit: 2 });
  if (!best) {
    return { text: handoffMessage(businessName), outcome: 'handoff_offered', sourceIds: [], unanswered: true };
  }

  const sources = [best];
  let text = best.item.answer;
  if (second && second.score >= 0.75 && second.score >= best.score - 0.1) {
    text += `\n\n${second.item.answer}`;
    sources.push(second);
  }
  return { text, outcome: 'answered', sourceIds: sources.map((s) => s.item.id), unanswered: false };
}

/** Simulates token streaming so the widget UI matches a ConverseStream response. */
export async function* streamWords(text: string, delayMs = 28): AsyncGenerator<string> {
  const parts = text.match(/\S+\s*/g) ?? [text];
  for (const part of parts) {
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    yield part;
  }
}
