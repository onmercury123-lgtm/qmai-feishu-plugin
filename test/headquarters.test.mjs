import test from 'node:test';
import assert from 'node:assert/strict';
import {readSelection} from '../src/reader.js';
import {fromSource,storeLines} from '../src/model.js';
import {groupRecords,groupParticipation} from '../src/grouping.js';
import {writeExecutionStatus} from '../src/writeback.js';
test('总部表短名称表头、缺少区域ID与开始时间、编码及逐行恢复回填',async()=>{
 const fields=[['id','总部冲突活动ID'],['name','总部冲突活动名'],['type','总部冲突活动类型'],['owner','总部活动剔除人'],['stores','剔除门店/区域'],['end','区域活动结束时间']].map(([id,name])=>({id,name}));
 fields.push({id:'excluded',name:'是否已剔除',type:3,property:{options:[{id:'yes',name:'是'}]}},{id:'restore',name:'恢复状态',type:3,property:{options:[{id:'pending',name:'待恢复'},{id:'restored',name:'已恢复'}]}});
 const data={a:{id:'1314665142587478016',name:'总部-冷泡茶+零食加购活动',type:'特惠加购',owner:'负责人',stores:'Y816019136',end:'2026/12/30',excluded:{id:'yes'},restore:{id:'pending'}},b:{id:'1314665142587478016',name:'总部-冷泡茶+零食加购活动',type:'特惠加购',owner:'负责人',stores:'76161780 76200123',end:'2026/12/31',excluded:{id:'yes'},restore:{id:'pending'}}};
 const writes=[];const table={getViewById:async()=>({getSelectedRecordIdList:async()=>['a','b']}),getFieldMetaList:async()=>fields,getCellValue:async(f,r)=>data[r][f],getCellString:async(f,r)=>typeof data[r][f]==='string'?data[r][f]:'',setCellValue:async(f,r,v)=>{writes.push([f,r]);data[r][f]=v;}};
 const base={getSelection:async()=>({baseId:'base',tableId:'hq',viewId:'view'}),getTableById:async()=>table};
 const records=await readSelection(base);assert.equal(records[0].display.activityName,data.a.name);const draft=fromSource(records[0]);assert.equal(draft.regionActivityId,'');assert.equal(draft.start,'');assert.equal(draft.end,'2026-12-30');assert.deepEqual(storeLines(records[1].display.stores),['76161780','76200123']);const [group]=groupRecords(records);assert.equal(group.members.length,2);assert.equal(groupParticipation(group,draft).length,2);
 for(const record of records)await writeExecutionStatus(base,record,'restore');assert.deepEqual(writes,[['restore','a'],['restore','b']]);assert.equal(data.a.excluded.id,'yes');assert.equal(data.a.owner,'负责人');
});
