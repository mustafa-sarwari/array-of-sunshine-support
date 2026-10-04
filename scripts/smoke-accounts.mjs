// Browser test of owner accounts against the real server: registration, sign-in, password
// change, and recovery-code reset. Creates a new fictional business account on every run,
// so point it at a throwaway database. Usage: npm start (or npm run dev), then
//   $env:BASE_URL = "http://localhost:3001"; npm run smoke:accounts
import { mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { chromium } from 'playwright-core';

const base = process.env.BASE_URL ?? 'http://localhost:3001';
mkdirSync('docs/screenshots', { recursive: true });
const browser = await chromium.launch({ ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : { channel: process.env.BROWSER_CHANNEL ?? 'msedge' }), headless: true });
const errors = [];
const pw = () => `Test-${randomBytes(9).toString('base64url')}`;

try {
  for (const viewport of [{ width: 1366, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    const shot = (name) => page.screenshot({ path: `docs/screenshots/server-${name}-${viewport.width}.png`, fullPage: true, mask: [page.locator('code')] });
    const accountForm = () => page.locator('section form');
    const email = `owner-${viewport.width}-${Date.now()}@example.com`;
    const business = `Sunrise Florist ${viewport.width}`;
    let password = pw();

    async function signIn(pass) {
      await page.goto(base + '/owner/sign-in');
      await page.getByLabel('Email', { exact: true }).fill(email);
      await page.getByLabel('Password', { exact: true }).fill(pass);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    }
    async function savedCode() {
      const code = (await page.getByRole('status').locator('code').innerText()).trim();
      if (code.length < 20) throw new Error('No recovery code shown.');
      return code;
    }

    await page.goto(base + '/owner/sign-in');
    await accountForm().getByLabel('Account email').fill(email);
    await accountForm().getByLabel('Business name').fill(business);
    await accountForm().getByLabel(/New password/).fill('too-short');
    await accountForm().getByRole('button', { name: 'Create account' }).click();
    if (await page.getByRole('status').count()) throw new Error('A password shorter than 12 characters was accepted.');
    await accountForm().getByLabel(/New password/).fill(password);
    await accountForm().getByRole('button', { name: 'Create account' }).click();
    const firstCode = await savedCode();
    await shot('register');
    await page.getByRole('button', { name: /Saved/ }).click();

    await signIn(password);
    await page.getByRole('heading', { name: `Welcome back, ${business.split(' ')[0]}` }).waitFor();
    await page.goto(base + '/owner/knowledge');
    await page.getByRole('heading', { name: 'Approved answers' }).waitFor();
    if (await page.getByText('Opening hours').count()) throw new Error('New business can see sample business answers.');
    console.log(`  ✓ ${viewport.width}px registration and sign-in into an empty, separate business`);

    await page.goto(base + '/owner/widget');
    await page.getByRole('heading', { name: 'Account security' }).waitFor();
    await page.getByLabel('Current password').fill('Wrong-password-123');
    await page.getByLabel('New password', { exact: true }).fill(pw());
    await page.getByRole('button', { name: 'Change password' }).click();
    await page.getByRole('alert').filter({ hasText: 'Current password is incorrect.' }).waitFor();
    const newPassword = pw();
    await page.getByLabel('Current password').fill(password);
    await page.getByLabel('New password', { exact: true }).fill(newPassword);
    await page.getByRole('button', { name: 'Change password' }).click();
    await page.getByText(/Password changed/).waitFor();
    const secondCode = await savedCode();
    if (secondCode === firstCode) throw new Error('Password change did not rotate the recovery code.');
    await shot('password-changed');
    await page.goto(base + '/owner');
    await page.getByRole('heading', { name: 'Owner sign-in' }).waitFor();
    console.log(`  ✓ ${viewport.width}px password change rejects a wrong current password, rotates the code, and ends the session`);

    await signIn(password);
    await page.getByRole('alert').filter({ hasText: 'Invalid email or password.' }).waitFor();
    password = newPassword;
    await signIn(password);
    await page.getByRole('heading', { name: /Welcome back/ }).waitFor();
    if (viewport.width < 600) await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('button', { name: 'Sign out', exact: true }).first().click();
    await page.getByRole('heading', { name: 'Owner sign-in' }).waitFor();
    console.log(`  ✓ ${viewport.width}px old password refused, new password signs in, sign-out works`);

    async function recover(code, pass) {
      await page.goto(base + '/owner/sign-in');
      await page.getByRole('button', { name: 'Recover account' }).click();
      await accountForm().getByLabel('Account email').fill(email);
      await accountForm().getByLabel('Recovery code').fill(code);
      await accountForm().getByLabel(/New password/).fill(pass);
      await accountForm().getByRole('button', { name: 'Reset password' }).click();
    }
    await recover(firstCode, pw());
    await page.getByRole('alert').filter({ hasText: 'Email or recovery code is incorrect.' }).waitFor();
    const recoveredPassword = pw();
    await recover(secondCode, recoveredPassword);
    const thirdCode = await savedCode();
    if (thirdCode === secondCode) throw new Error('Recovery did not rotate the recovery code.');
    await shot('recovered');
    await page.getByRole('button', { name: /Saved/ }).click();
    if (viewport.width > 600) {
      // The server allows five recovery attempts per minute per address; keep the run under that.
      await recover(secondCode, pw());
      await page.getByRole('alert').filter({ hasText: 'Email or recovery code is incorrect.' }).waitFor();
    }
    await signIn(password);
    await page.getByRole('alert').filter({ hasText: 'Invalid email or password.' }).waitFor();
    await signIn(recoveredPassword);
    await page.getByRole('heading', { name: /Welcome back/ }).waitFor();
    console.log(`  ✓ ${viewport.width}px recovery refuses a revoked code, resets the password, and rotates the code`);
    await context.close();
    console.log(`PASS account flows ${viewport.width}px`);
  }
  if (errors.length) throw new Error(errors.join('\n'));
} finally {
  await browser.close();
}
