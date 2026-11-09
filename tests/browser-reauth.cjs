const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process');
(async()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'reauth-ui-'));let server,browser;try{
 server=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,PORT:'0',DATA_FILE:path.join(dir,'db.json'),ADMIN_EMAIL:'ui@test.invalid',ADMIN_PASSWORD:'UI-Test-Password-123'},stdio:['ignore','pipe','inherit']});
 const origin=await new Promise(resolve=>server.stdout.on('data',b=>{const m=b.toString().match(/localhost:(\d+)/);if(m)resolve('http://127.0.0.1:'+m[1])}));
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 const ctx=await browser.newContext({viewport:{width:390,height:844},permissions:['geolocation'],geolocation:{latitude:50,longitude:14,accuracy:12},serviceWorkers:'block'});
 const login=await ctx.request.post(origin+'/api/auth/login',{data:{email:'ui@test.invalid',password:'UI-Test-Password-123'}});assert.equal(login.status(),200);
 const created=await ctx.request.post(origin+'/api/sessions',{headers:{Cookie:login.headers()['set-cookie'].split(';')[0]},data:{code:'UIR160',place:'UI',station:'Station',group:'DOD',hourlyRate:200,categories:['car'],directions:[{name:'Road',mode:'road',moves:[]}],presenceVerification:true,stationLatitude:50,stationLongitude:14,stationAccuracy:5}});assert.equal(created.status(),201);
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());await page.goto(origin);await page.waitForFunction(()=>window.trafficAccount);
 await page.locator('#joinHome').click();await page.locator('#joinCode').fill('UIR160');await page.locator('#joinBtn').click();await page.locator('#userName').fill('UI counter');await page.locator('#selectDirs button').first().click();await page.locator('#start').click();await page.locator('#count').waitFor({state:'visible'});
 const identity=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('trafficUser'))),token=await page.evaluate(id=>localStorage.getItem('v130:'+location.origin+':trafficParticipant:'+id.code+':'+id.id),identity);
 const headers={'X-Participant-Token':token},up=origin+'/api/sessions/UIR160/users/'+identity.id;
 for(let i=0;i<2;i++)assert.equal((await ctx.request.post(up+'/presence',{headers,data:{}})).status(),200);
 // Third control through the real UI, followed by cancellation.
 await page.locator('#presenceBar').evaluate(e=>e.classList.remove('hidden'));await page.locator('#presenceConfirm').click();await page.locator('dialog').waitFor();assert(await page.locator('.vehicle').first().isDisabled());
 await page.locator('dialog [data-cancel]').click();assert(await page.locator('.vehicle').first().isDisabled());assert.match(await page.locator('#presenceBar').innerText(),/Sčítání pozastaveno/);
 await page.reload();await page.locator('#count').waitFor({state:'visible'});assert(await page.locator('.vehicle').first().isDisabled());
 await page.locator('#presenceConfirm').click();await page.locator('dialog input[name=email]').fill('ui@test.invalid');await page.locator('dialog input[name=password]').fill('UI-Test-Password-123');await page.locator('dialog button[type=submit]').click();await page.waitForFunction(()=>!document.querySelector('.vehicle').disabled);
 assert.equal(await page.evaluate(()=>JSON.stringify(localStorage).includes('UI-Test-Password-123')),false);
 await page.locator('.vehicle').first().click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('v130:'+location.origin+':trafficQueue')||'[]').length===0);
 const session=await (await ctx.request.get(origin+'/api/sessions/UIR160',{headers})).json();assert.equal(session.records.length,1);assert.equal(session.users[0].presenceChecksSinceVehicle,0);
 assert.deepEqual(errors,[]);console.log('PASS UI: mobile viewport, third presence dialog, cancellation, vehicle buttons locked, reload retains lock, password + fresh GPS unlock, record sync, no password in storage.');
}finally{await browser?.close();server?.kill();fs.rmSync(dir,{recursive:true,force:true})}})().catch(e=>{console.error(e);process.exitCode=1});
