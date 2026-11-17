import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
const source=readFileSync(new URL('../inovatec/home.js',import.meta.url),'utf8');
test('Ponto fica oculto salvo liberação explícita da coordenação',async()=>{
 for(const response of [{data:{ponto_divulgado:true}},{data:{ponto_divulgado:false}},{data:{}},{data:null},{error:{message:'Falha'}}]){
  const card={hidden:true};
  const api={from:()=>({select:()=>({eq:()=>({maybeSingle:()=>Promise.resolve(response)})})})};
  vm.runInNewContext(source,{window:{supabase:{createClient:()=>api}},document:{getElementById:id=>id==='point-access'?card:{hidden:true}}});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(card.hidden,response.data?.ponto_divulgado!==true);
 }
 const html=readFileSync(new URL('../inovatec/index.html',import.meta.url),'utf8');
 assert.match(html,/<a id="point-access"[^>]* hidden>/);
});
