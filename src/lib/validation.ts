import type { KnowledgeKind, KnowledgeStatus } from '../../shared/knowledge';

/** Input rules shared by the local demo, the AWS data sources, and the standalone widget. */

export const MAX_VISITOR_MESSAGE_LENGTH = 500;

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

export interface KnowledgeInput {
  kind: KnowledgeKind;
  question: string;
  answer: string;
  keywords: string[];
  status: KnowledgeStatus;
}

export function validateKnowledge(input: KnowledgeInput): string[] {
  const errors: string[] = [];
  if (input.question.trim().length < 3) errors.push('Add a question or title (at least 3 characters).');
  if (input.answer.trim().length < 10) errors.push('Add an approved answer (at least 10 characters).');
  if (input.answer.length > 1500) errors.push('Keep answers under 1,500 characters.');
  return errors;
}

export function cleanKeywords(keywords: string[]): string[] {
  return [...new Set(keywords.map((k) => k.trim().toLowerCase()).filter(Boolean))];
}
