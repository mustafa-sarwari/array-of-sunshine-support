import type { DatabaseSync } from 'node:sqlite';
import type { DemoDatabase } from '../src/lib/types';

/** Relational entity storage. JSON retains optional fields; keys and relationships are SQL columns. */
export function createStorage(sql: DatabaseSync) {
  sql.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS businesses(id TEXT PRIMARY KEY, body TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS memberships(ownerId TEXT NOT NULL REFERENCES users(id), businessId TEXT NOT NULL REFERENCES businesses(id), body TEXT NOT NULL, PRIMARY KEY(ownerId,businessId));
    CREATE TABLE IF NOT EXISTS knowledge(id TEXT PRIMARY KEY,businessId TEXT NOT NULL REFERENCES businesses(id),body TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS conversations(id TEXT PRIMARY KEY,businessId TEXT NOT NULL REFERENCES businesses(id),body TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS messages(id TEXT NOT NULL,conversationId TEXT NOT NULL REFERENCES conversations(id),position INTEGER NOT NULL,body TEXT NOT NULL,PRIMARY KEY(conversationId,id));
    CREATE TABLE IF NOT EXISTS inquiries(id TEXT PRIMARY KEY,businessId TEXT NOT NULL REFERENCES businesses(id),body TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS unanswered(id TEXT PRIMARY KEY,businessId TEXT NOT NULL REFERENCES businesses(id),conversationId TEXT NOT NULL REFERENCES conversations(id),body TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS knowledge_business ON knowledge(businessId);
    CREATE INDEX IF NOT EXISTS conversations_business ON conversations(businessId);
    CREATE INDEX IF NOT EXISTS inquiries_business ON inquiries(businessId);
    CREATE INDEX IF NOT EXISTS unanswered_business ON unanswered(businessId);
    CREATE INDEX IF NOT EXISTS messages_conversation ON messages(conversationId,position);
    CREATE TABLE IF NOT EXISTS schema_version(version INTEGER PRIMARY KEY);`);
  function save(db: DemoDatabase) {
    sql.exec('SAVEPOINT persist_entities');
    try {
      for(const table of ['messages','unanswered','inquiries','knowledge','memberships','conversations','businesses']) sql.exec(`DELETE FROM ${table}`);
      for(const b of db.businesses) sql.prepare('INSERT INTO businesses VALUES(?,?)').run(b.id,JSON.stringify(b));
      for(const m of db.memberships) sql.prepare('INSERT INTO memberships VALUES(?,?,?)').run(m.ownerId,m.businessId,JSON.stringify(m));
      for(const table of ['knowledge','inquiries'] as const) for(const item of db[table]) sql.prepare(`INSERT INTO ${table} VALUES(?,?,?)`).run(item.id,item.businessId,JSON.stringify(item));
      for(const c of db.conversations) {
        const {messages,...metadata}=c;
        sql.prepare('INSERT INTO conversations VALUES(?,?,?)').run(c.id,c.businessId,JSON.stringify(metadata));
        messages.forEach((m,i)=>sql.prepare('INSERT INTO messages VALUES(?,?,?,?)').run(m.id,c.id,i,JSON.stringify(m)));
      }
      for(const u of db.unanswered) sql.prepare('INSERT INTO unanswered VALUES(?,?,?,?)').run(u.id,u.businessId,u.conversationId,JSON.stringify(u));
      sql.exec('INSERT OR IGNORE INTO schema_version VALUES(2); RELEASE persist_entities');
    } catch(e) {sql.exec('ROLLBACK TO persist_entities; RELEASE persist_entities');throw e;}
  }
  function load(): DemoDatabase | undefined {
    if(!sql.prepare('SELECT version FROM schema_version WHERE version=2').get()) return;
    const rows=(table:string)=>sql.prepare(`SELECT body FROM ${table}`).all().map(r=>JSON.parse(r.body as string));
    return {version:1,businesses:rows('businesses'),owners:sql.prepare('SELECT id,email,displayName FROM users').all().map(u=>({...u,password:''})) as DemoDatabase['owners'],memberships:rows('memberships'),knowledge:rows('knowledge'),inquiries:rows('inquiries'),unanswered:rows('unanswered'),conversations:rows('conversations').map(c=>({...c,messages:sql.prepare('SELECT body FROM messages WHERE conversationId=? ORDER BY position').all(c.id).map(m=>JSON.parse(m.body as string))}))};
  }
  return {load,save};
}
