import { defineFunction } from '@aws-amplify/backend';

/** Economical model verified as ACTIVE with on-demand inference in us-east-2. See COST_ESTIMATE.md. */
export const DEFAULT_MODEL_ID = 'amazon.nova-lite-v1:0';

export const publicChat = defineFunction({
  name: 'public-chat',
  entry: './handler.ts',
  runtime: 22,
  memoryMB: 512,
  timeoutSeconds: 30,
  logging: { format: 'json', retention: '1 month' },
  environment: {
    MODEL_ID: process.env.BEDROCK_MODEL_ID ?? DEFAULT_MODEL_ID,
    MAX_OUTPUT_TOKENS: '400',
    CONVERSATION_RETENTION_DAYS: '180',
    RATE_LIMIT_PER_MINUTE: '20',
  },
});
