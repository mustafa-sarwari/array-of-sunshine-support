import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from './app';

test('real HTTP authentication, tenant isolation, FAQ CRUD, chat handoff, persistence',async()=>{
  const folder=mkdtempSync(join(tmpdir(),'support-test-'));
  const database=join(folder,'test.sqlite');
  let app=createApp({database,quiet:true,testPasswords:{'owner@maplestreetbakery.demo':'Maple-test-password!','owner@harborbikes.demo':'Harbor-test-password!'}});
  await new Promise<void>(r=>app.server.listen(0,'127.0.0.1',r));
  let base=`http://127.0.0.1:${(app.server.address() as {port:number}).port}`;
  async function call(path:string,body?:unknown,cookie='',origin='http://localhost:5173'){
    const res=await fetch(base+'/api/'+path,{headers:{Origin:origin,Cookie:cookie,...(body===undefined ? {}:{'Content-Type':'application/json'})},...(body===undefined ? {}:{method:'POST',body:JSON.stringify(body)})});
    const data=path==='chat' && res.headers.get('content-type')?.includes('ndjson') ? (await res.text()).trim().split('\n').map(line=>JSON.parse(line)).map(e=>e.text ?? e.outcome ?? '').join('') : await res.json();
    return {status:res.status,data,cookie:res.headers.get('set-cookie')?.split(';')[0] ?? ''};
  }
  try {
    assert.equal((await call('owner',{operation:'listKnowledge',args:[]})).status,401);
    assert.equal((await call('auth/login',{email:'owner@maplestreetbakery.demo',password:'bad'})).status,401);
    const login=await call('auth/login',{email:'owner@maplestreetbakery.demo',password:'Maple-test-password!'});
    assert.equal(login.status,200);assert.ok(login.cookie);
    const maple=login.cookie;
    const harbor=(await call('auth/login',{email:'owner@harborbikes.demo',password:'Harbor-test-password!'})).cookie;
    assert.ok(harbor);
    assert.equal((await call('owner',{operation:'listKnowledge',args:[]},maple,'https://evil.example')).status,403);
    const owner=(operation:string,args:unknown[]=[],cookie=maple)=>call('owner',{operation,args},cookie);
    const knowledge=await owner('listKnowledge');assert.equal(knowledge.status,200);assert.ok(knowledge.data.every((k:{id:string})=>!k.id.includes('harbor')));
    const denied=await owner('saveKnowledge',[{kind:'faq',question:'Hijack',answer:'Attempt to overwrite other tenant.',keywords:[],status:'approved'},'kb_harbor_tuneup']);assert.equal(denied.status,400);
    const key='pk_demo_maple_7c1f2a';const visitor=(await call('chat',{action:'start',widgetKey:key})).data;
    assert.ok(visitor.visitorToken);
    assert.equal((await call('chat',{action:'transcript',widgetKey:key,...visitor,visitorToken:'wrong'})).status,404);
    assert.equal((await call('chat',{action:'transcript',widgetKey:'pk_demo_harbor_93be41',...visitor})).status,404);
    const ask=(text:string)=>call('chat',{action:'message',widgetKey:key,...visitor,text});
    assert.match((await ask('Are you open on Sunday?')).data,/8:00 am to 2:00 pm/);
    assert.match((await ask('Do you have keto cakes?')).data,/handoff_offered/);
    assert.match((await ask('Are you open on Christmas?')).data,/handoff_offered/);
    assert.match((await ask('hi mustafa')).data,/smalltalk/);
    const handoff=await call('chat',{action:'handoff',widgetKey:key,...visitor,handoff:{name:'Integration Tester',email:'test@example.com',message:'Please call about keto.'}});assert.equal(handoff.status,200);
    assert.ok((await owner('listInquiries')).data.some((i:{name:string})=>i.name==='Integration Tester'));
    assert.ok(!(await owner('listInquiries',[],harbor)).data.some((i:{name:string})=>i.name==='Integration Tester'));
    const unanswered=(await owner('listUnanswered')).data.find((u:{question:string})=>u.question==='Do you have keto cakes?');
    const draft={kind:'faq',question:'Do you have keto cakes?',answer:'Keto cakes are available on Fridays.',keywords:['keto','cakes'],status:'draft'};
    const saved=await owner('saveKnowledge',[draft,null,unanswered.id]);assert.equal(saved.status,200);
    assert.equal((await owner('listUnanswered')).data.find((u:{id:string})=>u.id===unanswered.id).status,'open');
    assert.match((await ask('Do you have keto cakes?')).data,/handoff_offered/);
    await owner('saveKnowledge',[{...draft,status:'approved'},saved.data.id]);
    assert.match((await ask('Do you have keto cakes?')).data,/available on Fridays/);
    assert.equal((await owner('listUnanswered')).data.find((u:{id:string})=>u.id===unanswered.id).status,'resolved');
    const detail=await owner('getConversation',[visitor.conversationId]);assert.equal(detail.status,200);assert.ok(!JSON.stringify(detail.data).includes(visitor.visitorToken));
    assert.equal((await owner('getConversation',[visitor.conversationId],harbor)).data,null);
    await app.close();
    app=createApp({database,quiet:true});await new Promise<void>(r=>app.server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${(app.server.address() as {port:number}).port}`;
    assert.ok((await owner('listKnowledge')).data.some((k:{id:string})=>k.id===saved.data.id));
    assert.ok((await owner('listInquiries')).data.some((i:{name:string})=>i.name==='Integration Tester'));
    await owner('deleteKnowledge',[saved.data.id]);assert.ok(!(await owner('listKnowledge')).data.some((k:{id:string})=>k.id===saved.data.id));
    assert.equal((await call('auth/logout',{},maple)).status,200);
    assert.equal((await owner('listKnowledge')).status,401);
  } finally {await app.close();rmSync(folder,{recursive:true,force:true});}
});
