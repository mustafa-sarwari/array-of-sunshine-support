import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createStorage} from './storage';
import {buildSeed} from '../src/lib/seed';

test('relational round trip preserves entities, message order and foreign keys',()=>{
 const sql=new DatabaseSync(':memory:');sql.exec('CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT,displayName TEXT)');
 const seed=buildSeed();for(const o of seed.owners) sql.prepare('INSERT INTO users VALUES(?,?,?)').run(o.id,o.email,o.displayName);
 const storage=createStorage(sql);storage.save(seed);const loaded=storage.load()!;
 for(const key of ['businesses','knowledge','memberships','conversations','inquiries','unanswered'] as const) assert.deepEqual(loaded[key],seed[key]);
 assert.throws(()=>sql.prepare('INSERT INTO knowledge VALUES(?,?,?)').run('bad','nonexistent','{}'),/FOREIGN KEY/);
 const before=storage.load();assert.throws(()=>storage.save({...seed,knowledge:[{...seed.knowledge[0],businessId:'missing'}]}),/FOREIGN KEY/);
 assert.deepEqual(storage.load(),before);sql.close();
});

test('legacy SQLite state migrates without losing custom FAQ records',async()=>{
 const {mkdtempSync,rmSync}=await import('node:fs');const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {createApp}=await import('./app');
 const dir=mkdtempSync(join(tmpdir(),'support-migration-'));const file=join(dir,'legacy.sqlite');
 const old=new DatabaseSync(file);old.exec('CREATE TABLE state(id INTEGER PRIMARY KEY,body TEXT); CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT UNIQUE,displayName TEXT,salt TEXT,hash TEXT)');
 const seed=buildSeed();seed.knowledge.push({...seed.knowledge[0],id:'custom-preserved',question:'Custom migration FAQ'});
 for(const o of seed.owners) old.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(o.id,o.email,o.displayName,'salt','hash');old.prepare('INSERT INTO state VALUES(1,?)').run(JSON.stringify(seed));old.close();
 const app=createApp({database:file,quiet:true});await app.close();
 const check=new DatabaseSync(file);assert.ok(check.prepare('SELECT id FROM knowledge WHERE id=?').get('custom-preserved'));
 assert.equal(check.prepare("SELECT name FROM sqlite_master WHERE name='state'").get(),undefined);assert.equal(check.prepare('PRAGMA foreign_key_check').all().length,0);check.close();rmSync(dir,{recursive:true,force:true});
});
