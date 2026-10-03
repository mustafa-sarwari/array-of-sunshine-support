import { defineBackend } from '@aws-amplify/backend';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { FunctionUrlAuthType, HttpMethod, InvokeMode } from 'aws-cdk-lib/aws-lambda';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { ownerApi } from './functions/owner-api/resource';
import { DEFAULT_BEDROCK_REGION, DEFAULT_MODEL_ID, publicChat } from './functions/public-chat/resource';

const backend = defineBackend({ auth, data, storage, ownerApi, publicChat });

// ---------- Cognito: owners are invited, never self-registered ----------
const { cfnUserPool } = backend.auth.resources.cfnResources;
cfnUserPool.adminCreateUserConfig = { allowAdminCreateUserOnly: true };

// ---------- DynamoDB single table ----------
const tableStack = backend.createStack('SupportData');
const table = new Table(tableStack, 'SupportTable', {
  partitionKey: { name: 'PK', type: AttributeType.STRING },
  sortKey: { name: 'SK', type: AttributeType.STRING },
  billingMode: BillingMode.PAY_PER_REQUEST,
  encryption: TableEncryption.AWS_MANAGED,
  pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
  timeToLiveAttribute: 'ttl',
  removalPolicy: RemovalPolicy.RETAIN,
});
table.addGlobalSecondaryIndex({
  indexName: 'GSI1',
  partitionKey: { name: 'GSI1PK', type: AttributeType.STRING },
  sortKey: { name: 'GSI1SK', type: AttributeType.STRING },
});

// ---------- owner-api (AppSync resolver) ----------
const ownerFn = backend.ownerApi.resources.lambda;
table.grantReadWriteData(ownerFn);
backend.ownerApi.addEnvironment('TABLE_NAME', table.tableName);
const bucket = backend.storage.resources.bucket;
bucket.grantPut(ownerFn, 'businesses/*');
backend.ownerApi.addEnvironment('DOCUMENTS_BUCKET', bucket.bucketName);

// ---------- public-chat (function URL, streaming, Bedrock) ----------
const chatFn = backend.publicChat.resources.lambda;
table.grantReadWriteData(chatFn);
backend.publicChat.addEnvironment('TABLE_NAME', table.tableName);

const modelId = process.env.BEDROCK_MODEL_ID ?? DEFAULT_MODEL_ID;
const bedrockRegion = process.env.BEDROCK_REGION ?? DEFAULT_BEDROCK_REGION;
// On-demand model ARN in the Bedrock region. If you switch to a cross-region inference
// profile (e.g. us.amazon.nova-micro-v1:0, Paid plan only), grant the inference-profile ARN
// AND arn:aws:bedrock:*::foundation-model/<base-model-id> instead.
chatFn.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['bedrock:InvokeModelWithResponseStream', 'bedrock:InvokeModel'],
    resources: [`arn:aws:bedrock:${bedrockRegion}::foundation-model/${modelId}`],
  }),
);

// CORS is open at the URL level because customer websites change without a redeploy.
// The handler enforces each business's own allowedOrigins list and answers 403 otherwise.
const chatUrl = chatFn.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  invokeMode: InvokeMode.RESPONSE_STREAM,
  cors: {
    allowedOrigins: ['*'],
    allowedMethods: [HttpMethod.POST],
    allowedHeaders: ['content-type'],
    maxAge: Duration.hours(1),
  },
});

// Optional cost circuit breaker. Leave unset on new accounts whose total
// Lambda concurrency quota is 10, because reserving capacity there fails.
if (process.env.PUBLIC_CHAT_RESERVED_CONCURRENCY) {
  backend.publicChat.resources.cfnResources.cfnFunction.reservedConcurrentExecutions = Number(
    process.env.PUBLIC_CHAT_RESERVED_CONCURRENCY,
  );
}

backend.addOutput({
  custom: {
    publicChatUrl: chatUrl.url,
    supportTableName: table.tableName,
    bedrockModelId: modelId,
    bedrockRegion,
  },
});
