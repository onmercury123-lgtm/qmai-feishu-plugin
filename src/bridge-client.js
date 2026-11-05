const ORIGIN='http://127.0.0.1:8787',KIND='qmai-workbench-bridge';
export function createBridge(){
 let frame=null,channel=null,nonce='',ready=null,readyTimer,popupMode=false;const pending=new Map();
 const rejectAll=message=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error(message));}pending.clear();};
 function reset(message){clearTimeout(readyTimer);rejectAll(message);frame?.remove();frame=null;channel=null;ready=null;}
 let resolveReady,rejectReady;
 window.addEventListener('message',event=>{const m=event.data;if(event.origin!==ORIGIN||event.source!==channel||!m||m.kind!==KIND||m.nonce!==nonce)return;if(m.type==='ready'){clearTimeout(readyTimer);resolveReady?.();return;}const p=pending.get(m.requestId);if(!p)return;clearTimeout(p.timer);pending.delete(m.requestId);m.type==='error'?p.reject(Error(m.error||'后台处理失败')):p.resolve(m);});
 function open(){if(ready&&(frame?.isConnected||popupMode&&channel&&!channel.closed))return ready;
  nonce=[...crypto.getRandomValues(new Uint8Array(24))].map(n=>n.toString(16).padStart(2,'0')).join('');
  ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});const result=ready;
  const url=ORIGIN+'/plugin-background/index.html#'+encodeURIComponent(JSON.stringify({nonce,origin:location.origin}));
  if(popupMode){channel=window.open(url,'qmai-plugin-connection','popup,width=420,height=220');if(!channel){rejectReady?.(Error('连接窗口未打开，请允许本次弹窗后再点去执行。'));reset('连接窗口未打开');return result;}}
  else{frame=document.createElement('iframe');frame.title='商品工作台后台连接';frame.hidden=true;frame.setAttribute('aria-hidden','true');frame.src=url;document.body.append(frame);channel=frame.contentWindow;}
  readyTimer=setTimeout(()=>{const wasPopup=popupMode;popupMode=true;rejectReady?.(Error(wasPopup?'本机连接窗口未响应，请确认插件后台运行，并保留连接窗口。':'隐藏连接未建立，请再点“去执行”打开兼容连接窗口。'));reset('后台未连接');},15000);return result;
 }
 async function request(type,body){await open();const requestId=crypto.randomUUID();return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(requestId);reject(Error(type==='submit'?'未取得执行结果，请核对同步记录，勿重复提交':'核验超时，请检查企迈连接'));},type==='submit'?180000:120000);pending.set(requestId,{resolve,reject,timer});channel.postMessage({kind:KIND,nonce,type,requestId,...body},ORIGIN);});}
 return {open,prepare:plan=>request('prepare',{plan}),submit:ticket=>request('submit',{ticket}),invalidate(){if(channel)channel.postMessage({kind:KIND,nonce,type:'invalidate'},ORIGIN);rejectAll('方案已修改，请重新核验');}};
}
