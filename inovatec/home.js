(()=>{
  const api=window.supabase?.createClient('https://uvdnejmdqgwdcipctyur.supabase.co','sb_publishable_Afn5llFEgcHD4Uhmt8N4pA_W0T_NHZk');
  if(!api)return;
  api.from('inovatec_configuracoes').select('*').eq('id',1).maybeSingle().then(({data,error})=>{
    if(error||!data)return;
    if(data.inscricoes_abertas)document.getElementById('showcase').hidden=false;
    if(!data.oficinas_inscricoes_abertas)return;
    const card=document.getElementById('workshops');
    card?.classList.add('is-open');
    const kicker=document.getElementById('workshops-kicker');
    if(kicker)kicker.textContent='INSCRIÇÕES ABERTAS · VAGAS LIMITADAS';
    card?.parentElement?.prepend(card);
  });
})();
