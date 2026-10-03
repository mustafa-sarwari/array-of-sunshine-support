const INFERENCE_PROFILE = /^(us|us-gov|eu|apac|jp|au|ca|global)\.(.+)$/;

/**
 * IAM resources for invoking `modelId` from `region`.
 *
 * A plain model ID is an in-Region on-demand call. A cross-Region inference profile
 * (for example `us.amazon.nova-lite-v1:0`) needs the profile ARN plus the base model in
 * every Region the profile can route to. The AWS Free plan doesn't allow profiles.
 * `region` and `account` may be CDK tokens.
 */
export function bedrockModelArns(modelId: string, region: string, account: string): string[] {
  const profile = INFERENCE_PROFILE.exec(modelId);
  if (!profile) return [`arn:aws:bedrock:${region}::foundation-model/${modelId}`];
  return [
    `arn:aws:bedrock:${region}:${account}:inference-profile/${modelId}`,
    `arn:aws:bedrock:*::foundation-model/${profile[2]}`,
  ];
}
