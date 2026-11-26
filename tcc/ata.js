(()=>{
 const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
 const XML='http://www.w3.org/XML/1998/namespace';
 const courses={ADS:'Análise e Desenvolvimento de Sistemas',EDC:'Engenharia de Computação'};
 const $=id=>document.getElementById(id);
 const texts=p=>[...p.getElementsByTagNameNS(W,'t')];
 const content=p=>texts(p).map(t=>t.textContent).join('');
 function replace(p,old,value,black=false){
  const pos=content(p).indexOf(old);
  if(pos<0)return false;
  let offset=0,inserted=false;
  for(const t of texts(p)){
   const current=t.textContent,start=offset,end=start+current.length;
   offset=end;
   if(end<=pos||start>=pos+old.length)continue;
   t.textContent=current.slice(0,Math.max(0,pos-start))+(inserted?'':value)+current.slice(Math.min(current.length,pos+old.length-start));
   t.setAttributeNS(XML,'xml:space','preserve');
   if(black){
    const run=t.parentNode;
    const properties=run.getElementsByTagNameNS(W,'rPr')[0]||run.insertBefore(p.ownerDocument.createElementNS(W,'w:rPr'),run.firstChild);
    const color=properties.getElementsByTagNameNS(W,'color')[0]||properties.appendChild(p.ownerDocument.createElementNS(W,'w:color'));
    for(const attr of ['themeColor','themeTint','themeShade'])color.removeAttributeNS(W,attr);
    color.setAttributeNS(W,'w:val','000000');
   }
   inserted=true;
  }
  return true;
 }
 function renderXml(xml,work,data,part){
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.getElementsByTagName('parsererror').length)throw Error('O modelo da ata não pôde ser lido.');
  const paragraphs=[...doc.getElementsByTagNameNS(W,'p')];
  const course=courses[data.curso];
  if(!course)throw Error('Selecione o curso.');
  for(const p of paragraphs)if(data.curso==='EDC'){
   replace(p,'Coordenação do Curso Superior de Tecnologia em','Coordenação do Curso de');
   replace(p,'Curso de Tecnologia em Análise e Desenvolvimento de Sistemas','Curso de Engenharia de Computação');
   replace(p,'Curso de Tecnologia em Análise e Desenvolvimento de Sistemas','Curso de Engenharia de Computação');
   replace(p,'Análise e Desenvolvimento de Sistemas',course);
   replace(p,'título de tecnólogo','título de engenheiro');
  }
  if(part==='word/document.xml'){
   const day=new Intl.DateTimeFormat('pt-BR',{dateStyle:'long',timeZone:'UTC'}).format(new Date(data.data+'T12:00:00Z'));
   const fill=(p,key,value)=>{if(!p||!replace(p,key,value,true))throw Error('O modelo não contém o campo '+key+'.');};
   const intro=paragraphs.find(p=>content(p).includes('[DATA DO AGENDAMENTO DA BANCA]'));
   const professors=paragraphs.filter(p=>content(p).includes('[NOME COMPLETO DO PROFESSOR]'));
   const sign1=paragraphs.find(p=>content(p).includes('[NOME DO PRIMEIRO ESTUDANTE]'));
   const sign2=paragraphs.find(p=>content(p).includes('[NOME DO SEGUNDO ESTUDANTE]'));
   if(professors.length!==3||!sign1||!sign2||!work.autores?.length)throw Error('Confira os campos de banca e assinaturas do modelo.');
   const result=paragraphs.find(p=>content(p).includes('foram APROVADOS'));
   if(!result||!replace(result,'foram APROVADOS','obtiveram o resultado ______________________'))throw Error('Campo de resultado ausente.');
   fill(intro,'[DATA DO AGENDAMENTO DA BANCA]',day);
   fill(intro,'[PERÍODO DO CURSO]',data.periodo+'º período');
   for(const p of paragraphs){
    replace(p,'1ª Examinador','1º Examinador');
    replace(p,'2ª Examinador','2º Examinador');
   }
   if(work.autores.length===1){replace(intro,'os acadêmicos','o(a) acadêmico(a)');replace(result,'os acadêmicos obtiveram','o(a) acadêmico(a) obteve');}
   else replace(intro,'apresentou e defendeu','apresentaram e defenderam');
   [[data.tituloOrientador,work.orientador_nome],[data.titulo1,data.nome1],[data.titulo2,data.nome2]].forEach(([title,name],i)=>{
    fill(professors[i],'[TITULAÇÃO]',title);fill(professors[i],'[NOME COMPLETO DO PROFESSOR]',name);
   });
   const original=sign2.cloneNode(true);
   fill(sign1,'[NOME DO PRIMEIRO ESTUDANTE]',work.autores[0]);
   if(work.autores.length===1)sign2.remove();
   else{
    fill(sign2,'[NOME DO SEGUNDO ESTUDANTE]',work.autores[1]+':');
    let after=sign2;
    for(const author of work.autores.slice(2)){
     const line=original.cloneNode(true);
     fill(line,'[NOME DO SEGUNDO ESTUDANTE]',author+':');after.after(line);after=line;
    }
   }
   fill(intro,'[NOME DO TRABALHO DO GRUPO]',work.titulo);
   fill(intro,'[NOME DOS AUTORES SEPARADOS POR VÍRGULA]',work.autores.join(', '));
  }
  return new XMLSerializer().serializeToString(doc);
 }
 async function download(work,data){
  const response=await fetch('/tcc/modelo-ata-aems.docx');
  if(!response.ok)throw Error('Não foi possível carregar o modelo da ata.');
  const zip=new PizZip(await response.arrayBuffer());
  for(const part of Object.keys(zip.files).filter(name=>/^word\/(document|header\d+|footer\d+)\.xml$/.test(name))){
   zip.file(part,renderXml(zip.file(part).asText(),work,data,part));
  }
  const url=URL.createObjectURL(zip.generate({type:'blob',compression:'DEFLATE',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}));
  const link=document.createElement('a');
  link.href=url;link.download='Ata de defesa - '+courses[data.curso]+' - '+data.data+'.docx';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
 }
 const dialog=$('tcc-ata'),form=$('tcc-ata-form'),status=form.querySelector('[role=status]');
 const submit=form.querySelector('[type=submit]');
 let selection;
 $('tcc-ata-close').onclick=()=>dialog.close();
 form.onsubmit=async event=>{
  event.preventDefault();
  const current=selection;
  submit.disabled=true;status.textContent='Salvando os dados da banca…';
  try{
   const payload=Object.fromEntries(new FormData(form));
   const {data,error}=await current.db.rpc('tcc_configurar_banca',{p_id:current.work.id,p_dados:payload});
   if(error)throw Error(error.message);
   await download(current.work,data);
   if(selection===current)status.textContent='Banca salva. Ata gerada em Word.';
  }catch(error){if(selection===current)status.textContent=error.message}
  finally{if(selection===current)submit.disabled=false}
 };
 window.TccAta={async open(db,work){
  const current={db,work};selection=current;
  form.reset();submit.disabled=true;$('tcc-ata-work').textContent=work.titulo+' · Orientador: '+work.orientador_nome;
  status.textContent='Carregando dados da banca…';dialog.showModal();
  try{
   const {data,error}=await db.rpc('tcc_configurar_banca',{p_id:work.id});
   if(selection!==current)return;
   if(error)throw Error(error.message);
   for(const [key,value] of Object.entries(data||{}))if(form.elements[key])form.elements[key].value=value;
   status.textContent='Resultado, média e assinaturas ficam em branco para preenchimento na banca.';
   submit.disabled=false;
  }catch(error){if(selection===current)status.textContent=error.message}
 }};
})();
