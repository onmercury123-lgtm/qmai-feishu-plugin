import {fromSource} from './model.js';
export function demandFingerprint(source){
 const d=fromSource(source);
 return JSON.stringify([source.baseId||'',source.tableId,source.recordId,d.activityId,d.activityName,d.activityType,d.stores,d.regionActivityId,d.regionActivityName,d.start,d.end]);
}
export async function checkFreshness(members,read){
 for (let start = 0; start < members.length; start += 4) {
  const group = members.slice(start, start + 4);
  const latest = await Promise.all(group.map(async member => {
   try {
    return await read(member);
   } catch (error) {
    throw Error('暂时无法读取原申请，请重试；若记录已删除，请重新读取所选。'+(error?.message?'（'+error.message+'）':''));
   }
  }));
  if (group.some((member, index) => demandFingerprint(latest[index]) !== demandFingerprint(member))) return false;
 }
 return true;
}
