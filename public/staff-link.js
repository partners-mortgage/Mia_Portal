(function(){
 const demoLoan='ln_7fa2',opp='opp_9d31c7';
 let revision=0,chain=Promise.resolve(),fingerprint='',status='Connecting to local test service',syncFailed=false;
 const originalRender=render,originalLoan=viewLoan,originalBind=bind;
 async function post(path,data){
  const r=await fetch('/api/demo/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,loanId:opp,expectedRevision:revision})});
  const b=await r.json();if(!r.ok)throw Error(b.error);revision=b.revision;return b;
 }
 function paint(){const e=document.getElementById('integrationStatus');if(e)e.textContent=status;}
 function queue(path,data){
  chain=chain.then(()=>post(path,data)).then(()=>{syncFailed=false;status='Shared local revision '+revision+'. No external messages sent.';paint();}).catch(e=>{syncFailed=true;status='Not synced: '+e.message;paint();});return chain;
 }
 function panel(){
  if(S.loanId!==demoLoan||S.view!=='loan')return;
  const p=el('section','card');p.id='miaIntegration';
  p.innerHTML='<h2>Connected local test</h2><p class="small">Claude fixture B: 10 borrower requests, one hold, 15 internal or third-party conditions. This differs from original Source A. It is a fictional test, not a parsing result.</p><p id="integrationStatus" role="status"></p><div class="rowflex"><button id="reviewDemoAll" class="ghost sm">Mark fictional items reviewed</button><button id="shareDemo" class="sm">Share approved checklist with test portal</button><a href="mia-portal.html" target="_blank" rel="noopener">Open borrower test portal</a></div><p class="tiny muted">No production login, storage, GHL send, document upload or live AI. Data resets on server restart. Do not enter real borrower information.</p>';
  document.getElementById('view').prepend(p);paint();
  document.getElementById('reviewDemoAll').disabled=!can('review')||!S.imported;
  document.getElementById('reviewDemoAll').onclick=()=>{S.conditions.forEach(c=>{c.review='reviewed';});logEvent('Synthetic review','Fictional fixture reviewed for local test only.');render();};
  const av=activeVersion(),button=document.getElementById('shareDemo');button.disabled=!av||av.superseded||av.loanId!==demoLoan||!can('release')||syncFailed;
  button.onclick=async()=>{
   button.disabled=true;await chain;const v=activeVersion();if(!v||v.superseded||!can('release')||syncFailed)return;
   const items=v.items.filter(c=>!c.hold&&c.audience==='borrower').map(c=>({id:c.cid,t:c.friendly,why:c.friendly,state:c.collection,fix:c.components.filter(k=>k.reopened).map(k=>k.reason).join('; ')}));
   await queue('release',{synthetic:true,coverage:true,items});
  };
 }
 viewLoan=function(){if(S.loanId!==demoLoan){const d=el('div','card');d.innerHTML='<h1>'+esc(loan().ref)+'</h1><p>No connected checklist, document or income fixture exists for this loan. Canary records are not shown here.</p>';return d;}return originalLoan();};
 render=function(){
  const next=JSON.stringify(S.conditions);
  if(fingerprint&&next!==fingerprint){supersede('checklist or receipt changed');queue('invalidate',{});}
  fingerprint=next;originalRender();panel();incomeWorkbench();
 };
 const originalApprove=approveVersion;
 approveVersion=function(){originalApprove();fingerprint=JSON.stringify(S.conditions);};
 bind=function(){originalBind();const btn=document.getElementById('toggleAi');if(btn)btn.onclick=()=>{S.aiPause=!S.aiPause;queue('pause',{paused:S.aiPause});render();};};
 function incomeWorkbench(){
  if(S.view!=='loan'||S.loanId!==demoLoan||S.tab!=='income')return;
  const p=el('section','card');p.innerHTML='<h2>Income arithmetic workbench</h2><p class="small">Fictional numbers only. This computes base-pay arithmetic, not qualifying income or a pre-approval. It does not add employers together or include overtime, bonus or commission.</p><form id="incomeCalc"><label>Gross base amount <input id="baseAmount" value="2000.00" required></label><label>Pay frequency <select id="payFrequency"><option value="annual">Annual</option><option value="monthly">Monthly</option><option value="biweekly" selected>Biweekly</option><option value="semimonthly">Semimonthly</option><option value="weekly">Weekly</option><option value="hourly">Hourly</option></select></label><label>Documented weekly hours (hourly only) <input id="weeklyHours" placeholder="Do not assume 40"></label><label>Fictional source reference <input id="incomeEvidence" value="Synthetic paystub, page 1" required></label><button>Calculate preliminary monthly base</button></form><p id="incomeResult" role="status"></p>';
  document.getElementById('view').prepend(p);
  document.getElementById('incomeCalc').onsubmit=async e=>{e.preventDefault();const output=document.getElementById('incomeResult');try{
   const r=await fetch('/api/demo/income',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({loanId:opp,amount:document.getElementById('baseAmount').value,frequency:document.getElementById('payFrequency').value,weeklyHours:document.getElementById('weeklyHours').value||undefined,evidence:document.getElementById('incomeEvidence').value})});const b=await r.json();if(!r.ok)throw Error(b.error);output.textContent=b.status==='blocked'?'Blocked: '+b.reason:'Preliminary monthly base: $'+b.monthly+'. Rule '+b.rule+'. Authorized review required. No eligibility determination.';
  }catch(err){output.textContent='Calculation unavailable: '+err.message;}};
 }
 fetch('/api/demo/checklist').then(r=>{if(!r.ok)throw Error();return r.json();}).then(b=>{revision=b.revision;S.aiPause=b.paused;status='Local service ready. Review and release a fictional checklist.';render();}).catch(()=>{syncFailed=true;status='Start the local Mia server to enable sharing. Static preview only.';render();});
})();
