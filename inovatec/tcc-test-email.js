(async()=>{
 const management=document.querySelector('#management');
 if(!management)return;
 const db=Inovatec.api();
 const {data:{session}}=await db.auth.getSession();
 if(!session)return;
 const {data:profile}=await db.from('perfis').select('papel,ativo').eq('id',session.user.id).maybeSingle();
 if(!profile?.ativo||profile.papel!=='coordenador')return;
 const panel=document.createElement('section');
 panel.className='panel';
 panel.innerHTML='<h2>Teste de e-mail do TCC</h2><p>Envia uma mensagem somente ao endereço de teste configurado no Supabase. Nenhum estudante recebe aviso.</p><button type="button" class="secondary">Enviar e-mail de teste</button><p role="status"></p>';
 management.prepend(panel);
 const button=panel.querySelector('button'), status=panel.querySelector('[role=status]');
 button.onclick=async()=>{
  button.disabled=true;
  status.textContent='Enviando…';
  try{
   const {data,error}=await db.functions.invoke('tcc-test-email',{body:{}});
   if(error){
    const detail=await error.context?.json?.().catch(()=>null);
    throw new Error(detail?.error||'Confira se a versão atualizada da função foi publicada no Supabase.');
   }
   if(data?.aceito!==true)throw new Error('A função não confirmou o envio.');
   status.textContent='O Resend aceitou o envio. Confira a caixa de entrada e o spam.';
  }catch(error){status.textContent='Teste não concluído: '+error.message}
  finally{button.disabled=false}
 };
})().catch(error=>console.error('Painel de teste de e-mail indisponível.',error));
