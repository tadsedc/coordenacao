(()=>{
 const previous=layout;
 layout=function(content,title){
  if(state.role==='coord'&&state.page==='dash'){
   content='<section class="notice" id="tcc-email-test"><strong>Teste de e-mail do TCC</strong><p>Envia somente para o endereço de teste configurado no Supabase.</p><button type="button" class="btn soft">Enviar e-mail de teste</button><p role="status"></p></section>'+content;
  }
  return previous(content,title);
 };
 document.addEventListener('click',async event=>{
  const button=event.target.closest?.('#tcc-email-test button');
  if(!button||button.disabled||state.role!=='coord')return;
  const status=button.parentElement.querySelector('[role=status]');
  button.disabled=true;
  status.textContent='Enviando…';
  try{
   const {data,error}=await banco.functions.invoke('tcc-test-email',{body:{}});
   if(error){
    const detail=await error.context?.json?.().catch(()=>null);
    throw new Error(detail?.error||'Confira se a versão atualizada da função foi publicada no Supabase.');
   }
   if(data?.aceito!==true)throw new Error('A função não confirmou o envio.');
   status.textContent='O Resend aceitou o envio. Confira a caixa de entrada e o spam.';
  }catch(error){status.textContent='Teste não concluído: '+error.message}
  finally{button.disabled=false}
 });
})();
