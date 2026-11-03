window.Inovatec={
 api:()=>supabase.createClient('https://uvdnejmdqgwdcipctyur.supabase.co','sb_publishable_Afn5llFEgcHD4Uhmt8N4pA_W0T_NHZk'),
 esc:v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
 date:v=>v?new Date(v).toLocaleString('pt-BR',{timeZone:'America/Campo_Grande',dateStyle:'short',timeStyle:'short'}):'Horário a definir',
 norm:v=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toLowerCase(),
 csv(text){
  text=text.replace(/^\uFEFF/,'');const sep=(text.split(/\r?\n/)[0].includes(';')?';':',');let rows=[],row=[],value='',quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++}else quoted=!quoted}else if(c===sep&&!quoted){row.push(value.trim());value=''}else if((c==='\r'||c==='\n')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(value.trim());if(row.some(Boolean))rows.push(row);row=[];value=''}else value+=c}
  if(quoted)throw Error('CSV com aspas não fechadas.');row.push(value.trim());if(row.some(Boolean))rows.push(row);
  const header=(rows.shift()||[]).map(x=>this.norm(x)),ni=header.findIndex(x=>['nome','nome completo','nome_completo'].includes(x)),ei=header.findIndex(x=>['email','e-mail'].includes(x)),ti=header.findIndex(x=>['telefone','celular','whatsapp'].includes(x));
  if(ni<0||ei<0)throw Error('Use as colunas nome, email e telefone.');
  const result=new Map();rows.forEach((r,i)=>{const nome=r[ni]?.trim(),email=r[ei]?.trim().toLowerCase();if(!nome||nome.split(/\s+/).length<2||!/^\S+@\S+\.\S+$/.test(email))throw Error('Nome ou e-mail inválido na linha '+(i+2));result.set(this.norm(nome)+'|'+email,{nome_completo:nome.toUpperCase(),email,telefone:ti>=0?r[ti]:null})});if(!result.size)throw Error('CSV vazio.');return [...result.values()]
 }
};
