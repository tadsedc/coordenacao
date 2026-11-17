/* Resumo da matriz efetivamente exibida na integralização da turma. */
(()=>{
 function update(){
  if(state.page!=='integral'||state.role!=='coord')return;
  const select=document.querySelector('#integral-group');
  if(!select?.value)return;
  const controls=[...document.querySelectorAll('[data-prog-status],[data-version-status]')];
  const table=controls[0]?.closest('table'),card=table?.closest('.card');
  if(!card)return;
  let section=document.getElementById('remaining-subjects');
  if(!section){section=document.createElement('section');section.id='remaining-subjects';section.className='remaining-subjects';card.before(section)}
  const pending=controls.map(control=>{const row=control.closest('tr');return {name:row.cells[1].querySelector('b')?.textContent||row.cells[1].textContent,semester:row.cells[0].textContent,status:control.value}}).filter(d=>!['cumprida','dispensada'].includes(d.status));
  section.replaceChildren();
  const header=document.createElement('div');header.className='remaining-heading';
  const title=document.createElement('h2');title.textContent='Disciplinas a cursar';
  const badge=document.createElement('span');badge.textContent=pending.length+' disciplina(s)';
  header.append(title,badge);
  const note=document.createElement('p');note.textContent='Pendências da turma '+select.options[select.selectedIndex].textContent+'. Inclui disciplinas em curso e não ofertadas agora; exclui cumpridas e dispensadas/aproveitadas.';
  section.append(header,note);
  if(!pending.length){const done=document.createElement('p');done.textContent='Todas as disciplinas desta matriz estão cumpridas ou dispensadas.';section.append(done);return}
  const list=document.createElement('ul');list.className='remaining-list';
  for(const d of pending){const item=document.createElement('li'),name=document.createElement('strong'),meta=document.createElement('small');name.textContent=d.name;meta.textContent=d.semester+' semestre · '+(progressLabels[d.status]||'Pendente');item.append(name,meta);list.append(item)}
  section.append(list);
 }
 const previousBind=bind;bind=function(){previousBind();update()};
 document.addEventListener('integral-version-saved',update);
 const style=document.createElement('style');style.textContent='.remaining-subjects{margin:0 0 22px;padding:22px;border:1px solid #cfe1f0;border-radius:18px;background:#f4f9ff}.remaining-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.remaining-heading h2{font-size:21px;margin:0}.remaining-heading span{background:#dceeff;color:#086aaa;border-radius:99px;padding:7px 11px;font-size:12px;font-weight:800}.remaining-subjects>p{color:#60748b;line-height:1.5;font-size:13px}.remaining-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr));gap:9px;list-style:none;padding:0;margin:18px 0 0}.remaining-list li{padding:13px;border:1px solid #dce7f1;background:#fff;border-radius:12px;min-width:0}.remaining-list strong{display:block;font-size:13px;overflow-wrap:anywhere}.remaining-list small{display:block;color:#64768d;margin-top:6px;font-size:11px}@media(max-width:600px){.remaining-subjects{padding:16px}.remaining-heading{align-items:start}.remaining-heading h2{font-size:19px}.remaining-heading span{white-space:nowrap}}';document.head.append(style);
})();
