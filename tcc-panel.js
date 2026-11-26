(()=>{
 const previous=layout;
 layout=function(content,title){
  if((state.role==='coord'&&state.page==='dash')||(state.role==='teacher'&&state.page==='mine')){
   content='<section class="notice"><strong>Trabalhos de Conclusão de Curso</strong><p>Consulte os trabalhos recebidos e as ações disponíveis para seu perfil.</p><a class="btn soft" href="/tcc/?acesso=equipe">Abrir gestão de TCC</a></section>'+content;
  }
  return previous(content,title);
 };
})();
