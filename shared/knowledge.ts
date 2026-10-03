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

/** A knowledge item as the owner sees it. The business is implied by the signed-in identity. */
export type KnowledgeEntry = Omit<KnowledgeItem, 'businessId'>;

export interface RetrievalMatch<T extends KnowledgeEntry = KnowledgeItem> {
  item: T;
  score: number;
}

export type MessageIntent = 'greeting' | 'thanks' | 'human' | 'question';
