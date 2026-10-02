(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.trafficStats=api;})(globalThis,()=>{
  'use strict';
  const registry=Object.freeze([
    {id:'car',label:'Osobní auta',icon:'🚗',mode:'road'},
    {id:'truck',label:'Nákladní auta',icon:'🚚',mode:'road'},
    {id:'lorry',label:'Kamiony',icon:'🚛',mode:'road'},
    {id:'bus',label:'Autobusy',icon:'🚌',mode:'road'},
    {id:'tram',label:'Tramvaje',icon:'🚋',mode:'tram'}
  ].map(Object.freeze));
  const legacy=['car','truck','lorry','bus'];
  function categories(s){const ids=s.categories===undefined?legacy:s.categories;return registry.filter(c=>Array.isArray(ids)&&ids.includes(c.id));}
  function forDirection(s,d){return categories(s).filter(c=>c.mode===(d?.mode||'road'));}
  function category(r){return registry.find(c=>c.id===r.categoryId||(!r.categoryId&&c.label===r.category));}
  function validRecords(s,rs){const ids=categories(s).map(c=>c.id);return rs.filter(r=>ids.includes(category(r)?.id));}
  // Largest remainder in tenths of a percent: nonempty totals always sum to 100.0%.
  function composition(cats,rs){const counts=cats.map(c=>rs.filter(r=>category(r)?.id===c.id).length),total=counts.reduce((a,b)=>a+b,0);
    const raw=counts.map(n=>total?n*1000/total:0),units=raw.map(Math.floor);
    const order=raw.map((n,i)=>({i,f:n-units[i]})).sort((a,b)=>b.f-a.f||a.i-b.i);
    const remaining=(total?1000:0)-units.reduce((a,b)=>a+b,0);
    for(let n=0;n<remaining;n++)units[order[n].i]++;
    return cats.map((c,i)=>({...c,count:counts[i],percent:units[i]/10}));
  }
  function duration(s,users){const spans=users.map(u=>[Date.parse(u.joined),Date.parse(u.finishedAt||s.endedAt||s.serverNow)]).filter(([a,b])=>Number.isFinite(a)&&Number.isFinite(b)&&b>=a).sort((a,b)=>a[0]-b[0]);
    // Union of observed time: simultaneous devices never multiply observation duration.
    let ms=0,end=-Infinity;for(const [a,b] of spans){ms+=Math.max(0,b-Math.max(a,end));end=Math.max(end,b);}return ms;
  }
  function summarize(s,rs=s.records||[],userId){rs=validRecords(s,rs);const users=(s.users||[]).filter(u=>!userId||u.id===userId);
    function group(label,d){const rows=d?rs.filter(r=>r.direction===d.name):rs;const ms=duration(s,d?users.filter(u=>u.direction===d.name):users);return {label,total:rows.length,hours:ms/3600000,intensity:ms>0?rows.length*3600000/ms:null,composition:composition(d?forDirection(s,d):categories(s),rows)};}
    return {total:group('Celkem'),directions:(s.directions||[]).filter(d=>!userId||users.some(u=>u.direction===d.name)).map(d=>group(d.name,d))};
  }
  function validate(s){if(!Array.isArray(s.categories)||!s.categories.length||new Set(s.categories).size!==s.categories.length||s.categories.some(id=>!registry.some(c=>c.id===id)))return 'categories';
    if(!Array.isArray(s.directions)||!s.directions.length||new Set(s.directions.map(d=>typeof d?.name==='string'?d.name.trim():'')).size!==s.directions.length)return 'directions';
    if(s.directions.some(d=>!d||typeof d.name!=='string'||!d.name.trim()||!['road','tram',undefined].includes(d.mode)||!Array.isArray(d.moves)||d.moves.some(m=>typeof m!=='string'||!m.trim())||!forDirection(s,d).length))return 'directions';
    if(categories(s).some(c=>!s.directions.some(d=>(d.mode||'road')===c.mode)))return 'directions';return null;
  }
  return {registry,legacy,categories,forDirection,category,validRecords,composition,duration,summarize,validate};
});
