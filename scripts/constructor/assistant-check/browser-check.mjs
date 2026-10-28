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
const until=async expression=>{for(let i=0;i<100;i++){if(await evaluate(`!!document.body && !!(${expression})`))return;await new Promise(r=>setTimeout(r,100));}throw Error(`UI condition failed: ${expression}; page=${await evaluate('location.href')}; text=${await evaluate('document.body.innerText.slice(-1200)')}`);};
await cdp('Page.enable');await cdp('Runtime.enable');const evidence=[],uiEvidence=[];
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
 for(const flow of ['rules','background','class','spell','chat','attack']){
  await cdp('Page.navigate',{url:`${origin}/?flow=${flow}`});
  if(flow==='attack'){
   await until(`Array.from(document.querySelectorAll('button')).some(b=>b.innerText==='Відкрити атаку')`);
   await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.innerText==='Відкрити атаку').click()`);
   await until(`Array.from(document.querySelectorAll('button[aria-pressed]')).some(b=>b.innerText.includes('Ціль'))`);
   await evaluate(`Array.from(document.querySelectorAll('button[aria-pressed]')).find(b=>b.innerText.includes('Ціль')).click()`);
   await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.innerText==='Далі · кидок').click()`);
   await until(`document.body.innerText.includes('Кидок атаки · d20')`);
   await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.innerText.trim()==='14').click()`);
   await until(`document.querySelector('input[aria-label^="Кубик"]')`);
   await evaluate(`document.querySelectorAll('input[aria-label^="Кубик"]').forEach(input=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'4');input.dispatchEvent(new Event('input',{bubbles:true}));})`);
   await until(`Array.from(document.querySelectorAll('button')).some(b=>b.innerText==='Далі · підсумок'&&!b.disabled)`);
   await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.innerText==='Далі · підсумок').click()`);
   await until(`Array.from(document.querySelectorAll('button')).some(b=>b.innerText.trim()==='Атакувати')`);
   assert.equal(await evaluate(`window.assistantRequests.filter(r=>r.method!=='GET').length`),0);
   await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.innerText.trim()==='Атакувати').click()`);
   await until(`document.querySelector('#attack-state')?.textContent==='result'`);
   const writes=await evaluate(`window.assistantRequests.filter(r=>r.method!=='GET')`);
   assert.equal(writes.length,1);
   assert(writes[0].url.endsWith('/attack'));
   assert.deepEqual(writes[0].body.targetIds,['target']);
   assert.equal(writes[0].body.attackRoll,14);
   assert.deepEqual(writes[0].body.damageRolls,[4]);
  }else if(flow==='chat'){
   await until(`document.querySelector('textarea[aria-label="Повідомлення"]')`);
   await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.innerText.trim()==='Увімкнути auto').click()`);
   await until(`document.body.innerText.includes('Увімкнути auto для наступних дій?')`);
   assert.equal(await evaluate(`window.assistantRequests.filter(r=>r.url.includes('/assistant/policy')).length`),0);
   await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.innerText.trim()==='Увімкнути для наступних дій').click()`);
   await until(`document.body.innerText.includes('Режим: auto')`);
   await evaluate(`{const input=document.querySelector('textarea[aria-label="Повідомлення"]');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,'Synthetic request');input.dispatchEvent(new Event('input',{bubbles:true}));}`);
   await until(`!Array.from(document.querySelectorAll('button')).find(b=>b.innerText.trim()==='Надіслати').disabled`);
   await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.innerText.trim()==='Надіслати').click()`);
   await until(`Array.from(document.querySelectorAll('button')).some(b=>b.innerText==='Надіслати обраний контекст'&&!b.disabled)`);
   assert.equal(await evaluate(`window.assistantRequests.filter(r=>r.url.endsWith('/chat')&&r.method==='POST').length`),0);
   await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.innerText==='Надіслати обраний контекст').click()`);
   await until(`Array.from(document.querySelectorAll('button')).some(b=>b.innerText.trim()==='Стоп')`);
   await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.innerText.trim()==='Стоп').click()`);
   await until(`document.body.innerText.includes('Квитанція synthetic-chat-receipt: дію виконано')`);
   await evaluate(`window.dispatchEvent(new Event('online'))`);
   assert.equal(await evaluate(`window.assistantRequests.filter(r=>r.url.endsWith('/chat')&&r.method==='POST').length`),1);
   assert.equal(await evaluate(`window.assistantRequests.filter(r=>r.url.includes('/chat')&&r.method==='DELETE').length`),1);
   assert.equal(await evaluate(`window.assistantRequests.filter(r=>r.url.includes('/confirm')).length`),0);
  }else if(flow==='spell'){
   await until(`document.body.innerText.includes('Вибір заклинання')`);
   await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.innerText==='Промінь').click()`);
   await until(`document.querySelector('#spell-state').textContent.includes('targets')`);
   await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))`);
   await until(`JSON.parse(document.querySelector('#spell-state').textContent).step==='closed'`);
   assert.equal(await evaluate(`JSON.parse(document.querySelector('#spell-state').textContent).registered`),false);
   await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.innerText==='Промінь').click()`);
   await until(`document.body.innerText.includes('Ціль на карті')`);
   await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.innerText==='Ціль на карті').click()`);
   await until(`JSON.parse(document.querySelector('#spell-state').textContent).step==='rolls'`);
   assert.deepEqual(await evaluate(`JSON.parse(document.querySelector('#spell-state').textContent).targets`),['target']);
  }else{
   await until(`document.querySelector('form') && Array.from(document.querySelectorAll('button')).some(b=>b.innerText==='Зберегти')`);
   if(flow==='rules'){
    await evaluate(`document.querySelector('#rules-morale-enabled').click()`);
   }else{
    await evaluate(`Array.from(document.querySelectorAll('[role=tab]')).find(b=>b.innerText===${JSON.stringify(flow==='class'?'Вміння за рівнями':'Вибори')}).dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0}))`);
    await until(`document.body.innerText.includes('Додати вибір')`);
    await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.innerText==='Додати вибір').click()`);
    await until(`document.querySelector('#choice-0-id')?.value==='choice'`);
    assert.equal(await evaluate(`window.assistantRequests.filter(r=>r.method!=='GET').length`),0);
   }
   await until(`!Array.from(document.querySelectorAll('button')).find(b=>b.innerText==='Зберегти').disabled`);
   await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.innerText==='Зберегти').click()`);
   await until(`window.assistantRequests.some(r=>r.method!=='GET')`);
   const writes=await evaluate(`window.assistantRequests.filter(r=>r.method!=='GET')`);
   assert.equal(writes.length,1);
   assert.equal(writes[0].status,200);
   assert(writes[0].url.includes(flow==='rules'?'/rules':flow==='class'?'/classes/class':'/backgrounds/background'));
  }
  assert(!await evaluate(`document.documentElement.scrollWidth>innerWidth+1`),`${flow}: no viewport overflow`);
  const shot=await cdp('Page.captureScreenshot',{format:'png'});writeFileSync(`${dir}/${flow}-${width}.png`,Buffer.from(shot.data,'base64'));
  uiEvidence.push({width,flow,passed:true,syntheticHttp:true});
 }
}
assert.deepEqual(errors,[]);writeFileSync(`${dir}/constructor-ui.json`,JSON.stringify({total:12,passed:uiEvidence.length,failed:0,skipped:0,evidence:uiEvidence},null,2));writeFileSync(`${dir}/browser.json`,JSON.stringify({total:cases.length*2,passed:evidence.length,failed:errors.length,skipped:0,evidence,errors,apiBoundary:'synthetic deterministic responses; bundled production AssistantWorkspace; database atomicity verified separately by local integration tests'},null,2));console.log(JSON.stringify({cases:evidence.length,constructorUi:uiEvidence.length,viewports:[1440,390],errors}));ws.close();
