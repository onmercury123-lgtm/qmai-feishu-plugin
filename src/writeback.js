const normalize=s=>String(s||'').replace(/\s/g,'');
export async function writeExecutionStatus(base,source,action){
 if(!['exclude','restore'].includes(action))throw Error('未知执行方式');
 const table=await base.getTableById(source.tableId);
 const matches=(await table.getFieldMetaList()).filter(f=>normalize(f.name)==='是否已剔除');
 if(matches.length!==1)throw Error('未找到唯一的“是否已剔除”字段');
 const field=matches[0],checked=action==='exclude';let value;
 if(field.type===7)value=checked;
 else if(field.type===3){const name=checked?'是':'否',option=field.property?.options?.find(o=>o.name===name);if(!option)throw Error('“是否已剔除”缺少“'+name+'”选项');value={id:option.id,text:option.name};}
 else throw Error('“是否已剔除”需为复选框或是/否单选字段');
 const current=await table.getCellValue(field.id,source.recordId);
 const equal=v=>field.type===7?v===checked:v?.id===value.id;
 if(!equal(current))await table.setCellValue(field.id,source.recordId,value);
 if(!equal(await table.getCellValue(field.id,source.recordId)))throw Error('表格回填后核验不一致');
 return checked?'已勾选“是否已剔除”':'已取消“是否已剔除”';
}
