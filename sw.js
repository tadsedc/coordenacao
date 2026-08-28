/* Service worker do portal público (tadsedc.site) — existe só para
   habilitar a instalação como app no celular ("Adicionar à tela
   inicial" / prompt de instalação do Chrome/Android) e dar uma
   resiliência básica de rede.

   Estratégia deliberadamente conservadora, porque os dados do portal
   vêm ao vivo do Supabase e não podem ficar desatualizados:
   - Só intercepta requisições GET de mesma origem (nunca o Supabase,
     nunca CDNs como jsDelivr/Google Fonts) — essas seguem direto para
     a rede, sem passar por aqui.
   - "Network-first": sempre tenta a rede primeiro; só usa o cache
     como fallback se a rede falhar (por exemplo, sem conexão). Isso
     evita servir uma versão antiga de um arquivo quando há internet.
   - Guarda só o essencial (HTML/CSS/JS/ícones da casca do app), não
     dados. */
const CACHE_NAME='tadsedc-shell-v1';
const APP_SHELL=[
  '/',
  '/ads/',
  '/edc/',
  '/novo-site/app.js',
  '/novo-site/styles.css',
  '/manifest.webmanifest',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/favicon.ico'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache=>cache.addAll(APP_SHELL))
      .catch(()=>{/* não trava a instalação se algum recurso falhar */})
  );
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(names=>Promise.all(
      names.filter(name=>name!==CACHE_NAME).map(name=>caches.delete(name))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return; // nunca intercepta Supabase/CDNs

  event.respondWith(
    fetch(request)
      .then(response=>{
        if(response&&response.ok){
          const copy=response.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put(request,copy)).catch(()=>{});
        }
        return response;
      })
      .catch(()=>caches.match(request).then(cached=>cached||caches.match('/')))
  );
});
