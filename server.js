const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||8080,ROOT=__dirname,DATA=process.env.DATA_FILE||path.join(ROOT,'data.json');
let db={};try{db=JSON.parse(fs.readFileSync(DATA,'utf8'))}catch{}
function save(){fs.writeFileSync(DATA,JSON.stringify(db,null,2))}
function json(res,status,obj){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj))}
function body(req){return new Promise((resolve,reject)=>{let s='';req.on('data',d=>{s+=d;if(s.length>1e6)req.destroy()});req.on('end',()=>{try{resolve(s?JSON.parse(s):{})}catch(e){reject(e)}})})}
function safeSession(x){return x&&{code:x.code,place:x.place,station:x.station,group:x.group,directions:x.directions||[],users:x.users||[],records:x.records||[],created:x.created,ended:!!x.ended,endedAt:x.endedAt||null}}
function adminOK(req,s){let t=req.headers['x-admin-token'];return !!(t&&s.adminToken&&crypto.timingSafeEqual(Buffer.from(String(t)),Buffer.from(String(s.adminToken))))}
const server=http.createServer(async(req,res)=>{try{let u=new URL(req.url,'http://x'),parts=u.pathname.split('/').filter(Boolean);
 if(req.method==='GET'&&u.pathname==='/health')return json(res,200,{ok:true,app:'scitani-dopravy',version:'1.0.1'});
 if(parts[0]==='api'&&parts[1]==='sessions'){
  if(req.method==='POST'&&parts.length===2){let x=await body(req);if(!x.code)return json(res,400,{error:'code'});while(db[x.code])x.code=crypto.randomBytes(4).toString('hex').slice(0,6).toUpperCase();let session=safeSession(x),adminToken=crypto.randomBytes(32).toString('hex');db[x.code]={...session,adminToken};save();return json(res,201,{session:safeSession(db[x.code]),adminToken})}
  let code=(parts[2]||'').toUpperCase(),s=db[code];if(!s)return json(res,404,{error:'not_found'});
  if(req.method==='GET'&&parts.length===3)return json(res,200,safeSession(s));
  if(req.method==='POST'&&parts[3]==='users'){if(s.ended)return json(res,409,{error:'ended'});let x=await body(req);if(!s.users.some(u=>u.id===x.id))s.users.push(x);save();return json(res,201,x)}
  if(req.method==='POST'&&parts[3]==='records'&&parts.length===4){if(s.ended)return json(res,409,{error:'ended'});let x=await body(req);if(!x.id)x.id=crypto.randomUUID();if(!s.records.some(r=>r.id===x.id))s.records.push(x);save();return json(res,201,x)}
  if(req.method==='DELETE'&&parts[3]==='records'&&parts[4]){let id=decodeURIComponent(parts[4]),uid=String(req.headers['x-user-id']||'');let rec=s.records.find(r=>r.id===id);if(!rec)return json(res,404,{error:'not_found'});if(!uid||String(rec.userId||'')!==uid)return json(res,403,{error:'forbidden'});s.records=s.records.filter(r=>r.id!==id);save();return json(res,200,{ok:true})}
  if(req.method==='POST'&&parts[3]==='end'){if(!adminOK(req,s))return json(res,403,{error:'admin_required'});let x=await body(req);s.ended=true;s.endedAt=x.endedAt||new Date().toISOString();save();return json(res,200,safeSession(s))}
  return json(res,405,{error:'method'});
 }
 let f=u.pathname==='/'?'index.html':u.pathname.replace(/^\//,'');f=path.normalize(f).replace(/^\.\.(\/|\\)/,'');let fp=path.join(ROOT,f);if(!fp.startsWith(ROOT)||!fs.existsSync(fp)||fs.statSync(fp).isDirectory()){res.writeHead(404);return res.end('Not found')}
 let ext=path.extname(fp),types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.json':'application/json','.png':'image/png','.css':'text/css'};res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream'});fs.createReadStream(fp).pipe(res)
 }catch(e){json(res,500,{error:'server_error',detail:e.message})}});
server.listen(PORT,()=>console.log('Scitani dopravy running on http://localhost:'+PORT));
