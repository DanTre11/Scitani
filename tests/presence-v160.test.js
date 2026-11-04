const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn}=require('node:child_process');
const {distanceMeters,assessLocation,checksDue}=require('../presence-location');

test('presence schedule is vehicle based and repeats every ten minutes',()=>{
 const t=Date.parse('2026-01-01T10:00:00Z');
 assert.equal(checksDue(new Date(t).toISOString(),0,t+9*60000),false);
 assert.equal(checksDue(new Date(t).toISOString(),0,t+10*60000),true);
 assert.equal(checksDue(new Date(t).toISOString(),1,t+19*60000),false);
 assert.equal(checksDue(new Date(t).toISOString(),1,t+20*60000),true);
 assert.equal(checksDue(new Date(t).toISOString(),2,t+30*60000),true);
});
test('GPS accuracy limits classification and distance uses geographic coordinates',()=>{
 const station={latitude:50,longitude:14};
 assert.equal(distanceMeters(station,station),0);
 assert.equal(assessLocation(station,{...station,accuracy:300}).verificationStatus,'uncertain');
 assert.equal(assessLocation(station,{latitude:50.001,longitude:14,accuracy:10}).verificationStatus,'ok');
 assert.equal(assessLocation(station,{latitude:50.02,longitude:14,accuracy:5}).verificationStatus,'suspicious');
});

let child,origin,dir;
before(async()=>{dir=fs.mkdtempSync(path.join(os.tmpdir(),'scitani-v160-'));child=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,PORT:'0',DATA_FILE:path.join(dir,'db.json'),ADMIN_EMAIL:'admin@presence.test',ADMIN_PASSWORD:'Presence-Test-Password-123'},stdio:['ignore','pipe','pipe']});origin=await new Promise((resolve,reject)=>{child.stdout.on('data',b=>{const m=b.toString().match(/localhost:(\d+)/);if(m)resolve('http://127.0.0.1:'+m[1])});child.once('exit',reject)})});
after(()=>{child?.kill();fs.rmSync(dir,{recursive:true,force:true})});
async function api(p,method='GET',data,headers={}){const r=await fetch(origin+p,{method,headers:{'Content-Type':'application/json',...headers},body:data===undefined?undefined:JSON.stringify(data)});return {status:r.status,data:await r.json(),headers:r.headers}}

test('location history is private, server evaluated, and double mismatch ends only participant',async()=>{
 const login=await api('/api/auth/login','POST',{email:'admin@presence.test',password:'Presence-Test-Password-123'});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
 const created=await api('/api/sessions','POST',{code:'LOC160',place:'Test',station:'S1',group:'A',hourlyRate:0,categories:['car'],directions:[{name:'Sever',moves:[]}],presenceVerification:true,stationLatitude:50,stationLongitude:14,stationAccuracy:6},{Cookie:cookie});assert.equal(created.status,201);const token=created.data.adminToken,p='/api/sessions/LOC160',headers={'X-Participant-Token':'a'};
 assert.equal((await api(p+'/users','POST',{id:'a',name:'Sčítač',direction:'Sever'},headers)).status,401);
 assert.equal((await api(p+'/users','POST',{id:'a',name:'Sčítač',direction:'Sever'}, {...headers,Cookie:cookie})).status,201);
 const near={latitude:50,longitude:14,accuracy:8,eventType:'join'};
 assert.equal((await api(p+'/users/a/location','POST',near,headers)).data.location.verificationStatus,'ok');
 assert.equal((await api(p+'/locations')).status,403);
 let map=await api(p+'/locations','GET',undefined,{'X-Admin-Token':token});assert.equal(map.status,200);assert.equal(map.data.history.length,1);assert.equal(map.data.history[0].userId,'a');
 const noisy=await api(p+'/users/a/location','POST',{latitude:50.05,longitude:14,accuracy:300,eventType:'presence-check'},headers);assert.equal(noisy.data.verificationStatus,'uncertain');assert.equal(noisy.data.finishedAt,null);
 const far={latitude:50.02,longitude:14,accuracy:5,eventType:'presence-check'};
 const first=await api(p+'/users/a/location','POST',far,headers);assert.equal(first.data.warning,true);assert.equal(first.data.finishedAt,null);
 const second=await api(p+'/users/a/location','POST',far,headers);assert.equal(second.data.finishReason,'location-mismatch');
 map=await api(p+'/locations','GET',undefined,{'X-Admin-Token':token});assert.equal(map.data.history.length,4);assert.equal(map.data.users[0].finishReason,'location-mismatch');
});

test('three presence checks require the linked account and a valid location; a vehicle resets checks',async()=>{
 const login=await api('/api/auth/login','POST',{email:'admin@presence.test',password:'Presence-Test-Password-123'});const cookie=login.headers.get('set-cookie').split(';')[0];
 const created=await api('/api/sessions','POST',{code:'PRS160',place:'Test',station:'S2',group:'A',hourlyRate:0,categories:['car'],directions:[{name:'Sever',moves:[]}],presenceVerification:true,stationLatitude:50,stationLongitude:14,stationAccuracy:5},{Cookie:cookie});assert.equal(created.status,201);const p='/api/sessions/PRS160',pt={'X-Participant-Token':'b'};
 assert.equal((await api(p+'/users','POST',{id:'b',name:'Sčítač',direction:'Sever'},pt)).status,401);
 assert.equal((await api(p+'/users','POST',{id:'b',name:'Sčítač',direction:'Sever'}, {...pt,Cookie:cookie})).status,201);
 for(let i=1;i<=3;i++){const r=await api(p+'/users/b/presence','POST',{},pt);assert.equal(r.data.presenceChecksSinceVehicle,i);assert.equal(r.data.reauthRequired,i===3)}
 assert.equal((await api(p+'/users/b/location','POST',{latitude:50,longitude:14,accuracy:12,eventType:'reauth'},pt)).status,401);
 const suspiciousReauth=await api(p+'/users/b/location','POST',{latitude:50.02,longitude:14,accuracy:5,eventType:'reauth'}, {...pt,Cookie:cookie});assert.equal(suspiciousReauth.data.warning,true);assert.equal(suspiciousReauth.data.reauthRequired,true);
 const reauth=await api(p+'/users/b/location','POST',{latitude:50,longitude:14,accuracy:12,eventType:'reauth'}, {...pt,Cookie:cookie});assert.equal(reauth.data.verificationStatus,'ok');assert.equal(reauth.data.reauthRequired,false);
 const rec=await api(p+'/records','POST',{id:'v1',userId:'b',time:new Date().toISOString(),direction:'Sever',movement:'',category:'Osobní auta'},pt);assert.equal(rec.status,201);
 const admin=await api(p+'/manage','GET',undefined,{'X-Admin-Token':created.data.adminToken});assert.equal(admin.data.users[0].presenceChecksSinceVehicle,0);assert.ok(admin.data.users[0].lastVehicleAt);
});
