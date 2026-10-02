const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawn } = require('node:child_process');
const workSummary = require('../work-summary');
let child, origin, dir;
const now = Date.now(), iso = ms => new Date(ms).toISOString();
const fixture = (code, idle) => ({code, place:'Test',station:'A',group:'Audit',hourlyRate:180,directions:[{name:'A',moves:[]},{name:'B',moves:[]}],users:[{id:'u',name:'Test',direction:'A',joined:iso(now-3600000),lastActivity:iso(now-idle),participantToken:'secret'}],records:[],adminToken:'admin',created:iso(now-3600000),ended:false});
async function request(url, method='GET', data, token='secret', admin=false) {
 const r=await fetch(origin+url,{method,headers:{'Content-Type':'application/json',[admin?'X-Admin-Token':'X-Participant-Token']:token},body:data===undefined?undefined:JSON.stringify(data)});
 return {status:r.status,data:await r.json()};
}
before(async()=>{
 dir=fs.mkdtempSync(path.join(os.tmpdir(),'scitani-audit-'));
 fs.writeFileSync(path.join(dir,'data.json'),JSON.stringify({sessions:{MANUAL:fixture('MANUAL',0),WARN10:fixture('WARN10',600001),IDLE20:fixture('IDLE20',1200001),ADMIN1:fixture('ADMIN1',0),CLOCK1:fixture('CLOCK1',0)},accounts:[],authSessions:{},archive:[]}));
 child=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,PORT:'0',DATA_FILE:path.join(dir,'data.json')},stdio:['ignore','pipe','pipe']});
 // Server logs the actual ephemeral port for isolated, parallel-safe tests.
 origin=await new Promise((resolve,reject)=>{child.stdout.on('data',b=>{const m=b.toString().match(/http:\/\/localhost:(\d+)/);if(m)resolve('http://127.0.0.1:'+m[1]);});child.once('exit',c=>reject(Error('server exit '+c)));});
});
after(()=>{child?.kill();fs.rmSync(dir,{recursive:true,force:true});});
test('manual finish is authoritative and idempotent',async()=>{
 const first=await request('/api/sessions/MANUAL/users/u/finish','POST',{reason:'manual',finishedAt:'2099-01-01'});
 const retry=await request('/api/sessions/MANUAL/users/u/finish','POST',{reason:'inactivity'});
 assert.equal(first.status,200);assert.equal(first.data.finishReason,'manual');assert.deepEqual(retry.data,first.data);
 assert.ok(Math.abs(Date.parse(first.data.finishedAt)-Date.now())<10000);assert.equal(first.data.user.participantToken,undefined);
});
test('warning at 10 minutes; presence resets activity',async()=>{
 const r=await request('/api/sessions/WARN10/users/u/heartbeat','POST',{});
 assert.equal(r.data.presenceDue,true);assert.ok(!r.data.finishedAt);
 await request('/api/sessions/WARN10/users/u/presence','POST',{});
 assert.equal((await request('/api/sessions/WARN10/users/u/heartbeat','POST',{})).data.presenceDue,false);
});
test('inactivity settles on server read at exact deadline without heartbeat',async()=>{
 const r=await request('/api/sessions/IDLE20');const user=r.data.users[0];
 assert.equal(user.finishReason,'inactivity');assert.equal(user.finishedAt,iso(now-1));
 const finish=await request('/api/sessions/IDLE20/users/u/finish','POST',{reason:'manual'});
 assert.equal(finish.data.finishedAt,user.finishedAt);assert.equal(finish.data.finishReason,'inactivity');
 assert.equal((await request('/api/sessions/IDLE20/users/u/presence','POST',{})).status,409);
});
test('admin end ignores phone time; later finish and repeated end preserve values',async()=>{
 const end=await request('/api/sessions/ADMIN1/end','POST',{endedAt:'2099-01-01'},'admin',true);
 assert.equal(end.status,200);assert.ok(Math.abs(Date.parse(end.data.endedAt)-Date.now())<10000);
 const f=await request('/api/sessions/ADMIN1/users/u/finish','POST',{reason:'manual'});
 assert.equal(f.data.finishReason,'session-ended');assert.equal(f.data.finishedAt,end.data.endedAt);
 const retry=await request('/api/sessions/ADMIN1/end','POST',{},'admin',true);
 assert.equal(retry.data.endedAt,end.data.endedAt);
});
test('server join and activity ignore incorrect phone clock; duplicate records do not reset activity',async()=>{
 const joined=await request('/api/sessions/CLOCK1/users','POST',{id:'new',name:'New',direction:'A',joined:'2099-01-01'});
 assert.ok(Math.abs(Date.parse(joined.data.joined)-Date.now())<10000);
 const r={id:'r',userId:'new',time:'2099-01-01',category:'Osobní auta'};
 assert.equal((await request('/api/sessions/CLOCK1/records','POST',r)).status,201);
 const first=(await request('/api/sessions/CLOCK1')).data.users.find(x=>x.id==='new');
 assert.ok(Math.abs(Date.parse(first.lastActivity)-Date.now())<10000);
 await request('/api/sessions/CLOCK1/records','POST',r);
 const next=(await request('/api/sessions/CLOCK1')).data;
 assert.equal(next.users.find(x=>x.id==='new').lastActivity,first.lastActivity);assert.equal(next.records.length,1);
});
test('participant and admin tokens are required',async()=>{
 assert.equal((await request('/api/sessions/CLOCK1/users/u/finish','POST',{},'wrong')).status,403);
 assert.equal((await request('/api/sessions/CLOCK1/end','POST',{},'wrong',true)).status,403);
});
test('private data, source and git files cannot be downloaded',async()=>{
 for(const p of ['/data.json','/.env','/.git/config','/server.js'])assert.equal((await fetch(origin+p)).status,404);
 for(const p of ['/','/app.bundle.js','/work-summary.js','/modern.css','/sw.js'])assert.equal((await fetch(origin+p)).status,200);
});
test('reward uses full duration; missing timestamps never use phone time',()=>{
 const user={joined:'2026-01-01T10:00:00Z',finishedAt:'2026-01-01T10:20:00Z',finishReason:'manual'};
 const w=workSummary({hourlyRate:200},user);assert.equal(w.hours,0.33);assert.equal(w.reward,66.67);
 assert.equal(workSummary({hourlyRate:200},{joined:user.joined}).reward,null);
 assert.equal(workSummary({hourlyRate:0},user).reward,0);
 assert.equal(workSummary({hourlyRate:200},{joined:'invalid',finishedAt:user.finishedAt}).confirmed,false);
 const ended=workSummary({hourlyRate:200,ended:true,endedAt:user.finishedAt},{joined:user.joined});assert.equal(ended.reward,w.reward);assert.equal(ended.finishReason,'session-ended');
});
test('real Excel export and final screen use identical hours, rate, reward and reason',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../app.bundle.js'),'utf8');
 const current={place:'Test',station:'A',group:'Test',code:'ABC123',hourlyRate:200,directions:[{name:'A',moves:[]}],records:[],users:[{id:'u',name:'Test',direction:'A',joined:'2026-01-01T10:00:00Z',finishedAt:'2026-01-01T10:20:00Z',finishReason:'inactivity'}]};
 let files;const nodes={};const el=id=>nodes[id]||(nodes[id]={classList:{add(){},toggle(){},contains(){return false}},querySelector(){return el('message')}});
 const ctx=vm.createContext({current,records:[],cats:['🚗 Osobní auta','🚚 Nákladní auta','🚛 Kamiony','🚌 Autobusy'],workSummary,window:{trafficWorkSummary:workSummary},sessionStorage:{getItem:()=>JSON.stringify({id:'u',name:'Test'})},$:el,isCreator:false,esc:s=>String(s),platform2:{exportFile:async()=>{}},zipStore:x=>{files=x;},summaryHtml:()=>''});
 vm.runInContext(source.slice(source.indexOf('    const workSummary =')+ '    const workSummary = window.trafficWorkSummary;'.length,source.indexOf('    function crc32')),ctx);
 vm.runInContext(source.slice(source.indexOf('    function xesc'),source.indexOf('    $("export").onclick')),ctx);
 vm.runInContext(source.slice(source.indexOf('    function renderUserFinal()'),source.indexOf('    async function acceptServerFinish')),ctx);
 await vm.runInContext('buildExcel([], "test.xlsx")',ctx);vm.runInContext('renderUserFinal()',ctx);
 assert.match(files['xl/workbook.xml'],/Pracovní doba a odměny/);
 for(const [cell,value] of [['E2','0.33'],['F2','200'],['G2','66.67']])assert.ok(files['xl/worksheets/sheet4.xml'].includes(`<c r="${cell}"><v>${value}</v></c>`));
 assert.match(files['xl/worksheets/sheet4.xml'],/Nečinnost \(20 minut\)/);
 assert.match(nodes.userFinal.innerHTML,/0,33 h/);assert.match(nodes.userFinal.innerHTML,/66,67 Kč/);assert.match(nodes.userFinal.innerHTML,/200,00 Kč\/h/);
 delete current.users[0].finishedAt;delete current.users[0].finishReason;
 vm.runInContext('renderUserFinal()',ctx);assert.match(nodes.userFinal.innerHTML,/Čeká na server/);assert.doesNotMatch(nodes.userFinal.innerHTML,/66,67/);
});
test('offline finish survives retries; confirmed server reason updates cache and visible final screen',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../app.bundle.js'),'utf8');
 const identity={code:'ABC123',id:'u'};
 const current={code:identity.code,users:[{id:'u',joined:'2026-01-01T10:00:00Z'}]};
 const memory={trafficSessions:JSON.stringify({ABC123:current}),trafficFinishes:JSON.stringify([{...identity,reason:'manual'}]),trafficQueue:'[]'};
 let online=false, renders=0, finished={id:'u',joined:'2026-01-01T10:00:00Z',finishedAt:'2026-01-01T10:20:00Z',finishReason:'session-ended'};
 const ctx=vm.createContext({current,storage:{getItem:async k=>memory[k],setItem:async(k,v)=>{memory[k]=v;}},db:async()=>JSON.parse(memory.trafficSessions),saveDB:async d=>{memory.trafficSessions=JSON.stringify(d);},mutateLocal:async f=>f(),sessionStorage:{getItem:()=>JSON.stringify(identity)},$:()=>({classList:{contains:()=>false}}),renderUserFinal:()=>{renders++;},participantToken:async()=> 'token',apiResult:async()=>online?{ok:true,data:{users:[finished]}}:{ok:false,kind:'network'}});
 vm.runInContext(source.slice(source.indexOf('    async function acceptServerFinish'),source.indexOf('    async function showServerFinish')),ctx);
 vm.runInContext(source.slice(source.indexOf('    let finishing = null;'),source.indexOf('    $("presenceConfirm").onclick')),ctx);
 await vm.runInContext('flushFinishes()',ctx);assert.equal(JSON.parse(memory.trafficFinishes).length,1);assert.equal(current.users[0].finishedAt,undefined);
 // A rejected pending vehicle must not prevent an already-confirmed finish from reaching the UI.
 memory.trafficQueue=JSON.stringify([{code:identity.code,record:{userId:identity.id}}]);online=true;
 await vm.runInContext('flushFinishes()',ctx);
 assert.equal(JSON.parse(memory.trafficFinishes).length,0);assert.equal(current.users[0].finishReason,'session-ended');assert.equal(JSON.parse(memory.trafficSessions).ABC123.users[0].finishedAt,finished.finishedAt);assert.equal(renders,1);assert.equal(JSON.parse(memory.trafficQueue).length,1);
});
