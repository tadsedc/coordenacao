(async function(){
  const SUPABASE_URL='https://uvdnejmdqgwdcipctyur.supabase.co';
  const SUPABASE_KEY='sb_publishable_Afn5llFEgcHD4Uhmt8N4pA_W0T_NHZk';
  const root=document.getElementById('document-root');
  const esc=value=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  function slugFromLocation(){let path=decodeURIComponent(location.pathname).replace(/^\/+|\/+$/g,'');if(location.hostname.endsWith('github.io'))path=path.replace(/^coordenacao\/?/,'');return new URLSearchParams(location.search).get('slug')||path.split('/')[0]||''}
  function state(title,message){root.innerHTML='<section class="doc-state"><div class="doc-state-icon">i</div><h1>'+esc(title)+'</h1><p>'+esc(message)+'</p><a class="doc-button" href="./">Voltar ao portal</a></section>'}
  try{
    const slug=slugFromLocation();if(!slug)return state('Documento não informado','Confira o endereço recebido e tente novamente.');
    const banco=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
    const {data,error}=await banco.from('documentos_publicos').select('titulo,slug,arquivo_path,nome_arquivo,atualizado_em').eq('slug',slug).eq('ativo',true).maybeSingle();
    if(error)throw error;if(!data)return state('Documento indisponível','O endereço pode estar incorreto ou ter sido desativado pela coordenação.');
    const signed=await banco.storage.from('documentos-publicos').createSignedUrl(data.arquivo_path,3600);if(signed.error)throw signed.error;
    const url=signed.data.signedUrl,download=await banco.storage.from('documentos-publicos').createSignedUrl(data.arquivo_path,3600,{download:data.nome_arquivo});
    document.title=data.titulo+' | Portal da Coordenação';
    root.innerHTML='<div class="doc-heading"><div><p>Documento público</p><h1>'+esc(data.titulo)+'</h1></div><div class="doc-actions"><a class="doc-button secondary" href="'+esc(url)+'" target="_blank" rel="noopener">Abrir em tela cheia</a><a class="doc-button" href="'+esc(download.data?.signedUrl||url)+'">Baixar PDF</a></div></div><iframe class="doc-frame" title="'+esc(data.titulo)+'" src="'+esc(url)+'#view=FitH"></iframe><p class="doc-note">Se a visualização não carregar no seu aparelho, use Abrir em tela cheia ou Baixar PDF.</p>';
  }catch(error){console.error(error);state('Não foi possível abrir o documento','Tente novamente em alguns instantes ou solicite um novo link à coordenação.');}
})();
