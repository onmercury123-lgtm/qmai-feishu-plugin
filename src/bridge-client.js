const ORIGIN='http://127.0.0.1:8787',KIND='qmai-workbench-bridge';
export function createBridge({onProgress=()=>{}}={}){
 let frame=null,channel=null,nonce='',ready=null,readyTimer,popupMode=false,batchReuse=false,batchId=null,protocolVersion=1;const pending=new Map();
 const rejectAll=message=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error(message));}pending.clear();};
 function reset(message){clearTimeout(readyTimer);rejectAll(message);frame?.remove();frame=null;channel=null;ready=null;connected=false;}
 let resolveReady,rejectReady,connected=false;
 window.addEventListener('message',event=>{const m=event.data;if(event.origin!==ORIGIN||event.source!==channel||!m||m.kind!==KIND||m.nonce!==nonce)return;if(m.type==='ready'){protocolVersion=Number(m.protocolVersion)||1;if(protocolVersion>2){rejectReady?.(Error('工作台连接协议版本不兼容，请更新插件'));reset('协议版本不兼容');return;}batchReuse=m.batchReuse===true;clearTimeout(readyTimer);connected=true;resolveReady?.();return;}const p=pending.get(m.requestId);if(!p)return;if(m.type==='progress'){onProgress(m.label||'正在处理…');return;}clearTimeout(p.timer);pending.delete(m.requestId);m.type==='error'?p.reject(Error(m.error||'后台处理失败')):p.resolve(m);});
 function open({preferPopup=false}={}){if(ready&&(frame?.isConnected||popupMode&&channel&&!channel.closed))return ready;
  if(preferPopup)popupMode=true;
  nonce=[...crypto.getRandomValues(new Uint8Array(24))].map(n=>n.toString(16).padStart(2,'0')).join('');
  ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});const result=ready;
  const url=ORIGIN+'/plugin-background/index.html#'+encodeURIComponent(JSON.stringify({nonce,origin:location.origin}));
  if(popupMode){channel=window.open(url,'qmai-plugin-connection','popup,width=420,height=220');if(!channel){rejectReady?.(Error('连接窗口未打开，请允许本次弹窗后再点“连接企迈”。'));reset('连接窗口未打开');return result;}}
  else{frame=document.createElement('iframe');frame.title='商品工作台后台连接';frame.hidden=true;frame.setAttribute('aria-hidden','true');frame.src=url;document.body.append(frame);channel=frame.contentWindow;}
  readyTimer=setTimeout(()=>{const wasPopup=popupMode;popupMode=true;rejectReady?.(Error(wasPopup?'本机连接窗口未返回握手，请检查该窗口是否显示连接就绪，再点“连接企迈”重试。':'本机后台握手超时，请点“连接企迈”打开兼容连接窗口。'));reset('后台未连接');},popupMode?15000:5000);return result;
 }
 async function request(type,body){await open();const requestId=crypto.randomUUID();return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(requestId);reject(Error(type==='submit'?'未取得执行结果，请核对同步记录，勿重复提交':'核验超时，请检查企迈连接'));},type==='submit'?180000:type==='end-batch'?5000:type==='status'?15000:120000);pending.set(requestId,{resolve,reject,timer});channel.postMessage({kind:KIND,nonce,type,requestId,protocolVersion:2,...body},ORIGIN);});}
 return {open,isConnected:()=>connected&&Boolean(frame?.isConnected||popupMode&&channel&&!channel.closed),
  startBatch(){batchId=batchReuse?crypto.randomUUID():null;},
  async endBatch(){if(!batchId)return;batchId=null;await request('end-batch',{});},
  prepare:plan=>request('prepare',{plan,batchId}),submit:async ticket=>{try{return await request('submit',{ticket})}catch(error){if(protocolVersion<2)throw error;try{onProgress('连接中断，正在查询本次执行回执…');return await request('status',{ticket})}catch{throw Error('执行结果待核实，请查看同步记录；未重新提交。'+error.message)}}},invalidate(){if(channel)channel.postMessage({kind:KIND,nonce,type:'invalidate'},ORIGIN);rejectAll('方案已修改，请重新核验');}};
}
