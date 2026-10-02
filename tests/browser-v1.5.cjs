const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn}=require('node:child_process');
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'scitani-ui15-'));let server,browser;
 try{
 server=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,PORT:'0',DATA_FILE:path.join(dir,'data.json')},stdio:['ignore','pipe','inherit']});
 const origin=await new Promise(resolve=>server.stdout.on('data',b=>{const m=b.toString().match(/localhost:(\d+)/);if(m)resolve('http://127.0.0.1:'+m[1]);}));
 browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
 const contexts=await Promise.all([0,1,2].map(()=>browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'})));
 const [admin,road,tram]=await Promise.all(contexts.map(c=>c.newPage()));const errors=[];
 for(const p of [admin,road,tram]){p.on('pageerror',e=>errors.push(e.message));p.on('dialog',async d=>{errors.push('Unexpected dialog: '+d.message());await d.accept();});await p.goto(origin);await p.locator('#appContent').waitFor({state:'visible'});}
 await admin.locator('#createHome').click();
 for(const [id,value] of Object.entries({place:'V1.5 UI',station:'S1',group:'Test',hourlyRate:'200'}))await admin.locator('#'+id).fill(value);
 for(const id of ['truck','lorry','bus'])await admin.locator('[data-category='+id+']').uncheck();
 await admin.locator('[data-dir="0"]').fill('Silnice');await admin.locator('[data-dir="1"]').fill('Centrum');
 assert.equal(await admin.locator('[data-mode]').count(),0);
 await admin.locator('[data-category=tram]').check();await admin.locator('[data-mode="1"]').selectOption('tram');
 await admin.locator('#addDir').click();await admin.locator('[data-dir="2"]').fill('Motol');await admin.locator('[data-mode="2"]').selectOption('tram');
 await admin.locator('#createCount').click();await admin.locator('#createdCode').waitFor({state:'visible'});const code=await admin.locator('#createdCode').innerText();
 await admin.locator('#toAdmin').click();
 async function join(p,name,index){await p.locator('#joinHome').click();await p.locator('#joinCode').fill(code);await p.locator('#joinBtn').click();await p.locator('#userName').fill(name);await p.locator('#selectDirs button').nth(index).click();await p.locator('#start').click();await p.locator('#count').waitFor({state:'visible'});}
 await join(road,'Silniční sčítač',0);await join(tram,'Tramvajový sčítač',1);
 assert.equal(await road.locator('.vehicle').count(),1);assert.match(await road.locator('.vehicle').innerText(),/Osobní auta/);
 assert.equal(await tram.locator('.vehicle').count(),1);assert.equal(await tram.locator('.vehicle').innerText(),'TRAMVAJ');assert.match(await tram.locator('#buttons').innerText(),/Centrum/);
 for(let i=0;i<3;i++)await road.locator('.vehicle').click();await tram.locator('.vehicle').click();
 await admin.locator('#trafficDashboard').getByText('4 vozidel',{exact:true}).waitFor({timeout:25000});
 assert.match(await admin.locator('#trafficDashboard').innerText(),/75 %/);assert.match(await admin.locator('#trafficDashboard').innerText(),/25 %/);assert.doesNotMatch(await admin.locator('#trafficDashboard').innerText(),/Autobusy|Kamiony/);
 assert.equal(await road.locator('#stats').innerText(),'');
 console.log('PASS dynamic subset, separate tram screen, directions, hidden counts, two participants and server dashboard');
 await contexts[2].setOffline(true);await tram.locator('.vehicle').click();await tram.locator('#bottom').click();await tram.locator('#undo').click();await tram.locator('.handle').click();await tram.locator('.vehicle').click();await contexts[2].setOffline(false);
 await admin.locator('#trafficDashboard').getByText('5 vozidel',{exact:true}).waitFor({timeout:30000});
 const session=await(await fetch(origin+'/api/sessions/'+code)).json();assert.equal(session.records.filter(r=>r.category==='Tramvaje').length,2);
 const download=admin.waitForEvent('download');await admin.locator('#adminExport').click();const file=await download;const bytes=fs.readFileSync(await file.path());assert.equal(bytes.subarray(0,2).toString(),'PK');assert.ok(bytes.includes(Buffer.from('Intenzita a skladba')));assert.ok(bytes.includes(Buffer.from('Tramvaje')));
 assert.equal(await tram.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await admin.locator('#adminEnd').click();await admin.locator('#confirmAdminEnd').click();await admin.locator('#finishAdmin').waitFor({state:'visible'});
 await tram.locator('#userFinal').getByText('Ukončeno správcem',{exact:true}).waitFor({timeout:25000});assert.match(await tram.locator('#userFinal').innerText(),/voz\/h/);
 assert.deepEqual(errors,[]);console.log('PASS offline tram queue, undo, actual XLSX download, mobile layout and admin completion');
 // PWA shell includes the shared statistics module and loads after disconnection.
 const pwa=await browser.newContext({serviceWorkers:'allow'}),page=await pwa.newPage();await page.goto(origin);await page.locator('#appContent').waitFor({state:'visible'});
 await page.evaluate(()=>Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('PWA timeout')),15000))]));await page.reload();await pwa.setOffline(true);await page.reload();await page.locator('#appContent').waitFor({state:'visible'});assert.equal(await page.evaluate(()=>window.trafficStats.categories({}).length),4);console.log('PASS PWA offline shell with v1.5 statistics');
 for(const category of ['car','tram']){
   const context=await browser.newContext({serviceWorkers:'block'}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(origin);await p.locator('#createHome').click();
   for(const [id,value] of Object.entries({place:'Single '+category,station:'S1',group:'Test',hourlyRate:'200'}))await p.locator('#'+id).fill(value);
   for(const id of ['car','truck','lorry','bus','tram'])await p.locator('[data-category='+id+']').setChecked(id===category);
   for(let i=0;i<2;i++){await p.locator('[data-dir="'+i+'"]').fill('Směr '+i);if(category==='tram')await p.locator('[data-mode="'+i+'"]').selectOption('tram');}
   await p.locator('#createCount').click();await p.locator('#createdCode').waitFor({state:'visible'});const singleCode=await p.locator('#createdCode').innerText();
   await p.locator('#creatorChoose').click();await p.locator('#userName').fill('Only '+category);await p.locator('#selectDirs button').first().click();await p.locator('#start').click();await p.locator('#count').waitFor({state:'visible'});
   assert.equal(await p.locator('.vehicle').count(),1);assert.equal((await p.locator('.vehicle').innerText()).includes('TRAMVAJ'),category==='tram');await p.locator('.vehicle').click();
   await p.waitForFunction(()=>document.getElementById('netbar').textContent.includes('vše synchronizováno'));
   const single=await(await fetch(origin+'/api/sessions/'+singleCode)).json();assert.equal(single.records.length,1);assert.deepEqual(single.categories,[category]);await context.close();
 }
 assert.deepEqual(errors,[]);console.log('PASS road-only subset and tram-only creation and counting');
 }finally{await browser?.close();server?.kill();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
