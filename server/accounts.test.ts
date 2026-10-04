import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from './app';

test('registration, isolated business, password change, recovery rotation and session revocation',async()=>{
 const app=createApp({database:':memory:',quiet:true});await new Promise<void>(r=>app.server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${(app.server.address() as {port:number}).port}/api/`;
 const call=async(path:string,b:unknown,cookie='')=>{const res=await fetch(base+path,{method:'POST',headers:{Origin:'http://localhost:5173','Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(b)});return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]??''};};
 try {
 const fields={email:'new@example.com',businessName:'New Business',password:'Long-private-password!'};
 assert.equal((await call('auth/register',{...fields,password:'short'})).status,400);
 const created=await call('auth/register',fields);assert.equal(created.status,201);assert.ok(created.data.recoveryCode);
 assert.equal((await call('auth/register',fields)).status,409);
 const login=await call('auth/login',fields);assert.equal(login.status,200);
 assert.deepEqual((await call('owner',{operation:'listKnowledge',args:[]},login.cookie)).data,[]);
 assert.equal((await call('owner',{operation:'getMyBusiness',args:[]},login.cookie)).data.name,'New Business');
 assert.equal((await call('auth/password',{currentPassword:'bad',password:'New-private-password!'},login.cookie)).status,401);
 const changed=await call('auth/password',{currentPassword:fields.password,password:'New-private-password!'},login.cookie);assert.equal(changed.status,200);
 assert.equal((await call('owner',{operation:'listKnowledge',args:[]},login.cookie)).status,401);
 assert.equal((await call('auth/recover',{email:fields.email,recoveryCode:created.data.recoveryCode,password:'Recovered-password!'})).status,401);
 const newLogin=await call('auth/login',{email:fields.email,password:'New-private-password!'});assert.equal(newLogin.status,200);
 const recovered=await call('auth/recover',{email:fields.email,recoveryCode:changed.data.recoveryCode,password:'Recovered-password!'});assert.equal(recovered.status,200);
 assert.equal((await call('owner',{operation:'listKnowledge',args:[]},newLogin.cookie)).status,401);
 assert.equal((await call('auth/login',{email:fields.email,password:'Recovered-password!'})).status,200);
 assert.notEqual(recovered.data.recoveryCode,changed.data.recoveryCode);
 } finally {await app.close();}
});

test('unexpected errors are 500 with generic responses and logs without secret text',async()=>{
 const app=createApp({database:':memory:',quiet:true});await new Promise<void>(r=>app.server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${(app.server.address() as {port:number}).port}`;
 const logs:string[]=[];const original=console.error;console.error=(text)=>logs.push(text);
 try {
 const res=await fetch(base+'/%ZZ?password=should-not-be-logged');assert.equal(res.status,500);
 assert.deepEqual(await res.json(),{error:'An internal error occurred. Please try again.'});
 assert.ok(res.headers.get('x-request-id'));assert.equal(logs.length,1);
 assert.ok(!logs[0].includes('should-not-be-logged'));assert.equal(JSON.parse(logs[0]).event,'request_failed');
 } finally {console.error=original;await app.close();}
});
