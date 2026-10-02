const {test,before,after}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const {spawn}=require('node:child_process');const stats=require('../traffic-stats'),workSummary=require('../work-summary');
const source=fs.readFileSync(path.join(__dirname,'../app.bundle.js'),'utf8');
const joined='2026-01-01T10:00:00Z',finishedAt='2026-01-01T10:15:00Z';
const base=()=>({code:'TEST15',categories:['car','bus','tram'],place:'Test',station:'S1',group:'G',hourlyRate:200,directions:[{name:'Silnice',mode:'road',moves:[]},{name:'Centrum',mode:'tram',moves:[]}],users:[{id:'a',name:'A',direction:'Silnice',joined,finishedAt},{id:'b',name:'B',direction:'Centrum',joined,finishedAt}],records:[],serverNow:finishedAt});
const rec=(id,category,direction='Silnice')=>({id:String(id),time:'2026-01-01T10:05:00Z',category,direction,movement:'',userId:direction==='Silnice'?'a':'b'});
test('legacy categories, subset, tram-only and invalid configurations',()=>{
 assert.deepEqual(stats.categories({}).map(c=>c.id),['car','truck','lorry','bus']);
 assert.equal(stats.validate(base()),null);
 assert.equal(stats.validate({...base(),categories:['tram'],directions:[base().directions[1]]}),null);
 for(const x of [{categories:[]},{categories:['unknown']},{categories:['car','car']},{directions:[null]},{directions:[{name:3}]},{directions:[]},{directions:[{name:'x',moves:[],mode:'train'}]}])assert.ok(stats.validate({...base(),...x}));
 assert.ok(stats.validate({...base(),categories:['car']}));
 assert.deepEqual(stats.forDirection(base(),base().directions[1]).map(c=>c.id),['tram']);
});
test('37 vehicles in 15 minutes = 148 veh/h, concurrent devices and gaps',()=>{
 const s=base();s.records=Array.from({length:37},(_,i)=>rec(i,'Osobní auta'));
 assert.equal(stats.summarize(s).total.intensity,148);assert.equal(stats.summarize(s).directions[0].intensity,148);
 assert.equal(stats.duration(s,[...s.users,...s.users]),900000);
 assert.equal(stats.duration(s,[s.users[0],{joined:'2026-01-01T11:00:00Z',finishedAt:'2026-01-01T11:15:00Z'}]),1800000);
 assert.equal(stats.summarize({...s,users:[]}).total.intensity,null);
});
test('composition sums to 100.0%, excludes disabled types and separates directions',()=>{
 const s=base();s.records=[rec(1,'Osobní auta'),rec(2,'Autobusy'),rec(3,'Tramvaje','Centrum'),rec(4,'Kamiony')];
 const result=stats.summarize(s);assert.equal(result.total.total,3);assert.deepEqual(result.total.composition.map(c=>c.percent),[33.4,33.3,33.3]);
 assert.deepEqual(result.directions[0].composition.map(c=>c.percent),[50,50]);assert.equal(result.directions[1].composition[0].percent,100);
 assert.ok(stats.summarize(base()).total.composition.every(c=>c.percent===0));
 for(let n=1;n<100;n++){const rs=Array.from({length:n},(_,i)=>rec(i,['Osobní auta','Autobusy','Tramvaje'][i%3]));assert.equal(Math.round(stats.composition(stats.categories(s),rs).reduce((a,c)=>a+c.percent,0)*10),1000);}
});
test('Excel preserves four sheets, dynamic categories, 15min counts and hourly projection',async()=>{
 const current=base();current.categories=['car'];current.directions=[current.directions[0]];current.records=Array.from({length:37},(_,i)=>rec(i,'Osobní auta'));
 let files;const ctx=vm.createContext({current,window:{trafficStats:stats},workSummary,zipStore:x=>{files=x;},platform2:{exportFile:async()=>{}}});
 vm.runInContext(source.slice(source.indexOf('    function xesc'),source.indexOf('    $("export").onclick')),ctx);
 await vm.runInContext('buildExcel(current.records,"test.xlsx")',ctx);
 for(const name of ['Souhrn','Průjezdy','15min intervaly','Pracovní doba a odměny','Intenzita a skladba'])assert.ok(files['xl/workbook.xml'].includes(name));
 assert.doesNotMatch(files['xl/worksheets/sheet1.xml'],/Autobusy|Tramvaje|Kamiony/);
 assert.match(files['xl/worksheets/sheet3.xml'],/<v>37<\/v>/);assert.match(files['xl/worksheets/sheet3.xml'],/<v>148<\/v>/);
 assert.match(files['xl/worksheets/sheet5.xml'],/<v>148<\/v>/);
 assert.match(files['xl/styles.xml'],/<fgColor rgb="FF002B4F"\/>/);
 assert.match(files['xl/styles.xml'],/<color rgb="FFFFFFFF"\/>/);
 current.categories=['tram'];current.directions=[base().directions[1]];current.records=[rec(1,'Tramvaje','Centrum')];
 await vm.runInContext('buildExcel(current.records,"tram.xlsx")',ctx);assert.match(files['xl/worksheets/sheet1.xml'],/Tramvaje/);assert.doesNotMatch(files['xl/worksheets/sheet1.xml'],/Osobní auta/);
});
test('final results preserve movements, use same statistics and personal observation duration',()=>{
 const current=base();current.records=[{...rec(1,'Osobní auta'),movement:'Vlevo'}];const ctx=vm.createContext({current,trafficStats:stats,sessionStorage:{getItem:()=>JSON.stringify({id:'a',name:'A'})},esc:String});
 vm.runInContext(source.slice(source.indexOf('    function summaryHtml'),source.indexOf('    function renderUserFinal')),ctx);
 const html=vm.runInContext('summaryHtml(current.records,true)',ctx);assert.match(html,/4 voz\/h/);assert.match(html,/Vlevo/);assert.doesNotMatch(html,/Kamiony/);
});
let child,origin,dir;
before(async()=>{dir=fs.mkdtempSync(path.join(os.tmpdir(),'scitani-v15-'));child=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,PORT:'0',DATA_FILE:path.join(dir,'db.json'),ADMIN_EMAIL:'test@example.test',ADMIN_PASSWORD:'Test-password-12345'},stdio:['ignore','pipe','pipe']});origin=await new Promise((resolve,reject)=>{child.stdout.on('data',b=>{const m=b.toString().match(/localhost:(\d+)/);if(m)resolve('http://127.0.0.1:'+m[1]);});child.once('exit',reject);});});
after(()=>{child?.kill();fs.rmSync(dir,{recursive:true,force:true});});
async function api(p,method='GET',data,headers={}){const r=await fetch(origin+p,{method,headers:{'Content-Type':'application/json',...headers},body:data===undefined?undefined:JSON.stringify(data)});return {status:r.status,data:await r.json(),headers:r.headers};}
test('two participants sync road and tram, validate categories, undo, admin finish and accounts',async()=>{
 const login=await api('/api/auth/login','POST',{email:'test@example.test',password:'Test-password-12345'});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
 const created=await api('/api/sessions','POST',base(),{Cookie:cookie});assert.equal(created.status,201);const code=created.data.session.code,p='/api/sessions/'+code;
 const admin={'X-Admin-Token':created.data.adminToken};
 for(const [id,direction] of [['a','Silnice'],['b','Centrum']])assert.equal((await api(p+'/users','POST',{id,name:id,direction},{'X-Participant-Token':id})).status,201);
 for(const r of [rec(1,'Osobní auta'),rec(2,'Tramvaje','Centrum')])assert.equal((await api(p+'/records','POST',r,{'X-Participant-Token':r.userId})).status,201);
 assert.equal((await api(p+'/records','POST',rec(3,'Kamiony'),{'X-Participant-Token':'a'})).status,400);
 assert.equal((await api(p+'/records','POST',rec(3,'Tramvaje'),{'X-Participant-Token':'a'})).status,400);
 assert.equal((await api(p+'/records','POST',rec(2,'Tramvaje','Centrum'),{'X-Participant-Token':'b'})).status,200);
 const read=(await api(p+'/manage','GET',undefined,admin)).data;assert.equal(read.records.length,2);assert.deepEqual(read.categories,base().categories);assert.ok(read.users.every(u=>!u.participantToken));
 assert.equal((await api(p+'/manage')).status,403);assert.equal((await api(p+'/manage','GET',undefined,{Cookie:cookie})).status,200);
 assert.equal((await api('/api/dashboard','GET',undefined,{Cookie:cookie})).data[0].vehicles,2);
 assert.equal((await api(p+'/records/1','DELETE',undefined,{'X-Participant-Token':'a','X-User-Id':'a'})).status,200);
 const ended=await api(p+'/end','POST',{},admin);assert.ok(ended.data.users.every(u=>u.finishReason==='session-ended'));assert.ok(workSummary(ended.data,ended.data.users[0]).confirmed);
 assert.equal((await api(p+'/records','POST',rec(4,'Osobní auta'),{'X-Participant-Token':'a'})).status,409);
});
test('legacy creation defaults to four categories; explicit invalid configuration rejected',async()=>{
 const legacy=base();delete legacy.categories;legacy.code='OLD140';legacy.directions=[{name:'A',moves:[]}];
 const r=await api('/api/sessions','POST',legacy);assert.equal(r.status,201);assert.deepEqual(r.data.session.categories,stats.legacy);
 assert.equal((await api('/api/sessions','POST',{...base(),categories:[]})).status,400);
 assert.equal((await api('/api/sessions','POST',{...base(),directions:[null]})).status,400);
});
test('organizer owns only own sessions; regular account cannot access dashboard',async()=>{
 const login=async email=>{const r=await api('/api/auth/login','POST',{email,password:'Test-password-12345'});assert.equal(r.status,200);return {Cookie:r.headers.get('set-cookie').split(';')[0]};};
 const admin=await login('test@example.test');
 for(const role of ['organizer','user'])assert.equal((await api('/api/accounts','POST',{name:role,email:role+'@example.test',password:'Test-password-12345',role},admin)).status,201);
 const organizer=await login('organizer@example.test'),regular=await login('user@example.test');
 const created=await api('/api/sessions','POST',{...base(),code:'OWNER1'},organizer);assert.equal(created.status,201);
 assert.equal((await api('/api/sessions/OWNER1/manage','GET',undefined,organizer)).status,200);
 assert.equal((await api('/api/sessions/TEST15/manage','GET',undefined,organizer)).status,403);
 assert.equal((await api('/api/dashboard','GET',undefined,organizer)).data.length,1);
 assert.equal((await api('/api/dashboard','GET',undefined,regular)).status,403);
 assert.equal((await api('/api/sessions/OWNER1/manage','GET',undefined,regular)).status,403);
});
