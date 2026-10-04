import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';
const base=process.env.BASE_URL ?? 'http://localhost:3001';
const maplePassword=process.env.MAPLE_PASSWORD;
const harborPassword=process.env.HARBOR_PASSWORD;
if(!maplePassword || !harborPassword) throw new Error('Set MAPLE_PASSWORD and HARBOR_PASSWORD to the generated local passwords.');
mkdirSync('docs/screenshots',{recursive:true});
const browser=await chromium.launch({...(process.env.BROWSER_EXECUTABLE ? {executablePath:process.env.BROWSER_EXECUTABLE} : {channel:process.env.BROWSER_CHANNEL ?? 'msedge'}),headless:true});
const errors=[];
try {
  for(const viewport of [{width:1366,height:900},{width:390,height:844}]){
    const context=await browser.newContext({viewport});const page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    async function login(email,password){await page.goto(base+'/owner/sign-in');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByRole('heading',{name:/Welcome back/}).waitFor();}
    await login('owner@maplestreetbakery.demo',maplePassword);
    await page.screenshot({path:`docs/screenshots/server-dashboard-${viewport.width}.png`,fullPage:true});
    await page.goto(base+'/owner/knowledge');await page.getByRole('heading',{name:'Approved answers'}).waitFor();
    await page.getByRole('button',{name:'+ Add entry'}).click();
    const question=`Browser test ${viewport.width} ${Date.now()}`;
    await page.getByLabel('Question',{exact:true}).fill(question);await page.getByLabel('Approved answer',{exact:true}).fill('This answer was saved through the real server.');await page.getByLabel('Keywords',{exact:true}).fill(question);
    await page.getByRole('button',{name:'Save',exact:true}).click();await page.getByText('Entry added.').waitFor();
    await page.reload();await page.getByText(question,{exact:true}).waitFor();
    await page.screenshot({path:`docs/screenshots/server-knowledge-${viewport.width}.png`,fullPage:true});
    await page.goto(base+'/demo/maple-street-bakery');await page.getByRole('button',{name:'Chat with Maple Street Bakery'}).click();
    const dialog=page.getByRole('dialog',{name:/chat assistant/i});
    await dialog.getByLabel('Type your question').fill('Are you open on Sunday?');await dialog.getByLabel('Type your question').press('Enter');await dialog.getByText(/Sunday 8:00 am to 2:00 pm/).waitFor();
    await dialog.getByLabel('Type your question').fill('Do you have keto cakes?');await dialog.getByLabel('Type your question').press('Enter');await dialog.getByRole('button',{name:'Yes, contact the team'}).waitFor();
    await page.screenshot({path:`docs/screenshots/server-widget-${viewport.width}.png`,fullPage:true});
    await dialog.getByRole('button',{name:'Yes, contact the team'}).click();await dialog.getByLabel('Your name').fill('Browser Tester');await dialog.getByLabel('Email',{exact:true}).fill('browser@example.com');await dialog.getByRole('button',{name:'Send to team'}).click();await dialog.getByText(/Request sent/).waitFor();
    async function ask(text,expected){const seen=await dialog.getByText(expected).count();await dialog.getByLabel('Type your question').fill(text);await dialog.getByLabel('Type your question').press('Enter');await dialog.getByText(expected).nth(seen).waitFor();}
    await ask('hi mustafa',/What would you like to know\?/);
    await ask('Are you open on Christmas?',/don.t have approved information/);
    await page.goto(base+'/owner/inquiries');await page.getByText('Browser Tester',{exact:true}).first().waitFor();
    await page.goto(base+'/owner');
    if(viewport.width<600) await page.getByRole('button',{name:'Open menu'}).click();
    await page.getByRole('button',{name:'Sign out',exact:true}).first().click();
    await login('owner@harborbikes.demo',harborPassword);await page.goto(base+'/owner/knowledge');await page.getByRole('heading',{name:'Approved answers'}).waitFor();
    if(await page.getByText(question,{exact:true}).count()) throw new Error('Cross-tenant entry exposed.');
    await context.close();console.log(`PASS real server browser flow ${viewport.width}px`);
  }
  {
    // The server allows 120 API requests per minute per address; the flows above use most of that.
    await new Promise(r=>setTimeout(r,61000));
    const context=await browser.newContext({viewport:{width:1366,height:900}});const page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/owner/sign-in');await page.getByLabel('Email',{exact:true}).fill('owner@maplestreetbakery.demo');await page.getByLabel('Password',{exact:true}).fill(maplePassword);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByRole('heading',{name:/Welcome back/}).waitFor();
    const keto=()=>page.locator('li',{hasText:'Do you have keto cakes?'});
    await page.goto(base+'/owner/unanswered');await keto().getByRole('button',{name:'Write approved answer'}).click();
    await page.getByLabel('Status',{exact:true}).selectOption('draft');await page.getByLabel('Approved answer',{exact:true}).fill('Keto cakes are available on Fridays.');await page.getByLabel('Keywords',{exact:true}).fill('keto, cakes');
    await page.getByRole('button',{name:'Save',exact:true}).click();await page.getByText('Draft saved; question remains open.').waitFor();
    await page.goto(base+'/owner/unanswered');await keto().getByText('Draft answer waiting for approval').waitFor();
    if(await keto().getByText(/Answered by/).count()) throw new Error('An open question with a draft is shown as answered.');
    await keto().getByRole('button',{name:'Review draft answer'}).click();
    await page.getByLabel('Status',{exact:true}).selectOption('approved');await page.getByRole('button',{name:'Save',exact:true}).click();await page.getByText('Entry updated.').waitFor();
    await page.goto(base+'/owner/unanswered');await page.getByText('Do you offer baking classes for kids?').waitFor();
    if(await keto().count()) throw new Error('Approving the draft did not resolve its question.');
    await page.getByRole('tab',{name:/^resolved/}).click();await keto().getByText(/Answered by/).waitFor();
    await page.goto(base+'/demo/maple-street-bakery');await page.getByRole('button',{name:'Chat with Maple Street Bakery'}).click();
    const dialog=page.getByRole('dialog',{name:/chat assistant/i});
    await dialog.getByLabel('Type your question').fill('Do you have keto cakes?');await dialog.getByLabel('Type your question').press('Enter');await dialog.getByText(/available on Fridays/).waitFor();
    await context.close();console.log('PASS draft answer keeps the question open until approved');
  }
  if(errors.length) throw new Error(errors.join('\n'));
} finally {await browser.close();}
