import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import worker from './worker-release-1.4.0.mjs';
const sql=new DatabaseSync(':memory:');
sql.exec(`CREATE TABLE sessions(code TEXT PRIMARY KEY,data TEXT,owner_id TEXT,admin_token TEXT,ended INTEGER DEFAULT 0,ended_at TEXT);
CREATE TABLE users(code TEXT,id TEXT,data TEXT,token_hash TEXT,account_id TEXT,last_seen TEXT,finished_at TEXT,PRIMARY KEY(code,id));
CREATE TABLE records(code TEXT,id TEXT,data TEXT,time TEXT,user_id TEXT,PRIMARY KEY(code,id));
CREATE TABLE attempts(key TEXT PRIMARY KEY,n INTEGER,until INTEGER);
CREATE TABLE audit(at TEXT,actor TEXT,action TEXT,target TEXT);`);
const db={prepare(query){return {bind(...args){const stmt=sql.prepare(query);return {async first(){return stmt.get(...args)||null},async all(){return {results:stmt.all(...args)}},async run(){return {meta:{changes:Number(stmt.run(...args).changes)}}}}}}},async batch(stmts){sql.exec('BEGIN');try{const r=[];for(const s of stmts)r.push(await s.run());sql.exec('COMMIT');return r}catch(e){sql.exec('ROLLBACK');throw e}}};
const env={DB:db,ASSETS:{fetch:async()=>new Response('icon')}};
async function call(path,method='GET',data,headers={}){const r=await worker.fetch(new Request('https://counter.test'+path,{method,headers:{'Content-Type':'application/json',...headers},body:data===undefined?undefined:JSON.stringify(data)}),env);const text=await r.text();let body;try{body=JSON.parse(text)}catch{body=text}return {status:r.status,body,headers:r.headers}}
assert.equal((await call('/health')).body.version,'1.4.0');
assert((await call('/')).body.includes('app.bundle.js'));assert((await call('/app.bundle.js')).body.includes('20 minut bez aktivity'));
const created=await call('/api/sessions','POST',{code:'TEST14',place:'Praha',station:'A',group:'Test',hourlyRate:150,directions:[{name:'A',moves:[]},{name:'B',moves:[]}]});assert.equal(created.status,201);assert.equal(created.body.session.hourlyRate,150);
const admin={'X-Admin-Token':created.body.adminToken},token={'X-Participant-Token':'a'.repeat(64)};
async function join(id){assert.equal((await call('/api/sessions/TEST14/users','POST',{id,name:id,direction:'A'},token)).status,201)}
await join('one');
const joined=(await call('/api/sessions/TEST14/users','POST',{id:'one',name:'changed',direction:'A',joined:'2099-01-01'},token)).body;
assert.equal(joined.name,'one');assert(Number.isFinite(Date.parse(joined.joined)));assert(!joined.joined.startsWith('2099'));
const base='/api/sessions/TEST14/users/one/';
function age(minutes){sql.prepare("UPDATE users SET data=json_set(data,'$.lastActivity',?) WHERE id='one'").run(new Date(Date.now()-minutes*60000).toISOString())}
age(9);assert.equal((await call(base+'heartbeat','POST',{},token)).body.presenceDue,false);
age(10.1);assert.equal((await call(base+'heartbeat','POST',{},token)).body.presenceDue,true);
assert.equal((await call(base+'presence','POST',{},token)).status,200);assert.equal((await call(base+'heartbeat','POST',{},token)).body.presenceDue,false);
age(19);assert.equal((await call(base+'heartbeat','POST',{},token)).body.autoFinished,false);
const record={id:'r1',userId:'one',time:new Date().toISOString(),direction:'A',movement:'',category:'Osobní auta'};
assert.equal((await call('/api/sessions/TEST14/records','POST',record,token)).status,201);
assert.equal((await call(base+'heartbeat','POST',{},token)).body.presenceDue,false);
age(20.1);assert.equal((await call(base+'heartbeat','POST',{},token)).body.autoFinished,true);
assert.equal((await call(base+'heartbeat','POST',{},token)).body.autoFinished,true);
assert.equal((await call(base+'presence','POST',{},token)).status,409);
assert.equal((await call(base+'finish','POST',{reason:'manual'},token)).status,200);
assert.equal(JSON.parse(sql.prepare("SELECT data FROM users WHERE id='one'").get().data).finishReason,'inactivity');
await join('two');assert.equal((await call('/api/sessions/TEST14/users/two/finish','POST',{reason:'manual'},token)).status,200);
await join('three');assert.equal((await call('/api/sessions/TEST14/end','POST',{},admin)).status,200);
const summary=(await call('/api/sessions/TEST14')).body;assert.deepEqual(summary.users.map(u=>u.finishReason),['inactivity','session-ended','manual']);assert(summary.users.every(u=>u.finishedAt));assert.equal(summary.hourlyRate,150);
assert.equal((await call('/api/sessions/TEST14/users/three/heartbeat','POST',{},token)).body.ended,true);
assert.equal((await call('/api/sessions/TEST14/users/three/heartbeat','POST',{})).status,403);
// Existing 1.3 rows use their latest record, then join time, as inactivity baseline.
sql.prepare("UPDATE sessions SET ended=0,ended_at=NULL WHERE code='TEST14'").run();
await join('legacy');sql.prepare("UPDATE users SET data=json_remove(data,'$.lastActivity') WHERE id='legacy'").run();
assert.equal((await call('/api/sessions/TEST14/users/legacy/heartbeat','POST',{},token)).body.autoFinished,false);
// Reconcile persisted sessions even when no participant heartbeat arrives.
await join('silent');
const activity='2026-01-01T10:00:00.123Z', deadline='2026-01-01T10:20:00.123Z';
sql.prepare("UPDATE users SET data=json_set(data,'$.lastActivity',?) WHERE id='silent'").run(activity);
const silent=(await call('/api/sessions/TEST14')).body.users.find(u=>u.id==='silent');
assert.equal(silent.finishedAt,deadline);assert.equal(silent.finishReason,'inactivity');
assert.equal((await call('/api/sessions/TEST14/users/silent/finish','POST',{},token)).body.user.finishedAt,deadline);
// An older stored session end wins only if it preceded the inactivity deadline.
await join('before');await join('after');
sql.prepare("UPDATE users SET data=json_set(data,'$.lastActivity',?) WHERE id IN ('before','after')").run(activity);
sql.prepare("UPDATE users SET data=json_set(data,'$.lastActivity',?) WHERE id='after'").run('2026-01-01T10:15:00.123Z');
sql.prepare("UPDATE sessions SET ended=1,ended_at=? WHERE code='TEST14'").run('2026-01-01T10:25:00.123Z');
const ended=(await call('/api/sessions/TEST14')).body;
assert.equal(ended.users.find(u=>u.id==='before').finishedAt,deadline);
assert.equal(ended.users.find(u=>u.id==='before').finishReason,'inactivity');
assert.equal(ended.users.find(u=>u.id==='after').finishedAt,ended.endedAt);
assert.equal(ended.users.find(u=>u.id==='after').finishReason,'session-ended');
assert(Number.isFinite(Date.parse(ended.serverNow)));
await call('/api/sessions/TEST14/end','POST',{},admin);
assert.equal((await call('/api/sessions/TEST14')).body.endedAt,ended.endedAt);
assert.equal((await call('/health')).body.build,'v1.4.0-payroll-20261002');
assert((await call('/work-summary.js')).body.includes('trafficWorkSummary'));
console.log('PASS: embedded interface, D1 SQLite queries, 10/20 minute limits, presence and count reset, repeated inactivity detection, all finish reasons, hourly rate, legacy rows and authorization.');
