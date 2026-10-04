import { AccessError, validateKnowledge } from '../src/lib/ownerApi';
import { createStorage } from './storage';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { mkdirSync, existsSync, readFileSync } from 'node:fs';
import { dirname, resolve, extname, sep } from 'node:path';
import { buildSeed } from '../src/lib/seed';
import { updateDb, __setDbForTests, getDb, subscribeDb } from '../src/lib/db';
import { createLocalOwnerData } from '../src/backend/local/ownerData';
import * as chat from '../src/lib/publicApi';
import type { OwnerIdentity, OwnerDataSource } from '../src/backend/types';

const digest = (v: string) => createHash('sha256').update(v).digest('hex');
const methods = new Set<keyof OwnerDataSource>(['getMyBusiness','updateBusinessProfile','getDashboardStats','listKnowledge','saveKnowledge','deleteKnowledge','listConversations','getConversation','setConversationStatus','listInquiries','setInquiryStatus','listUnanswered','setUnansweredStatus']);
class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }

/** One process owns the SQLite state. Small local portfolio app, not a multi-worker datastore. */
export function createApp(options: { database?: string; testPasswords?: Record<string,string>; origins?: string[]; quiet?: boolean } = {}) {
  const filename = options.database ?? resolve('data/support.sqlite');
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
  const sql = new DatabaseSync(filename);
  sql.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS state(id INTEGER PRIMARY KEY CHECK(id=1), body TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, displayName TEXT NOT NULL, salt TEXT NOT NULL, hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(tokenHash TEXT PRIMARY KEY, userId TEXT NOT NULL, expires INTEGER NOT NULL);`);
  sql.exec('CREATE TABLE IF NOT EXISTS recovery(userId TEXT PRIMARY KEY REFERENCES users(id), tokenHash TEXT NOT NULL)');
  const storage=createStorage(sql);
  const existing=storage.load();
  const row = sql.prepare('SELECT body FROM state WHERE id=1').get() as {body:string} | undefined;
  if (existing) __setDbForTests(existing);
  else if (row) __setDbForTests(JSON.parse(row.body));
  else {
    const seed = buildSeed();
    for (const user of seed.owners) {
      const password = options.testPasswords?.[user.email] ?? randomBytes(18).toString('base64url');
      const salt = randomBytes(16).toString('hex');
      sql.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(user.id, user.email, user.displayName, salt, scryptSync(password,salt,64).toString('hex'));
      if (!options.quiet) console.log(`Local sample account: ${user.email}\nPassword (save locally): ${password}`);
      user.password = ''; // Never persist the sample seed's plaintext passwords.
    }
    for (const c of seed.conversations) c.visitorToken = randomBytes(24).toString('hex');
    __setDbForTests(seed);
  }
  const persist = () => storage.save(getDb());
  persist();
  sql.exec('DROP TABLE state'); // Migration committed before removing the old document.
  const unsubscribe = subscribeDb(persist);
  const origins = options.origins ?? ['http://localhost:5173','http://localhost:4173','http://localhost:3001','http://127.0.0.1:5173','http://127.0.0.1:4173','http://127.0.0.1:3001'];
  const hits = new Map<string,{count:number;expires:number}>();
  function limit(key: string, max: number) {
    const now=Date.now();
    for (const [k,v] of hits) if(v.expires<now) hits.delete(k);
    const entry=hits.get(key) ?? {count:0,expires:now+60000};
    entry.count++; hits.set(key,entry);
    if(entry.count>max) throw new HttpError(429,'Too many requests. Try again in a minute.');
  }
  function identity(req: IncomingMessage): OwnerIdentity {
    const token = /(?:^|;\s*)aos_session=([a-zA-Z0-9_-]+)/.exec(req.headers.cookie ?? '')?.[1] ?? '';
    const u=sql.prepare('SELECT users.id, users.email, users.displayName FROM sessions JOIN users ON users.id=sessions.userId WHERE tokenHash=? AND expires>?').get(digest(token),Date.now()) as OwnerIdentity | undefined;
    if(!u) throw new HttpError(401,'Sign in required.');
    return u;
  }
  async function body(req: IncomingMessage) {
    let raw='';
    for await(const chunk of req) { raw+=chunk.toString(); if(Buffer.byteLength(raw)>16384) throw new HttpError(413,'Request too large.'); }
    try { const b=JSON.parse(raw || '{}'); if(!b || typeof b!=='object' || Array.isArray(b)) throw 0; return b; }
    catch {throw new HttpError(400,'Invalid JSON.');}
  }
  function json(res: ServerResponse, code: number, value: unknown) {res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(value));}
  const server = createServer(async(req,res)=> {
    const requestId=randomBytes(8).toString('hex'); const started=Date.now();
    res.setHeader('X-Request-Id',requestId);
    const route=(req.url ?? '').split('?')[0];
    const logRoute=['/api/auth/register','/api/auth/login','/api/auth/logout','/api/auth/session','/api/auth/password','/api/auth/recover','/api/owner','/api/chat','/api/health','/api/businesses'].includes(route)?route:'other';
    if(!options.quiet) res.on('finish',()=>console.info(JSON.stringify({level:'info',event:'request_complete',requestId,method:req.method,route:logRoute,status:res.statusCode,durationMs:Date.now()-started})));
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Cache-Control','no-store');
    try {
      const path=new URL(req.url ?? '/', 'http://localhost').pathname;
      const origin=req.headers.origin;
      if(path.startsWith('/api/')) {
        if(origin && !origins.includes(origin)) throw new HttpError(403,'Origin not allowed.');
        if(req.method==='POST' && !origin) throw new HttpError(403,'Origin required.');
        if(origin) {res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
        limit(req.socket.remoteAddress ?? 'local',120);
      }
      if(path==='/api/health') return json(res,200,{status:'ok',database:'sqlite',assistant:'approved FAQ matching; no AI model'});
      if(path==='/api/businesses' && req.method==='GET') return json(res,200,getDb().businesses);
      if(path==='/api/auth/session' && req.method==='GET') return json(res,200,identity(req));
      if(path==='/api/auth/register' && req.method==='POST') {
        limit(`register:${req.socket.remoteAddress}`,5);
        const b=await body(req);
        const email=typeof b.email==='string' ? b.email.trim().toLowerCase() : '';
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>254) throw new HttpError(400,'Enter a valid email.');
        if(typeof b.password!=='string' || b.password.length<12 || b.password.length>200) throw new HttpError(400,'Use a password of 12–200 characters.');
        if(typeof b.businessName!=='string' || !b.businessName.trim() || b.businessName.length>100) throw new HttpError(400,'Enter a business name of at most 100 characters.');
        if(sql.prepare('SELECT id FROM users WHERE email=?').get(email)) throw new HttpError(409,'An account already exists with this email.');
        const id=randomBytes(16).toString('hex'); const businessId='biz_'+randomBytes(16).toString('hex');
        const salt=randomBytes(16).toString('hex'); const recoveryCode=randomBytes(24).toString('base64url');
        sql.exec('BEGIN');
        try {
          sql.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(id,email,b.businessName.trim(),salt,scryptSync(b.password,salt,64).toString('hex'));
          sql.prepare('INSERT INTO recovery VALUES(?,?)').run(id,digest(recoveryCode));
          updateDb(db=>{
            db.owners.push({id,email,displayName:b.businessName.trim(),password:''});
            db.memberships.push({ownerId:id,businessId,role:'owner'});
            db.businesses.push({id:businessId,slug:businessId,name:b.businessName.trim(),tagline:'Welcome to our business',category:'Business',brandColor:'#4f46e5',phone:'',email,address:'',greeting:'Hello! How can we help?',widgetKey:randomBytes(24).toString('hex'),allowedOrigins:[]});
          });
          sql.exec('COMMIT');
        } catch(e) { sql.exec('ROLLBACK'); throw e; }
        return json(res,201,{email,recoveryCode});
      }
      if(path==='/api/auth/recover' && req.method==='POST') {
        limit(`recover:${req.socket.remoteAddress}`,5); const b=await body(req);
        if(typeof b.email!=='string' || typeof b.recoveryCode!=='string' || b.recoveryCode.length>200 || typeof b.password!=='string' || b.password.length<12 || b.password.length>200) throw new HttpError(400,'Enter your email, recovery code, and a password of 12–200 characters.');
        const u=sql.prepare('SELECT users.id, recovery.tokenHash FROM users JOIN recovery ON users.id=recovery.userId WHERE email=?').get(b.email.trim().toLowerCase()) as {id:string;tokenHash:string}|undefined;
        if(!u || !timingSafeEqual(Buffer.from(digest(b.recoveryCode)),Buffer.from(u.tokenHash))) throw new HttpError(401,'Email or recovery code is incorrect.');
        const salt=randomBytes(16).toString('hex'); const recoveryCode=randomBytes(24).toString('base64url');
        sql.exec('BEGIN');
        try {
          sql.prepare('UPDATE users SET salt=?,hash=? WHERE id=?').run(salt,scryptSync(b.password,salt,64).toString('hex'),u.id);
          sql.prepare('UPDATE recovery SET tokenHash=? WHERE userId=?').run(digest(recoveryCode),u.id);
          sql.prepare('DELETE FROM sessions WHERE userId=?').run(u.id); sql.exec('COMMIT');
        } catch(e) {sql.exec('ROLLBACK');throw e;}
        return json(res,200,{recoveryCode});
      }
      if(path==='/api/auth/password' && req.method==='POST') {
        const user=identity(req); limit(`password:${user.id}`,5); const b=await body(req);
        if(typeof b.currentPassword!=='string' || b.currentPassword.length>200 || typeof b.password!=='string' || b.password.length<12 || b.password.length>200) throw new HttpError(400,'New password must contain 12–200 characters.');
        const u=sql.prepare('SELECT salt,hash FROM users WHERE id=?').get(user.id) as {salt:string;hash:string};
        if(!timingSafeEqual(scryptSync(b.currentPassword,u.salt,64),Buffer.from(u.hash,'hex'))) throw new HttpError(401,'Current password is incorrect.');
        const salt=randomBytes(16).toString('hex'); const recoveryCode=randomBytes(24).toString('base64url');
        sql.exec('BEGIN');
        try {
          sql.prepare('UPDATE users SET salt=?,hash=? WHERE id=?').run(salt,scryptSync(b.password,salt,64).toString('hex'),user.id);
          sql.prepare('INSERT OR REPLACE INTO recovery VALUES(?,?)').run(user.id,digest(recoveryCode));
          sql.prepare('DELETE FROM sessions WHERE userId=?').run(user.id); sql.exec('COMMIT');
        } catch(e) {sql.exec('ROLLBACK');throw e;}
        res.setHeader('Set-Cookie','aos_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
        return json(res,200,{recoveryCode});
      }
      if(path==='/api/auth/login' && req.method==='POST') {
        limit(`login:${req.socket.remoteAddress}`,10);
        const b=await body(req);
        const email=typeof b.email==='string' ? b.email.trim().toLowerCase() : '';
        const password=typeof b.password==='string' ? b.password : '';
        if(password.length>200) throw new HttpError(400,'Invalid credentials.');
        const u=sql.prepare('SELECT * FROM users WHERE email=?').get(email) as (OwnerIdentity & {salt:string;hash:string}) | undefined;
        const candidate=scryptSync(password,u?.salt ?? 'dummy-salt',64);
        if(!u || !timingSafeEqual(candidate,Buffer.from(u.hash,'hex'))) throw new HttpError(401,'Invalid email or password.');
        const token=randomBytes(32).toString('base64url');
        sql.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());
        sql.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token),u.id,Date.now()+8*3600000);
        res.setHeader('Set-Cookie',`aos_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`);
        return json(res,200,{id:u.id,email:u.email,displayName:u.displayName});
      }
      if(path==='/api/auth/logout' && req.method==='POST') {
        const token=/(?:^|;\s*)aos_session=([a-zA-Z0-9_-]+)/.exec(req.headers.cookie ?? '')?.[1] ?? '';
        sql.prepare('DELETE FROM sessions WHERE tokenHash=?').run(digest(token));
        res.setHeader('Set-Cookie','aos_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
        return json(res,200,{ok:true});
      }
      if(path==='/api/owner' && req.method==='POST') {
        const user=identity(req); const b=await body(req);
        if(!methods.has(b.operation)) throw new HttpError(400,'Unknown operation.');
        if(!Array.isArray(b.args) || b.args.length>3) throw new HttpError(400,'Invalid arguments.');
        if (b.operation === 'saveKnowledge') {
          const k=b.args[0];
          if(!k || !['faq','service'].includes(k.kind) || !['draft','approved'].includes(k.status) ||
            typeof k.question!=='string' || k.question.length>300 || typeof k.answer!=='string' ||
            !Array.isArray(k.keywords) || k.keywords.length>30 || k.keywords.some((v:unknown)=>typeof v!=='string' || v.length>100))
            throw new HttpError(400,'Invalid knowledge entry.');
          const errors=validateKnowledge(k);if(errors.length) throw new HttpError(400,errors.join(' '));
        }
        const statusRules:Record<string,string[]>={setInquiryStatus:['new','contacted','resolved'],setConversationStatus:['active','handoff','closed'],setUnansweredStatus:['open','resolved','dismissed']};
        if(statusRules[b.operation] && !statusRules[b.operation].includes(b.args[1])) throw new HttpError(400,'Invalid status.');
        if(b.operation==='updateBusinessProfile') {
          const profile=b.args[0];
          for(const key of ['name','tagline','phone','email','address','greeting','brandColor'])
            if(!profile || typeof profile[key]!=='string' || profile[key].length>500) throw new HttpError(400,'Invalid business profile.');
          if(!profile.name.trim()) throw new HttpError(400,'Business name required.');
        }
        // Identity is taken exclusively from the verified server session.
        const data=createLocalOwnerData(user);
        const fn=data[b.operation as keyof OwnerDataSource] as (...args: unknown[])=>Promise<unknown>;
        const value=await fn(...b.args);
        return json(res,200,value ?? null);
      }
      if(path==='/api/chat' && req.method==='POST') {
        const b=await body(req);
        if(typeof b.widgetKey!=='string') throw new HttpError(400,'Widget key required.');
        const business=getDb().businesses.find(x=>x.widgetKey===b.widgetKey);
        if(!business) throw new HttpError(404,'Unknown widget.');
        const ref={conversationId:b.conversationId,visitorToken:b.visitorToken};
        if(b.action==='config') return json(res,200,{...chat.getWidgetConfig(b.widgetKey), assistantMode:'faq'});
        if(b.action==='start') return json(res,200,chat.startConversation(b.widgetKey,typeof b.pageUrl==='string' ? b.pageUrl.slice(0,300) : undefined));
        if(!chat.getVisitorTranscript(b.widgetKey,ref)) throw new HttpError(404,'Conversation not found.');
        if(b.action==='transcript') return json(res,200,{messages:chat.getVisitorTranscript(b.widgetKey,ref)});
        if(b.action==='handoff') {chat.submitHandoff(b.widgetKey,ref,b.handoff);return json(res,200,{ok:true});}
        if(b.action==='message') {
          if(typeof b.text!=='string' || b.text.length>500) throw new HttpError(400,'Message must be at most 500 characters.');
          // Finish persistence before responding, so disconnects cannot leave an unfinished message.
          const events=[];for await(const e of chat.sendVisitorMessage(b.widgetKey,ref,b.text,{delayMs:0})) events.push(e);
          res.writeHead(200,{'Content-Type':'application/x-ndjson'});
          for(const e of events) res.write(JSON.stringify(e)+'\n');
          return res.end();
        }
        throw new HttpError(400,'Unknown action.');
      }
      if(path.startsWith('/api/')) throw new HttpError(404,'Not found.');
      if(req.method!=='GET') throw new HttpError(405,'Method not allowed.');
      const file=resolve('dist','.'+decodeURIComponent(path));
      if(!file.startsWith(resolve('dist')+sep)) throw new HttpError(403,'Not allowed.');
      const asset=existsSync(file) && extname(file) ? file : resolve('dist/index.html');
      if(!existsSync(asset)) throw new HttpError(404,'Build the frontend first: npm run build');
      const mime:Record<string,string>={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
      res.writeHead(200,{'Content-Type':mime[extname(asset)] ?? 'application/octet-stream'});res.end(readFileSync(asset));
    } catch(e) {
      const status=e instanceof HttpError ? e.status : e instanceof AccessError ? 404 : 500;
      if(status===500) console.error(JSON.stringify({level:'error',event:'request_failed',requestId,method:req.method,route:logRoute,errorType:e instanceof Error ? e.name : 'UnknownError'}));
      if(!res.headersSent) json(res,status,{error:e instanceof HttpError || e instanceof AccessError ? e.message : 'An internal error occurred. Please try again.'});else res.end();
    }
  });
  return { server, close: async()=> {await new Promise<void>(r=>server.close(()=>r())); unsubscribe();sql.close();} };
}
