import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {guide,validateRelease,project,DEMO_LOAN,MAX_AGE_MS} from '../domain.mjs';
import {monthlyBase} from '../income.mjs';
import {makeConversationRequest,callGateway} from '../gateway-contract.mjs';
import {createApp} from '../server.mjs';
const item={id:'cond_001',t:'Signed fictional gift letter',why:'Include the donor signature.',state:'needed'};
const snap=()=>({version:1,releasedAt:new Date().toISOString(),items:[{...item}]});
test('missing, stale and superseded checklists fail closed',()=>{
 for(const snapshot of [null,{...snap(),superseded:true},{...snap(),releasedAt:new Date(Date.now()-MAX_AGE_MS-100).toISOString()}])assert.match(guide({snapshot,message:'What is needed?'}).reply,/cannot confirm/);
});
test('borrower claims never mutate receipt or claim a callback',()=>{
 const snapshot=snap();assert.match(guide({snapshot,message:'I uploaded it'}).reply,/does not verify receipt/);assert.equal(snapshot.items[0].state,'needed');assert.match(guide({snapshot,message:'Call me'}).reply,/not booked/);
});
test('selected condition uses current projection and arbitrary items are rejected',()=>{
 assert.match(guide({snapshot:snap(),message:'Explain this',itemId:item.id}).reply,/donor signature/);
 assert.throws(()=>guide({snapshot:snap(),message:'Explain this',itemId:'internal'}));
});
test('underwriting and pause cannot become an approval',()=>{
 assert.match(guide({snapshot:snap(),message:'Am I approved?'}).reply,/cannot determine/);
 assert.match(guide({snapshot:snap(),message:'What is needed?',paused:true}).reply,/paused/);
});
test('projection allowlists fields and releases reject duplicate ids',()=>{
 const s=snap();s.items[0].staffNote='private';assert(!JSON.stringify(project(s)).includes('private'));
 assert.throws(()=>validateRelease({loanId:DEMO_LOAN,synthetic:true,coverage:true,items:[item,item]}));
});
test('income is decimal arithmetic with evidence and explicit frequency',()=>{
 for(const [amount,frequency,weeklyHours,want] of [['72000','annual',null,'6000.00'],['2000','biweekly',null,'4333.33'],['2000','semimonthly',null,'4000.00'],['25','hourly',40,'4333.33']])assert.equal(monthlyBase({amount,frequency,weeklyHours,evidence:'fixture p1'}).monthly,want);
 assert.equal(monthlyBase({amount:'25',frequency:'hourly',evidence:'p1'}).status,'blocked');
 assert.equal(monthlyBase({amount:'2000',frequency:'unknown',evidence:'p1'}).status,'blocked');
 assert.equal(monthlyBase({amount:'2000',frequency:'monthly'}).status,'blocked');
});
test('gateway refuses missing auth and placeholder URL; mock extracts text',async()=>{
 const request=makeConversationRequest({model:'test-model',message:'Explain checklist',borrowerProjection:project(snap())});
 await assert.rejects(callGateway({url:'https://pm-gateway.<account>.workers.dev',request}));
 await assert.rejects(callGateway({url:'https://gateway.example/',request}));
 let called=false;
 const result=await callGateway({url:'https://gateway.example/',request,authorization:'Bearer synthetic',fetchImpl:async(u,o)=>{called=true;assert.equal(u.pathname,'/anthropic');return new Response(JSON.stringify({content:[{type:'text',text:'Test answer'}]}));}});
 assert(called);assert.equal(result.reply,'Test answer');
});
test('HTTP release to chat, conflict detection, cross-origin rejection and invalidation',async t=>{
 const server=createApp();await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());
 const base='http://127.0.0.1:'+server.address().port;
 const post=(path,b,origin=base)=>fetch(base+'/api/demo/'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({loanId:DEMO_LOAN,...b})});
 assert.equal((await post('release',{expectedRevision:0,synthetic:true,coverage:true,items:[item]},'https://evil.invalid')).status,403);
 assert.equal((await post('release',{expectedRevision:0,synthetic:true,coverage:true,items:[item]})).status,200);
 assert.equal((await post('ask',{revision:0,message:'What is needed?'})).status,409);
 const a=await post('ask',{revision:1,message:'What is needed?'});assert.match((await a.json()).reply,/gift letter/);
 assert.equal((await post('ask',{loanId:'other',revision:1,message:'What is needed?'})).status,404);
 await post('invalidate',{expectedRevision:1});assert.match((await (await post('ask',{revision:2,message:'What is needed?'})).json()).reply,/cannot confirm/);
});
test('both imported screens have syntactically valid inline scripts',async()=>{
 for(const file of ['mia-staff.html','mia-portal.html']){
  const html=await readFile(new URL('../public/'+file,import.meta.url),'utf8');
  for(const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
 }
});
test('staff approval copies full condition state; borrower report supersedes without scanning',async()=>{
 const html=await readFile(new URL('../public/mia-staff.html',import.meta.url),'utf8');
 const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
 const context=vm.createContext({});
 vm.runInContext(scripts.find(s=>s.includes('var STAFF =')),context);
 vm.runInContext(scripts.find(s=>s.includes('var S =')).split('/* ---------- boot ---------- */')[0],context);
 vm.runInContext('buildConditions(); S.conditions.forEach(c=>c.review="reviewed"); S.coverageChecked=true; approveVersion();',context);
 assert.equal(vm.runInContext('activeVersion().allConditions.length',context),26);
 assert.equal(vm.runInContext('activeVersion().items.length',context),10);
 vm.runInContext('S.conditions[0].friendly="changed"; reportGift();',context);
 assert.notEqual(vm.runInContext('activeVersion().items[0].friendly',context),'changed');
 assert.equal(vm.runInContext('activeVersion().superseded',context),true);
 assert.equal(vm.runInContext('giftCond().docProc',context),'awaiting_upload');
});
