(()=>{
 const panel=document.querySelector('#tcc-email-test');
 if(!panel)return;
 const db=Inovatec.api();
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
 button.disabled=false;
})();
