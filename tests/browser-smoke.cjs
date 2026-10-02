// Optional UI audit: NODE_PATH=<directory containing playwright> node tests/browser-smoke.cjs
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {once}=require('node:events');
const workSummary=require('../work-summary');
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'scitani-browser-'));
 const dataFile=path.join(dir,'data.json');let server,browser,port=0;
 async function start(){server=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,PORT:String(port),DATA_FILE:dataFile},stdio:['ignore','pipe','inherit']});return new Promise(resolve=>server.stdout.on('data',b=>{const m=b.toString().match(/localhost:(\d+)/);if(m){port=Number(m[1]);resolve('http://127.0.0.1:'+port);}}));}
 async function stop(){const exited=once(server,'exit');server.kill();await exited;}
 try {
 const origin=await start();browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const contexts=await Promise.all([browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'})]);
 const [admin,user]=await Promise.all(contexts.map(c=>c.newPage()));const errors=[];
 for(const p of [admin,user]){p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());await p.goto(origin);await p.locator('#appContent').waitFor({state:'visible'});}
 await admin.locator('#createHome').click();assert.equal(await admin.locator('[data-dir]').count(),2);
 for(const [id,value] of Object.entries({place:'Audit UI',station:'S01',group:'Test',hourlyRate:'200'}))await admin.locator('#'+id).fill(value);
 await admin.locator('[data-dir="0"]').fill('Praha');await admin.locator('[data-dir="1"]').fill('Brno');
 await admin.locator('#createCount').click();await admin.locator('#createdCode').waitFor({state:'visible'});const code=await admin.locator('#createdCode').innerText();
 await admin.locator('#toAdmin').click();
 async function join(name){await user.locator('#joinHome').click();await user.locator('#joinCode').fill(code);await user.locator('#joinBtn').click();await user.locator('#userName').fill(name);await user.locator('#selectDirs button').first().click();await user.locator('#start').click();await user.locator('#count').waitFor({state:'visible'});}
 await join('Ruční test');
 await user.locator('.vehicle').first().click();await user.locator('.vehicle').nth(2).click();
 await user.locator('#bottom').click();await user.locator('#finish').click();await user.locator('#finish').filter({hasText:'OPRAVDU UKONČIT'}).waitFor({timeout:10000});await user.locator('#finish').click();
 await user.locator('#userFinal').getByText('Ukončeno sčítačem',{exact:true}).waitFor();
 assert.match(await user.locator('#userFinal').innerText(),/200,00 Kč\/h/);
 const session=await (await fetch(origin+'/api/sessions/'+code)).json();const manual=session.users[0];assert.equal(manual.finishReason,'manual');assert.equal(session.records.length,2);
 await user.reload();await user.locator('#userFinal').getByText('Ukončeno sčítačem',{exact:true}).waitFor();
 console.log('PASS manual completion, two-device counts and final-screen reload');
 await user.locator('#userHome').click();await join('Offline test');
 await contexts[1].setOffline(true);await user.locator('#bottom').click();await user.locator('#finish').click();await user.locator('#finish').filter({hasText:'OPRAVDU UKONČIT'}).waitFor({timeout:10000});await user.locator('#finish').click();
 await user.locator('#userFinal').getByText('Čeká na server',{exact:true}).first().waitFor();
 await contexts[1].setOffline(false);await user.locator('#userFinal').getByText('Ukončeno sčítačem',{exact:true}).waitFor({timeout:25000});
 console.log('PASS offline pending state and automatic confirmation after reconnection');
 await user.locator('#userHome').click();await join('Nečinnost');
 await stop();const db=JSON.parse(fs.readFileSync(dataFile));const idle=db.sessions[code].users.at(-1);idle.joined=new Date(Date.now()-3600000).toISOString();idle.lastActivity=new Date(Date.now()-1201000).toISOString();fs.writeFileSync(dataFile,JSON.stringify(db));await start();
 await user.reload();await user.locator('#userFinal').getByText('Nečinnost (20 minut)',{exact:true}).waitFor();
 const ended=(await (await fetch(origin+'/api/sessions/'+code)).json()).users.at(-1);assert.equal(ended.finishReason,'inactivity');assert.equal(Date.parse(ended.finishedAt),Date.parse(idle.lastActivity)+1200000);
 console.log('PASS server inactivity deadline and recovery after browser reload');
 await user.locator('#userHome').click();await join('Ukončení správcem');
 await admin.locator('#adminEnd').click();await admin.locator('#confirmAdminEnd').click();await admin.locator('#finishAdmin').waitFor({state:'visible'});
 await user.locator('#userFinal').getByText('Ukončeno správcem',{exact:true}).waitFor({timeout:25000});
 const final=await (await fetch(origin+'/api/sessions/'+code)).json();assert.equal(final.users[0].finishedAt,manual.finishedAt);assert.equal(final.users.at(-1).finishedAt,final.endedAt);
 const w=workSummary(final,final.users.at(-1));assert.ok((await user.locator('#userFinal').innerText()).includes(w.reward.toLocaleString('cs-CZ',{minimumFractionDigits:2,maximumFractionDigits:2})+' Kč'));
 const download=admin.waitForEvent('download');await admin.locator('#finalExport').click();const file=await download;assert.match(file.suggestedFilename(),/\.xlsx$/);assert.ok(fs.statSync(await file.path()).size>1000);
 assert.equal(await user.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);console.log('PASS admin completion, Excel download, mobile layout and no JS errors');
 } finally {await browser?.close();if(server?.exitCode===null)await stop();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
