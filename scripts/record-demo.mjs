import { chromium } from 'playwright-core';
import {mkdirSync,renameSync} from 'node:fs';
const base=process.env.BASE_URL??'http://localhost:3001';
if(!process.env.MAPLE_PASSWORD) throw new Error('Set MAPLE_PASSWORD to your local sample password.');
mkdirSync('docs/videos',{recursive:true});
const browser=await chromium.launch({...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{channel:process.env.BROWSER_CHANNEL??'msedge'}),headless:true});
const context=await browser.newContext({viewport:{width:1366,height:900},recordVideo:{dir:'docs/videos',size:{width:1366,height:900}}});
const page=await context.newPage();const video=page.video();const started=Date.now();
const pause=ms=>page.waitForTimeout(ms);
try {
 await page.goto(base+'/owner/sign-in');
 // Authenticate through HTTP to avoid putting the password visibly into the recording.
 const response=await context.request.post(base+'/api/auth/login',{headers:{Origin:new URL(base).origin},data:{email:'owner@maplestreetbakery.demo',password:process.env.MAPLE_PASSWORD}});
 if(!response.ok()) throw new Error('Sample owner sign-in failed.');
 await page.goto(base+'/owner');await page.getByRole('heading',{name:/Welcome back/}).waitFor();await pause(15000);
 await page.goto(base+'/owner/knowledge');await page.getByRole('button',{name:'+ Add entry'}).click();
 const question='Do you offer office pastry boxes?';
 await page.getByLabel('Question',{exact:true}).fill(question);await page.getByLabel('Approved answer',{exact:true}).fill('Office pastry boxes are available by preorder with 48 hours notice.');await page.getByLabel('Keywords',{exact:true}).fill('office pastry boxes');await pause(10000);
 await page.getByRole('button',{name:'Save',exact:true}).click();await page.getByText('Entry added.',{exact:true}).waitFor();await pause(10000);
 await page.goto(base+'/demo/maple-street-bakery');await page.getByRole('button',{name:'Chat with Maple Street Bakery'}).click();
 const dialog=page.getByRole('dialog',{name:/chat assistant/i});await dialog.getByLabel('Type your question').fill(question);await dialog.getByLabel('Type your question').press('Enter');await dialog.getByText(/48 hours notice/).waitFor();await pause(20000);
 await dialog.getByLabel('Type your question').fill('Do you offer keto cakes?');await dialog.getByLabel('Type your question').press('Enter');await dialog.getByRole('button',{name:'Yes, contact the team'}).click();await pause(10000);
 await dialog.getByLabel('Your name').fill('Demo Customer');await dialog.getByLabel('Email',{exact:true}).fill('demo@example.com');await dialog.getByRole('button',{name:'Send to team'}).click();await dialog.getByText(/Request sent/).waitFor();await pause(10000);
 await page.goto(base+'/owner/inquiries');await page.getByText('Demo Customer',{exact:true}).first().waitFor();
 await pause(Math.max(0,120000-(Date.now()-started)));
 await context.close();renameSync(await video.path(),'docs/videos/server-demo.webm');console.log('Recorded docs/videos/server-demo.webm (silent real-server walkthrough).');
} finally {await browser.close();}
