import assert from 'node:assert/strict';
import {scryptSync} from 'node:crypto';
import {testDatabase} from './test-db.mjs';
import worker from './worker-release-1.6.0.mjs';
const {sql,db}=testDatabase(),env={DB:db};
async function call(path,method='GET',data,headers={}){const r=await worker.fetch(new Request('https://test.invalid/api'+path,{method,headers:{'Content-Type':'application/json',...headers},body:data===undefined?undefined:JSON.stringify(data)}),env);return {status:r.status,data:await r.json(),headers:r.headers}}
const password='DOD-Test-Password-123',salt='test-salt';
const encoded=salt+':'+scryptSync(password,salt,64,{N:32768,r:8,p:3,maxmem:67108864}).toString('hex');
const devices=[];
for(let i=0;i<20;i++){
 const id='device'+i,email=id+'@example.test';sql.prepare('INSERT INTO accounts(id,email,name,role,password) VALUES(?,?,?,?,?)').run(id,email,id,i===0?'organizer':'user',encoded);
 const headers={'CF-Connecting-IP':'192.0.2.'+(i+1),'X-Participant-Token':(i+1).toString(16).padStart(64,'0')};
 const login=await call('/auth/login','POST',{email,password},headers);assert.equal(login.status,200);headers.Cookie=login.headers.get('set-cookie').split(';')[0];
 devices.push({id,email,headers,direction:i%4===0?'Tram':'Road'});
}
const p='/sessions/LOAD16';const created=await call('/sessions','POST',{code:'LOAD16',place:'DOD',station:'S1',group:'20 devices',hourlyRate:200,categories:['car','tram'],directions:[{name:'Road',mode:'road',moves:[]},{name:'Tram',mode:'tram',moves:[]}],presenceVerification:true,stationLatitude:50,stationLongitude:14,stationAccuracy:5},devices[0].headers);assert.equal(created.status,201);
const gps={latitude:50,longitude:14,accuracy:12,eventType:'presence-check'};
await Promise.all(devices.map(async(d,i)=>{assert.equal((await call(p+'/users','POST',{id:d.id,name:d.id,direction:d.direction},d.headers)).status,201);assert.equal((await call(p+'/users/'+d.id+'/location','POST',{...gps,eventType:'join',latitude:50+i/100000},d.headers)).status,200)}));
const vehicle=(d,id)=>({id,userId:d.id,time:new Date().toISOString(),direction:d.direction,movement:'',categoryId:d.direction==='Tram'?'tram':'car'});
const results=await Promise.all(devices.flatMap(d=>Array.from({length:20},(_,i)=>call(p+'/records','POST',vehicle(d,d.id+'-'+i),d.headers))));assert(results.every(x=>x.status===201),JSON.stringify(results.filter(x=>x.status!==201)));
assert.equal(sql.prepare("SELECT COUNT(*) n FROM records WHERE code='LOAD16'").get().n,400);
await Promise.all(devices.map(d=>call(p+'/records','POST',vehicle(d,d.id+'-0'),d.headers)));assert.equal(sql.prepare("SELECT COUNT(*) n FROM records WHERE code='LOAD16'").get().n,400);
const map=await call(p+'/locations','GET',undefined,devices[0].headers);assert.equal(map.data.users.length,20);assert(map.data.users.every(u=>u.lastLocation));assert.equal((await call(p+'/locations','GET',undefined,devices[1].headers)).status,403);
assert((await Promise.all(devices.map(d=>call(p+'/users/'+d.id+'/heartbeat','POST',{},d.headers)))).every(x=>x.status===200));
const d=devices[1],up=p+'/users/'+d.id;const read=()=>JSON.parse(sql.prepare('SELECT data FROM users WHERE code=? AND id=?').get('LOAD16',d.id).data);
for(let n=1;n<=3;n++){const r=await call(up+'/presence','POST',{},d.headers);assert.equal(r.data.presenceChecksSinceVehicle,n);assert.equal(r.data.reauthRequired,n===3)}
const lastVehicle=read().lastVehicleAt,lastActivity=read().lastActivity;
assert.equal((await call(p+'/records','POST',vehicle(d,'bypass'),d.headers)).data.error,'reauth_required');
assert.equal((await call(p+'/records','POST',{...vehicle(d,'offline-bypass'),time:new Date(Date.now()-60000).toISOString()},d.headers)).status,409);
assert.equal((await call(up+'/presence','POST',{},d.headers)).status,409);assert.equal(read().lastActivity,lastActivity);
assert.equal((await call(up+'/location','POST',{...gps,eventType:'reauth'},d.headers)).status,401);
assert.equal((await call(up+'/reauth','POST',{email:d.email,password:'wrong'},d.headers)).status,401);
assert.equal((await call(up+'/reauth','POST',{email:devices[2].email,password},d.headers)).status,403);
// Generic login does not unlock or provide the participant-bound proof.
const ordinary=await call('/auth/login','POST',{email:d.email,password},d.headers);d.headers.Cookie=ordinary.headers.get('set-cookie').split(';')[0];assert.equal((await call(up+'/location','POST',{...gps,eventType:'reauth'},d.headers)).status,401);
const fresh=await call(up+'/reauth','POST',{email:d.email,password},d.headers);assert.equal(fresh.status,200);d.headers.Cookie=fresh.headers.get('set-cookie').split(';')[0];const proof=fresh.data.reauthProof;
assert.equal((await call(up+'/location','POST',{...gps,accuracy:300,eventType:'reauth',reauthProof:proof},d.headers)).data.reauthRequired,true);
assert.equal((await call(p+'/records','POST',vehicle(d,'still-blocked'),d.headers)).status,409);
const other=devices[2];for(let i=0;i<3;i++)await call(p+'/users/'+other.id+'/presence','POST',{},other.headers);
assert.equal((await call(p+'/users/'+other.id+'/location','POST',{...gps,eventType:'reauth',reauthProof:proof},other.headers)).status,401);
const privateMap=await call(p+'/locations','GET',undefined,devices[0].headers);assert(!JSON.stringify(privateMap.data).includes('reauthProof'));assert(!JSON.stringify(privateMap.data).includes('reauthChallenge'));
assert.equal((await call(up+'/location','POST',{...gps,eventType:'reauth',reauthProof:proof},d.headers)).data.reauthRequired,false);
assert.equal(read().presenceChecksSinceVehicle,0);assert.equal(read().lastVehicleAt,lastVehicle);assert.equal((await call(up+'/heartbeat','POST',{},d.headers)).data.presenceDue,false);
assert.equal((await call(up+'/location','POST',{...gps,eventType:'reauth',reauthProof:proof},d.headers)).status,409);
assert.equal((await call(p+'/records','POST',vehicle(d,'resumed'),d.headers)).status,201);
// Concurrent presence / vehicle / location requests must never clear an established lock.
for(let i=0;i<3;i++)await call(up+'/presence','POST',{},d.headers);
await Promise.all([call(up+'/location','POST',gps,d.headers),call(p+'/records','POST',vehicle(d,'race-blocked'),d.headers),call(up+'/presence','POST',{},d.headers)]);
assert.equal(read().reauthRequired,true);assert.equal(read().presenceChecksSinceVehicle,3);
assert.equal((await call(p+'/records','POST',vehicle(d,d.id+'-0'),d.headers)).status,200);assert.equal(read().presenceChecksSinceVehicle,3);
assert.equal((await call(p+'/records','POST',vehicle(devices[3],'unaffected'),devices[3].headers)).status,201);
const expired=await call(up+'/reauth','POST',{email:d.email,password},d.headers);d.headers.Cookie=expired.headers.get('set-cookie').split(';')[0];sql.prepare("UPDATE users SET data=json_set(data,'$.reauthProofExpiresAt',0) WHERE code='LOAD16' AND id=?").run(d.id);
assert.equal((await call(up+'/location','POST',{...gps,eventType:'reauth',reauthProof:expired.data.reauthProof},d.headers)).status,401);
// Compatibility with already-due participants created by the previous release.
sql.prepare("UPDATE users SET data=json_remove(data,'$.reauthRequired') WHERE code='LOAD16' AND id=?").run(d.id);
assert.equal((await call(p+'/records','POST',vehicle(d,'legacy-bypass'),d.headers)).status,409);
assert.equal((await call(up+'/reauth','POST',{email:d.email,password},{})).status,403);
// Race at the actual third-check boundary: whichever operation commits first wins.
const racer=devices[4],rp=p+'/users/'+racer.id;
for(let n=0;n<10;n++){
 sql.prepare("UPDATE users SET data=json_set(data,'$.reauthRequired',json('false'),'$.presenceChecksSinceVehicle',2) WHERE code='LOAD16' AND id=?").run(racer.id);
 const id='boundary-'+n;
 await Promise.all([call(rp+'/presence','POST',{},racer.headers),call(p+'/records','POST',vehicle(racer,id),racer.headers),call(rp+'/location','POST',gps,racer.headers)]);
 const state=JSON.parse(sql.prepare("SELECT data FROM users WHERE code='LOAD16' AND id=?").get(racer.id).data),record=sql.prepare("SELECT id FROM records WHERE code='LOAD16' AND id=?").get(id);
 if(state.reauthRequired){assert.equal(state.presenceChecksSinceVehicle,3);assert.equal(record,undefined)}else{assert(record);assert(state.presenceChecksSinceVehicle<=1)}
}
sql.prepare("UPDATE accounts SET role='organizer' WHERE id=?").run(devices[5].id);assert.equal((await call(p+'/locations','GET',undefined,devices[5].headers)).status,403);
// The lock does not extend the existing inactivity deadline.
sql.prepare("UPDATE users SET data=json_set(data,'$.lastActivity',?) WHERE code='LOAD16' AND id=?").run(new Date(Date.now()-20.1*60000).toISOString(),d.id);
assert.equal((await call(up+'/heartbeat','POST',{},d.headers)).data.finishReason,'inactivity');
console.log('PASS: 20 independent accounts/participants, 400 concurrent vehicles, deduplication, 20 GPS/map entries, authorization, heartbeat, persistent reauth lock, old login/wrong password/wrong account/offline bypass rejection, uncertain GPS, proof expiry/binding/replay, resume and concurrent requests.');
