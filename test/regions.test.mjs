import test from 'node:test';import assert from 'node:assert/strict';
import {toggleRegion,regionRows,catalogue} from '../src/regions.js';
const rows=[{id:'1',name:'公司',path:'品牌 / 公司'},{id:'2',name:'区域',path:'品牌 / 公司 / 区域'},{id:'3',name:'城市',path:'品牌 / 公司 / 区域 / 城市'},{id:'4',name:'其他',path:'品牌 / 其他'}];
test('父子区域互斥并保留其他分支，避免重复覆盖',()=>{let s=toggleRegion(new Set(['1','4']),'2',true,rows);assert.deepEqual([...s],['4','2']);s=toggleRegion(s,'1',true,rows);assert.deepEqual([...s],['4','1']);assert.deepEqual(regionRows(s,rows).map(r=>r.id),['1','4']);assert.deepEqual([...toggleRegion(s,'1',false,rows)],['4']);});
test('目录来自运行快照并过滤异常组织，未知区域不允许选中',()=>{assert.ok(catalogue.length>100);assert.ok(catalogue.every(r=>r.id&&r.name&&r.path&&!/(components\.|测试停用)/.test(r.path)));assert.throws(()=>toggleRegion(new Set(),'missing',true),/变化/);});
