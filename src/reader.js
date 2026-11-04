import {names,fieldAliases,text} from './model.js';
export async function selectedContext(base){
 const selection=await base.getSelection();
 if(!selection.tableId)throw Error('请先打开申请表，再勾选需要读取的记录。');
 const table=await base.getTableById(selection.tableId);
 let ids=[];
 if(selection.viewId){const view=await table.getViewById(selection.viewId);if(typeof view.getSelectedRecordIdList==='function')ids=await view.getSelectedRecordIdList();}
 ids=[...new Set(ids.filter(Boolean))];
 if(!ids.length&&selection.recordId)ids=[selection.recordId];
 if(!ids.length)throw Error('未读取到选中记录。请勾选行左侧复选框，或点击该行单元格后再读取。');
 if(ids.length>100)throw Error('请一次选择不超过100条申请。');
 return {selection,table,ids};
}
const normalize=s=>s.replace(/[\s（）()]/g,'').replaceAll('／','/');
export async function readSelection(base,recordId){
 const before=await selectedContext(base);
 if(recordId&&!before.ids.includes(recordId))throw Error('这条申请已不在选中范围，请重新读取。');
 const ids=recordId?[recordId]:before.ids,metas=await before.table.getFieldMetaList(),fields={};
 for(const [key,name] of Object.entries(names)){
  const matches=metas.filter(m=>(fieldAliases[key]||[name]).some(n=>normalize(n)===normalize(m.name)));
  if(matches.length>1)throw Error('存在多个可匹配的字段：'+matches.map(m=>m.name).join('、')+'，请先明确字段映射。');
  fields[key]=matches[0];
 }
 for(const key of ['activityId','activityType','stores'])if(!fields[key])throw Error('未找到必要字段：'+names[key]);
 const records=[];
 for(const id of ids){
  const raw={},display={},fieldIds={};
  await Promise.all(Object.keys(names).map(async key=>{const meta=fields[key];if(!meta){raw[key]=null;display[key]='';return;}fieldIds[key]=meta.id;raw[key]=await before.table.getCellValue(meta.id,id);display[key]=await before.table.getCellString(meta.id,id)??text(raw[key]);}));
  records.push({baseId:before.selection.baseId,tableId:before.selection.tableId,recordId:id,raw,display,fieldIds});
 }
 const after=await selectedContext(base),sameIds=(a,b)=>a.length===b.length&&a.every(id=>b.includes(id));
 if(before.selection.tableId!==after.selection.tableId||before.selection.viewId!==after.selection.viewId||!sameIds(before.ids,after.ids))throw Error('读取期间选中记录发生变化，请重新读取。');
 return records;
}
