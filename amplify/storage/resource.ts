import { defineStorage } from '@aws-amplify/backend';

/**
 * Private bucket for owner-uploaded reference documents (menus, price
 * sheets). There are deliberately no client access rules: browsers never get
 * direct bucket access. The owner-api Lambda issues short-lived presigned
 * URLs under businesses/{businessId}/, where businessId comes from the
 * caller's membership record. The public widget has no path to this bucket.
 */
export const storage = defineStorage({
  name: 'businessDocuments',
});
