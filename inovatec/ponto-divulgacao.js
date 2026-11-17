(()=>{
 const db=Inovatec.api();
 const panel=document.createElement('section');panel.className='panel';panel.hidden=true;
 panel.innerHTML='<h2>Divulgação do Ponto INOVATEC</h2><p>O acesso na página pública do evento fica oculto até a liberação da coordenação. Ocultar este card não invalida declarações nem bloqueia a verificação de autenticidade.</p><label class="inline-check"><input type="checkbox" id="point-published"> Exibir Ponto INOVATEC na página do evento</label><button class="secondary" id="save-point-publication" disabled>Salvar divulgação</button><p id="point-publication-status" role="status"></p>';
 document.querySelector('#management')?.prepend(panel);
 const toggle=panel.querySelector('input'),button=panel.querySelector('button'),status=panel.querySelector('[role=status]');
 async function load(){const{data,error}=await db.from('inovatec_configuracoes').select('ponto_divulgado').eq('id',1).single();if(error)throw error;toggle.checked=data.ponto_divulgado===true;status.textContent=toggle.checked?'Divulgação liberada.':'Oculto para os estudantes na página do evento.';button.disabled=false}
 button.onclick=async()=>{button.disabled=true;try{const{data,error}=await db.from('inovatec_configuracoes').update({ponto_divulgado:toggle.checked,atualizado_em:new Date().toISOString()}).eq('id',1).select('ponto_divulgado').single();if(error)throw error;toggle.checked=data.ponto_divulgado===true;status.textContent=toggle.checked?'Divulgação liberada.':'Divulgação ocultada.'}catch(e){status.textContent='Não foi possível salvar: '+e.message}finally{button.disabled=false}};
 (async()=>{const{data:{session}}=await db.auth.getSession();if(!session)return;const{data:p}=await db.from('perfis').select('papel,ativo').eq('id',session.user.id).single();if(!p?.ativo||p.papel!=='coordenador')return;panel.hidden=false;try{await load()}catch(e){status.textContent='Execute o SQL de divulgação do Ponto INOVATEC para habilitar este controle. '+e.message}})();
})();
