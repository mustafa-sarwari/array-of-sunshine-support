// End-to-end smoke test for the local demo. Drives the installed Microsoft Edge
// (or Chrome) against the running preview server. Usage:
//   npm run preview            (in one terminal)
//   npm run smoke              (in another)
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173';
const SHOTS = 'docs/screenshots';
mkdirSync(SHOTS, { recursive: true });

const channel = process.env.BROWSER_CHANNEL ?? 'msedge';
const browser = await chromium.launch({ channel, headless: true });
const errors = [];
const step = (msg) => console.log(`  ✓ ${msg}`);

function watch(page) {
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));
}

async function ask(page, text, expected) {
  const dialog = page.getByRole('dialog', { name: /chat assistant/i });
  await dialog.getByLabel('Type your question').fill(text);
  await dialog.getByLabel('Type your question').press('Enter');
  await dialog.getByText(expected).last().waitFor({ timeout: 15_000 });
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 15_000 });
}

async function signInAs(page, businessName) {
  await page.goto(`${BASE}/owner/sign-in`);
  await page.getByRole('button', { name: new RegExp(businessName) }).click();
  await page.getByRole('heading', { name: /Welcome back/ }).waitFor();
}

try {
  console.log('Desktop flow');
  const desktop = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await desktop.newPage();
  watch(page);

  await page.goto(`${BASE}/`);
  await page.getByText('An AI support assistant that only answers').waitFor();
  await page.screenshot({ path: `${SHOTS}/home-desktop.png` });
  step('home page renders');

  await page.goto(`${BASE}/demo/maple-street-bakery`);
  await page.getByRole('button', { name: 'Chat with Maple Street Bakery' }).click();
  await ask(page, 'Are you open on Sunday?', /Sunday 8:00 am to 2:00 pm/);
  step('widget answers from approved info (hours)');

  await ask(page, 'How much is a tune-up?', /don.t have approved information/);
  step('widget refuses another business\u2019s answer and offers handoff');
  await page.screenshot({ path: `${SHOTS}/widget-desktop.png` });

  const dialog = page.getByRole('dialog', { name: /chat assistant/i });
  await dialog.getByRole('button', { name: 'Yes, contact the team' }).click();
  await dialog.getByLabel('Your name').fill('Smoke Tester');
  await dialog.getByLabel('Email').fill('smoke@example.com');
  await dialog.getByRole('button', { name: 'Send to team' }).click();
  await dialog.getByText(/Request sent/).waitFor();
  step('handoff request submitted');

  await signInAs(page, 'Maple Street Bakery');
  await page.screenshot({ path: `${SHOTS}/dashboard-desktop.png` });
  step('demo sign-in as bakery owner');

  await page.goto(`${BASE}/owner/inquiries`);
  await page.getByText('Smoke Tester').waitFor();
  step('inquiry visible to bakery owner');

  await page.goto(`${BASE}/owner/unanswered`);
  await page.getByText('\u201cHow much is a tune-up?\u201d').waitFor();
  step('unanswered question recorded');

  const row = page.locator('li', { hasText: 'Do you offer baking classes for kids?' });
  await row.getByRole('button', { name: 'Write approved answer' }).click();
  await page.getByLabel('Approved answer').fill('Yes! Kids baking classes run on the first Saturday of each month at 10 am. Spots are $25.');
  await page.getByLabel('Keywords').fill('baking class, classes, kids, lesson');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByText('Answer added and question marked resolved.').waitFor();
  await page.screenshot({ path: `${SHOTS}/knowledge-desktop.png` });
  step('owner turned an unanswered question into an approved answer');

  await page.goto(`${BASE}/owner/conversations`);
  await page.locator('a[href^="/owner/conversations/"]').first().click();
  await page.getByText(/Assistant \(simulated\)/).first().waitFor();
  await page.screenshot({ path: `${SHOTS}/conversations-desktop.png` });
  step('conversation transcript visible');

  await page.goto(`${BASE}/demo/maple-street-bakery?chat=open`);
  await page.getByRole('button', { name: 'New chat' }).click();
  await ask(page, 'Do you offer baking classes for kids?', /first Saturday of each month/);
  step('widget now uses the newly approved answer');

  await page.goto(`${BASE}/owner`);
  await page.getByRole('button', { name: 'Sign out' }).first().click();
  await signInAs(page, 'Harbor Bike Repair');
  await page.goto(`${BASE}/owner/inquiries`);
  await page.getByText('Sam Rivera').waitFor();
  if (await page.getByText('Smoke Tester').count()) throw new Error('Harbor owner can see a bakery inquiry');
  await page.goto(`${BASE}/owner/knowledge`);
  await page.getByText('Tune-up packages and prices').waitFor();
  if (await page.getByText('Can I order a custom or birthday cake?').count()) throw new Error('Harbor owner can see bakery knowledge');
  step('bike-shop owner sees only bike-shop data');
  await desktop.close();

  console.log('Mobile flow');
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const m = await mobile.newPage();
  watch(m);
  await m.goto(`${BASE}/demo/maple-street-bakery`);
  await m.screenshot({ path: `${SHOTS}/site-mobile.png` });
  await m.getByRole('button', { name: 'Chat with Maple Street Bakery' }).click();
  await ask(m, 'Do you deliver?', /deliver orders over \$30/);
  await m.screenshot({ path: `${SHOTS}/widget-mobile.png` });
  step('mobile widget opens full screen and answers');

  await signInAs(m, 'Maple Street Bakery');
  await m.getByRole('button', { name: 'Open menu' }).click();
  await m.screenshot({ path: `${SHOTS}/dashboard-menu-mobile.png` });
  await m.getByRole('link', { name: /Approved answers/ }).click();
  await m.getByRole('heading', { name: 'Approved answers' }).waitFor();
  await m.screenshot({ path: `${SHOTS}/knowledge-mobile.png` });
  step('mobile dashboard navigation works');
  await mobile.close();

  if (errors.length) throw new Error(`Browser errors:\n${errors.join('\n')}`);
  console.log(`\nSmoke test passed. Screenshots saved to ${SHOTS}/`);
} catch (e) {
  console.error('\nSmoke test FAILED:', e.message);
  if (errors.length) console.error(errors.join('\n'));
  process.exitCode = 1;
} finally {
  await browser.close();
}
