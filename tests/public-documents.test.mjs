import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const viewerSource=fs.readFileSync(new URL('../documento.js',import.meta.url),'utf8');

async function renderViewer({path='/enade',document=null,error=null}){
  const root={innerHTML:''};
  const page={title:'',getElementById:id=>id==='document-root'?root:null};
  const storage={
    createSignedUrl:async(_path,_ttl,options)=>({data:{signedUrl:options?.download?'https://files.test/download':'https://files.test/view'},error:null})
  };
  const query={
    select(){return this},eq(){return this},maybeSingle:async()=>({data:document,error})
  };
  const context={
    console,
    URLSearchParams,
    decodeURIComponent,
    location:{pathname:path,search:'',hostname:'tadsedc.site'},
    document:page,
    window:{supabase:{createClient:()=>({from:()=>query,storage:{from:()=>storage}})}}
  };
  vm.runInNewContext(viewerSource,context);
  await new Promise(resolve=>setTimeout(resolve,10));
  return {html:root.innerHTML,title:page.title};
}

const published=await renderViewer({document:{titulo:'Manual do ENADE',slug:'enade',arquivo_path:'id/file.pdf',nome_arquivo:'enade.pdf'}});
assert.match(published.html,/Manual do ENADE/);
assert.match(published.html,/https:\/\/files\.test\/view#view=FitH/);
assert.match(published.html,/Baixar PDF/);
assert.equal(published.title,'Manual do ENADE | Portal da Coordenação');

const unavailable=await renderViewer({document:null});
assert.match(unavailable.html,/Documento indisponível/);
assert.doesNotMatch(unavailable.html,/<iframe/);

const html404=fs.readFileSync(new URL('../404.html',import.meta.url),'utf8');
assert.match(html404,/documento\.js/);
assert.match(html404,/supabase-js@2/);

const adminSource=fs.readFileSync(new URL('../public-documents.js',import.meta.url),'utf8');
for(const feature of ['Publicar PDF','Substituir PDF','Desativar','Reativar','Copiar link','Excluir'])assert.match(adminSource,new RegExp(feature));

console.log('Documentos públicos: visualizador, indisponibilidade e controles essenciais validados.');
