import './style.css';
import {createBridge} from './bridge-client.js';
import {mountEditor} from './editor.js';
import {readSelectedBatch} from './feishu.js';
import {groupRecords} from './grouping.js';
import {demo} from './demo.js';
const isDemo=new URLSearchParams(location.search).get('demo')==='1';
const app=document.getElementById('app');
app.innerHTML='<header><div class="preview-heading-row"><div class="preview-title"><span class="page-heading-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></span><h1>操作预览</h1></div><button type="button" class="button read-button" id="read"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#ffc447" stroke="#a86413" stroke-width="1.25" stroke-linejoin="round" d="M10 4l2.2 6.8L19 13l-6.8 2.2L10 22l-2.2-6.8L1 13l6.8-2.2Z M19 1l1.1 3.4L23.5 5.5l-3.4 1.1L19 10l-1.1-3.4L14.5 5.5l3.4-1.1Z"/></svg>读取所选</button></div><div class="preview-status-area"><p class="status" id="batch-status" role="status"></p></div></header><main><div id="record-list"></div><div id="batch-receipts" hidden></div><div class="batch-actions" id="batch-actions" hidden><p class="status" id="batch-progress" role="status" aria-live="polite"></p><div id="writeback-retry"></div><button type="button" class="button primary" id="execute-batch"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="10" cy="10" r="7.5"/><path d="m8 6.5 5 3.5-5 3.5Z" fill="currentColor" stroke="none"/></svg>去执行</button></div></main><p class="plugin-version">0.14.1</p>';

const read=document.getElementById('read'),status=document.getElementById('batch-status'),error=document.getElementById('batch-progress'),list=document.getElementById('record-list');let editors=[],loading=false,running=false;const bridge=createBridge();const receipts=document.getElementById('batch-receipts'),retryArea=document.getElementById('writeback-retry');const batch=document.getElementById('batch-actions'),execute=document.getElementById('execute-batch'),progress=document.getElementById('batch-progress');
async function load(){
 if(running||loading||editors.some(e=>e.isBusy()))return;
 if(editors.some(e=>e.isDirty())&&!confirm('重新读取会替换当前调整，是否继续？'))return;
 loading=true;read.disabled=true;read.setAttribute('aria-busy','true');error.textContent='';retryArea.replaceChildren();
 try{
  const records=isDemo?[structuredClone(demo),{...structuredClone(demo),recordId:'demo-second',display:{...demo.display,activityName:'总部-第二条活动示例',stores:'Y801019885'}}]:await readSelectedBatch();
  editors.forEach(e=>e.dispose());editors=[];list.replaceChildren();receipts.replaceChildren();receipts.hidden=true;progress.textContent='';
  const groups=groupRecords(records);groups.forEach((record,index)=>{const host=document.createElement('form');host.className='record-editor';host.onsubmit=e=>e.preventDefault();list.append(host);const receipt=document.createElement('div');receipt.className='receipt-row';receipt.hidden=true;const name=document.createElement('strong');name.textContent=record.display.activityName||record.display.activityId||'申请 '+(index+1);const result=document.createElement('p');result.className='status';result.setAttribute('role','status');receipt.append(name,result);receipts.append(receipt);editors.push(mountEditor(host,record,index,bridge,result));});
  status.classList.toggle('has-records',records.length>0);batch.hidden=!records.length;execute.disabled=false;status.textContent=(isDemo?'离线演示 · ':'')+'已读取 '+records.length+' 条申请 · '+groups.length+' 个执行任务';
 }catch(e){batch.hidden=false;error.textContent=e.message;}finally{loading=false;read.disabled=false;read.removeAttribute('aria-busy');}
}
read.onclick=load;if(isDemo)load();

execute.onclick=async()=>{
 if(running||loading)return;running=true;read.disabled=true;execute.disabled=true;error.textContent='';
 let connected;try{connected=bridge.open();connected.catch(()=>{});}catch(e){error.textContent=e.message;running=false;read.disabled=false;execute.disabled=false;return;}
 list.inert=true;receipts.hidden=true;retryArea.replaceChildren();progress.textContent='正在连接本机后台…';let done=0,failed=0;
 try{await connected;bridge.startBatch?.();for(let i=0;i<editors.length;i++){
  receipts.children[i].hidden=false;progress.textContent='正在处理 '+(i+1)+' / '+editors.length;const result=await editors[i].execute();
  if(result.status==='success'||result.status==='skipped')done++;else failed++;
  if(result.status==='uncertain'){error.textContent='执行结果待核实，剩余记录未执行，请查看工作台同步记录。';break;}
 }if(!error.textContent||error.textContent.startsWith('正在')){const failure=[...receipts.querySelectorAll('.receipt-row')].find(row=>{const message=row.querySelector('p').textContent;return message&&!message.startsWith('已完成');});const reason=failure?.querySelector('p').textContent.replace(/\s+/g,' ').trim();progress.textContent='已完成 '+done+' 个任务'+(failed?'，未完成 '+failed+' 个任务':'')+(reason?'；'+reason:'');}const details=receipts.textContent;progress.title=details;if(details.includes('表格回填失败')){const row=[...receipts.querySelectorAll('.receipt-row p')].find(p=>p.textContent.includes('表格回填失败'));progress.textContent=row.textContent.replace('仅重试回填','').replace(/\s+/g,' ').trim();}for(const button of receipts.querySelectorAll('button')){const row=button.closest('.receipt-row');const retry=button.onclick;button.onclick=async()=>{await retry();progress.textContent=row.querySelector('p').textContent.split('\n')[0];};retryArea.append(button);}}
 catch(e){progress.textContent='未执行：'+(e.message||String(e));}
 finally{await bridge.endBatch?.().catch(()=>{});running=false;list.inert=false;read.disabled=false;execute.disabled=editors.every(e=>e.isFinished());}
};
