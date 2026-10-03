import { createHash, timingSafeEqual } from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

/**
 * Single-table layout (DynamoDB, on-demand):
 *
 *   PK                          SK                         item
 *   USER#<cognitoSub>           MEMBERSHIP                 { businessId, role }
 *   WIDGET#<widgetKey>          WIDGET                     { businessId }
 *   BIZ#<businessId>            PROFILE                    business profile + allowedOrigins
 *   BIZ#<businessId>            KB#<id>                    knowledge entry
 *   BIZ#<businessId>            CONV#<id>                  conversation summary (+ GSI1 by updatedAt)
 *   BIZ#<businessId>#CONV#<id>  MSG#<iso>#<id>             message
 *   BIZ#<businessId>            INQ#<id>                   handoff inquiry
 *   BIZ#<businessId>            UNQ#<id>                   unanswered question
 *   BIZ#<businessId>            DOC#<id>                   uploaded document metadata
 *   RATE#<ip>#<minute>          RATE                       public request counter (TTL)
 *
 * Every business-owned key starts with BIZ#<businessId>, and that id only
 * ever comes from a membership lookup or a widget-key lookup on the server.
 */

export const TABLE_NAME = process.env.TABLE_NAME ?? '';

export const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

export const keys = {
  membership: (sub: string) => ({ PK: `USER#${sub}`, SK: 'MEMBERSHIP' }),
  widget: (widgetKey: string) => ({ PK: `WIDGET#${widgetKey}`, SK: 'WIDGET' }),
  business: (businessId: string) => `BIZ#${businessId}`,
  profile: (businessId: string) => ({ PK: `BIZ#${businessId}`, SK: 'PROFILE' }),
  knowledge: (businessId: string, id: string) => ({ PK: `BIZ#${businessId}`, SK: `KB#${id}` }),
  conversation: (businessId: string, id: string) => ({ PK: `BIZ#${businessId}`, SK: `CONV#${id}` }),
  conversationGsi: (businessId: string) => `BIZ#${businessId}#CONVS`,
  messagesPk: (businessId: string, conversationId: string) => `BIZ#${businessId}#CONV#${conversationId}`,
  inquiry: (businessId: string, id: string) => ({ PK: `BIZ#${businessId}`, SK: `INQ#${id}` }),
  unanswered: (businessId: string, id: string) => ({ PK: `BIZ#${businessId}`, SK: `UNQ#${id}` }),
  document: (businessId: string, id: string) => ({ PK: `BIZ#${businessId}`, SK: `DOC#${id}` }),
};

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function tokenMatches(token: string, expectedHash: string | undefined): boolean {
  if (!expectedHash || !token) return false;
  const a = Buffer.from(hashToken(token), 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function ttlFromNow(days: number): number {
  return Math.floor(Date.now() / 1000) + days * 24 * 60 * 60;
}

export function stripKeys<T extends Record<string, unknown>>(item: T) {
  const { PK, SK, GSI1PK, GSI1SK, ttl, visitorTokenHash, ...rest } = item;
  void PK, SK, GSI1PK, GSI1SK, ttl, visitorTokenHash;
  return rest;
}
