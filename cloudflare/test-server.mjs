// Local-only HTTP adapter for browser tests of the actual production Worker.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import worker from './worker-release-1.5.0.mjs';
import {testDatabase} from './test-db.mjs';
const {db}=testDatabase();
const env={DB:db,ASSETS:{async fetch(req){
  const p=new URL(req.url).pathname,types={png:'image/png',ttf:'font/ttf',txt:'text/plain'};
  try{return new Response(await readFile(new URL('../.cloudflare-assets'+p,import.meta.url)),{headers:{'Content-Type':types[p.split('.').pop()]||'application/octet-stream'}})}catch{return new Response('Not found',{status:404})}
}}};
http.createServer(async(req,res)=>{
  const bytes=[];for await(const part of req)bytes.push(part);
  const response=await worker.fetch(new Request('http://'+req.headers.host+req.url,{method:req.method,headers:req.headers,...bytes.length?{body:Buffer.concat(bytes)}:{}}),env);
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
}).listen(0,'127.0.0.1',function(){console.log('http://localhost:'+this.address().port)});
