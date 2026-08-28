/* Botões "Compartilhar" e "Adicionar à agenda" nos cartões públicos do
   Portal do Aluno (dentro do painel: grade de horários, Datas
   importantes e Informes da coordenação) — para o estudante enviar um
   card específico como imagem para um colega (por exemplo, pelo
   WhatsApp) ou importar uma data importante para o calendário do
   celular.

   A imagem do card é desenhada diretamente com a API Canvas 2D (texto,
   caixas, cores — tudo feito na mão pelo próprio JavaScript), a mesma
   técnica usada no site público (novo-site/app.js), em vez de
   "fotografar" o HTML/CSS da página com uma biblioteca como o
   html2canvas — que foi a abordagem original deste arquivo. Aquela
   abordagem dependia do CSS da página estar 100% carregado e resolvido
   no instante exato da captura; quando isso falhava (folha de estilo
   ainda carregando, caminho relativo mal resolvido etc.) a imagem saía
   sem nenhuma estilização — foi exatamente o que aconteceu em
   produção. Desenhar o card à mão elimina essa dependência por
   completo, então os dois lugares (aqui e no site público) agora usam
   a mesma técnica confiável, e a biblioteca html2canvas (vendor/
   html2canvas.min.js) deixou de ser necessária. */
(function(){
  const SHARE_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v14"/></svg>';
  const CALENDAR_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>';

  function buildButton(kind,label){
    const button=document.createElement('button');
    button.type='button';
    button.className='mini share-card-button';
    if(kind==='ics')button.dataset.icsCard='1';else button.dataset.shareCard='1';
    button.setAttribute('aria-label',label);
    button.title=label;
    button.innerHTML=kind==='ics'?CALENDAR_ICON:SHARE_ICON;
    return button;
  }

  function buildFooter(...buttons){
    const footer=document.createElement('div');
    footer.className='share-card-footer';
    buttons.forEach(b=>footer.appendChild(b));
    return footer;
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
        roomline.appendChild(buildFooter(buildButton('share','Compartilhar esta aula')));
      });
    });
  };

  // 2) Datas importantes — só a versão pública (a interna de
  // coordenação/professor usa a mesma função, mas com state.page
  // diferente de 'public', então não é afetada). Também recebe o
  // botão "Adicionar à agenda", já que aqui dá para gravar a data
  // crua (ISO) direto no elemento, vinda do próprio item.
  const examCalendarBeforeShare=examCalendar;
  examCalendar=function(items,admin=false){
    const html=examCalendarBeforeShare(items,admin);
    if(state.page!=='public')return html;
    const sorted=[...items].sort((a,b)=>a.date.localeCompare(b.date));
    return withParsedHtml(html,wrap=>{
      [...wrap.querySelectorAll('.exam-card')].forEach((card,index)=>{
        const item=sorted[index];
        if(item)card.dataset.date=item.date;
        const footer=buildFooter(
          buildButton('ics','Adicionar esta data à agenda'),
          buildButton('share','Compartilhar esta data')
        );
        const tags=card.querySelector('.course-tags');
        if(tags){
          const actions=document.createElement('div');
          actions.className='share-card-actions';
          tags.before(actions);
          actions.append(tags,footer);
        }else card.appendChild(footer);
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
        card.appendChild(buildFooter(buildButton('share','Compartilhar este informe')));
      });
    });
  };

  function slugify(text){
    return String(text||'card').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  }
  function pngFileName(text){return `tadsedc-${(slugify(text)||'card').slice(0,40)}.png`}
  function icsFileName(text){return `tadsedc-${(slugify(text)||'evento').slice(0,40)}.ics`}

  function cardLabel(card){
    return card.querySelector('h3,h4')?.textContent?.trim()
      ||card.querySelector('time')?.textContent?.trim()
      ||'Compartilhar';
  }

  function text(el){return String(el?.textContent||'').replace(/\s+/g,' ').trim()}

  function wrapLines(ctx,value,maxWidth){
    const words=String(value||'').split(/\s+/).filter(Boolean),lines=[];
    let line='';
    words.forEach(word=>{
      const next=line?`${line} ${word}`:word;
      if(line&&ctx.measureText(next).width>maxWidth){lines.push(line);line=word}else line=next;
    });
    if(line)lines.push(line);
    return lines;
  }
  function roundRect(ctx,x,y,w,h,r,fill,stroke){
    ctx.beginPath();
    if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);
    else{
      ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
      ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
      ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
      ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);
    }
    if(fill){ctx.fillStyle=fill;ctx.fill()}
    if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}
  }
  function drawLines(ctx,lines,x,y,lineHeight,color){
    ctx.fillStyle=color;
    lines.forEach(line=>{ctx.fillText(line,x,y);y+=lineHeight});
    return y;
  }

  /* Selo "</>" da coordenação (o mesmo ícone do cabeçalho do site),
     desenhado ao lado do texto do rodapé da imagem — dá pra reconhecer
     de onde veio o card assim que ele chega pelo WhatsApp. */
  const BRAND_MARK_SRC='data:image/png;base64,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';
  let brandMarkPromise=null;
  function loadBrandMark(){
    if(!brandMarkPromise){
      brandMarkPromise=new Promise(resolve=>{
        const img=new Image();
        img.onload=()=>resolve(img);
        img.onerror=()=>resolve(null);
        img.src=BRAND_MARK_SRC;
      });
    }
    return brandMarkPromise;
  }

  const TONE_COLORS={
    bimestral:{bg:'#e7f5e9',accent:'#73b67b'},
    substitutiva:{bg:'#d8eadc',accent:'#276c40'},
    exame:{bg:'#fff4c9',accent:'#d9a61b'},
    institucional:{bg:'#e9f1fb',accent:'#4d7fb5'},
    outro:{bg:'#f0ecff',accent:'#7858c8'}
  };

  function cardData(card){
    if(card.classList.contains('exam-card')){
      const tone=[...card.classList].find(c=>TONE_COLORS[c])||'institucional';
      return {
        type:'exam',
        tone,
        date:text(card.querySelector('.exam-date')),
        label:text(card.querySelector('.exam-type')),
        title:text(card.querySelector('h4'))||'Data importante',
        body:text(card.querySelector('p')),
        room:text(card.querySelector('.exam-room')).replace(/^Local:\s*/i,''),
        tags:[...card.querySelectorAll('.course-tag')].map(text).filter(Boolean),
        notes:text(card.querySelector('small'))
      };
    }
    if(card.classList.contains('notice-card')){
      return {type:'notice',date:text(card.querySelector('time')),title:text(card.querySelector('h3'))||'Informe',body:text(card.querySelector('p'))};
    }
    return {
      type:'lesson',
      time:text(card.querySelector('.day')),
      title:text(card.querySelector('h3'))||'Aula',
      teacher:text(card.querySelector('.meta')),
      room:text(card.querySelector('.roomline b')),
      roomDetail:text(card.querySelector('.roomline small')),
      tags:[...card.querySelectorAll('.student-group-pill')].map(text).filter(Boolean)
    };
  }

  async function renderCardPng(card){
    const data=cardData(card),width=720,pad=42,contentWidth=width-pad*2,scale=2;
    const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
    ctx.font='400 18px Arial';
    const titleLines=wrapLines(ctx,data.title,contentWidth);
    const bodyLines=wrapLines(ctx,data.type==='exam'?data.body:data.type==='notice'?data.body:data.teacher,contentWidth);
    const roomLines=data.room?wrapLines(ctx,data.room,contentWidth-54):[];
    const detailLines=data.roomDetail?wrapLines(ctx,data.roomDetail,contentWidth-54):[];
    let height=data.type==='notice'?250:360;
    height+=Math.max(0,titleLines.length-1)*36+Math.max(0,bodyLines.length-1)*26+Math.max(0,roomLines.length-1)*28+Math.max(0,detailLines.length-1)*24;
    if((data.tags||[]).length)height+=30;
    if(data.notes)height+=28;
    canvas.width=width*scale;canvas.height=height*scale;ctx.scale(scale,scale);
    ctx.textBaseline='alphabetic';
    const tone=data.type==='exam'?(TONE_COLORS[data.tone]||TONE_COLORS.institucional):null;
    const bg=tone?tone.bg:'#ffffff';
    roundRect(ctx,0,0,width,height,26,bg,'#d8e1df');
    if(tone){ctx.fillStyle=tone.accent;ctx.fillRect(0,0,9,height)}
    let y=48;
    ctx.fillStyle='#61768b';ctx.font='600 18px Arial';
    if(data.date){ctx.fillText(data.date,pad,y);y+=30}
    if(data.label){
      ctx.font='700 14px Arial';
      const labelWidth=Math.min(contentWidth,ctx.measureText(data.label).width+28);
      roundRect(ctx,pad,y-19,labelWidth,34,17,'#ffffff');
      ctx.fillStyle='#0c2340';ctx.fillText(data.label,pad+14,y+3);y+=52;
    }
    if(data.time){ctx.fillStyle='#61768b';ctx.font='600 18px Arial';ctx.fillText(data.time,pad,y);y+=34}
    ctx.fillStyle='#0c2340';ctx.font='700 29px Arial';
    y=drawLines(ctx,titleLines,pad,y,36,'#0c2340')+10;
    ctx.font='400 21px Arial';
    y=drawLines(ctx,bodyLines,pad,y,29,'#61768b')+14;
    if(data.notes){ctx.font='400 17px Arial';y=drawLines(ctx,wrapLines(ctx,data.notes,contentWidth),pad,y,24,'#61768b')+10}
    if(roomLines.length||detailLines.length){
      ctx.strokeStyle='#d8e1df';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(width-pad,y);ctx.stroke();y+=33;
      roundRect(ctx,pad,y-21,38,38,12,'#e6f4ff');
      ctx.strokeStyle='#0878c9';ctx.lineWidth=2;ctx.beginPath();ctx.arc(pad+19,y-4,8,0,Math.PI*2);ctx.stroke();
      ctx.font='700 21px Arial';y=drawLines(ctx,roomLines,pad+54,y+3,28,'#0c2340');
      ctx.font='400 17px Arial';y=drawLines(ctx,detailLines,pad+54,y+1,24,'#61768b')+10;
    }
    if((data.tags||[]).length){
      ctx.font='700 14px Arial';let x=pad;
      data.tags.forEach(tag=>{
        const w=ctx.measureText(tag).width+22;
        if(x+w>width-pad){x=pad;y+=28}
        roundRect(ctx,x,y-17,w,28,10,'#e6f4ff');
        ctx.fillStyle='#0878c9';ctx.fillText(tag,x+11,y+2);x+=w+8;
      });
      y+=32;
    }
    const footerY=height-42;
    ctx.strokeStyle='#d8e1df';ctx.setLineDash([5,4]);ctx.beginPath();ctx.moveTo(pad,footerY-24);ctx.lineTo(width-pad,footerY-24);ctx.stroke();ctx.setLineDash([]);
    ctx.font='400 16px Arial';
    const watermarkText='tadsedc.site · TADS e Engenharia de Computação';
    const brandMark=await loadBrandMark();
    const iconSize=20,iconGap=8;
    const textWidth=ctx.measureText(watermarkText).width;
    const blockWidth=(brandMark?iconSize+iconGap:0)+textWidth;
    let wx=width/2-blockWidth/2;
    if(brandMark){ctx.drawImage(brandMark,wx,footerY-iconSize+5,iconSize,iconSize);wx+=iconSize+iconGap}
    ctx.textAlign='left';ctx.fillStyle='#61768b';ctx.fillText(watermarkText,wx,footerY);ctx.textAlign='start';
    return new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  }

  function pad2(n){return String(n).padStart(2,'0')}
  function icsTimestamp(){const d=new Date();return `${d.getUTCFullYear()}${pad2(d.getUTCMonth()+1)}${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`}
  function icsEscape(value){return String(value||'').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n')}
  function icsAllDayRange(isoDate){
    const [y,m,d]=isoDate.split('-').map(Number);
    const start=new Date(Date.UTC(y,m-1,d)),end=new Date(Date.UTC(y,m-1,d+1));
    const fmt=dt=>`${dt.getUTCFullYear()}${pad2(dt.getUTCMonth()+1)}${pad2(dt.getUTCDate())}`;
    return {start:fmt(start),end:fmt(end)};
  }
  function buildIcs(card){
    const isoDate=card.dataset.date;
    if(!isoDate)return null;
    const data=cardData(card);
    const {start,end}=icsAllDayRange(isoDate);
    const descriptionParts=[data.label,data.body].filter(Boolean);
    const lines=[
      'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Coordenacao TADS e EDC//Painel//PT','CALSCALE:GREGORIAN','BEGIN:VEVENT',
      `UID:${isoDate}-${Math.random().toString(36).slice(2,10)}@tadsedc.site`,
      `DTSTAMP:${icsTimestamp()}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${icsEscape(data.title)}`,
      descriptionParts.length?`DESCRIPTION:${icsEscape(descriptionParts.join(' - '))}`:null,
      data.room?`LOCATION:${icsEscape(data.room)}`:null,
      'END:VEVENT','END:VCALENDAR'
    ].filter(Boolean);
    return new Blob([lines.join('\r\n')],{type:'text/calendar;charset=utf-8'});
  }

  function downloadBlob(blob,fileName){
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;link.download=fileName;document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),4000);
  }

  async function shareCard(button){
    const card=button.closest('article');
    if(!card)return;
    const subject=cardLabel(card);
    const originalHtml=button.innerHTML;
    button.disabled=true;
    button.innerHTML='<span class="share-card-spinner" aria-hidden="true"></span>';
    try{
      const blob=await renderCardPng(card);
      if(!blob)throw new Error('Falha ao gerar a imagem do card.');
      const file=new File([blob],pngFileName(subject),{type:'image/png'});
      const shareText=subject+' · tadsedc.site';
      if(navigator.canShare&&navigator.canShare({files:[file]})){
        await navigator.share({files:[file],title:subject,text:shareText});
      }else{
        downloadBlob(blob,pngFileName(subject));
        toast('Imagem salva. Agora é só enviar pelo WhatsApp ou outro aplicativo.');
      }
    }catch(error){
      if(error?.name!=='AbortError'){
        console.error(error);
        toast('Não foi possível compartilhar agora. Tente novamente em instantes.');
      }
    }finally{
      button.disabled=false;
      button.innerHTML=originalHtml;
    }
  }

  function addToCalendar(button){
    const card=button.closest('article');
    if(!card)return;
    const blob=buildIcs(card);
    if(!blob){toast('Não foi possível gerar o evento para a agenda.');return}
    downloadBlob(blob,icsFileName(cardLabel(card)));
    toast('Evento baixado. Abra o arquivo para adicionar à sua agenda.');
  }

  const bindBeforeShare=bind;
  bind=function(){
    bindBeforeShare();
    document.querySelectorAll('[data-share-card]').forEach(button=>{button.onclick=()=>shareCard(button)});
    document.querySelectorAll('[data-ics-card]').forEach(button=>{button.onclick=()=>addToCalendar(button)});
  };
})();
