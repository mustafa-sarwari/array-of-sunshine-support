export type KnowledgeKind = 'faq' | 'service';
export type KnowledgeStatus = 'approved' | 'draft';

export interface KnowledgeItem {
  id: string;
  businessId: string;
  kind: KnowledgeKind;
  /** FAQ question, or the title of a service-information entry. */
  question: string;
  answer: string;
  keywords: string[];
  status: KnowledgeStatus;
  updatedAt: string;
}

export interface RetrievalMatch {
  item: KnowledgeItem;
  score: number;
}

export type MessageIntent = 'greeting' | 'thanks' | 'human' | 'question';
