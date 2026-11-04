import './style.css';
import {createBridge} from './bridge-client.js';
import {mountEditor} from './editor.js';
import {readSelectedBatch} from './feishu.js';
import {demo} from './demo.js';
const isDemo=new URLSearchParams(location.search).get('demo')==='1';
const app=document.getElementById('app');
app.innerHTML='<header><div><span class="page-heading-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M16 3v4M8 3v4M4 11h16M8 15h8M8 18h5"/></svg></span><h1>活动操作预览</h1></div><button type="button" class="button read-button" id="read">读取所选</button></header><main><p class="status" id="batch-status" role="status">勾选表格记录后，点击读取所选</p><p class="error" id="batch-error" role="alert"></p><div id="record-list"></div><section class="batch-actions" id="batch-actions" hidden><p class="status" id="batch-progress" role="status">按各条执行方式处理全部记录</p><button type="button" class="button primary" id="execute-batch">执行全部</button></section><p class="footer">商品工作台 · 0.11.1</p></main>';
const read=document.getElementById('read'),status=document.getElementById('batch-status'),error=document.getElementById('batch-error'),list=document.getElementById('record-list');let editors=[],loading=false,running=false;const bridge=createBridge();const batch=document.getElementById('batch-actions'),execute=document.getElementById('execute-batch'),progress=document.getElementById('batch-progress');
async function load(){
 if(running||loading||editors.some(e=>e.isBusy()))return;
 if(editors.some(e=>e.isDirty())&&!confirm('重新读取会替换当前调整，是否继续？'))return;
 loading=true;read.disabled=true;error.textContent='';
 try{
  const records=isDemo?[structuredClone(demo),{...structuredClone(demo),recordId:'demo-second',display:{...demo.display,activityName:'总部-第二条活动示例',stores:'Y801019885'}}]:await readSelectedBatch();
  editors.forEach(e=>e.dispose());editors=[];list.replaceChildren();
  records.forEach((record,index)=>{const host=document.createElement('form');host.className='record-editor';host.onsubmit=e=>e.preventDefault();list.append(host);editors.push(mountEditor(host,record,index,bridge));});
  status.classList.toggle('has-records',records.length>0);batch.hidden=!records.length;execute.disabled=false;status.textContent=(isDemo?'离线演示 · ':'')+'已读取 '+records.length+' 条申请';
 }catch(e){error.textContent=e.message;}finally{loading=false;read.disabled=false;}
}
read.onclick=load;if(isDemo)load();

execute.onclick=async()=>{
 if(running||loading)return;running=true;read.disabled=true;execute.disabled=true;error.textContent='';
 let connected;try{connected=bridge.open();connected.catch(()=>{});}catch(e){error.textContent=e.message;running=false;read.disabled=false;execute.disabled=false;return;}
 list.inert=true;let done=0,failed=0;
 try{await connected;for(let i=0;i<editors.length;i++){
  progress.textContent='正在处理 '+(i+1)+' / '+editors.length;const result=await editors[i].execute();
  if(result.status==='success'||result.status==='skipped')done++;else failed++;
  if(result.status==='uncertain'){error.textContent='执行结果待核实，剩余记录未执行，请查看工作台同步记录。';break;}
 }progress.textContent='已完成 '+done+' 条'+(failed?' · 未完成 '+failed+' 条':'');}
 catch(e){error.textContent=e.message;progress.textContent='未执行，请检查工作台连接';}
 finally{running=false;list.inert=false;read.disabled=false;execute.disabled=editors.every(e=>e.isFinished());execute.textContent=execute.disabled?'全部完成':'执行未完成记录';}
};
