const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||8080,ROOT=__dirname,DATA=process.env.DATA_FILE||path.join(ROOT,'data.json');
const trafficStats=require('./traffic-stats.js');
const workSummary=require('./work-summary.js');
const APP='scitani-dopravy',VERSION='1.5.0',COOKIE='scitani_auth';
let db={};try{db=JSON.parse(fs.readFileSync(DATA,'utf8'))}catch{}
// Backward-compatible migration from v1.0.1 (sessions were stored directly under their codes).
if(!db.sessions){const old={};for(const [k,v] of Object.entries(db)){if(/^[A-Z0-9]{6}$/.test(k)&&v&&v.code)old[k]=v}db={sessions:old,accounts:[],authSessions:{},archive:[],meta:{migratedAt:new Date().toISOString()}}}
db.sessions=db.sessions||{};db.accounts=db.accounts||[];db.authSessions=db.authSessions||{};db.archive=db.archive||[];
function save(){fs.writeFileSync(DATA,JSON.stringify(db,null,2))}
function json(res,status,obj,extra={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extra});res.end(JSON.stringify(obj))}
function body(req){return new Promise((resolve,reject)=>{let s='';req.on('data',d=>{s+=d;if(s.length>1e6){reject(Error('body_too_large'));req.destroy()}});req.on('end',()=>{try{resolve(s?JSON.parse(s):{})}catch(e){reject(e)}})})}
function safeSession(x){return x&&{serverNow:new Date().toISOString(),code:x.code,place:x.place,station:x.station,group:x.group,hourlyRate:Number(x.hourlyRate)||0,categories:trafficStats.categories(x).map(c=>c.id),directions:x.directions||[],users:(x.users||[]).map(u=>{const {participantToken,...safe}=u;return safe}),records:x.records||[],created:x.created,ended:!!x.ended,endedAt:x.endedAt||null}}
// Finish once, using server time. A delayed heartbeat cannot extend paid time.
function settleSession(s, now=Date.now()) {
 let changed=false;
 for(const usr of s.users||[]) {
  if(usr.finishedAt)continue;
  const deadline=Date.parse(usr.lastActivity||usr.joined)+20*60*1000;
  const ended=Date.parse(s.endedAt);
  if(Number.isFinite(deadline)&&deadline<=now&&(!s.ended||deadline<=ended)) {
   usr.finishedAt=new Date(deadline).toISOString();usr.finishReason='inactivity';changed=true;
  } else if(s.ended&&Number.isFinite(ended)) {
   usr.finishedAt=s.endedAt;usr.finishReason='session-ended';changed=true;
  }
 }
 return changed;
}
function finishResponse(s,usr){return {ok:true,finishedAt:usr.finishedAt,finishReason:usr.finishReason,user:((({participantToken,...safe})=>safe)(usr)),work:workSummary(s,usr)}}
function safeAccount(a){return a&&{id:a.id,name:a.name,email:a.email,role:a.role,active:a.active!==false,created:a.created}}
function same(a,b){try{a=Buffer.from(String(a));b=Buffer.from(String(b));return a.length===b.length&&crypto.timingSafeEqual(a,b)}catch{return false}}
function adminTokenOK(req,s){return !!(req.headers['x-admin-token']&&s.adminToken&&same(req.headers['x-admin-token'],s.adminToken))}
function participantOK(req,s,userId){const u=(s.users||[]).find(x=>String(x.id)===String(userId));return !!(u&&u.participantToken&&same(req.headers['x-participant-token']||'',u.participantToken))}
function cookies(req){const out={};for(const p of String(req.headers.cookie||'').split(';')){const i=p.indexOf('=');if(i>0)out[p.slice(0,i).trim()]=decodeURIComponent(p.slice(i+1).trim())}return out}
function currentAccount(req){const token=cookies(req)[COOKIE]||String(req.headers['x-auth-token']||'');const aId=db.authSessions[token];if(!aId)return null;const a=db.accounts.find(x=>x.id===aId&&x.active!==false);return a||null}
function authRequired(req,res,roles){const a=currentAccount(req);if(!a){json(res,401,{error:'login_required'});return null}if(roles&&!roles.includes(a.role)){json(res,403,{error:'forbidden'});return null}return a}
function sessionManageOK(req,s){const a=currentAccount(req);return adminTokenOK(req,s)||!!(a&&(a.role==='admin'||(a.role==='organizer'&&s.ownerId===a.id)))}
function normEmail(v){return String(v||'').trim().toLowerCase()}
function hashPassword(password,salt=crypto.randomBytes(16).toString('hex')){const hash=crypto.scryptSync(String(password),salt,64).toString('hex');return {salt,hash}}
function verifyPassword(password,a){return same(crypto.scryptSync(String(password),a.passwordSalt,64).toString('hex'),a.passwordHash)}
function validPassword(p){return typeof p==='string'&&p.length>=12&&p.length<=128}
function setLogin(res,a){const token=crypto.randomBytes(32).toString('hex');db.authSessions[token]=a.id;save();return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=2592000`}
function clearLogin(){return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0`}
function ownerInfo(s){const a=db.accounts.find(x=>x.id===s.ownerId);return a?safeAccount(a):null}
function dashboardRow(s){return {...safeSession(s),owner:ownerInfo(s),vehicles:(s.records||[]).length,users:(s.users||[]).length,activeUsers:(s.users||[]).filter(u=>!u.finishedAt&&Date.now()-Date.parse(u.lastSeen||u.joined||0)<120000).length}}
function seedAdmin(){const email=normEmail(process.env.ADMIN_EMAIL),password=process.env.ADMIN_PASSWORD,name=String(process.env.ADMIN_NAME||'Hlavní správce').trim();if(!email||!password||db.accounts.some(a=>a.role==='admin'))return;if(!validPassword(password)){console.error('ADMIN_PASSWORD must have 12-128 characters');return}const p=hashPassword(password);db.accounts.push({id:crypto.randomUUID(),name,email,role:'admin',active:true,passwordSalt:p.salt,passwordHash:p.hash,created:new Date().toISOString()});save();console.log('Initial admin account created for '+email)}
seedAdmin();
const attempts=new Map();function loginAllowed(ip){const now=Date.now(),x=attempts.get(ip)||[];const recent=x.filter(t=>now-t<15*60*1000);attempts.set(ip,recent);return recent.length<10}function badLogin(ip){const x=attempts.get(ip)||[];x.push(Date.now());attempts.set(ip,x)}
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://x'),parts=u.pathname.split('/').filter(Boolean);
 if(req.method==='GET'&&u.pathname==='/health')return json(res,200,{ok:true,app:APP,version:VERSION});
 if(parts[0]==='api'&&parts[1]==='auth'){
  if(req.method==='GET'&&parts[2]==='me')return json(res,200,{account:safeAccount(currentAccount(req))});
  if(req.method==='POST'&&parts[2]==='register'){const x=await body(req),email=normEmail(x.email);if(!validPassword(x.password))return json(res,400,{error:'password_length'});if(!email||!String(x.name||'').trim())return json(res,400,{error:'invalid'});if(db.accounts.some(a=>a.email===email))return json(res,409,{error:'email_exists'});const p=hashPassword(x.password);db.accounts.push({id:crypto.randomUUID(),name:String(x.name).trim().slice(0,100),email,role:'user',active:true,passwordSalt:p.salt,passwordHash:p.hash,created:new Date().toISOString()});save();return json(res,201,{ok:true})}
  if(req.method==='POST'&&parts[2]==='login'){const ip=req.socket.remoteAddress||'unknown';if(!loginAllowed(ip))return json(res,429,{error:'try_later'});const x=await body(req),a=db.accounts.find(z=>z.email===normEmail(x.email)&&z.active!==false);if(!a||!verifyPassword(x.password||'',a)){badLogin(ip);return json(res,401,{error:'invalid_credentials'})}attempts.delete(ip);return json(res,200,{account:safeAccount(a)},{'Set-Cookie':setLogin(res,a)})}
  if(req.method==='POST'&&parts[2]==='logout'){const token=cookies(req)[COOKIE];if(token)delete db.authSessions[token];save();return json(res,200,{ok:true},{'Set-Cookie':clearLogin()})}
 }
 if(parts[0]==='api'&&parts[1]==='dashboard'&&req.method==='GET'){const a=authRequired(req,res,['organizer','admin']);if(!a)return;let rows=Object.values(db.sessions);if(a.role==='organizer')rows=rows.filter(s=>s.ownerId===a.id);rows.sort((a,b)=>String(b.created).localeCompare(String(a.created)));return json(res,200,rows.map(dashboardRow))}
 if(parts[0]==='api'&&parts[1]==='accounts'){
  const admin=authRequired(req,res,['admin']);if(!admin)return;
  if(req.method==='GET'&&parts.length===2)return json(res,200,db.accounts.map(safeAccount));
  if(req.method==='POST'&&parts.length===2){const x=await body(req),email=normEmail(x.email),role=['organizer','user'].includes(x.role)?x.role:'user';if(!validPassword(x.password))return json(res,400,{error:'password_length'});if(db.accounts.some(a=>a.email===email))return json(res,409,{error:'email_exists'});const p=hashPassword(x.password);const a={id:crypto.randomUUID(),name:String(x.name||'').trim().slice(0,100),email,role,active:true,passwordSalt:p.salt,passwordHash:p.hash,created:new Date().toISOString()};db.accounts.push(a);save();return json(res,201,safeAccount(a))}
  if(req.method==='PATCH'&&parts[2]){const a=db.accounts.find(z=>z.id===parts[2]);if(!a||a.role==='admin')return json(res,404,{error:'not_found'});const x=await body(req);if(x.name!==undefined)a.name=String(x.name).trim().slice(0,100);if(['organizer','user'].includes(x.role))a.role=x.role;if(typeof x.active==='boolean')a.active=x.active;if(x.password!==undefined){if(!validPassword(x.password))return json(res,400,{error:'password_length'});const p=hashPassword(x.password);a.passwordSalt=p.salt;a.passwordHash=p.hash}save();return json(res,200,safeAccount(a))}
 }
 if(parts[0]==='api'&&parts[1]==='archive'){
  const a=authRequired(req,res,['admin']);if(!a)return;
  if(req.method==='GET'&&parts.length===2)return json(res,200,db.archive.map(x=>{const {base64,...meta}=x;return meta}));
  if(req.method==='GET'&&parts[2]){const x=db.archive.find(z=>z.code===parts[2]);if(!x)return json(res,404,{error:'not_found'});return json(res,200,{filename:x.filename,base64:x.base64})}
 }
 if(parts[0]==='api'&&parts[1]==='sessions'){
  if(req.method==='POST'&&parts.length===2){let x=await body(req);if(!x.code)return json(res,400,{error:'code'});while(db.sessions[x.code])x.code=crypto.randomBytes(4).toString('hex').slice(0,6).toUpperCase();const rate=Number(x.hourlyRate??0);if(!Number.isFinite(rate)||rate<0)return json(res,400,{error:'hourly_rate'});if(x.categories!==undefined){const invalid=trafficStats.validate(x);if(invalid)return json(res,400,{error:invalid})}const session=safeSession({...x,hourlyRate:rate,users:[],records:[],created:new Date().toISOString(),ended:false,endedAt:null}),adminToken=crypto.randomBytes(32).toString('hex'),a=currentAccount(req);db.sessions[x.code]={...session,adminToken,ownerId:a&&['organizer','admin'].includes(a.role)?a.id:null};save();return json(res,201,{session:safeSession(db.sessions[x.code]),adminToken})}
  const code=(parts[2]||'').toUpperCase(),s=db.sessions[code];if(!s)return json(res,404,{error:'not_found'});
  if(settleSession(s))save();
  if(req.method==='GET'&&parts.length===3)return json(res,200,safeSession(s));
  if(parts[3]==='manage'&&req.method==='GET'){if(!sessionManageOK(req,s))return json(res,403,{error:'forbidden'});return json(res,200,safeSession(s))}
  if(parts[3]==='manage'&&req.method==='PATCH'){if(!sessionManageOK(req,s))return json(res,403,{error:'forbidden'});const x=await body(req);for(const k of ['place','station','group'])if(x[k]!==undefined)s[k]=String(x[k]).trim().slice(0,300);save();return json(res,200,safeSession(s))}
  if(req.method==='POST'&&parts[3]==='users'&&parts.length===4){if(s.ended)return json(res,409,{error:'ended'});const x=await body(req);if(s.ended)return json(res,409,{error:'ended'});if(!x.id)return json(res,400,{error:'id'});const supplied=String(req.headers['x-participant-token']||'');let existing=s.users.find(u=>u.id===x.id);if(existing){if(existing.participantToken&&!same(existing.participantToken,supplied))return json(res,403,{error:'forbidden'});const {participantToken,...out}=existing;return json(res,200,out)}if(!supplied)return json(res,400,{error:'participant_token_required'});x.participantToken=supplied;x.joined=new Date().toISOString();x.lastSeen=x.joined;x.lastActivity=x.joined;x.finishedAt=null;x.finishReason=null;s.users.push(x);save();const out={...x};delete out.participantToken;return json(res,201,out)}
  if(req.method==='POST'&&parts[3]==='users'&&parts[4]&&parts[5]==='heartbeat'){const usr=s.users.find(x=>x.id===parts[4]);if(!usr||!participantOK(req,s,usr.id))return json(res,403,{error:'forbidden'});const now=new Date(),last=Date.parse(usr.lastActivity||usr.joined),idleMs=Math.max(0,now.getTime()-last);usr.lastSeen=now.toISOString();save();return json(res,200,{...finishResponse(s,usr),ended:!!s.ended,autoFinished:usr.finishReason==='inactivity',idleMs,presenceDue:!usr.finishedAt&&idleMs>=10*60*1000})}
  if(req.method==='POST'&&parts[3]==='users'&&parts[4]&&parts[5]==='presence'){const usr=s.users.find(x=>x.id===parts[4]);if(!usr||!participantOK(req,s,usr.id))return json(res,403,{error:'forbidden'});if(usr.finishedAt)return json(res,409,{error:'finished'});usr.lastSeen=new Date().toISOString();usr.lastActivity=usr.lastSeen;usr.presenceConfirmedAt=usr.lastSeen;save();return json(res,200,{ok:true,lastActivity:usr.lastActivity})}
  if(req.method==='POST'&&parts[3]==='users'&&parts[4]&&parts[5]==='finish'){const usr=s.users.find(x=>x.id===parts[4]);if(!usr||!participantOK(req,s,usr.id))return json(res,403,{error:'forbidden'});await body(req);if(settleSession(s))save();if(!usr.finishedAt){usr.finishedAt=new Date().toISOString();usr.lastSeen=usr.finishedAt;usr.finishReason='manual';save()}return json(res,200,finishResponse(s,usr))}
  if(req.method==='POST'&&parts[3]==='records'&&parts.length===4){const x=await body(req);if(settleSession(s))save();if(!x.id)x.id=crypto.randomUUID();if(!participantOK(req,s,x.userId))return json(res,403,{error:'forbidden'});const usr=s.users.find(u=>String(u.id)===String(x.userId));if(s.records.some(r=>r.id===x.id))return json(res,200,s.records.find(r=>r.id===x.id));if(s.ended)return json(res,409,{error:'ended'});if(usr&&usr.finishedAt)return json(res,409,{error:'finished'});const cat=trafficStats.category(x),dir=s.directions.find(d=>d.name===(x.direction||usr.direction));if(!cat||!trafficStats.forDirection(s,dir).some(c=>c.id===cat.id)||!dir||(x.direction&&x.direction!==usr.direction))return json(res,400,{error:'category_direction'});x.category=cat.label;x.categoryId=cat.id;x.direction=dir.name;if(!s.records.some(r=>r.id===x.id))s.records.push(x);if(usr){usr.lastActivity=new Date().toISOString();usr.lastSeen=usr.lastActivity}save();return json(res,201,x)}
  if(req.method==='DELETE'&&parts[3]==='records'&&parts[4]){const id=decodeURIComponent(parts[4]),uid=String(req.headers['x-user-id']||''),rec=s.records.find(r=>r.id===id);if(!rec)return json(res,404,{error:'not_found'});if(!uid||String(rec.userId||'')!==uid||!participantOK(req,s,uid))return json(res,403,{error:'forbidden'});s.records=s.records.filter(r=>r.id!==id);save();return json(res,200,{ok:true})}
  if(req.method==='POST'&&parts[3]==='end'){if(!sessionManageOK(req,s))return json(res,403,{error:'admin_required'});await body(req);settleSession(s);if(!s.ended){s.ended=true;s.endedAt=new Date().toISOString();}for(const usr of (s.users||[])){if(!usr.finishedAt){usr.finishedAt=s.endedAt;usr.finishReason='session-ended'}}save();return json(res,200,safeSession(s))}
  return json(res,405,{error:'method'});
 }
 let f=u.pathname==='/'?'index.html':u.pathname.replace(/^\//,'');if(!['index.html','app.bundle.js','work-summary.js','traffic-stats.js','modern.css','manifest.json','sw.js','icon-192.png','icon-512.png'].includes(f)){res.writeHead(404);return res.end('Not found')}f=path.normalize(f).replace(/^\.\.(\/|\\)/,'');const fp=path.join(ROOT,f);if(!fp.startsWith(ROOT)||!fs.existsSync(fp)||fs.statSync(fp).isDirectory()){res.writeHead(404);return res.end('Not found')}const ext=path.extname(fp),types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.json':'application/json','.png':'image/png','.css':'text/css'};res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream'});fs.createReadStream(fp).pipe(res)
 }catch(e){console.error(e);json(res,500,{error:'server_error',detail:e.message})}});
setInterval(()=>{let changed=false;for(const s of Object.values(db.sessions))changed=settleSession(s)||changed;if(changed)save()},15000).unref();
server.listen(PORT,()=>console.log(`Scitani dopravy ${VERSION} running on http://localhost:${server.address().port}`));
