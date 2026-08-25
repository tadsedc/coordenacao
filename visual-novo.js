(function(){
  const icon='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const markup='<span class="np-portal-brand"><span class="np-portal-mark">'+icon+'</span><span class="np-portal-copy"><strong>Coordenação</strong><small>TADS e EDC · AEMS</small></span></span>';
  function applyVisualIdentity(){
    document.querySelectorAll('.brand-visual').forEach(function(el){if(!el.querySelector('.np-portal-brand'))el.insertAdjacentHTML('beforeend',markup)});
    document.querySelectorAll('a[href]').forEach(function(link){
      const href=link.getAttribute('href')||'';
      if(href==='/painel.html?acesso=professor'||href.endsWith('/professor/'))link.setAttribute('href','/professor-novo/');
      if(href==='/painel.html?acesso=estagio'||href.endsWith('/estagio/'))link.setAttribute('href','/estagio-novo/');
    });
  }
  applyVisualIdentity();
  new MutationObserver(applyVisualIdentity).observe(document.documentElement,{childList:true,subtree:true});
})();
