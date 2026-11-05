const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../app.bundle.js'),'utf8');
function harness(){
 const identity={id:'u',code:'UIR160'},current={code:identity.code,presenceVerification:true,users:[{id:'u',presenceChecksSinceVehicle:2}],records:[]};
 const memory={trafficActive:JSON.stringify(identity),trafficSessions:JSON.stringify({UIR160:current})},vehicle={disabled:false},nodes={};
 function node(id){return nodes[id]||(nodes[id]={textContent:'',disabled:false,classList:{hidden:false,add(){this.hidden=true},remove(){this.hidden=false},contains(){return this.hidden}},querySelector:s=>node(id+s)})}
 let gps=0,requests=[],credentials=null,locationOK=true;
 const ctx=vm.createContext({current,records:[],reauthLocked:false,presenceBusy:false,lastActivityAt:0,presencePromptFor:0,document:{querySelectorAll:()=>[vehicle]},$:node,sessionStorage:{getItem:()=>JSON.stringify(identity)},storage:{getItem:async k=>memory[k],setItem:async(k,v)=>memory[k]=v},db:async()=>JSON.parse(memory.trafficSessions),mutateLocal:async f=>f(),currentLocation:async()=>{gps++;return {latitude:50,longitude:14,accuracy:12}},participantToken:async()=> 'token',apiProblem:()=> 'error',sendLocation:async(u,type,pos,proof)=>{assert.equal(type,'reauth');assert.equal(proof,'proof');return {ok:true,data:{verificationStatus:locationOK?'ok':'uncertain',reauthRequired:!locationOK}}},showServerFinish:async()=>{},vib:()=>{},flushQueue:async()=>{},apiResult:async(url,opt)=>{requests.push(url);if(url.endsWith('/presence'))return {ok:true,data:{reauthRequired:true}};if(url.endsWith('/reauth')){assert.equal(JSON.parse(opt.body).password,'secret');return {ok:true,data:{reauthProof:'proof'}}}throw Error(url)}});
 vm.runInContext(source.slice(source.indexOf('    function paintReauthLock()'),source.indexOf('    function reauthCredentials()')),ctx);
 ctx.reauthCredentials=async()=>credentials?{...credentials}:null;
 vm.runInContext(source.slice(source.indexOf('    $("presenceConfirm").onclick ='),source.indexOf('    let maintenanceRunning')),ctx);
 vm.runInContext(source.slice(source.indexOf('    async function add(ci, m)'),source.indexOf('    $("bottom").onclick')),ctx);
 return {ctx,memory,vehicle,nodes,node,requests,get gps(){return gps},setCredentials:()=>credentials={email:'test@test.invalid',password:'secret'},setUncertain:()=>locationOK=false};
}
test('actual UI handler keeps lock after cancel, blocks even direct add, stores lock, and resumes only after credentials plus fresh GPS',async()=>{
 const h=harness();await h.node('presenceConfirm').onclick();assert.equal(h.ctx.reauthLocked,true);assert.equal(h.vehicle.disabled,true);assert.equal(JSON.parse(h.memory.trafficActive).reauthRequired,true);assert.match(h.node('presenceBarstrong').textContent,/pozastaveno/);
 await vm.runInContext('add(0,null)',h.ctx);assert.equal(h.ctx.records.length,0);assert.equal(h.requests.length,1);
 h.setCredentials();const previousGPS=h.gps;await h.node('presenceConfirm').onclick();assert.equal(h.requests.filter(x=>x.endsWith('/presence')).length,1);assert.equal(h.gps,previousGPS+1);assert.equal(h.ctx.reauthLocked,false);assert.equal(h.vehicle.disabled,false);assert.equal(JSON.parse(h.memory.trafficActive).reauthRequired,false);assert.equal(JSON.parse(h.memory.trafficSessions).UIR160.users[0].presenceChecksSinceVehicle,0);assert(!JSON.stringify(h.memory).includes('secret'));
});
test('actual UI handler stays locked when reauthenticated GPS is uncertain',async()=>{const h=harness();await h.node('presenceConfirm').onclick();h.setCredentials();h.setUncertain();await h.node('presenceConfirm').onclick();assert.equal(h.vehicle.disabled,true);assert.equal(h.ctx.reauthLocked,true);assert.equal(JSON.parse(h.memory.trafficActive).reauthRequired,true)});
test('actual offline queue retains rejected vehicles, stops repeated locked submissions, then retries after verification',async()=>{
 const h=harness();let locked=true,posts=0;h.ctx.syncing=null;h.ctx.syncProblem=null;h.ctx.netStatus=async()=>{};
 h.memory.trafficQueue=JSON.stringify([1,2].map(n=>({code:'UIR160',record:{id:'offline'+n,userId:'u'}})));
 h.ctx.apiResult=async(url)=>{if(url.endsWith('/users'))return {ok:true,data:{}};posts++;return locked?{ok:false,status:409,data:{error:'reauth_required'}}:{ok:true,data:{}}};
 vm.runInContext(source.slice(source.indexOf('    async function flushQueue()'),source.indexOf('    window.addEventListener("online", flushQueue)')),h.ctx);
 await vm.runInContext('flushQueue()',h.ctx);assert.equal(posts,1);assert.equal(JSON.parse(h.memory.trafficQueue).length,2);assert.equal(h.ctx.reauthLocked,true);
 locked=false;await vm.runInContext('setReauthLock({code:"UIR160",id:"u"},false);',h.ctx);await vm.runInContext('flushQueue()',h.ctx);assert.equal(JSON.parse(h.memory.trafficQueue).length,0);assert.equal(posts,3);
});
