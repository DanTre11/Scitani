import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../../',import.meta.url),out=new URL('../www/',import.meta.url);
await mkdir(out,{recursive:true});
for(const f of ['index.html','app.bundle.js','modern.css','icon-192.png','icon-512.png']){
 let content;
 if(f.endsWith('.png')){await copyFile(new URL(f,root),new URL(f,out));continue;}
 content=await readFile(new URL(f,root),'utf8');
 if(f==='app.bundle.js'){
  const old='const apiBase = /^https?:$/.test(location.protocol) ? location.origin : fallback, p = await platform(apiBase);';
  if(!content.includes(old))throw Error('Expected API selection not found; review native build.');
  content=content.replace(old,'const apiBase = Capacitor.isNativePlatform() ? fallback : (/^https?:$/.test(location.protocol) ? location.origin : fallback), p = await platform(apiBase);');
 }
 await writeFile(new URL(f,out),content);
}
console.log('Bundled offline interface for production https://scitanidopravnihoproudu.org');
