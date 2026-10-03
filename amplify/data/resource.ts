import { a, defineData, type ClientSchema } from '@aws-amplify/backend';
import { ownerApi } from '../functions/owner-api/resource';

/**
 * Owner-only GraphQL API (AWS AppSync). Every operation requires a Cognito
 * user pool token and is resolved by the owner-api Lambda, which derives the
 * business from the caller's `sub`. No operation accepts a businessId.
 * There is no API key and no guest access: the public widget uses the
 * separate public-chat function URL instead.
 */

const handler = a.handler.function(ownerApi);

const schema = a.schema({
  BusinessProfile: a.customType({
    name: a.string().required(),
    tagline: a.string(),
    phone: a.string(),
    email: a.string(),
    address: a.string(),
    greeting: a.string(),
    brandColor: a.string(),
    widgetKey: a.string().required(),
    allowedOrigins: a.string().array(),
  }),
  KnowledgeEntry: a.customType({
    id: a.id().required(),
    kind: a.string().required(),
    question: a.string().required(),
    answer: a.string().required(),
    keywords: a.string().array(),
    status: a.string().required(),
    updatedAt: a.datetime().required(),
  }),
  ConversationSummary: a.customType({
    id: a.id().required(),
    visitorLabel: a.string().required(),
    status: a.string().required(),
    pageUrl: a.string(),
    firstQuestion: a.string(),
    messageCount: a.integer(),
    visitorMessageCount: a.integer(),
    answeredCount: a.integer(),
    handoffOfferedCount: a.integer(),
    startedAt: a.datetime().required(),
    updatedAt: a.datetime().required(),
  }),
  DashboardStats: a.customType({
    conversationsTotal: a.integer().required(),
    conversationsLast7Days: a.integer().required(),
    answeredReplies: a.integer().required(),
    ratedReplies: a.integer().required(),
    newInquiries: a.integer().required(),
    openUnanswered: a.integer().required(),
    approvedAnswers: a.integer().required(),
  }),
  ConversationPage: a.customType({
    items: a.ref('ConversationSummary').array(),
    nextToken: a.string(),
  }),
  ChatMessage: a.customType({
    id: a.id().required(),
    role: a.string().required(),
    text: a.string().required(),
    outcome: a.string(),
    sourceIds: a.string().array(),
    createdAt: a.datetime().required(),
  }),
  ConversationDetail: a.customType({
    summary: a.ref('ConversationSummary').required(),
    messages: a.ref('ChatMessage').array(),
  }),
  Inquiry: a.customType({
    id: a.id().required(),
    conversationId: a.id(),
    name: a.string().required(),
    email: a.string().required(),
    phone: a.string(),
    message: a.string().required(),
    status: a.string().required(),
    createdAt: a.datetime().required(),
  }),
  UnansweredQuestion: a.customType({
    id: a.id().required(),
    conversationId: a.id(),
    question: a.string().required(),
    status: a.string().required(),
    resolvedKnowledgeId: a.id(),
    createdAt: a.datetime().required(),
  }),
  DocumentUpload: a.customType({
    documentId: a.id().required(),
    uploadUrl: a.string().required(),
    expiresAt: a.datetime().required(),
  }),
  BusinessDocument: a.customType({
    id: a.id().required(),
    fileName: a.string().required(),
    contentType: a.string().required(),
    createdAt: a.datetime().required(),
  }),

  getMyBusiness: a.query().returns(a.ref('BusinessProfile')).authorization((allow) => [allow.authenticated()]).handler(handler),
  getDashboardStats: a.query().returns(a.ref('DashboardStats')).authorization((allow) => [allow.authenticated()]).handler(handler),
  updateBusinessProfile: a
    .mutation()
    .arguments({
      name: a.string().required(),
      tagline: a.string(),
      phone: a.string(),
      email: a.string(),
      address: a.string(),
      greeting: a.string(),
      brandColor: a.string(),
    })
    .returns(a.ref('BusinessProfile'))
    .authorization((allow) => [allow.authenticated()])
    .handler(handler),

  listKnowledge: a.query().returns(a.ref('KnowledgeEntry').array()).authorization((allow) => [allow.authenticated()]).handler(handler),
  saveKnowledge: a
    .mutation()
    .arguments({
      id: a.id(),
      kind: a.string().required(),
      question: a.string().required(),
      answer: a.string().required(),
      keywords: a.string().array(),
      status: a.string().required(),
      resolvesUnansweredId: a.id(),
    })
    .returns(a.ref('KnowledgeEntry'))
    .authorization((allow) => [allow.authenticated()])
    .handler(handler),
  deleteKnowledge: a.mutation().arguments({ id: a.id().required() }).returns(a.boolean()).authorization((allow) => [allow.authenticated()]).handler(handler),

  listConversations: a
    .query()
    .arguments({ limit: a.integer(), nextToken: a.string() })
    .returns(a.ref('ConversationPage'))
    .authorization((allow) => [allow.authenticated()])
    .handler(handler),
  getConversation: a.query().arguments({ id: a.id().required() }).returns(a.ref('ConversationDetail')).authorization((allow) => [allow.authenticated()]).handler(handler),
  setConversationStatus: a
    .mutation()
    .arguments({ id: a.id().required(), status: a.string().required() })
    .returns(a.boolean())
    .authorization((allow) => [allow.authenticated()])
    .handler(handler),

  listInquiries: a.query().returns(a.ref('Inquiry').array()).authorization((allow) => [allow.authenticated()]).handler(handler),
  setInquiryStatus: a
    .mutation()
    .arguments({ id: a.id().required(), status: a.string().required() })
    .returns(a.boolean())
    .authorization((allow) => [allow.authenticated()])
    .handler(handler),

  listUnanswered: a.query().returns(a.ref('UnansweredQuestion').array()).authorization((allow) => [allow.authenticated()]).handler(handler),
  setUnansweredStatus: a
    .mutation()
    .arguments({ id: a.id().required(), status: a.string().required() })
    .returns(a.boolean())
    .authorization((allow) => [allow.authenticated()])
    .handler(handler),

  createDocumentUpload: a
    .mutation()
    .arguments({ fileName: a.string().required(), contentType: a.string().required() })
    .returns(a.ref('DocumentUpload'))
    .authorization((allow) => [allow.authenticated()])
    .handler(handler),
  listDocuments: a.query().returns(a.ref('BusinessDocument').array()).authorization((allow) => [allow.authenticated()]).handler(handler),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
