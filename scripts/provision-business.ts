// Links a Cognito owner to a business and loads that business's sample data
// into the deployed DynamoDB table. Run only after a sandbox/deploy exists.
//
//   $env:AWS_PROFILE = "aws-project"; $env:AWS_REGION = "us-east-2"
//   npx tsx scripts/provision-business.ts --table <SupportTableName> --business maple `
//     --owner-sub <cognito-sub> --origins "https://www.example.com,http://localhost:5173"
import { parseArgs } from 'node:util';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BatchWriteCommand, DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { buildSeed, HARBOR_ID, MAPLE_ID } from '../src/lib/seed';

const { values } = parseArgs({
  options: {
    table: { type: 'string' },
    business: { type: 'string' },
    'owner-sub': { type: 'string' },
    origins: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
  },
});

const table = values.table;
const businessId = values.business === 'maple' ? MAPLE_ID : values.business === 'harbor' ? HARBOR_ID : undefined;
const ownerSub = values['owner-sub'];
if (!table || !businessId || !ownerSub) {
  console.error('Usage: --table <name> --business maple|harbor --owner-sub <cognito sub> [--origins a,b] [--dry-run]');
  process.exit(1);
}

const seed = buildSeed();
const business = seed.businesses.find((b) => b.id === businessId)!;
const origins = values.origins ? values.origins.split(',').map((o) => o.trim()).filter(Boolean) : business.allowedOrigins;

const items: Record<string, unknown>[] = [
  { PK: `USER#${ownerSub}`, SK: 'MEMBERSHIP', businessId, role: 'owner' },
  { PK: `WIDGET#${business.widgetKey}`, SK: 'WIDGET', businessId },
  {
    PK: `BIZ#${businessId}`,
    SK: 'PROFILE',
    name: business.name,
    tagline: business.tagline,
    phone: business.phone,
    email: business.email,
    address: business.address,
    greeting: business.greeting,
    brandColor: business.brandColor,
    widgetKey: business.widgetKey,
    allowedOrigins: origins,
  },
  ...seed.knowledge
    .filter((k) => k.businessId === businessId)
    .map((k) => ({ PK: `BIZ#${businessId}`, SK: `KB#${k.id}`, ...k })),
];

if (values['dry-run']) {
  console.log(JSON.stringify(items, null, 2));
  process.exit(0);
}

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions: { removeUndefinedValues: true } });

// The membership must not silently move an existing owner to another business.
await ddb.send(
  new PutCommand({ TableName: table, Item: items[0], ConditionExpression: 'attribute_not_exists(PK) OR businessId = :b', ExpressionAttributeValues: { ':b': businessId } }),
);
for (let i = 1; i < items.length; i += 25) {
  let request = { [table]: items.slice(i, i + 25).map((Item) => ({ PutRequest: { Item } })) };
  for (let attempt = 0; Object.keys(request).length && attempt < 5; attempt++) {
    const res = await ddb.send(new BatchWriteCommand({ RequestItems: request }));
    request = (res.UnprocessedItems ?? {}) as typeof request;
    if (Object.keys(request).length) await new Promise((r) => setTimeout(r, 200 * 2 ** attempt));
  }
  if (Object.keys(request).length) throw new Error('Some items could not be written. Re-run the script.');
}
console.log(`Provisioned ${business.name} (${items.length} items) for owner ${ownerSub}.`);
