export type { KnowledgeItem, KnowledgeKind, KnowledgeStatus, RetrievalMatch } from '../../shared/knowledge';
import type { KnowledgeItem } from '../../shared/knowledge';

export interface Business {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  brandColor: string;
  phone: string;
  email: string;
  address: string;
  greeting: string;
  /** Public, non-secret key embedded in the customer's website. Maps to a business on the server. */
  widgetKey: string;
  allowedOrigins: string[];
}

/** Demo-only account record. Production uses Amazon Cognito; no passwords are stored by the app. */
export interface DemoOwnerAccount {
  id: string;
  email: string;
  password: string;
  displayName: string;
}

export interface Membership {
  ownerId: string;
  businessId: string;
  role: 'owner';
}

export type MessageRole = 'visitor' | 'assistant' | 'system';
export type MessageOutcome = 'answered' | 'handoff_offered' | 'smalltalk';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  createdAt: string;
  outcome?: MessageOutcome;
  sourceIds?: string[];
}

export type ConversationStatus = 'active' | 'handoff' | 'closed';

export interface Conversation {
  id: string;
  businessId: string;
  /** Secret held only by the visitor's browser; required to read or append to this conversation. */
  visitorToken: string;
  visitorLabel: string;
  startedAt: string;
  updatedAt: string;
  status: ConversationStatus;
  pageUrl?: string;
  messages: ChatMessage[];
}

export type InquiryStatus = 'new' | 'contacted' | 'resolved';

export interface Inquiry {
  id: string;
  businessId: string;
  conversationId?: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  status: InquiryStatus;
  createdAt: string;
}

export type UnansweredStatus = 'open' | 'resolved' | 'dismissed';

export interface UnansweredQuestion {
  id: string;
  businessId: string;
  conversationId: string;
  question: string;
  createdAt: string;
  status: UnansweredStatus;
  resolvedKnowledgeId?: string;
}

export interface DemoDatabase {
  version: 1;
  businesses: Business[];
  owners: DemoOwnerAccount[];
  memberships: Membership[];
  knowledge: KnowledgeItem[];
  conversations: Conversation[];
  inquiries: Inquiry[];
  unanswered: UnansweredQuestion[];
}
