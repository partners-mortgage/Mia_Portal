import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {DEMO_LOAN,project,validateRelease,guide} from './domain.mjs';
import {monthlyBase} from './income.mjs';
export function createApp(){
 let snapshot=null,revision=0,paused=false;
 const events=[];
 return http.createServer(async(req,res)=>{
  const origin=`http://${req.headers.host}`;
  const reply=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
  // Loopback only, exact Host and same-origin writes. Not production authentication.
  if(!/^127\.0\.0\.1:\d+$/.test(req.headers.host||''))return reply(403,{error:'Loopback host required'});
  const url=new URL(req.url,origin);
  try{
   if(url.pathname.startsWith('/api/')){
    if(req.method==='GET'&&url.pathname==='/api/demo/checklist')return reply(200,{synthetic:true,revision,snapshot:project(snapshot),paused});
    if(req.method==='GET'&&url.pathname==='/api/demo/events')return reply(200,{synthetic:true,events});
    if(req.method!=='POST'||req.headers.origin!==origin||req.headers['content-type']!=='application/json')return reply(403,{error:'Same-origin JSON request required'});
    let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>65536)return reply(413,{error:'Request too large'});}
    const b=JSON.parse(raw);
    if(b.loanId!==DEMO_LOAN)return reply(404,{error:'No authorized synthetic loan'});
    if(url.pathname==='/api/demo/income')return reply(200,monthlyBase(b));
    if(url.pathname==='/api/demo/ask'){
     if(b.revision!==revision)return reply(409,{error:'Checklist changed. Refresh it before asking again.'});
     return reply(200,guide({snapshot,message:b.message,itemId:b.itemId,paused}));
    }
    if(b.expectedRevision!==revision)return reply(409,{error:'Another change occurred. Reload shared state and try again.'});
    if(url.pathname==='/api/demo/release'){
     const items=validateRelease(b);snapshot={version:++revision,releasedAt:new Date().toISOString(),items};
     events.push({at:snapshot.releasedAt,type:'synthetic-release',version:revision,count:items.length});
    }else if(url.pathname==='/api/demo/invalidate'){
     if(snapshot)snapshot.superseded=true;revision++;
     events.push({at:new Date().toISOString(),type:'synthetic-invalidation',version:revision});
    }else if(url.pathname==='/api/demo/pause'){
     if(typeof b.paused!=='boolean')return reply(400,{error:'Boolean pause required'});
     paused=b.paused;revision++;
    }else return reply(404,{error:'Not implemented'});
    return reply(200,{revision,snapshot:project(snapshot),paused});
   }
   const pages={'/':'mia-staff.html','/mia-staff.html':'mia-staff.html','/mia-portal.html':'mia-portal.html','/portal-link.js':'portal-link.js','/staff-link.js':'staff-link.js','/mia-link.css':'mia-link.css'};
   if(req.method!=='GET'||!pages[url.pathname])return reply(404,{error:'Not found'});
   const file=pages[url.pathname];const content=await readFile(new URL('./public/'+file,import.meta.url));
   res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});res.end(content);
  }catch(err){reply(400,{error:err.message});}
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url))createApp().listen(8768,'127.0.0.1',()=>console.log('Mia synthetic integration: http://127.0.0.1:8768 . No real data, auth, uploads, live AI or sends. State resets on restart.'));
