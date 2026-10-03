import { chromium } from 'playwright-core';
const base=process.env.BASE_URL ?? 'http://localhost:3001';
const maplePassword=process.env.MAPLE_PASSWORD;
const harborPassword=process.env.HARBOR_PASSWORD;
if(!maplePassword || !harborPassword) throw new Error('Set MAPLE_PASSWORD and HARBOR_PASSWORD to the generated local passwords.');
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL ?? 'msedge',headless:true});
const errors=[];
try {
  for(const viewport of [{width:1366,height:900},{width:390,height:844}]){
    const context=await browser.newContext({viewport});const page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    async function login(email,password){await page.goto(base+'/owner/sign-in');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByRole('heading',{name:/Welcome back/}).waitFor();}
    await login('owner@maplestreetbakery.demo',maplePassword);
    await page.goto(base+'/owner/knowledge');await page.getByRole('heading',{name:'Approved answers'}).waitFor();
    await page.getByRole('button',{name:'+ Add entry'}).click();
    const question=`Browser test ${viewport.width} ${Date.now()}`;
    await page.getByLabel('Question',{exact:true}).fill(question);await page.getByLabel('Approved answer',{exact:true}).fill('This answer was saved through the real server.');await page.getByLabel('Keywords',{exact:true}).fill(question);
    await page.getByRole('button',{name:'Save',exact:true}).click();await page.getByText('Entry added.',{exact:true}).waitFor();
    await page.reload();await page.getByText(question,{exact:true}).waitFor();
    await page.goto(base+'/demo/maple-street-bakery');await page.getByRole('button',{name:'Chat with Maple Street Bakery'}).click();
    const dialog=page.getByRole('dialog',{name:/chat assistant/i});
    await dialog.getByLabel('Type your question').fill('Are you open on Sunday?');await dialog.getByLabel('Type your question').press('Enter');await dialog.getByText(/Sunday 8:00 am to 2:00 pm/).waitFor();
    await dialog.getByLabel('Type your question').fill('Do you have keto cakes?');await dialog.getByLabel('Type your question').press('Enter');await dialog.getByRole('button',{name:'Yes, contact the team'}).waitFor();
    await dialog.getByRole('button',{name:'Yes, contact the team'}).click();await dialog.getByLabel('Your name').fill('Browser Tester');await dialog.getByLabel('Email',{exact:true}).fill('browser@example.com');await dialog.getByRole('button',{name:'Send to team'}).click();await dialog.getByText(/Request sent/).waitFor();
    await page.goto(base+'/owner/inquiries');await page.getByText('Browser Tester',{exact:true}).first().waitFor();
    await page.goto(base+'/owner');
    if(viewport.width<600) await page.getByRole('button',{name:'Open menu'}).click();
    await page.getByRole('button',{name:'Sign out',exact:true}).first().click();
    await login('owner@harborbikes.demo',harborPassword);await page.goto(base+'/owner/knowledge');await page.getByRole('heading',{name:'Approved answers'}).waitFor();
    if(await page.getByText(question,{exact:true}).count()) throw new Error('Cross-tenant entry exposed.');
    await context.close();console.log(`PASS real server browser flow ${viewport.width}px`);
  }
  if(errors.length) throw new Error(errors.join('\n'));
} finally {await browser.close();}
