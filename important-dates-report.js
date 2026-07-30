/* Relatório Word consolidado das datas importantes. */
(function(){
  const mime='application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  function xml(value){
    return String(value??'')
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&apos;');
  }

  function paragraph(text,options={}){
    const align=options.align?'<w:jc w:val="'+options.align+'"/>':'';
    const before=options.before?'<w:spacing w:before="'+options.before+'"/>':'';
    const after='<w:spacing w:after="'+(options.after??80)+'"/>';
    const pageBreak=options.pageBreak?'<w:pageBreakBefore/>':'';
    const size=options.size||20;
    const color=options.color||'172B3A';
    const bold=options.bold?'<w:b/>':'';
    return '<w:p><w:pPr>'+align+before+after+pageBreak+'</w:pPr><w:r><w:rPr>'+bold+'<w:color w:val="'+color+'"/><w:sz w:val="'+size+'"/><w:szCs w:val="'+size+'"/></w:rPr><w:t xml:space="preserve">'+xml(text)+'</w:t></w:r></w:p>';
  }

  function cell(text,width,header=false){
    const shade=header?'<w:shd w:fill="176FAE"/>':'';
    const color=header?'FFFFFF':'172B3A';
    return '<w:tc><w:tcPr><w:tcW w:w="'+width+'" w:type="dxa"/>'+shade+'<w:vAlign w:val="center"/></w:tcPr>'
      +paragraph(text,{bold:header,size:header?18:17,color,after:40})+'</w:tc>';
  }

  function table(events){
    const widths=[1450,1350,2050,2500,2350,2150,1900];
    const headers=['Data','Dia','Categoria','Disciplina / evento','Professor','Local','Observações'];
    const header='<w:tr>'+headers.map((item,index)=>cell(item,widths[index],true)).join('')+'</w:tr>';
    const rows=events.map(event=>'<w:tr>'
      +cell(formatDate(event.date),widths[0])
      +cell(weekday(event.date),widths[1])
      +cell(displayText(event.type)||'Data importante',widths[2])
      +cell(displayText(event.subject)||'Não se aplica',widths[3])
      +cell(professor(event),widths[4])
      +cell(location(event),widths[5])
      +cell(event.notes||'',widths[6])
      +'</w:tr>').join('');
    return '<w:tbl><w:tblPr><w:tblW w:w="13750" w:type="dxa"/><w:tblLayout w:type="fixed"/>'
      +'<w:tblBorders><w:top w:val="single" w:sz="4" w:color="B8C7D1"/><w:left w:val="single" w:sz="4" w:color="B8C7D1"/>'
      +'<w:bottom w:val="single" w:sz="4" w:color="B8C7D1"/><w:right w:val="single" w:sz="4" w:color="B8C7D1"/>'
      +'<w:insideH w:val="single" w:sz="4" w:color="D9E2E8"/><w:insideV w:val="single" w:sz="4" w:color="D9E2E8"/></w:tblBorders></w:tblPr>'
      +'<w:tblGrid>'+widths.map(width=>'<w:gridCol w:w="'+width+'"/>').join('')+'</w:tblGrid>'+header+rows+'</w:tbl>';
  }

  function formatDate(value){
    if(!value)return '';
    const [year,month,day]=String(value).slice(0,10).split('-');
    return day+'/'+month+'/'+year;
  }

  function weekday(value){
    const names=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
    return names[new Date(String(value).slice(0,10)+'T12:00:00').getDay()]||'';
  }

  function professor(event){
    if(String(event.type||'').includes('Provão'))return 'Não se aplica';
    return event.teacher||'Não informado';
  }

  function displayText(value){
    return String(value||'').replace(/Avaliação Institucional - Provão/gi,'AVALIAÇÃO INSTITUCIONAL - PROVÃO');
  }

  function location(event){
    if(String(event.type||'').includes('Provão'))return 'Online no grupoau.com.br';
    if(event.roomId){
      const roomItem=(db.rooms||[]).find(item=>String(item.id)===String(event.roomId));
      if(roomItem)return [roomItem.name,roomItem.building,roomItem.floor].filter(Boolean).join(' · ');
    }
    return event.room&&!String(event.room).includes('não definida')?event.room:'Sala ainda não informada';
  }

  function groupSort(a,b){
    return String(a.name||'').localeCompare(String(b.name||''),'pt-BR',{numeric:true,sensitivity:'base'});
  }

  function eventSort(a,b){
    return String(a.date||'').localeCompare(String(b.date||''))
      ||String(a.teacher||'').localeCompare(String(b.teacher||''),'pt-BR')
      ||String(a.subject||'').localeCompare(String(b.subject||''),'pt-BR');
  }

  function reportSections(){
    const exams=[...(db.exams||[])].sort(eventSort);
    const sections=[];
    ['ADS','EDC'].forEach(course=>{
      const courseGroups=(db.groups||[]).filter(group=>(group.courses||[]).includes(course)).sort(groupSort);
      const groups=courseGroups.map(group=>({
        name:group.name,
        events:exams.filter(event=>(event.groupIds||[]).map(String).includes(String(group.id)))
      })).filter(group=>group.events.length);
      const unlinked=exams.filter(event=>(event.courses||[]).includes(course)&&!(event.groupIds||[]).length);
      if(unlinked.length)groups.push({name:'Sem turma específica',events:unlinked});
      if(groups.length)sections.push({course,groups});
    });
    return sections;
  }

  function documentXml(){
    const sections=reportSections();
    let body=paragraph('CALENDÁRIO DE DATAS IMPORTANTES',{bold:true,size:34,color:'0B5E9A',align:'center',after:100})
      +paragraph('Cursos de Análise e Desenvolvimento de Sistemas e Engenharia de Computação',{bold:true,size:22,align:'center',after:60})
      +paragraph('Coordenação de TADS e EDC · Faculdades Integradas de Três Lagoas — AEMS',{size:18,color:'526A7A',align:'center',after:180})
      +paragraph('Documento gerado em '+new Date().toLocaleDateString('pt-BR')+'. Registros organizados por curso, turma e data.',{size:17,color:'526A7A',align:'center',after:220});
    sections.forEach((section,courseIndex)=>{
      const courseName=section.course==='ADS'?'ANÁLISE E DESENVOLVIMENTO DE SISTEMAS — ADS':'ENGENHARIA DE COMPUTAÇÃO — EDC';
      body+=paragraph(courseName,{bold:true,size:27,color:section.course==='ADS'?'0B67A7':'A76600',before:courseIndex?260:80,after:130,pageBreak:courseIndex>0});
      section.groups.forEach(group=>{
        body+=paragraph('Turma '+group.name+' · '+group.events.length+' registro(s)',{bold:true,size:22,color:'172B3A',before:180,after:80});
        body+=table(group.events);
      });
    });
    body+='<w:sectPr><w:pgSz w:w="15840" w:h="12240" w:orient="landscape"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/></w:sectPr>';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+body+'</w:body></w:document>';
  }

  function generateReport(){
    if(!window.PizZip||!window.saveAs)return toast('O gerador de documentos não foi carregado. Atualize a página e tente novamente.');
    if(!(db.exams||[]).length)return toast('Ainda não há datas importantes cadastradas para gerar o relatório.');
    const sections=reportSections();
    if(!sections.length)return toast('As datas cadastradas ainda não possuem curso ou turma vinculados.');
    const zip=new PizZip();
    zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
    zip.folder('_rels').file('.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    zip.folder('word').file('document.xml',documentXml());
    const blob=zip.generate({type:'blob',mimeType:mime});
    window.saveAs(blob,'Calendario_Datas_Importantes_TADS_EDC_'+new Date().toISOString().slice(0,10)+'.docx');
    toast('Calendário em Word gerado com sucesso.');
  }

  const examsBeforeReport=exams;
  exams=function(){
    let html=examsBeforeReport();
    if(state.role==='coord'){
      const button='<button class="btn soft" data-important-dates-report>Baixar calendário em Word</button>';
      const batch=/<button class="btn soft" data-batchexam>[\s\S]*?<\/button>/;
      const create=/<button class="btn primary" data-newexam>[\s\S]*?<\/button>/;
      html=batch.test(html)?html.replace(batch,match=>match+button):html.replace(create,match=>match+button);
    }
    return html;
  };

  const bindBeforeReport=bind;
  bind=function(){
    bindBeforeReport();
    document.querySelectorAll('[data-important-dates-report]').forEach(button=>button.onclick=generateReport);
  };
})();
