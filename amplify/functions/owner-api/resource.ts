import { defineFunction } from '@aws-amplify/backend';

export const ownerApi = defineFunction({
  name: 'owner-api',
  entry: './handler.ts',
  runtime: 22,
  memoryMB: 256,
  timeoutSeconds: 10,
  logging: { format: 'json', retention: '1 month' },
  // Lives with the data stack because AppSync resolvers invoke it.
  resourceGroupName: 'data',
});
