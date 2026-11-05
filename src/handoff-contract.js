(function(root){
 'use strict';
function regionalInfo(value){if(value==null)return [];if(!Array.isArray(value)||value.length>100)throw Error('区域活动信息格式无效');return value.map(a=>{if(!a||typeof a!=='object')throw Error('区域活动信息无效');const id=String(a.id||'').trim(),name=String(a.name||'').trim();if(id&&!/^\d{1,40}$/.test(id)||name.length>300)throw Error('区域活动 ID 或名称格式无效');function date(v,end){if(!v)return null;if(typeof v!=='string')throw Error('区域活动时间格式无效');const s=v.trim().replaceAll('/','-');if(!/^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(s))throw Error('区域活动时间格式无效');const out=s.length===10?s+(end?'T23:59:59+08:00':'T00:00:00+08:00'):s;if(!Number.isFinite(Date.parse(out)))throw Error('区域活动时间无效');return out}const startAt=date(a.startAt,false),endAt=date(a.endAt,true);if(startAt&&endAt&&Date.parse(startAt)>Date.parse(endAt))throw Error('区域活动结束早于开始');return {id,name,startAt,endAt,source:'plugin-import'};})}
 const types=['限时折扣','特惠加购','满M件N折','优惠券包','广告管理'];
 function validate(p){
  if(!p||![1,2].includes(p.version)||!['exclude','restore'].includes(p.action)||!['stores','region'].includes(p.scope)||typeof p.activityId!=='string'||!/^\d{1,40}$/.test(p.activityId)||typeof p.activityName!=='string'||!p.activityName.trim()||p.activityName.length>300||!types.includes(p.activityType)||!Array.isArray(p.stores)||((p.scope==='stores'||p.version===1)&&!p.stores.length)||p.stores.length>1000||p.stores.some(s=>typeof s!=='string'||!s.trim()||s.length>500))throw Error('工作台方案格式不完整，请重新读取并核对。');
  const result={version:p.version,action:p.action,scope:p.scope,activityId:p.activityId,activityName:p.activityName,activityType:p.activityType,stores:p.stores.map(s=>s.trim())};
  if(p.version===2&&p.scope==='region'){
   if(!Array.isArray(p.regions)||!p.regions.length||p.regions.length>100||p.regions.some(r=>!r||typeof r.id!=='string'||!/^\d{1,40}$/.test(r.id)||typeof r.name!=='string'||!r.name.trim()||r.name.length>100||typeof r.path!=='string'||!r.path.trim()||r.path.length>500)||new Set(p.regions.map(r=>r.id)).size!==p.regions.length)throw Error('请勾选区域并确认范围');
   if(p.regions.some((r,i)=>p.regions.some((s,j)=>i!==j&&(s.path===r.path||s.path.startsWith(r.path+' / ')))))throw Error('区域范围重叠，请重新确认');
   result.regions=p.regions.map(r=>({id:r.id,name:r.name,path:r.path}));result.stores=[];
  }
  if(p.participationActivities!=null)result.participationActivities=regionalInfo(p.participationActivities);
  if(p.sourceRecords!=null){if(!Array.isArray(p.sourceRecords)||p.sourceRecords.length>100||p.sourceRecords.some(r=>!r||typeof r.baseId!=='string'||typeof r.tableId!=='string'||typeof r.recordId!=='string'||[r.baseId,r.tableId,r.recordId].some(v=>v.length>200)||!Array.isArray(r.stores)||r.stores.length>1000||r.stores.some(v=>typeof v!=='string'||v.length>500)))throw Error('来源记录格式无效');result.sourceRecords=p.sourceRecords.map(r=>({baseId:r.baseId,tableId:r.tableId,recordId:r.recordId,stores:r.stores.slice()}));}
  return result;
 }
 function build(plan){const p=validate({version:2,...plan.standard});const data=encodeURIComponent(JSON.stringify(p));if(data.length>24000)throw Error('门店清单过长，请分批发送到工作台。');return 'http://127.0.0.1:8787/#feishu-plan='+data;}
 function parse(hash){if(!hash.startsWith('#feishu-plan=')||hash.length>24013)throw Error('工作台方案链接无效。');try{return validate(JSON.parse(decodeURIComponent(hash.slice(13))));}catch{throw Error('工作台方案链接无效，请从插件重新发送。');}}
 root.WorkbenchHandoff={validate,build,parse};
})(globalThis);
