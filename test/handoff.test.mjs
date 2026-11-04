import test from 'node:test';
import assert from 'node:assert/strict';
import '../src/handoff-contract.js';
const H=globalThis.WorkbenchHandoff;
const sample=()=>({version:1,action:'exclude',scope:'stores',activityName:'总部活动<script>',activityId:'1307704560059633664',activityType:'限时折扣',stores:['Y801019156','Y801019885']});
test('中文及长 ID 通过本机 fragment 交接，不携带原始记录或执行指令',()=>{const url=H.build({standard:sample(),original:{owner:'不传输'}});const u=new URL(url);assert.equal(u.origin,'http://127.0.0.1:8787');assert.equal(u.search,'');const p=H.parse(u.hash);assert.deepEqual(p,sample());assert.equal('original' in p,false);assert.equal('submit' in p,false);});
test('恢复和区域的语义保持，拦截无效类型、数字 ID 及空门店',()=>{const p={...sample(),action:'restore',scope:'region',stores:['广西']};assert.deepEqual(H.parse(new URL(H.build({standard:p})).hash),p);for(const bad of [{action:'submit'},{activityId:1307704560059633664},{activityType:'未知'},{stores:[]},{scope:'all'}])assert.throws(()=>H.validate({...sample(),...bad}));assert.throws(()=>H.parse('#feishu-plan=%XX'));});
test('超长方案不生成无法打开的链接',()=>assert.throws(()=>H.build({standard:{...sample(),stores:Array.from({length:1000},(_,i)=>'中文门店'+i+'甲'.repeat(100))}}),/过长/));
test('新版携带已确认区域 ID 与完整路径，阻止父子重叠和未确认范围',()=>{const region={id:'1',name:'区域',path:'品牌 / 区域'},p={...sample(),version:2,scope:'region',stores:[],regions:[region]};assert.deepEqual(H.parse(new URL(H.build({standard:p})).hash),p);assert.throws(()=>H.validate({...p,regions:[]}),/确认范围/);assert.throws(()=>H.validate({...p,regions:[region,{id:'2',name:'城市',path:'品牌 / 区域 / 城市'}]}),/重叠/);});
