(function(){
 let revision=0,activeSnapshot=null,selectedItem=null,requestSerial=0;
 const originalRender=render,map={needed:'needed',waiting:'needed',reported:'await',uploaded:'await',correction:'fix',received:'got'};
 LOANS.forEach(l=>{l.items=[];l.folders={};});
 function note(t){const n=document.getElementById('sharedStatus');if(n)n.textContent=t;}
 async function refresh(){
  try{const r=await fetch('/api/demo/checklist');if(!r.ok)throw Error();const b=await r.json();revision=b.revision;activeSnapshot=b.snapshot;
   LOANS[0].items=b.snapshot?b.snapshot.items.map(i=>({...i,state:map[i.state]})):[];render();
  }catch{activeSnapshot=null;LOANS[0].items=[];render();note('Local service unavailable. Checklist and Ask Mia cannot be verified.');}
 }
 function attach(){
  if(!P.authed)return;
  const card=el('section','card');card.innerHTML='<h2>Shared checklist</h2><p id="sharedStatus" role="status"></p><button id="refreshShared" class="ghost sm">Refresh released checklist</button>';
  document.getElementById('view').prepend(card);document.getElementById('refreshShared').onclick=refresh;
  note(L().opp==='opp_9d31c7'?(activeSnapshot?'Local released checklist v'+activeSnapshot.version+'. Refresh after staff changes.':'No current released checklist. Staff must review and release it.'):'No checklist connected for this closed loan.');
  document.querySelectorAll('[data-ask]').forEach(n=>{n.onclick=()=>open(n.getAttribute('data-ask'));});
  document.querySelectorAll('button').forEach(n=>{if(/Ask Mia a question|Ask for help with an item/.test(n.textContent))n.onclick=()=>open(null);});
  document.querySelectorAll('[data-up]').forEach(n=>{n.textContent='Real upload not connected';n.disabled=true;n.onclick=null;});
  ['shareBtn','unshare'].forEach(id=>{const n=document.getElementById(id);if(n){n.disabled=true;n.title='Agent identity, consent and revocation backend not connected';n.onclick=null;}});
 }
 render=function(){originalRender();attach();};
 function open(itemId){
  requestSerial++;selectedItem=itemId;let d=document.getElementById('miaChat');if(d)d.remove();
  d=document.createElement('dialog');d.id='miaChat';d.className='mia-chat';
  d.innerHTML='<form method="dialog"><button class="ghost sm" aria-label="Close Ask Mia">Close</button></form><h2>Ask Mia</h2><p class="tiny muted">Local guide, not live AI. Fictional test only. No message reaches GHL or your loan team. Do not enter real personal or financial information.</p><p id="miaContext"></p><div id="miaTranscript" role="log" aria-live="polite"></div><form id="miaAskForm"><label for="miaQuestion">Your question</label><textarea id="miaQuestion" maxlength="2000" rows="3" required></textarea><button id="miaSend">Ask Mia</button></form>';
  document.body.append(d);d.showModal();
  document.getElementById('miaContext').textContent=selectedItem?L().items.find(i=>i.id===selectedItem)?.t||'Checklist item':'Selected loan: '+L().ref;
  const input=document.getElementById('miaQuestion');input.value=selectedItem?'What do I need for this item?':'';input.focus();
  d.addEventListener('close',()=>{requestSerial++;d.remove();});
  document.getElementById('miaAskForm').onsubmit=async e=>{
   e.preventDefault();const loanId=L().opp,serial=++requestSerial,question=input.value.trim();if(!question)return;
   const transcript=document.getElementById('miaTranscript');transcript.append(el('p',null,'You: '+question));input.value='';document.getElementById('miaSend').disabled=true;
   try{
    const r=await fetch('/api/demo/ask',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(10000),body:JSON.stringify({loanId,revision,message:question,itemId:selectedItem})});
    const b=await r.json();if(!r.ok)throw Error(b.error);if(serial!==requestSerial)return;
    transcript.append(el('p','mia-answer','Mia local guide: '+b.reply));
   }catch(err){if(serial===requestSerial)transcript.append(el('p','mia-answer','Not answered: '+err.message+' Close this window and refresh the checklist.'));}
   finally{if(serial===requestSerial&&document.getElementById('miaSend'))document.getElementById('miaSend').disabled=false;}
  };
 }
 refresh();
})();
