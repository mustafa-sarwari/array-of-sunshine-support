import { defineFunction } from '@aws-amplify/backend';

/** Economical model. See COST_ESTIMATE.md for the availability check and pricing. */
export const DEFAULT_MODEL_ID = 'amazon.nova-lite-v1:0';

/**
 * Bedrock is called in the app's own region unless BEDROCK_REGION is set. Set it only
 * when the model has no in-Region on-demand access there, for example Nova Lite from
 * us-east-2 on the AWS Free plan (README, "Model choice").
 */
export const BEDROCK_REGION_OVERRIDE = process.env.BEDROCK_REGION?.trim() || undefined;

export const publicChat = defineFunction({
  name: 'public-chat',
  entry: './handler.ts',
  runtime: 22,
  memoryMB: 512,
  timeoutSeconds: 30,
  logging: { format: 'json', retention: '1 month' },
  environment: {
    MODEL_ID: process.env.BEDROCK_MODEL_ID ?? DEFAULT_MODEL_ID,
    ...(BEDROCK_REGION_OVERRIDE ? { BEDROCK_REGION: BEDROCK_REGION_OVERRIDE } : {}),
    MAX_OUTPUT_TOKENS: '400',
    CONVERSATION_RETENTION_DAYS: '180',
    RATE_LIMIT_PER_MINUTE: '20',
  },
});
