const ORIGIN='http://127.0.0.1:8787',KIND='qmai-workbench-bridge';
export function createBridge(){
 let popup=null,nonce='',ready=null,resolveReady,rejectReady,readyTimer,closedTimer;const pending=new Map();
 const rejectAll=message=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error(message));}pending.clear();};
 window.addEventListener('message',event=>{const m=event.data;if(event.origin!==ORIGIN||event.source!==popup||!m||m.kind!==KIND||m.nonce!==nonce)return;if(m.type==='ready'){clearTimeout(readyTimer);resolveReady?.();return;}if(m.type==='closed'){rejectAll('工作台连接已关闭，请重新核验');ready=null;return;}const p=pending.get(m.requestId);if(!p)return;clearTimeout(p.timer);pending.delete(m.requestId);m.type==='error'?p.reject(Error(m.error||'工作台处理失败')):p.resolve(m);});
 function open(){
  if(popup&&!popup.closed&&ready)return ready;
  nonce=[...crypto.getRandomValues(new Uint8Array(24))].map(n=>n.toString(16).padStart(2,'0')).join('');
  ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
  // Keep the opener only for this nonce-bound, origin-checked local channel.
  popup=window.open(ORIGIN+'/#feishu-bridge='+encodeURIComponent(JSON.stringify({nonce,origin:location.origin})),'qmai-plugin-'+nonce);
  if(!popup){ready=null;throw Error('请允许打开工作台窗口后重试');}
  readyTimer=setTimeout(()=>{rejectReady?.(Error('工作台未连接，请先启动本机工作台后重试'));ready=null;},25000);
  clearInterval(closedTimer);closedTimer=setInterval(()=>{if(popup?.closed){clearInterval(closedTimer);clearTimeout(readyTimer);rejectReady?.(Error('工作台窗口已关闭'));rejectAll('工作台窗口已关闭，请重新核验');ready=null;}},1000);
  return ready;
 }
 async function request(type,body){await open();if(!popup||popup.closed)throw Error('工作台窗口已关闭');const requestId=crypto.randomUUID();return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(requestId);reject(Error(type==='submit'?'未取得执行结果，请查看工作台同步记录，勿重复提交':'核验超时，请检查工作台连接'));},type==='submit'?180000:120000);pending.set(requestId,{resolve,reject,timer});popup.postMessage({kind:KIND,nonce,type,requestId,...body},ORIGIN);});}
 return {open,prepare:plan=>request('prepare',{plan}),submit:ticket=>request('submit',{ticket}),invalidate(){if(popup&&!popup.closed)popup.postMessage({kind:KIND,nonce,type:'invalidate'},ORIGIN);rejectAll('方案已修改，请重新核验');}};
}
