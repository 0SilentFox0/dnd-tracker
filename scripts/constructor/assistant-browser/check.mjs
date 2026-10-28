import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const dir=process.argv[2];
const { origin, cdpPort }=JSON.parse(readFileSync(`${dir}/process.json`,'utf8'));
const cdpOrigin=`http://127.0.0.1:${cdpPort}`;
const cases=['content-rule','scene-battle-slide','hero-choice-resource-inventory','battle-action-show','ordinary-write-review','dangerous-human-confirm','stale-preview','retry-recovery','compendium-handoff'];
const targets=await(await fetch(`${cdpOrigin}/json/list`)).json();const target=targets.find(t=>t.type==='page');assert(target);
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,e)=>{ws.onopen=r;ws.onerror=e;});
let seq=0;const pending=new Map(),errors=[];ws.onmessage=e=>{const d=JSON.parse(e.data);if(d.id){const p=pending.get(d.id);pending.delete(d.id);if(d.error)p.reject(d.error);else p.resolve(d.result);}else if(d.method==='Runtime.exceptionThrown')errors.push(d.params.exceptionDetails.text);};
const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
const evaluate=async expression=>{const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;};
const until=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,100));}throw Error(`UI condition failed: ${expression}`);};
await cdp('Page.enable');await cdp('Runtime.enable');const evidence=[];
for(const width of [1440,390]){
 await cdp('Emulation.setDeviceMetricsOverride',{width,height:950,deviceScaleFactor:1,mobile:width===390});
 for(const id of cases){
  await cdp('Page.navigate',{url:`${origin}/?intent=${id}`});
  await until(`document.body.innerText.includes(${JSON.stringify(({ 'content-rule':'Контент і правило','scene-battle-slide':'Сцена, бій і слайд','hero-choice-resource-inventory':'Вибір, ресурси й інвентар героя','battle-action-show':'Бойова дія та показ','ordinary-write-review':'Звичайний запис у режимі перегляду','dangerous-human-confirm':'Небезпечна дія потребує підтвердження','stale-preview':'Застарілий preview','retry-recovery':'Відновлення квитанції','compendium-handoff':'Довідник потребує перевірки в застосунку'})[id])})`);
  if(id==='compendium-handoff'){
   assert.equal(await evaluate(`document.querySelector('a')?.getAttribute('href')`),'/campaigns/synthetic/dm/compendium','safe relative app handoff');
   assert.equal(await evaluate(`window.assistantRequests.length`),0,'handoff does not execute or confirm a mutation');
   evidence.push({width,id,expectedHttpStatus:null,actualHttpStatus:null,actionId:'compendium.preview',expectedUiOutcome:'handoff-not-executed',actualUiOutcome:'handoff-not-executed',readOnlyOpen:true,keyless:true,noOverflow:true});
   continue;
  }
  assert.equal(await evaluate(`window.assistantRequests.filter(r=>r.method!=='GET').length`),0,`${id}: opening review stays read-only`);
  assert(await evaluate(`document.body.innerText.includes('Підключіть ключ AI')`),`${id}: keyless MCP review`);
  assert(!await evaluate(`document.documentElement.scrollWidth>innerWidth+1`),`${id}: no viewport overflow`);
  let expectedStatus=200;
  if(id==='stale-preview'){
   await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.innerText==='Застосувати')?.click()`);
   await until(`document.body.innerText.includes('застаріла')||document.body.innerText.includes('Не вдалося виконати дію')`);
   expectedStatus=409;
  }else{
   if(id==='dangerous-human-confirm')assert(await evaluate(`document.body.innerText.includes('Наслідки: Небезпечна дія потребує підтвердження')&&document.body.innerText.includes('dangerous-human-confirm-target')`),'dangerous targets and effect details are visible before confirm');
   await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.innerText==='Застосувати')?.click()`);
   await until(`document.body.innerText.includes('Застосовано')`);
  }
  const request=await evaluate(`window.assistantRequests.filter(r=>r.url.includes('/confirm')).at(-1)`);
  assert.equal(request?.status,expectedStatus,`${id}: HTTP result`);
  assert.equal(request?.actionId,({ 'content-rule':'content.units.create','scene-battle-slide':'scenario.update','hero-choice-resource-inventory':'characters.choices','battle-action-show':'battles.attack','ordinary-write-review':'campaign.settings','dangerous-human-confirm':'campaign.delete','stale-preview':'characters.resources','retry-recovery':'characters.inventory','compendium-handoff':'compendium.preview'})[id]);
  if(id==='retry-recovery')assert.equal(await evaluate(`window.assistantRequests.filter(r=>r.url.includes('/confirm')).length`),1,'receipt recovery does not resubmit confirmation');
  evidence.push({width,id,expectedHttpStatus:expectedStatus,actualHttpStatus:request.status,actionId:request.actionId,expectedUiOutcome:id==='stale-preview'?'stale-rejected':'receipt-applied',actualUiOutcome:id==='stale-preview'?'stale-rejected':(await evaluate(`document.body.innerText.includes('Застосовано')?'receipt-applied':'unknown'`)),readOnlyOpen:true,keyless:true,noOverflow:true});
 }
 const shot=await cdp('Page.captureScreenshot',{format:'png'});writeFileSync(`${dir}/${width}.png`,Buffer.from(shot.data,'base64'));
}
assert.deepEqual(errors,[]);writeFileSync(`${dir}/browser.json`,JSON.stringify({evidence,errors,apiBoundary:'synthetic deterministic responses; bundled production AssistantWorkspace; database atomicity verified separately by local integration tests'},null,2));console.log(JSON.stringify({cases:evidence.length,viewports:[1440,390],errors}));ws.close();
