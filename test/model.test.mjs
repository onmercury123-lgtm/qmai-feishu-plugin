import test from 'node:test';
import assert from 'node:assert/strict';
import {fromSource,fingerprint,makePlan,storeLines,validate} from '../src/model.js';
import {demo} from '../src/demo.js';
const valid=()=>({...fromSource(demo),startMode:'after-confirmation',endMeaning:'inclusive',confirmed:true});

test('剔除和恢复均立即，保存真实操作类型且不创建定时方案',()=>{const d=valid();assert.equal(d.action,'exclude');const a=makePlan(demo,d);assert.equal(a.standard.action,'exclude');assert.equal(a.standard.restorePlan,'none');d.action='restore';const b=makePlan(demo,d);assert.equal(b.standard.action,'restore');assert.equal(b.standard.restorePlan,'restore-only');assert.equal(b.standard.startMode,'after-confirmation');assert.equal(b.executable,false);d.action='scheduled';assert.throws(()=>makePlan(demo,d),/剔除或恢复/);});
test('Lookup 人员身份、长活动 ID 与北京时间完整保留',()=>{const d=fromSource(demo);assert.equal(d.activityId,'1234567890123456789');assert.equal(d.start,'2026-10-27');assert.deepEqual(d.ownerIds,['demo-owner']);assert.equal(d.confirmed,false);});
test('区域原文不变，标准方案独立且永不默认可执行',()=>{const before=JSON.stringify(demo);const d=valid();d.stores='标准门店甲\n标准门店乙';const p=makePlan(demo,d);assert.equal(JSON.stringify(demo),before);assert.equal(p.qmaiVerified,false);assert.equal(p.executable,false);assert.deepEqual(p.standard.stores,['标准门店甲','标准门店乙']);});
test('选项 ID 不冒充活动类型，未核对不能保存',()=>{const d=fromSource({...demo,display:{...demo.display,activityType:'optWIctXMT'}});assert.equal(d.activityType,'');assert.ok(validate(d).some(x=>x.includes('活动类型')));assert.throws(()=>makePlan(demo,d));});
test('区域可交接由工作台离线确认，方案仅包含执行所需内容',()=>{const d=valid();d.scope='region';assert.equal(validate(d).length,1);d.regions=[{id:'1',name:'区域',path:'品牌 / 区域'}];assert.equal(validate(d).length,0);d.regionsDirty=true;assert.equal(validate(d).length,1);d.regionsDirty=false;d.scope='stores';d.owner='';d.start='';d.end='';const p=makePlan(demo,d);assert.equal(p.standard.restorePlan,'none');assert.equal(p.standard.startMode,'after-confirmation');for(const key of ['owner','ownerIds','start','end','reminder','endMeaning'])assert.equal(key in p.standard,false);});
test('门店去重，名称内部空格不被拆散',()=>assert.deepEqual(storeLines('南京 新街口店、苏州店\n苏州店'),['南京 新街口店','苏州店']));
test('空格分隔的多门店编码拆分并去重',()=>assert.deepEqual(storeLines('Y801019156 Y801019885 Y801019156'),['Y801019156','Y801019885']));
test('字段异步返回顺序不影响指纹，内容变化使预览失效',()=>{const a={...demo,raw:{a:1,b:2}},b={...demo,raw:{b:2,a:1}};assert.equal(fingerprint(a),fingerprint(b));b.raw.a=3;assert.notEqual(fingerprint(a),fingerprint(b));});
