import test from 'node:test';
import assert from 'node:assert/strict';
import {checkFreshness} from '../src/freshness.js';
import {demo} from '../src/demo.js';
import {readSelection} from '../src/reader.js';
test('状态更新不失效，活动和范围变化失效',async()=>{
 const changed=structuredClone(demo);changed.display.status='已完成';changed.raw.status='done';changed.display.owner='其他人';
 assert.equal(await checkFreshness([demo],async()=>changed),true);
 changed.display.stores='Y999999999';assert.equal(await checkFreshness([demo],async()=>changed),false);
 changed.display.stores=demo.display.stores;changed.display.activityId='999';assert.equal(await checkFreshness([demo],async()=>changed),false);
});
test('读取错误单独报告，重试恢复',async()=>{
 await assert.rejects(()=>checkFreshness([demo],async()=>{throw Error('网络错误');}),/暂时无法读取原申请/);
 assert.equal(await checkFreshness([demo],async()=>demo),true);
});
test('原行复核不依赖当前勾选',async()=>{
 const table={getFieldMetaList:async()=>['activityId','activityType','stores'].map((id,i)=>({id,name:['总部冲突活动ID','总部冲突活动类型','剔除门店/区域'][i]})),getCellValue:async()=>'',getCellString:async(field,row)=>{assert.equal(row,'original');return '123';}};
 const base={getSelection:async()=>{throw Error('不应读取选择');},getTableById:async id=>{assert.equal(id,'original-table');return table;}};
 const [r]=await readSelection(base,'original',{baseId:'base',tableId:'original-table'});assert.equal(r.recordId,'original');
});
