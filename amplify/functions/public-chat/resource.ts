import { defineFunction } from '@aws-amplify/backend';

/** Economical model. See COST_ESTIMATE.md for the availability check and pricing. */
export const DEFAULT_MODEL_ID = 'amazon.nova-lite-v1:0';

/**
 * Bedrock is called in us-east-1 even though the app runs in us-east-2: Nova Lite
 * has in-Region on-demand quotas there, and the AWS Free plan does not allow
 * cross-Region inference profiles. See COST_ESTIMATE.md, "Region note".
 */
export const DEFAULT_BEDROCK_REGION = 'us-east-1';

export const publicChat = defineFunction({
  name: 'public-chat',
  entry: './handler.ts',
  runtime: 22,
  memoryMB: 512,
  timeoutSeconds: 30,
  logging: { format: 'json', retention: '1 month' },
  environment: {
    MODEL_ID: process.env.BEDROCK_MODEL_ID ?? DEFAULT_MODEL_ID,
    BEDROCK_REGION: process.env.BEDROCK_REGION ?? DEFAULT_BEDROCK_REGION,
    MAX_OUTPUT_TOKENS: '400',
    CONVERSATION_RETENTION_DAYS: '180',
    RATE_LIMIT_PER_MINUTE: '20',
  },
});
