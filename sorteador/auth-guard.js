(function(){
  const SUPABASE_URL='https://uvdnejmdqgwdcipctyur.supabase.co';
  const SUPABASE_KEY='sb_publishable_Afn5llFEgcHD4Uhmt8N4pA_W0T_NHZk';
  const loginUrl='../professor/?destino=sorteador';

  function liberar(){document.documentElement.classList.remove('auth-pending')}
  function mostrarErro(){
    liberar();
    const montar=()=>{
      document.body.innerHTML='<main style="min-height:100vh;display:grid;place-items:center;padding:24px;font-family:system-ui,sans-serif;background:#f5f3ed;color:#18332d"><section style="max-width:520px;text-align:center;background:white;padding:32px;border-radius:22px;box-shadow:0 18px 50px rgba(20,50,44,.12)"><h1 style="margin-top:0">Não foi possível validar o acesso</h1><p>Verifique sua conexão e tente novamente.</p><button onclick="location.reload()" style="border:0;border-radius:12px;padding:12px 20px;background:#173f36;color:white;font-weight:700;cursor:pointer">Tentar novamente</button></section></main>';
    };
    if(document.body)montar();else window.addEventListener('DOMContentLoaded',montar,{once:true});
  }

  window.__sorteadorAuth=(async()=>{
    try{
      if(!window.supabase)throw new Error('Biblioteca de autenticação indisponível.');
      const api=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
      const {data:{session},error:sessionError}=await api.auth.getSession();
      if(sessionError)throw sessionError;
      if(!session){location.replace(loginUrl);return false}
      const {data:perfil,error}=await api.from('perfis').select('papel,ativo').eq('id',session.user.id).maybeSingle();
      if(error)throw error;
      if(!perfil?.ativo||!['professor','coordenador'].includes(perfil.papel)){
        await api.auth.signOut();
        location.replace(loginUrl);
        return false;
      }
      liberar();
      return true;
    }catch(error){
      console.error('Falha ao validar o acesso ao sorteador:',error);
      mostrarErro();
      return false;
    }
  })();
})();
