// Visual and accessibility smoke checks against an isolated local server.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn}=require('node:child_process');
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'scitani-brand-'));let server,browser;
 const screenshots=process.env.SCREENSHOT_DIR;if(screenshots)fs.mkdirSync(screenshots,{recursive:true});
 try{
 const now=Date.now(),joined=new Date(now-900000).toISOString(),finishedAt=new Date(now).toISOString();
 const session={code:'STYLE1',place:'Praha – Motol',station:'S01',group:'Dopravní průzkum',hourlyRate:180,categories:['car','truck','lorry','bus','tram'],created:joined,directions:[{name:'Směr centrum',mode:'road',moves:[]},{name:'Směr Motol',mode:'tram',moves:[]}],users:[{id:'a',name:'Silniční sčítač',direction:'Směr centrum',joined,finishedAt,finishReason:'manual'},{id:'b',name:'Tramvajový sčítač',direction:'Směr Motol',joined,finishedAt,finishReason:'manual'}],records:[],adminToken:'visual-test-only',ended:false};
 for(const [category,n] of [['Osobní auta',60],['Nákladní auta',15],['Kamiony',10],['Autobusy',5],['Tramvaje',10]])for(let i=0;i<n;i++)session.records.push({id:String(session.records.length),time:joined,category,direction:category==='Tramvaje'?'Směr Motol':'Směr centrum',movement:'',userId:category==='Tramvaje'?'b':'a'});
 fs.writeFileSync(path.join(dir,'db.json'),JSON.stringify({sessions:{STYLE1:session},accounts:[],authSessions:{},archive:[]}));
 server=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,PORT:'0',DATA_FILE:path.join(dir,'db.json'),ADMIN_EMAIL:'visual@example.test',ADMIN_PASSWORD:'Visual-test-only-123'},stdio:['ignore','pipe','inherit']});
 const origin=await new Promise(resolve=>server.stdout.on('data',b=>{const m=b.toString().match(/localhost:(\d+)/);if(m)resolve('http://127.0.0.1:'+m[1]);}));
 browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
 const context=await browser.newContext({viewport:{width:1440,height:1040},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 await page.goto(origin);await page.locator('#appContent').waitFor({state:'visible'});await page.evaluate(()=>document.fonts.ready);
 async function capture(name){await page.evaluate(()=>document.fonts.ready);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,name+' horizontal overflow');if(screenshots)await page.screenshot({path:path.join(screenshots,name+'.png'),fullPage:true});}
 assert.equal(await page.evaluate(()=>document.fonts.check('16px Roboto')),true);assert.equal(await page.locator('#schoolLogo').getAttribute('aria-label'),'Střední průmyslová škola dopravní');
 assert.equal(await page.locator('#createHome').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(0, 43, 79)');
 await capture('01-uvod-desktop');await page.setViewportSize({width:390,height:844});await capture('02-uvod-mobil');await page.setViewportSize({width:320,height:740});await capture('03-uvod-320');
 await page.setViewportSize({width:1440,height:1040});await page.locator('#profile').click();await page.locator('#loginForm').waitFor();await capture('04-prihlaseni-desktop');await page.setViewportSize({width:390,height:844});await capture('05-prihlaseni-mobil');
 await page.locator('#email').fill('visual@example.test');await page.locator('#password').fill('Visual-test-only-123');await page.locator('#loginForm button').click();await page.locator('[data-open=STYLE1]').waitFor();await page.setViewportSize({width:1440,height:1040});await capture('06-organizator');
 await page.locator('[data-open=STYLE1]').click();await page.locator('#trafficDashboard').getByText('100 vozidel',{exact:true}).waitFor();await capture('07-sprava-desktop');await page.setViewportSize({width:390,height:844});await capture('08-sprava-mobil');
 await page.locator('#adminCount').click();await page.locator('#userName').fill('Vizuální test');await page.locator('#selectDirs button').nth(1).click();await page.locator('#start').click();await page.locator('#count').waitFor({state:'visible'});await capture('09-tramvaj-mobil');assert.equal(await page.locator('.vehicle').innerText(),'TRAMVAJ');
 await fetch(origin+'/api/sessions/STYLE1/end',{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Token':'visual-test-only'},body:'{}'});
 await page.locator('#userFinal').getByText('Ukončeno správcem',{exact:true}).waitFor({timeout:25000});await capture('10-vysledek-mobil');
 const exportResponse=await fetch(origin+'/brand/Roboto.ttf');assert.equal(exportResponse.headers.get('content-type'),'font/ttf');assert.equal((await fetch(origin+'/brand/../server.js')).status,404);
 assert.deepEqual(errors,[]);console.log('PASS school logo, local Roboto, official blue, 320/390/1440 layouts, login, organizer, server dashboard, tram and final screen');
 }finally{await browser?.close();server?.kill();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
