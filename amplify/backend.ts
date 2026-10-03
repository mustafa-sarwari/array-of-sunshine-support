import { defineBackend } from '@aws-amplify/backend';
import { Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { FunctionUrlAuthType, HttpMethod, InvokeMode } from 'aws-cdk-lib/aws-lambda';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { ownerApi } from './functions/owner-api/resource';
import { publicChat } from './functions/public-chat/resource';

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

const region = Stack.of(chatFn).region;
const modelId = process.env.BEDROCK_MODEL_ID ?? 'amazon.nova-lite-v1:0';
// In-region on-demand model ARN. If you switch to a cross-region inference profile
// (e.g. us.amazon.nova-micro-v1:0), grant the inference-profile ARN AND
// arn:aws:bedrock:*::foundation-model/<base-model-id> instead.
chatFn.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['bedrock:InvokeModelWithResponseStream', 'bedrock:InvokeModel'],
    resources: [`arn:aws:bedrock:${region}::foundation-model/${modelId}`],
  }),
);

const widgetOrigins = (process.env.WIDGET_ALLOWED_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const chatUrl = chatFn.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  invokeMode: InvokeMode.RESPONSE_STREAM,
  cors: {
    allowedOrigins: widgetOrigins,
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
  },
});
