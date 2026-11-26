(()=>{
 const staff=()=>['coord','teacher'].includes(state.role);
 const previousNav=nav;
 nav=function(){
  const html=previousNav();
  if(!staff())return html;
  const entry='<button data-page="tcc" class="'+(state.page==='tcc'?'on':'')+'"><b class="nav-icon">'+navIcon('classes')+'</b>TCC</button>';
  return html.replace('<button data-page="public"',entry+'<button data-page="public"');
 };
 const previousRender=render;
 render=function(){
  if(auth&&staff()&&state.page==='tcc'){
   document.getElementById('root').innerHTML=layout(
    '<div class="section-head"><h1>Trabalhos de Conclusão de Curso</h1><p>Consulte as entregas e as ações disponíveis para o seu perfil.</p></div>'+
    '<iframe src="/tcc/?acesso=equipe&amp;integrado=1" title="Gestão de trabalhos de conclusão de curso" style="display:block;width:100%;height:max(480px,calc(100dvh - 220px));border:0;border-radius:18px"></iframe>',
    'TCC');
   bind();
   return;
  }
  return previousRender();
 };
})();
