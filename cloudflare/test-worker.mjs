import {testDatabase} from './test-db.mjs';
import stats from '../traffic-stats.js';
import workSummary from '../work-summary.js';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import worker from './worker-release-1.5.0.mjs';
const {sql,db}=testDatabase();
const env={DB:db,ASSETS:{fetch:async()=>new Response('icon')}};
async function call(path,method='GET',data,headers={}){const r=await worker.fetch(new Request('https://counter.test'+path,{method,headers:{'Content-Type':'application/json',...headers},body:data===undefined?undefined:JSON.stringify(data)}),env);const text=await r.text();let body;try{body=JSON.parse(text)}catch{body=text}return {status:r.status,body,headers:r.headers}}
assert.equal((await call('/health')).body.version,'1.5.0');
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
assert.equal((await call('/health')).body.build,'v1.5.0-school-20261002');
assert((await call('/work-summary.js')).body.includes('trafficWorkSummary'));
console.log('PASS: embedded interface, D1 SQLite queries, 10/20 minute limits, presence and count reset, repeated inactivity detection, all finish reasons, hourly rate, legacy rows and authorization.');

const input={code:'TEST15',place:'Release test',station:'S',group:'Test',hourlyRate:200,categories:['car','tram'],directions:[{name:'Road',mode:'road',moves:['Straight']},{name:'Centrum',mode:'tram',moves:[]},{name:'Motol',mode:'tram',moves:[]}]};
for(const patch of [{categories:[]},{categories:['tram']},{categories:['car','boat']},{directions:[{name:'Same',mode:'road',moves:[]},{name:'Same',mode:'tram',moves:[]}]}])
  assert.equal((await call('/api/sessions','POST',{...input,...patch})).status,400);
const mixed=await call('/api/sessions','POST',input);assert.equal(mixed.status,201);assert.deepEqual(mixed.body.session.categories,['car','tram']);assert.equal(mixed.body.session.directions[1].mode,'tram');
const admin15={'X-Admin-Token':mixed.body.adminToken},token2={'X-Participant-Token':'b'.repeat(64)};
for(const [id,direction,auth] of [['road','Road',token],['tram','Centrum',token2]])assert.equal((await call('/api/sessions/TEST15/users','POST',{id,name:id,direction},auth)).status,201);
const r15={id:'first',userId:'road',time:new Date().toISOString(),direction:'Road',movement:'Straight',category:'Osobní auta'};
assert.equal((await call('/api/sessions/TEST15/records','POST',r15,token)).status,201);
assert.equal((await call('/api/sessions/TEST15/records','POST',{...r15,id:'disabled',category:'Autobusy'},token)).status,400);
assert.equal((await call('/api/sessions/TEST15/records','POST',{...r15,id:'wrong',category:'Tramvaje'},token)).status,400);
const tram15={...r15,id:'tram',userId:'tram',direction:'Centrum',movement:'',category:'Tramvaje'};
assert.equal((await call('/api/sessions/TEST15/records','POST',tram15,token)).status,403);
assert.equal((await call('/api/sessions/TEST15/records','POST',tram15,token2)).body.categoryId,'tram');
assert.equal((await call('/api/sessions/TEST15/records','POST',tram15,token2)).status,200);
assert.equal((await call('/api/sessions/TEST15/records/tram','DELETE',undefined,{...token2,'X-User-Id':'tram'})).status,200);
assert.equal((await call('/api/sessions/TEST15/records','POST',tram15,token2)).status,201);
let view15=(await call('/api/sessions/TEST15')).body;
assert.equal(view15.records.length,2);assert.deepEqual(stats.summarize(view15).total.composition.map(c=>c.percent),[50,50]);
const start15=new Date(Date.now()-15*60000).toISOString();sql.prepare("UPDATE users SET data=json_set(data,'$.joined',?) WHERE code='TEST15'").run(start15);
view15=(await call('/api/sessions/TEST15')).body;assert(Math.abs(stats.summarize(view15).total.intensity-8)<0.01);
await call('/api/sessions/TEST15/users/tram/finish','POST',{},token2);
// Production accepts queued pre-finish records but refuses post-finish timestamps.
assert.equal((await call('/api/sessions/TEST15/records','POST',{...tram15,id:'queued',time:start15},token2)).status,201);
assert.equal((await call('/api/sessions/TEST15/records','POST',{...tram15,id:'late',time:new Date(Date.now()+1000).toISOString()},token2)).status,409);
await call('/api/sessions/TEST15/end','POST',{},admin15);
view15=(await call('/api/sessions/TEST15')).body;assert(view15.users.every(u=>workSummary(view15,u).confirmed));assert(view15.users.every(u=>Math.abs(workSummary(view15,u).reward-50)<0.1));
// Pagination used by both participant sync and the live admin dashboard.
const insert=sql.prepare('INSERT INTO records(code,id,data,time,user_id) VALUES(?,?,?,?,?)');
for(let i=0;i<501;i++){const r={...r15,id:'page'+String(i).padStart(4,'0')};insert.run('TEST15',r.id,JSON.stringify(r),r.time,r.userId)}
assert.equal((await call('/api/sessions/TEST15/manage','GET',undefined,admin15)).body.pagedRecords,true);
const firstPage=(await call('/api/sessions/TEST15/records')).body;assert.equal(firstPage.records.length,500);assert(firstPage.next);
assert.equal((await call('/api/sessions/TEST15/records?after='+firstPage.next)).body.records.length,4);
for(const category of ['car','tram']){const result=await call('/api/sessions','POST',{...input,code:category==='car'?'CAR015':'TRM015',categories:[category],directions:[{name:'One',mode:category==='car'?'road':'tram',moves:[]}]});assert.equal(result.status,201)}
sql.prepare("UPDATE sessions SET data=json_remove(data,'$.categories') WHERE code='TEST14'").run();
assert.deepEqual(stats.categories((await call('/api/sessions/TEST14')).body).map(c=>c.id),stats.legacy);
// Existing account cookies and ownership still gate administration.
for(const [id,role] of [['owner','organizer'],['other','organizer'],['admin','admin'],['user','user']])sql.prepare('INSERT INTO accounts(id,email,name,role,password) VALUES(?,?,?,?,?)').run(id,id+'@test.invalid',id,role,'unused');
const cookies={};for(const [i,id] of ['owner','other','admin','user'].entries()){const t=String(i+1).repeat(64);cookies[id]={cookie:'traffic_session='+t};sql.prepare('INSERT INTO logins VALUES(?,?,?)').run(createHash('sha256').update(t).digest('hex'),id,Date.now()+60000)}
const owned=await call('/api/sessions','POST',{...input,code:'OWN015'},cookies.owner);assert.equal(owned.body.adminToken,'account');
assert.equal((await call('/api/sessions/OWN015/manage','GET',undefined,cookies.owner)).status,200);
assert.equal((await call('/api/sessions/OWN015/manage','GET',undefined,cookies.other)).status,403);
assert.equal((await call('/api/sessions/OWN015/manage','GET',undefined,cookies.admin)).status,200);
assert.equal((await call('/api/dashboard','GET',undefined,cookies.user)).status,403);
assert.equal((await call('/api/dashboard','GET',undefined,cookies.owner)).body.length,1);
assert.equal((await call('/api/accounts','GET',undefined,cookies.admin)).body.length,4);
for(const p of ['/server.js','/wrangler.jsonc','/cloudflare/worker.mjs','/.git/config','/data.json','/tests/v1.5.test.js'])assert.equal((await call(p)).status,404);
for(const p of ['/traffic-stats.js','/school.css','/brand/school-logo.png','/brand/Roboto.ttf'])assert.equal((await call(p)).status,200);
console.log('PASS: v1.5 categories, separate tram directions, two participants, undo, queued records, composition, intensity, payroll, legacy sessions, pagination, roles and public asset allowlist.');
