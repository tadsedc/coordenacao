/* Botão "Compartilhar" nos cartões públicos do portal (Portal do
   Aluno) — grade de horários, Datas importantes e Informes da
   coordenação — para o estudante enviar um card específico como
   imagem para um colega, por exemplo pelo WhatsApp.

   Como funciona:
   1. Três funções que geram cards públicos ganham um botão a mais em
      cada card: `tiles()` (grade), `examCalendar()` só quando
      `state.page==='public'` (ela também é usada na página interna de
      coordenação/professor, que não deve ganhar o botão) e
      `portalNotices()` (só a versão pública dos informes; a versão de
      administração, `notices()`, é uma função separada e não é
      tocada). Em todos os casos, o botão é colocado por posição no
      HTML já gerado (não por comparação de texto), para não misturar
      dois cards com conteúdo parecido — por exemplo, duas aulas com o
      mesmo professor.
   2. Ao clicar, o card (o `<article>` mais próximo do botão) é
      transformado em imagem PNG com a biblioteca html2canvas,
      carregada só nesse momento — não pesa no carregamento normal da
      página — e hospedada localmente em ./vendor, mesmo padrão já
      usado para o gerador de documentos Word, então continua
      funcionando mesmo se algum CDN externo estiver fora do ar.
   3. Se o navegador oferece a Web Share API com arquivos (a maioria
      dos celulares), abre o menu nativo de compartilhamento do
      aparelho — de onde o estudante escolhe WhatsApp, Telegram etc.
      Caso contrário (a maioria dos desktops), a imagem é baixada e um
      aviso explica que ela já pode ser enviada manualmente. */
(function(){
  const SHARE_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v14"/></svg>';

  function buildShareButton(label){
    const button=document.createElement('button');
    button.type='button';
    button.className='mini share-card-button';
    button.dataset.shareHide='1';
    button.setAttribute('aria-label',label);
    button.innerHTML=SHARE_ICON+'<span>Compartilhar</span>';
    return button;
  }

  function withParsedHtml(html,fn){
    const wrap=document.createElement('div');
    wrap.innerHTML=html;
    fn(wrap);
    return wrap.innerHTML;
  }

  // 1) Grade de horários (Portal do Aluno).
  const tilesBeforeShare=tiles;
  tiles=function(items,editable=false){
    const html=tilesBeforeShare(items,editable);
    if(state.page!=='public')return html;
    return withParsedHtml(html,wrap=>{
      [...wrap.querySelectorAll('.tile')].forEach((card,index)=>{
        const roomline=card.querySelector('.roomline');
        if(!items[index]||!roomline)return;
        roomline.appendChild(buildShareButton('Compartilhar esta aula'));
      });
    });
  };

  // 2) Datas importantes — só a versão pública (a interna de
  // coordenação/professor usa a mesma função, mas com state.page
  // diferente de 'public', então não é afetada).
  const examCalendarBeforeShare=examCalendar;
  examCalendar=function(items,admin=false){
    const html=examCalendarBeforeShare(items,admin);
    if(state.page!=='public')return html;
    return withParsedHtml(html,wrap=>{
      wrap.querySelectorAll('.exam-card').forEach(card=>{
        const footer=document.createElement('div');
        footer.className='share-card-footer';
        footer.appendChild(buildShareButton('Compartilhar esta data'));
        card.appendChild(footer);
      });
    });
  };

  // 3) Informes da coordenação — só `portalNotices()` (a versão
  // pública). `notices()`, a tela de administração, é outra função e
  // não é tocada.
  const portalNoticesBeforeShare=portalNotices;
  portalNotices=function(){
    const html=portalNoticesBeforeShare();
    return withParsedHtml(html,wrap=>{
      wrap.querySelectorAll('.notice-card').forEach(card=>{
        const footer=document.createElement('div');
        footer.className='share-card-footer';
        footer.appendChild(buildShareButton('Compartilhar este informe'));
        card.appendChild(footer);
      });
    });
  };

  async function ensureHtml2Canvas(){
    if(window.html2canvas)return;
    await loadScriptOnce('./vendor/html2canvas.min.js?v=1.4.1');
    if(!window.html2canvas)throw new Error('html2canvas não carregou');
  }

  function safeFileName(text){
    const slug=String(text||'card').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
    return (slug||'card').slice(0,40);
  }

  function cardLabel(card){
    return card.querySelector('h3,h4')?.textContent?.trim()
      ||card.querySelector('time')?.textContent?.trim()
      ||'Compartilhar';
  }

  async function shareCard(button){
    const card=button.closest('article');
    if(!card)return;
    const subject=cardLabel(card);
    const originalHtml=button.innerHTML;
    button.disabled=true;
    button.innerHTML='<span>Gerando imagem…</span>';
    const hiddenEls=[...card.querySelectorAll('[data-share-hide]')];
    const previousDisplay=hiddenEls.map(el=>el.style.display);
    const watermark=document.createElement('div');
    watermark.className='share-card-watermark';
    watermark.textContent='tadsedc.site · TADS e Engenharia de Computação';
    try{
      await ensureHtml2Canvas();
      hiddenEls.forEach(el=>{el.style.display='none'});
      card.appendChild(watermark);
      const canvas=await window.html2canvas(card,{backgroundColor:'#ffffff',scale:Math.min(3,(window.devicePixelRatio||1)*1.5)});
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      if(!blob)throw new Error('Falha ao gerar a imagem do card.');
      const fileName='tadsedc-'+safeFileName(subject)+'.png';
      const file=new File([blob],fileName,{type:'image/png'});
      const shareText=subject+' · tadsedc.site';
      if(navigator.canShare&&navigator.canShare({files:[file]})){
        await navigator.share({files:[file],title:subject,text:shareText});
      }else{
        const url=URL.createObjectURL(blob);
        const link=document.createElement('a');
        link.href=url;link.download=fileName;document.body.appendChild(link);link.click();link.remove();
        setTimeout(()=>URL.revokeObjectURL(url),4000);
        toast('Imagem salva. Agora é só enviar pelo WhatsApp ou outro aplicativo.');
      }
    }catch(error){
      if(error?.name!=='AbortError'){
        console.error(error);
        toast('Não foi possível compartilhar agora. Tente novamente em instantes.');
      }
    }finally{
      watermark.remove();
      hiddenEls.forEach((el,index)=>{el.style.display=previousDisplay[index]});
      button.disabled=false;
      button.innerHTML=originalHtml;
    }
  }

  const bindBeforeShare=bind;
  bind=function(){
    bindBeforeShare();
    document.querySelectorAll('.share-card-button').forEach(button=>{
      button.onclick=()=>shareCard(button);
    });
  };
})();
