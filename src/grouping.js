import {storeLines,fromSource} from './model.js';
export function groupRecords(records){
 const groups=new Map();
 for(const record of records){const d=record.display,key=JSON.stringify([record.baseId,record.tableId,d.activityId?.trim(),d.activityType,d.activityName]);let group=groups.get(key);if(!group){group={...record,members:[],display:{...d}};groups.set(key,group);}group.members.push(record);group.display.stores=[...new Set(group.members.flatMap(r=>storeLines(r.display.stores)))].join('\n');}
 return [...groups.values()];
}
export function groupParticipation(source,draft){
 return [...new Map((source.members?.length>1?source.members.map(fromSource):[draft]).flatMap(d=>d.regionActivityId||d.start||d.end?[{id:d.regionActivityId||'',name:d.regionActivityName||'',startAt:d.start||null,endAt:d.end||null}]:[]).map(a=>[JSON.stringify(a),a])).values()];
}
