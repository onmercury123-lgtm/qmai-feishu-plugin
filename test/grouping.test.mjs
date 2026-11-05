import test from 'node:test';
import assert from 'node:assert/strict';
import {groupRecords,groupParticipation} from '../src/grouping.js';
const row=(id,store,extra={})=>({baseId:'base',tableId:'table',recordId:id,raw:{},display:{activityId:'100',activityType:'限时折扣',activityName:'测试',stores:store,...extra}});
test('同活动多门店去重合并，保留每个来源行且不修改原始数据',()=>{const rows=[row('r1','Y801019852'),row('r2','Y801019852\nY801019903')],before=structuredClone(rows),groups=groupRecords(rows);assert.equal(groups.length,1);assert.equal(groups[0].members.length,2);assert.equal(groups[0].display.stores,'Y801019852\nY801019903');assert.deepEqual(rows,before);assert.equal(groupRecords([row('r1','Y1'),row('r2','Y2',{activityId:'101'})]).length,2);});
test('不同活动类型、表或活动名称保持独立，避免误合并',()=>{const a=row('r1','Y1');assert.equal(groupRecords([a,row('r2','Y2',{activityType:'特惠加购'}),{...row('r3','Y3'),tableId:'other'},row('r4','Y4',{activityName:'不同名称'})]).length,4);});
test('合并保留各原始行的区域活动日期信息',()=>{const rows=[row('r1','Y1',{start:'2026/11/05',end:'2026/11/06'}),row('r2','Y2',{start:'2026/11/07',end:'2026/11/08'})];assert.equal(groupParticipation(groupRecords(rows)[0],{}).length,2);});
