import { randomUUID } from 'node:crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DeleteCommand, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { AppSyncIdentityCognito, AppSyncResolverEvent } from 'aws-lambda';
import { TABLE_NAME, ddb, keys, stripKeys } from '../lib/table';

/**
 * AppSync resolver for every owner operation. The caller's business is
 * derived from the verified Cognito `sub` (event.identity), never from
 * arguments. Records fetched by id are always addressed under that
 * business's partition, so ids belonging to another business simply miss.
 */

type Args = Record<string, unknown>;

const s3 = new S3Client({});
const BUCKET = process.env.DOCUMENTS_BUCKET ?? '';
const ALLOWED_UPLOAD_TYPES = new Set(['application/pdf', 'text/plain', 'text/markdown', 'text/csv']);

const KNOWLEDGE_KINDS = new Set(['faq', 'service']);
const KNOWLEDGE_STATUSES = new Set(['approved', 'draft']);
const CONVERSATION_STATUSES = new Set(['active', 'handoff', 'closed']);
const INQUIRY_STATUSES = new Set(['new', 'contacted', 'resolved']);
const UNANSWERED_STATUSES = new Set(['open', 'resolved', 'dismissed']);

class UserError extends Error {}

async function resolveBusinessId(event: AppSyncResolverEvent<Args>): Promise<string> {
  const identity = event.identity as AppSyncIdentityCognito | null;
  const sub = identity?.sub;
  if (!sub) throw new UserError('Unauthorized');
  const res = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: keys.membership(sub), ConsistentRead: true }));
  const businessId = res.Item?.businessId as string | undefined;
  if (!businessId) throw new UserError('This account is not linked to a business.');
  return businessId;
}

function str(args: Args, name: string, max: number, required = true): string {
  const v = args[name];
  if (v === undefined || v === null || v === '') {
    if (required) throw new UserError(`${name} is required.`);
    return '';
  }
  if (typeof v !== 'string') throw new UserError(`${name} must be a string.`);
  const trimmed = v.trim();
  if (trimmed.length > max) throw new UserError(`${name} is too long.`);
  return trimmed;
}

function oneOf(args: Args, name: string, allowed: Set<string>): string {
  const v = str(args, name, 40);
  if (!allowed.has(v)) throw new UserError(`Invalid ${name}.`);
  return v;
}

async function queryPrefix(businessId: string, prefix: string) {
  const items: Record<string, unknown>[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :p)',
        ExpressionAttributeValues: { ':pk': keys.business(businessId), ':p': prefix },
        ExclusiveStartKey,
      }),
    );
    items.push(...(res.Items ?? []));
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items.map(stripKeys);
}

async function setStatus(key: { PK: string; SK: string }, status: string) {
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: key,
        UpdateExpression: 'SET #s = :s',
        ConditionExpression: 'attribute_exists(PK)',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':s': status },
      }),
    );
    return true;
  } catch (e) {
    if ((e as Error).name === 'ConditionalCheckFailedException') throw new UserError('Not found.');
    throw e;
  }
}

const byNewest = (field: string) => (a: Record<string, unknown>, b: Record<string, unknown>) =>
  String(b[field] ?? '').localeCompare(String(a[field] ?? ''));

const operations: Record<string, (businessId: string, args: Args) => Promise<unknown>> = {
  async getMyBusiness(businessId) {
    const res = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: keys.profile(businessId) }));
    if (!res.Item) throw new UserError('Business not found.');
    return stripKeys(res.Item);
  },

  async getDashboardStats(businessId) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const stats = { conversationsTotal: 0, conversationsLast7Days: 0, answeredReplies: 0, ratedReplies: 0, newInquiries: 0, openUnanswered: 0, approvedAnswers: 0 };
    let ExclusiveStartKey: Record<string, unknown> | undefined;
    do {
      const res = await ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'PK = :pk',
          ProjectionExpression: 'SK, #s, updatedAt, answeredCount, handoffOfferedCount',
          ExpressionAttributeNames: { '#s': 'status' },
          ExpressionAttributeValues: { ':pk': keys.business(businessId) },
          ExclusiveStartKey,
        }),
      );
      for (const item of res.Items ?? []) {
        const sk = String(item.SK);
        if (sk.startsWith('CONV#')) {
          const answered = Number(item.answeredCount ?? 0);
          stats.conversationsTotal += 1;
          if (String(item.updatedAt ?? '') >= weekAgo) stats.conversationsLast7Days += 1;
          stats.answeredReplies += answered;
          stats.ratedReplies += answered + Number(item.handoffOfferedCount ?? 0);
        } else if (sk.startsWith('INQ#') && item.status === 'new') stats.newInquiries += 1;
        else if (sk.startsWith('UNQ#') && item.status === 'open') stats.openUnanswered += 1;
        else if (sk.startsWith('KB#') && item.status === 'approved') stats.approvedAnswers += 1;
      }
      ExclusiveStartKey = res.LastEvaluatedKey;
    } while (ExclusiveStartKey);
    return stats;
  },

  async updateBusinessProfile(businessId, args) {
    const brandColor = str(args, 'brandColor', 7, false);
    const res = await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: keys.profile(businessId),
        ConditionExpression: 'attribute_exists(PK)',
        UpdateExpression: 'SET #n = :n, tagline = :t, phone = :p, email = :e, address = :a, greeting = :g, brandColor = :c',
        ExpressionAttributeNames: { '#n': 'name' },
        ExpressionAttributeValues: {
          ':n': str(args, 'name', 120),
          ':t': str(args, 'tagline', 200, false),
          ':p': str(args, 'phone', 40, false),
          ':e': str(args, 'email', 200, false),
          ':a': str(args, 'address', 200, false),
          ':g': str(args, 'greeting', 300, false),
          ':c': /^#[0-9a-fA-F]{6}$/.test(brandColor) ? brandColor : '#4f46e5',
        },
        ReturnValues: 'ALL_NEW',
      }),
    );
    return stripKeys(res.Attributes ?? {});
  },

  async listKnowledge(businessId) {
    return (await queryPrefix(businessId, 'KB#')).sort(byNewest('updatedAt'));
  },

  async saveKnowledge(businessId, args) {
    const id = str(args, 'id', 64, false) || `kb_${randomUUID()}`;
    const keywords = Array.isArray(args.keywords)
      ? [...new Set(args.keywords.filter((k): k is string => typeof k === 'string').map((k) => k.trim().toLowerCase()).filter(Boolean))].slice(0, 30)
      : [];
    const item = {
      ...keys.knowledge(businessId, id),
      id,
      businessId,
      kind: oneOf(args, 'kind', KNOWLEDGE_KINDS),
      question: str(args, 'question', 300),
      answer: str(args, 'answer', 1500),
      keywords,
      status: oneOf(args, 'status', KNOWLEDGE_STATUSES),
      updatedAt: new Date().toISOString(),
    };
    if (item.answer.length < 10) throw new UserError('Answer is too short.');
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));

    const resolves = str(args, 'resolvesUnansweredId', 64, false);
    if (resolves) {
      await ddb
        .send(
          new UpdateCommand({
            TableName: TABLE_NAME,
            Key: keys.unanswered(businessId, resolves),
            ConditionExpression: 'attribute_exists(PK)',
            UpdateExpression: 'SET #s = :s, resolvedKnowledgeId = :k',
            ExpressionAttributeNames: { '#s': 'status' },
            ExpressionAttributeValues: { ':s': 'resolved', ':k': id },
          }),
        )
        .catch((e: Error) => {
          if (e.name !== 'ConditionalCheckFailedException') throw e;
        });
    }
    return stripKeys(item);
  },

  async deleteKnowledge(businessId, args) {
    await ddb.send(new DeleteCommand({ TableName: TABLE_NAME, Key: keys.knowledge(businessId, str(args, 'id', 64)) }));
    return true;
  },

  async listConversations(businessId, args) {
    const limit = Math.min(Math.max(Number(args.limit) || 25, 1), 100);
    const nextToken = str(args, 'nextToken', 2000, false);
    let startKey: Record<string, unknown> | undefined;
    if (nextToken) {
      startKey = JSON.parse(Buffer.from(nextToken, 'base64url').toString('utf8'));
      if (startKey?.PK !== keys.business(businessId)) throw new UserError('Invalid nextToken.');
    }
    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :g',
        ExpressionAttributeValues: { ':g': keys.conversationGsi(businessId) },
        ScanIndexForward: false,
        Limit: limit,
        ExclusiveStartKey: startKey,
      }),
    );
    return {
      items: (res.Items ?? []).map(stripKeys),
      nextToken: res.LastEvaluatedKey ? Buffer.from(JSON.stringify(res.LastEvaluatedKey)).toString('base64url') : null,
    };
  },

  async getConversation(businessId, args) {
    const id = str(args, 'id', 64);
    const summary = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: keys.conversation(businessId, id) }));
    if (!summary.Item) return null;
    const messages = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': keys.messagesPk(businessId, id) },
        Limit: 200,
      }),
    );
    return { summary: stripKeys(summary.Item), messages: (messages.Items ?? []).map(stripKeys) };
  },

  async setConversationStatus(businessId, args) {
    return setStatus(keys.conversation(businessId, str(args, 'id', 64)), oneOf(args, 'status', CONVERSATION_STATUSES));
  },

  async listInquiries(businessId) {
    return (await queryPrefix(businessId, 'INQ#')).sort(byNewest('createdAt'));
  },

  async setInquiryStatus(businessId, args) {
    return setStatus(keys.inquiry(businessId, str(args, 'id', 64)), oneOf(args, 'status', INQUIRY_STATUSES));
  },

  async listUnanswered(businessId) {
    return (await queryPrefix(businessId, 'UNQ#')).sort(byNewest('createdAt'));
  },

  async setUnansweredStatus(businessId, args) {
    return setStatus(keys.unanswered(businessId, str(args, 'id', 64)), oneOf(args, 'status', UNANSWERED_STATUSES));
  },

  async createDocumentUpload(businessId, args) {
    const contentType = str(args, 'contentType', 100);
    if (!ALLOWED_UPLOAD_TYPES.has(contentType)) throw new UserError('Unsupported file type.');
    const fileName = str(args, 'fileName', 200).replace(/[^a-zA-Z0-9._-]/g, '_');
    const documentId = randomUUID();
    const objectKey = `businesses/${businessId}/documents/${documentId}/${fileName}`;
    const expiresIn = 300;
    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: BUCKET, Key: objectKey, ContentType: contentType }),
      { expiresIn },
    );
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: { ...keys.document(businessId, documentId), id: documentId, fileName, contentType, objectKey, createdAt: new Date().toISOString() },
      }),
    );
    return { documentId, uploadUrl, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() };
  },

  async listDocuments(businessId) {
    return (await queryPrefix(businessId, 'DOC#')).map(({ objectKey, ...doc }) => (void objectKey, doc)).sort(byNewest('createdAt'));
  },
};

export const handler = async (event: AppSyncResolverEvent<Args>) => {
  const op = operations[event.info.fieldName];
  if (!op) throw new Error(`Unknown operation ${event.info.fieldName}`);
  try {
    const businessId = await resolveBusinessId(event);
    return await op(businessId, event.arguments ?? {});
  } catch (e) {
    if (e instanceof UserError) throw e;
    console.error('owner-api error', { field: event.info.fieldName, name: (e as Error).name, message: (e as Error).message });
    throw new Error('Internal error');
  }
};
