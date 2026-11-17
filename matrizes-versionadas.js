(()=>{
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let versions=[],items=[],links=[],history=[],available=false;
 const previousLoad=loadData;
 loadData=async function(){await previousLoad();if(state.role!=='coord')return;const r=await Promise.all(['matriz_versoes','matriz_versao_disciplinas','turma_matriz_versao','turma_versao_historico'].map(t=>banco.from(t).select('*')));available=!r.some(x=>x.error);if(available)[versions,items,links,history]=r.map(x=>x.data||[])};
 const previousIntegral=integralization;
 integralization=function(){let html=previousIntegral();if(!available)return html;const link=links.find(x=>String(x.turma_id)===String(state.integralGroupId)&&x.curso===state.integralCourse);
 const picker='<div class="notice"><label>Versão da matriz desta turma<select id="version-select"><option value="">Matriz atual do curso</option>'+versions.filter(x=>x.curso===state.integralCourse).map(v=>'<option value="'+v.id+'" '+(link?.versao_id===v.id?'selected':'')+'>'+esc(v.nome)+'</option>').join('')+'</select></label><p>A situação de cada disciplina é independente do semestre previsto na matriz.</p></div>';
 html=html.replace('<div class="card">',picker+'<div class="card">');
 if(!link)return html;
 const subset=items.filter(x=>x.versao_id===link.versao_id).sort((a,b)=>a.semestre-b.semestre||a.disciplina.localeCompare(b.disciplina,'pt-BR'));
 const rows=subset.map(d=>{const h=history.find(x=>x.turma_id===link.turma_id&&x.disciplina_id===d.id)||{};return '<tr><td>'+d.semestre+'º</td><td><b>'+esc(d.disciplina)+'</b><br>'+d.carga_horaria+'h</td><td><select data-version-status="'+d.id+'">'+Object.entries(progressLabels).map(([k,v])=>'<option value="'+k+'" '+((h.status||'pendente')===k?'selected':'')+'>'+esc(v)+'</option>').join('')+'</select></td><td><input data-version-term="'+d.id+'" value="'+esc(h.periodo_oferta||'')+'"></td><td><input data-version-notes="'+d.id+'" value="'+esc(h.observacoes||'')+'"></td><td><button class="mini" data-version-save="'+d.id+'">Salvar oferta/observações</button></td></tr>'}).join('');
 return html.replace(/<tbody>[\s\S]*?<\/tbody>/,'<tbody>'+rows+'</tbody>');
 };
 const previousBind=bind;bind=function(){previousBind();if(state.page!=='integral'||!available)return;
 document.querySelector('#version-select')?.addEventListener('change',async e=>{const group=Number(state.integralGroupId),version=Number(e.target.value);if(!group)return toast('Selecione uma turma.');if(!confirm('Vincular esta turma à matriz selecionada? Os históricos serão preservados separadamente.'))return render();e.target.disabled=true;const r=version?await banco.from('turma_matriz_versao').upsert({turma_id:group,curso:state.integralCourse,versao_id:version},{onConflict:'turma_id,curso'}):await banco.from('turma_matriz_versao').delete().eq('turma_id',group).eq('curso',state.integralCourse);if(r.error){toast(r.error.message);return render()}await loadData();render()});
 async function save(id,control){control.disabled=true;try{const payload={turma_id:Number(state.integralGroupId),disciplina_id:Number(id),status:document.querySelector('[data-version-status="'+id+'"]').value,periodo_oferta:document.querySelector('[data-version-term="'+id+'"]').value.trim()||null,observacoes:document.querySelector('[data-version-notes="'+id+'"]').value.trim()||null};const{error}=await banco.from('turma_versao_historico').upsert(payload,{onConflict:'turma_id,disciplina_id'});if(error)throw error;history=history.filter(h=>!(h.turma_id===payload.turma_id&&h.disciplina_id===payload.disciplina_id));history.push(payload);document.dispatchEvent(new Event('integral-version-saved'));toast('Integralização salva.')}catch(e){toast('Erro ao salvar: '+e.message)}finally{control.disabled=false}}
 document.querySelectorAll('[data-version-save]').forEach(b=>b.onclick=()=>save(b.dataset.versionSave,b));
 document.querySelectorAll('[data-version-status]').forEach(s=>s.onchange=()=>save(s.dataset.versionStatus,s));
 };
})();
