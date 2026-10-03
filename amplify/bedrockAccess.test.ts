import { describe, expect, it } from 'vitest';
import { bedrockModelArns } from './bedrockAccess';

describe('bedrockModelArns', () => {
  it('grants only the foundation model in the given region for a plain model ID', () => {
    expect(bedrockModelArns('amazon.nova-lite-v1:0', 'us-east-2', '000000000000')).toEqual([
      'arn:aws:bedrock:us-east-2::foundation-model/amazon.nova-lite-v1:0',
    ]);
  });

  it('grants the inference profile and the base model in any region for a profile ID', () => {
    expect(bedrockModelArns('us.amazon.nova-lite-v1:0', 'us-east-2', '000000000000')).toEqual([
      'arn:aws:bedrock:us-east-2:000000000000:inference-profile/us.amazon.nova-lite-v1:0',
      'arn:aws:bedrock:*::foundation-model/amazon.nova-lite-v1:0',
    ]);
    expect(bedrockModelArns('global.amazon.nova-2-lite-v1:0', 'us-east-2', '000000000000')[1]).toBe(
      'arn:aws:bedrock:*::foundation-model/amazon.nova-2-lite-v1:0',
    );
  });
});
