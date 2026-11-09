import test from 'node:test';
import assert from 'node:assert/strict';
import {readSelection} from '../src/reader.js';
import {fromSource} from '../src/model.js';
test('优先读取回传字段，长 ID 保持文本，X 占位符不进入计划',async()=>{
 for(const value of ['1325056410861588480','XXXXXXXXXXXXXXXX']){
  const base=fixture(),table=await base.getTableById(),fields=await table.getFieldMetaList();
  fields.push({id:'oldId',name:'区域活动ID'},{id:'returnedId',name:'区域活动ID回传'});
  const read=table.getCellString;
  table.getCellValue=table.getCellString=async id=>id==='returnedId'?value:read(id);
  const [record]=await readSelection(base);
  assert.equal(record.display.regionActivityId,value);
  assert.equal(fromSource(record).regionActivityId,value.startsWith('X')?'':value);
 }
});
function fixture({ids=['rec1'],recordId=null,missing=false,change=false}={}){
 let calls=0;
 const fields=[['id','总部冲突活动ID'],['type','总部冲突活动类型'],['stores','剔除门店/区域'],['owner','总部活动设置人']].filter(([id])=>!missing||id!=='stores').map(([id,name])=>({id,name}));
 const values={id:'1307704560059633664',type:'限时折扣',stores:'Y111111111 Y222222222',owner:'负责人'};
 const table={getViewById:async()=>({getSelectedRecordIdList:async()=>change&&calls>1?['other']:ids}),getFieldMetaList:async()=>fields,getCellValue:async id=>values[id],getCellString:async id=>values[id]};
 return {getSelection:async()=>{calls++;return {baseId:'base',tableId:'table',viewId:'view',recordId};},getTableById:async()=>table};
}
test('勾选行没有当前单元格仍读取，匹配现表头并保留长 ID',async()=>{const [r]=await readSelection(fixture());assert.equal(r.recordId,'rec1');assert.equal(r.display.activityId,'1307704560059633664');assert.equal(r.display.owner,'负责人');assert.equal(r.display.stores,'Y111111111 Y222222222');});
test('多条勾选不混入当前单元格，分别返回',async()=>{const records=await readSelection(fixture({ids:['a','b'],recordId:'unselected'}));assert.deepEqual(records.map(r=>r.recordId),['a','b']);});
test('无勾选时兼容点击单元格',async()=>assert.equal((await readSelection(fixture({ids:[],recordId:'cell'})))[0].recordId,'cell'));
test('保存选中清单中指定的一条，不替换为第一条',async()=>assert.equal((await readSelection(fixture({ids:['a','b']}),'b'))[0].recordId,'b'));
test('读取期间变化、空选择、必要字段缺失均明确阻止',async()=>{await assert.rejects(()=>readSelection(fixture({change:true})),/发生变化/);await assert.rejects(()=>readSelection(fixture({ids:[]})),/未读取到/);await assert.rejects(()=>readSelection(fixture({missing:true})),/必要字段/);await assert.rejects(()=>readSelection(fixture(),'other'),/不在选中范围/);});
