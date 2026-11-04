import snapshot from './region-catalogue.json' with {type:'json'};
export const catalogue=snapshot.regions.filter(r=>!/(components\.|测试停用)/.test(r.path+' '+r.name)).map(r=>({id:String(r.id),name:r.name,path:r.path}));
export function toggleRegion(ids,id,checked,rows=catalogue){const next=new Set(ids),r=rows.find(x=>x.id===id);if(!r)throw Error('区域已变化，请重新选择');if(checked){for(const other of rows)if(other.path.startsWith(r.path+' / ')||r.path.startsWith(other.path+' / '))next.delete(other.id);next.add(id);}else next.delete(id);return next;}
export function regionRows(ids,rows=catalogue){return rows.filter(r=>ids.has(r.id));}
export function mountRegions(host,{onEdit,onCommit}){
 const doc=host.ownerDocument,escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let ids=new Set(),committed=[],busy=false;
 host.innerHTML='<input class="region-search" aria-label="搜索区域" placeholder="搜索公司、区域或城市"><div class="region-tools"><span class="region-count"></span><button type="button" class="button ghost region-clear">清空</button></div><div class="region-tree" role="group" aria-label="区域目录"></div><div class="region-bottom"><span class="region-status"></span><button type="button" class="button region-confirm">确认区域</button></div>';
 const tree=host.querySelector('.region-tree'),search=host.querySelector('input'),confirm=host.querySelector('.region-confirm');
 const dialog=doc.createElement('dialog');dialog.className='region-dialog';dialog.innerHTML='<h2>确认区域</h2><p class="region-confirm-path"></p><div class="bottom"><button type="button" class="button">取消</button><button type="button" class="button primary">确认区域</button></div>';doc.body.append(dialog);
 const dirty=()=>JSON.stringify([...ids].sort())!==JSON.stringify(committed.map(r=>r.id).sort());
 function render(){
  const opened=new Set([...tree.querySelectorAll('details[open]')].map(d=>d.dataset.path)),scroll=tree.scrollTop,key=search.value.trim().toLowerCase(),root={children:new Map()};
  for(const r of catalogue.filter(r=>!key||r.path.toLowerCase().includes(key))){let node=root,path=[];for(const name of r.path.split(' / ')){path.push(name);if(!node.children.has(name))node.children.set(name,{name,path:path.join(' / '),children:new Map(),rows:[]});node=node.children.get(name);}node.rows.push(r);}
  const draw=(node,depth)=>[...node.children.values()].map(n=>{const label=n.rows.length?n.rows.map(r=>'<label title="'+escape(r.path)+'"><input type="checkbox" data-region="'+escape(r.id)+'" aria-label="选择'+escape(r.path)+'" '+(ids.has(r.id)?'checked ':'')+(busy?'disabled':'')+'><span>'+escape(n.name)+'</span></label>').join(''):'<span>'+escape(n.name)+'</span>';return n.children.size?'<details data-path="'+escape(n.path)+'" '+(depth===0||key||opened.has(n.path)?'open':'')+'><summary>'+label+'</summary><div class="region-children">'+draw(n,depth+1)+'</div></details>':'<div class="region-leaf">'+label+'</div>';}).join('');
  tree.innerHTML=draw(root,0)||'<p class="hint">没有匹配的区域</p>';tree.scrollTop=scroll;
  host.querySelector('.region-count').textContent='已选 '+ids.size+' 个区域'+(dirty()?' · 待确认':'');host.querySelector('.region-status').textContent=committed.length&&!dirty()?'已确认，预览时核验':'';confirm.disabled=busy||!ids.size;
 }
 tree.addEventListener('click',e=>{if(e.target.closest('label'))e.stopPropagation();});
 tree.addEventListener('change',e=>{if(!e.target.dataset.region||busy)return;ids=toggleRegion(ids,e.target.dataset.region,e.target.checked);render();onEdit({dirty:dirty(),regions:committed});});search.oninput=render;
 host.querySelector('.region-clear').onclick=()=>{if(busy)return;ids.clear();committed=[];render();onEdit({dirty:true,regions:[]});};
 confirm.onclick=()=>{dialog.querySelector('.region-confirm-path').textContent=regionRows(ids).map(r=>r.path.replaceAll(' / ',' → ')).join('\n');dialog.showModal();};
 const [cancel,accept]=dialog.querySelectorAll('button');cancel.onclick=()=>dialog.close();accept.onclick=()=>{committed=regionRows(ids).map(r=>({...r}));dialog.close();render();onCommit(committed);};
 render();return {dispose(){dialog.remove();},reset(regions=[]){committed=regions.map(r=>({...r}));ids=new Set(committed.map(r=>r.id));search.value='';render();},setBusy(value){busy=value;search.disabled=value;host.querySelector('.region-clear').disabled=value;render();},state(){return {regions:committed,dirty:dirty()};}};
}

