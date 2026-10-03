import type { ChatMessage, MessageOutcome } from './types';
import type { HandoffInput } from './validation';

/** Contract between the chat widget and whichever public chat backend it talks to. */

export interface PublicWidgetConfig {
  widgetKey: string;
  businessName: string;
  greeting: string;
  brandColor: string;
  suggestedQuestions: string[];
}

export interface VisitorConversation {
  conversationId: string;
  visitorToken: string;
}

export type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; outcome: MessageOutcome; sources?: { id: string; title: string }[] }
  | { type: 'error'; message: string };

export class PublicApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

export interface PublicChatClient {
  /** True when replies are generated locally instead of by Amazon Bedrock. */
  readonly simulated: boolean;
  getConfig(widgetKey: string): Promise<PublicWidgetConfig>;
  start(widgetKey: string, pageUrl?: string): Promise<VisitorConversation>;
  /** Resolves to null when the conversation no longer exists or the token doesn't match. */
  getTranscript(widgetKey: string, ref: VisitorConversation): Promise<ChatMessage[] | null>;
  sendMessage(widgetKey: string, ref: VisitorConversation, text: string): AsyncIterable<StreamEvent>;
  submitHandoff(widgetKey: string, ref: VisitorConversation, input: HandoffInput): Promise<void>;
}
