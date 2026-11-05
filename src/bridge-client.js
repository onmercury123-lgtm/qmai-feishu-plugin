const ORIGIN='http://127.0.0.1:8787',KIND='qmai-workbench-bridge';
export function createBridge(){
 let frame=null,channel=null,nonce='',ready=null,readyTimer;const pending=new Map();
 const rejectAll=message=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error(message));}pending.clear();};
 function reset(message){clearTimeout(readyTimer);rejectAll(message);frame?.remove();frame=null;channel=null;ready=null;}
 let resolveReady,rejectReady;
 window.addEventListener('message',event=>{const m=event.data;if(event.origin!==ORIGIN||event.source!==channel||!m||m.kind!==KIND||m.nonce!==nonce)return;if(m.type==='ready'){clearTimeout(readyTimer);resolveReady?.();return;}const p=pending.get(m.requestId);if(!p)return;clearTimeout(p.timer);pending.delete(m.requestId);m.type==='error'?p.reject(Error(m.error||'后台处理失败')):p.resolve(m);});
 function open(){if(frame?.isConnected&&ready)return ready;
  nonce=[...crypto.getRandomValues(new Uint8Array(24))].map(n=>n.toString(16).padStart(2,'0')).join('');
  ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});const result=ready;
  frame=document.createElement('iframe');frame.title='商品工作台后台连接';frame.hidden=true;frame.setAttribute('aria-hidden','true');frame.src=ORIGIN+'/plugin-background/index.html#'+encodeURIComponent(JSON.stringify({nonce,origin:location.origin}));document.body.append(frame);channel=frame.contentWindow;
  readyTimer=setTimeout(()=>{rejectReady?.(Error('无法连接本机后台：请启动“插件后台”，如浏览器提示访问本地网络，请允许本次连接。无需打开工作台页面。'));reset('后台未连接');},15000);return result;
 }
 async function request(type,body){await open();const requestId=crypto.randomUUID();return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(requestId);reject(Error(type==='submit'?'未取得执行结果，请核对同步记录，勿重复提交':'核验超时，请检查企迈连接'));},type==='submit'?180000:120000);pending.set(requestId,{resolve,reject,timer});channel.postMessage({kind:KIND,nonce,type,requestId,...body},ORIGIN);});}
 return {open,prepare:plan=>request('prepare',{plan}),submit:ticket=>request('submit',{ticket}),invalidate(){if(channel)channel.postMessage({kind:KIND,nonce,type:'invalidate'},ORIGIN);rejectAll('方案已修改，请重新核验');}};
}
