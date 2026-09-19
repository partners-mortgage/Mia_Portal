// Local synthetic integration only. This is not an authorization service.
export const DEMO_LOAN='opp_9d31c7';
export const MAX_AGE_MS=24*60*60*1000;
const states=new Set(['needed','waiting','reported','uploaded','correction','received']);
export function project(snapshot){
 if(!snapshot||snapshot.superseded) return null;
 return {version:snapshot.version,releasedAt:snapshot.releasedAt,items:snapshot.items.map(i=>({id:i.id,t:i.t,why:i.why,state:i.state,fix:i.fix||''}))};
}
export function validateRelease(body){
 if(body.loanId!==DEMO_LOAN||body.synthetic!==true||body.coverage!==true||!Array.isArray(body.items)||body.items.length>100) throw Error('Invalid synthetic release');
 const ids=new Set();
 return body.items.map(i=>{
  if(typeof i.id!=='string'||ids.has(i.id)||!/^cond_\d{3}$/.test(i.id)||!states.has(i.state)||typeof i.t!=='string'||!i.t.trim()||i.t.length>2500||typeof i.why!=='string'||i.why.length>2500||typeof (i.fix||'')!=='string'||(i.fix||'').length>1500) throw Error('Invalid checklist item');
  ids.add(i.id);return {id:i.id,t:i.t,why:i.why,state:i.state,fix:i.fix||''};
 });
}
export function guide({snapshot,message,itemId,paused=false,now=Date.now()}){
 if(typeof message!=='string'||!message.trim()||message.length>2000) throw Error('Enter a question of 1 to 2000 characters');
 const base={mode:'local-guide',isAI:false,version:snapshot?.version||null,reply:''};
 const answer=reply=>({...base,reply});
 if(paused)return answer('Mia is paused for this local test. No request was sent to your loan team.');
 if(/\b(rate|qualif|approve|eligible|pre.?approv|afford|income|denied|waiv)/i.test(message))return answer('Your loan officer needs to review that question. I cannot determine eligibility, approve a loan, quote a rate or waive a requirement. This local test has not notified anyone.');
 if(/\b(call|callback|human|speak|contact|katie|dereck)\b/i.test(message))return answer('What time would you prefer for a callback? A team member still needs to confirm it. This local test has not booked a call or notified anyone.');
 if(!snapshot||snapshot.superseded||!Number.isFinite(Date.parse(snapshot.releasedAt))||now-Date.parse(snapshot.releasedAt)>MAX_AGE_MS)return answer('I cannot confirm your remaining items from the current information. Your team needs to review and release an up-to-date checklist.');
 const item=itemId?snapshot.items.find(i=>i.id===itemId):null;
 if(itemId&&!item)throw Error('Item is not on the current released checklist');
 if(/\b(uploaded|sent|submitted|finished|done)\b/i.test(message))return answer('Thank you for the update. Saying an item was sent does not verify receipt. Your team still needs to check it. No upload or receipt status was changed by this message.');
 if(item){
  const status={received:'The team marked this item received. That is not underwriting clearance.',reported:'You reported this item uploaded; staff has not verified receipt.',uploaded:'Uploaded and awaiting staff review.',correction:'The team requested a correction: '+item.fix,needed:'Your released checklist requests this item.',waiting:'Your released checklist requests this item.'}[item.state];
  return answer(status+'\n\n'+(item.state==='correction'&&item.fix?item.fix:item.why)+'\n\nThis is a fictional test. Do not upload real documents here.');
 }
 if(/\b(list|needs?|needed|remaining|outstanding|checklist|status)\b/i.test(message)){
  const open=snapshot.items.filter(i=>['needed','waiting','correction'].includes(i.state));
  const review=snapshot.items.filter(i=>['reported','uploaded'].includes(i.state));
  return answer((open.length?'Your released checklist lists:\n'+open.map(i=>'• '+(i.state==='correction'?i.fix||i.t:i.t)).join('\n'):'No items are currently marked for collection on this released checklist. This is not loan approval.')+(review.length?'\n\n'+review.length+' item(s) still await receipt verification.':'')+'\n\nFictional test only.');
 }
 return answer('I can show your released needs list, explain a selected checklist item, or explain receipt status. This local guide is not connected to a live AI provider yet. For other questions, your loan team will need to help; nobody has been notified by this test.');
}
