// Build a reproducible release from reviewed sources and stage only public files.
import { mkdir, copyFile, readFile, writeFile, rm } from 'node:fs/promises';
const root = new URL('../', import.meta.url), assets = new URL('.cloudflare-assets/', root);
const embedded = {};
for (const [name,type] of Object.entries({
  'index.html':'text/html; charset=utf-8', 'app.bundle.js':'text/javascript; charset=utf-8',
  'work-summary.js':'text/javascript; charset=utf-8', 'traffic-stats.js':'text/javascript; charset=utf-8',
  'modern.css':'text/css; charset=utf-8', 'school.css':'text/css; charset=utf-8',
  'manifest.json':'application/manifest+json', 'sw.js':'text/javascript; charset=utf-8'
})) embedded['/'+name] = {type,body:await readFile(new URL(name,root),'utf8')};
await writeFile(new URL('worker-release-1.5.0.mjs',import.meta.url),
  'const RELEASE_ASSETS = '+JSON.stringify(embedded)+';\n'+await readFile(new URL('worker.mjs',import.meta.url),'utf8'));
// This fixed output directory contains generated public assets only.
await rm(assets,{recursive:true,force:true});
await mkdir(new URL('brand/',assets),{recursive:true});
for (const name of ['icon-192.png','icon-512.png','brand/school-logo.png','brand/school-pattern.png','brand/traffic-study.png','brand/Roboto.ttf','brand/OFL.txt'])
  await copyFile(new URL(name,root),new URL(name,assets));
