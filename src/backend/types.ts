import type { ComponentType } from 'react';
import type { KnowledgeEntry } from '../../shared/knowledge';
import type { PublicChatClient } from '../lib/chatTypes';
import type { Business, ChatMessage, ConversationStatus, InquiryStatus, UnansweredStatus } from '../lib/types';
import type { KnowledgeInput } from '../lib/validation';

/**
 * What the owner dashboard and demo pages need from a backend. The local demo
 * implements it with localStorage; the AWS build with Cognito, AppSync, and
 * the public-chat function URL. No method accepts a businessId: the business
 * always comes from the signed-in identity.
 */

export type BackendMode = 'local' | 'aws' | 'server';

export interface OwnerIdentity {
  /** Cognito `sub` in the AWS build, the demo owner id locally. */
  id: string;
  email: string;
  displayName: string;
}

export type OwnerSessionState = { status: 'loading' } | { status: 'signedOut' } | { status: 'signedIn'; identity: OwnerIdentity };

export interface OwnerBusiness {
  name: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  greeting: string;
  brandColor: string;
  widgetKey: string;
  allowedOrigins: string[];
  /** In-app demo website that embeds this business's widget, if there is one. */
  previewPath?: string;
}

export type BusinessProfileInput = Pick<OwnerBusiness, 'name' | 'tagline' | 'phone' | 'email' | 'address' | 'greeting' | 'brandColor'>;

export interface DashboardStats {
  conversationsTotal: number;
  conversationsLast7Days: number;
  answeredReplies: number;
  /** Replies that were either answered from approved info or offered a handoff (small talk excluded). */
  ratedReplies: number;
  newInquiries: number;
  openUnanswered: number;
  approvedAnswers: number;
}

export interface ConversationSummary {
  id: string;
  visitorLabel: string;
  status: ConversationStatus;
  pageUrl?: string;
  firstQuestion?: string;
  messageCount: number;
  visitorMessageCount: number;
  answeredCount: number;
  handoffOfferedCount: number;
  startedAt: string;
  updatedAt: string;
}

export interface ConversationPage {
  items: ConversationSummary[];
  nextToken?: string;
}

export interface ConversationDetail {
  summary: ConversationSummary;
  messages: ChatMessage[];
}

export interface OwnerInquiry {
  id: string;
  conversationId?: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  status: InquiryStatus;
  createdAt: string;
}

export interface OwnerUnanswered {
  id: string;
  conversationId?: string;
  question: string;
  status: UnansweredStatus;
  resolvedKnowledgeId?: string;
  createdAt: string;
}

export interface OwnerDataSource {
  getMyBusiness(): Promise<OwnerBusiness>;
  updateBusinessProfile(input: BusinessProfileInput): Promise<void>;
  getDashboardStats(): Promise<DashboardStats>;
  listKnowledge(): Promise<KnowledgeEntry[]>;
  saveKnowledge(input: KnowledgeInput, id?: string, resolvesUnansweredId?: string): Promise<KnowledgeEntry>;
  deleteKnowledge(id: string): Promise<void>;
  listConversations(page?: { limit?: number; nextToken?: string }): Promise<ConversationPage>;
  /** Resolves to null when the conversation doesn't exist for this business. */
  getConversation(id: string): Promise<ConversationDetail | null>;
  setConversationStatus(id: string, status: ConversationStatus): Promise<void>;
  listInquiries(): Promise<OwnerInquiry[]>;
  setInquiryStatus(id: string, status: InquiryStatus): Promise<void>;
  listUnanswered(): Promise<OwnerUnanswered[]>;
  setUnansweredStatus(id: string, status: UnansweredStatus): Promise<void>;
}

export interface Backend {
  mode: BackendMode;
  useOwnerSession(): OwnerSessionState;
  signOut(): Promise<void>;
  SignInScreen: ComponentType;
  createOwnerData(identity: OwnerIdentity): OwnerDataSource;
  /** Notifies when data changed outside the dashboard's own requests (local demo: another tab or the widget). */
  subscribeToChanges?(listener: () => void): () => void;
  /** Businesses with an in-app demo website. */
  useDemoBusinesses(): readonly Business[];
  resetDemoData?(): void;
  chat: PublicChatClient;
}
