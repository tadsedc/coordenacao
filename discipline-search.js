/* Busca de disciplinas nas áreas acadêmicas da coordenação. */
(function(){
  const supportedPages=new Set(['dash','classes','integral']);
  state.disciplineSearch=state.disciplineSearch||'';

  function normalize(value){
    return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  }

  function searchField(){
    const wrap=document.createElement('div');
    wrap.className='discipline-search';
    wrap.innerHTML='<label for="discipline-search-input"><span aria-hidden="true">⌕</span><span>Buscar disciplina</span></label><div class="discipline-search-control"><input id="discipline-search-input" type="search" autocomplete="off" placeholder="Digite o nome da disciplina" aria-label="Buscar disciplina"><button type="button" class="discipline-search-clear" aria-label="Limpar busca" title="Limpar busca">×</button></div>';
    const input=wrap.querySelector('input');
    input.value=state.disciplineSearch;
    input.addEventListener('input',()=>{state.disciplineSearch=input.value;applySearch()});
    wrap.querySelector('button').addEventListener('click',()=>{state.disciplineSearch='';input.value='';applySearch();input.focus()});
    return wrap;
  }

  function subjectOf(element){
    if(state.page==='integral')return element.querySelector('td:nth-child(2) b')?.textContent||'';
    return element.querySelector('.discipline b,h3')?.textContent||'';
  }

  function applySearch(){
    if(state.role!=='coord'||!supportedPages.has(state.page))return;
    const query=normalize(state.disciplineSearch);
    const desktop=[...document.querySelectorAll('.desktop-schedule tbody tr')];
    const mobile=[...document.querySelectorAll('.mobile-schedule .schedule-card')];
    const integral=state.page==='integral'?[...document.querySelectorAll('.card .table tbody tr')]:[];
    const rows=state.page==='integral'?integral:[...desktop,...mobile];
    rows.forEach(row=>{row.hidden=!!query&&!normalize(subjectOf(row)).includes(query)});
    const visible=rows.filter(row=>!row.hidden).length;
    const logicalVisible=state.page==='integral'?visible:visible/2;
    const empty=document.querySelector('.discipline-search-empty');
    if(empty){
      empty.hidden=!query||logicalVisible>0;
      empty.textContent='Nenhuma disciplina encontrada para “'+state.disciplineSearch.trim()+'”.';
    }
    const clear=document.querySelector('.discipline-search-clear');
    if(clear)clear.hidden=!query;
  }

  function installSearch(){
    if(state.role!=='coord'||!supportedPages.has(state.page))return;
    const content=document.querySelector('.content');
    if(!content||content.querySelector('.discipline-search'))return;
    const field=searchField();
    const anchor=state.page==='integral'?content.querySelector('.toolbar'):content.querySelector('.card');
    if(anchor)anchor.before(field);else content.querySelector('.head')?.after(field);
    const empty=document.createElement('div');
    empty.className='empty discipline-search-empty';
    empty.hidden=true;
    const card=content.querySelector('.card');
    if(card)card.appendChild(empty);
    applySearch();
  }

  const previousRender=render;
  render=function(){previousRender();installSearch()};

  const style=document.createElement('style');
  style.textContent='.discipline-search{display:flex;align-items:end;gap:12px;margin:0 0 16px;padding:13px 15px;border:1px solid #dbe9e5;border-radius:14px;background:#fff;box-shadow:0 8px 24px #173f360b}.discipline-search>label{min-width:138px;color:var(--g2);font-size:12px;font-weight:850}.discipline-search>label span:first-child{font-size:18px;margin-right:6px}.discipline-search-control{position:relative;flex:1}.discipline-search input{width:100%;padding-right:42px}.discipline-search-clear{position:absolute;right:7px;top:50%;transform:translateY(-50%);width:30px;height:30px;border:0;border-radius:8px;background:#eef5f2;color:var(--g2);font-size:20px;line-height:1;cursor:pointer}.discipline-search-empty{margin:14px}.desktop-schedule tr[hidden],.mobile-schedule .schedule-card[hidden],.card .table tr[hidden]{display:none!important}@media(max-width:700px){.discipline-search{display:block;padding:12px}.discipline-search>label{display:block;margin:0 0 7px}.discipline-search input{font-size:16px}}';
  document.head.appendChild(style);
  installSearch();
})();
