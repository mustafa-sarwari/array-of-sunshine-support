import { defineAuth } from '@aws-amplify/backend';

/**
 * Cognito user pool for business owners only. Visitors using the public
 * widget never sign in. Self sign-up is disabled in backend.ts; owners are
 * invited by an administrator and linked to exactly one business.
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  multifactor: {
    mode: 'OPTIONAL',
    totp: true,
  },
  accountRecovery: 'EMAIL_ONLY',
});
