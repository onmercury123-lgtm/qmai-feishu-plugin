import './style.css';
import './handoff-contract.js';
import {mountRegions} from './regions.js';
import {createBridge} from './bridge-client.js';
import {names,types,fromSource,storeLines,validate,fingerprint,makePlan} from './model.js';
import {readSelected,readSelectedBatch,watchSelection,watchRecord,writeStatus} from './feishu.js';
import {groupParticipation} from './grouping.js';
import {demo} from './demo.js';

export function mountEditor(host,initialSource,index=0,sharedBridge=null,receiptTarget=null){
const isDemo=new URLSearchParams(location.search).get('demo')==='1';
const members=initialSource.members||[initialSource];let pendingWriteback=[];
const publicSite=import.meta.env.VITE_PUBLIC_SITE==='1';
let selectedRecords=[];
let verified=null,finished=false;const bridge=sharedBridge||createBridge();
let source=null,draft=null,stale=false,busy=false,unwatch=null,saveVersion=0;
const $=id=>id==='execution-result'&&receiptTarget?receiptTarget:host.querySelector('#record-'+index+'-'+id);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const field=(id,label,type='text')=>`<div class="field"><label for="${id}">${label}</label><input id="${id}" name="${id}" type="${type}" autocomplete="off"></div>`;
const select=(id,label,options)=>`<div class="field"><label for="${id}">${label}</label><select id="${id}">${options.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></div>`;
host.innerHTML=`<header><div><h1>活动操作预览</h1>${isDemo?'<span class="header-note">离线演示</span>':''}</div><button class="button primary" id="read">${isDemo?'载入演示':'读取所选'}</button></header>
<main class="is-empty" id="main-content"><section class="read-status"><p id="message" class="status" role="status" aria-live="polite">勾选表格记录后，点击右上方读取所选</p><button class="button ghost" id="connect">检查工作台</button><p id="connection" class="status" hidden></p><div id="loading" class="loading" hidden></div><p class="error" id="error" role="alert"></p></section>
<div class="columns" id="editor" hidden><section class="card"><div class="section-heading"><h2>${escape(initialSource.display.activityName||initialSource.display.activityId)}</h2><span class="section-note">按需修改</span></div>
${members.length>1?'<p class="status">合并 '+members.length+' 条申请</p>':''}<p class="record-scope">${escape(initialSource.display.stores||'范围待确认')}</p><details class="record-settings"><summary>修改活动与范围</summary>${field('activityName','活动名称')}<div class="pair activity-pair">${select('activityType','活动类型',[['','请选择'],...types.map(t=>[t,t])])}${field('activityId','活动 ID')}</div>
<div class="field"><div class="label-row"><label for="stores">门店清单</label><span class="hint" id="count"></span></div><fieldset class="scope-options"><legend class="sr-only">门店选择方式</legend><label><input type="radio" name="scope" value="stores" checked>输入门店</label><label><input type="radio" name="scope" value="region">按区域选择</label></fieldset><textarea id="stores" placeholder="粘贴门店名称、编码或 ID，支持空格、换行、顿号或逗号分隔"></textarea><div id="region-picker" hidden></div></div>
</details><fieldset class="execution"><legend>执行方式</legend><label><input type="radio" name="action" value="exclude" checked><span>立即剔除</span></label><label><input type="radio" name="action" value="restore"><span>立即恢复</span></label></fieldset><p class="error" id="issues"></p><div id="verified-result" hidden></div><label class="check" id="confirm-row" hidden><input id="confirmed" type="checkbox"><span>已核对实际门店与操作</span></label>
<div class="form-actions"><button class="button primary" id="save">核验方案</button></div><p class="status" id="saved" hidden></p><p id="execution-result" class="status" role="status"></p></section>
</div>
<p class="footer">商品工作台 · 0.7</p></main><div id="toast" class="toast" role="status" hidden></div>`.replace(/\b(id|for)="([^" ]+)"/g,(_,attr,id)=>attr+'="record-'+index+'-'+id+'"');
if(receiptTarget)host.querySelector('[id$="-execution-result"]').hidden=true;host.querySelector('header').hidden=true;$('read').hidden=true;$('connect').hidden=true;$('message').hidden=true;host.querySelector('.footer').hidden=true;
const controls=['activityId','activityName','activityType','stores','confirmed'];
const regionPicker=mountRegions($('region-picker'),{onEdit(state){if(!draft)return;draft.regions=state.regions;draft.regionsDirty=state.dirty;invalidateVerification();saveVersion++;render();},onCommit(regions){if(!draft)return;draft.regions=regions;draft.regionsDirty=false;invalidateVerification();saveVersion++;render();}});
function invalidateVerification(){verified=null;finished=false;if(draft)draft.confirmed=false;$('confirmed').checked=false;$('execution-result').textContent='';bridge.invalidate();}

function fail(e){const message=e?.message||String(e);if(receiptTarget)receiptTarget.textContent=message;else $('error').textContent=message;}
function toast(s){$('toast').textContent=s;$('toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').hidden=true,3500);}
function setBusy(on){busy=on;$('loading').hidden=!on;$('read').disabled=on;$('save').disabled=on||!draft;for(const key of controls)$(key).disabled=on;for(const el of host.querySelectorAll('[name=action],[name=scope]'))el.disabled=on;regionPicker.setBusy(on);}
function valuesToControls(){invalidateVerification();regionPicker.reset(draft.regions||[]);for(const el of host.querySelectorAll('[name=scope]'))el.checked=el.value===draft.scope;for(const el of host.querySelectorAll('[name=action]'))el.checked=el.value===(draft.action||'exclude');for(const key of controls){if(key==='confirmed')$(key).checked=draft[key];else $(key).value=draft[key]||'';}}
function render(){if(!source||!draft)return;$('editor').hidden=false;$('main-content').classList.remove('is-empty');
 $('stores').hidden=draft.scope==='region';$('region-picker').hidden=draft.scope!=='region';
 $('count').textContent=verified?`${verified.summary.stores.length} 家 · 已核验`:draft.scope==='region'?(draft.regions?.length&&!draft.regionsDirty?'已确认 · 待核验':'请选择区域'):`${storeLines(draft.stores).length} 项 · 待核验`;
 const errors=validate({...draft,confirmed:true});if(stale)errors.unshift('源需求已变化，请重新读取');$('issues').textContent=errors.join('；');
 $('save').textContent=busy?(verified?'正在执行…':'正在核验…'):verified?(draft.action==='restore'?'确认立即恢复':'确认立即剔除'):'核验方案';
 $('save').disabled=busy||finished||errors.length>0||!!verified&&!draft.confirmed;
 $('confirm-row').hidden=!verified||finished;$('verified-result').hidden=!verified;
 if(verified){const result=verified.summary,total=result.changes.reduce((n,c)=>n+c.changed,0);$('verified-result').innerHTML='<p class="verified-count">'+(draft.action==='restore'?'将恢复 ':'将剔除 ')+total+' 家门店</p><details><summary>查看 '+result.stores.length+' 家实际门店</summary><ul>'+result.stores.map(s=>'<li>'+escape(s.name)+'<small>'+escape(s.code||s.id)+'</small></li>').join('')+'</ul></details>'+(result.warnings.length?'<p class="error">'+result.warnings.map(escape).join('；')+'</p>':'');}
}
function changed(key){if(!draft)return;if(key!=='confirmed')invalidateVerification();draft.action=host.querySelector('[name=action]:checked')?.value||'';draft.scope=host.querySelector('[name=scope]:checked')?.value||'stores';for(const key of controls)draft[key]=key==='confirmed'?$('confirmed').checked:$(key).value;saveVersion++;render();}
for(const key of controls)$(key).addEventListener('input',()=>changed(key));
for(const el of host.querySelectorAll('[name=action],[name=scope]'))el.addEventListener('change',()=>changed());
function invalidate(){if(!source||isDemo)return;stale=true;invalidateVerification();draft.confirmed=false;$('confirmed').checked=false;saveVersion++;$('message').textContent='表格发生变化，保留当前调整供参考，请重新读取需求。';render();}
async function load(){if(busy)return;if(draft&&saveVersion&& !confirm('重新读取会替换当前标准方案，是否继续？'))return;setBusy(true);$('error').textContent='';
 try{selectedRecords=[initialSource];
 const next=selectedRecords[0];unwatch?.();source=next;draft=fromSource(next);stale=false;saveVersion=0;valuesToControls();render();$('saved').textContent='';$('message').textContent=isDemo?'离线演示':`已读取 ${selectedRecords.length} 条申请`;
 if(!isDemo)unwatch=await watchRecord(source.tableId,async()=>{if(busy||finished)return;try{for(const member of members){const latest=await readSelected(member.recordId);if(fingerprint(latest)!==fingerprint(member)){invalidate();break;}}}catch{if(!busy&&!finished)invalidate();}});
 }catch(e){fail(e);}finally{setBusy(false);render();}}
async function ensureFresh(){if(stale)throw Error('源需求已变化，请重新读取。');if(!isDemo){for(const member of members){const latest=await readSelected(member.recordId);if(fingerprint(latest)!==fingerprint(member)){invalidate();throw Error('需求已变化，原预览失效，请重新读取。');}}}}
$('read').onclick=load;
$('connect').onclick=async()=>{if(busy)return;$('connection').hidden=false;$('connect').disabled=true;$('connection').textContent='正在检查本机工作台';try{const r=await fetch('/api/workbench/health');const d=await r.json();$('connection').textContent=d.connected?`工作台在线（${d.version}）；真实核验与执行接口尚未接入插件`:'工作台未连接；仍可编辑标准预览';}catch{$('connection').textContent='本地插件服务不可用，请通过启动文件打开';}finally{$('connect').disabled=false;}};
if(publicSite)$('connect').hidden=true;
async function writeMembers(){if(isDemo){pendingWriteback=[];return '离线演示，未写入表格';}const failed=[],errors=[];for(const member of pendingWriteback){try{await writeStatus(member,draft.action);}catch(e){failed.push(member);errors.push(e.message);}}pendingWriteback=failed;if(errors.length)throw Error(failed.length+' 条回填失败：'+errors[0]);return '已回填 '+members.length+' 条申请';}
async function execute(){
 if(busy||finished)return {status:finished?'skipped':'busy'};
 $('error').textContent='';const errors=validate({...draft,confirmed:true});if(errors.length){fail(Error(errors.join('；')));return {status:'invalid'};}
 const version=saveVersion;let submitting=false;setBusy(true);$('execution-result').textContent='正在核验…';
 try{
  await ensureFresh();await bridge.open();
  const plan=makePlan(source,{...draft,confirmed:true}),p=globalThis.WorkbenchHandoff.validate({version:2,...plan.standard,participationActivities:groupParticipation(source,draft),sourceRecords:members.map(m=>({baseId:m.baseId||'',tableId:m.tableId,recordId:m.recordId,stores:storeLines(m.display.stores)}))});
  const response=await bridge.prepare(p);if(version!==saveVersion)throw Error('方案已变化，请重新执行');await ensureFresh();
  $('execution-result').textContent='核验通过，正在'+(draft.action==='restore'?'恢复':'剔除')+'…';submitting=true;
  const message=await bridge.submit(response.ticket);finished=true;const result=message.result;
  $('execution-result').textContent=result.status==='success'?'已完成':result.status==='partial'?'部分完成，请查看工作台同步记录':result.error||'结果待核实，请查看工作台同步记录';
  if(result.status==='success'){
   try{pendingWriteback=members.slice();const note=await writeMembers();$('execution-result').textContent='已完成 · '+note;}
   catch(error){$('execution-result').textContent='活动已完成，表格回填失败：'+error.message;const retry=document.createElement('button');retry.type='button';retry.className='button';retry.textContent='仅重试回填';$('execution-result').append(document.createElement('br'),retry);retry.onclick=async()=>{retry.disabled=true;try{const note=await writeMembers();$('execution-result').textContent='已完成 · '+note;}catch(e){fail(e);retry.disabled=false;}};}
  }
  return {status:result.status==='success'?'success':'uncertain'};
 }catch(e){if(submitting)finished=true;fail(e);$('execution-result').textContent=(submitting?'结果待核实，未自动重试，请查看同步记录：':'核验失败，未提交：')+e.message;return {status:submitting?'uncertain':'invalid'};}
 finally{setBusy(false);render();}
}
$('save').hidden=true;host.querySelector('.form-actions').hidden=true;
load();return {dispose(){unwatch?.();bridge.invalidate();regionPicker.dispose?.();host.querySelectorAll('dialog').forEach(d=>d.remove());},execute,isFinished:()=>finished,isBusy:()=>busy,isDirty:()=>!!saveVersion};
}

