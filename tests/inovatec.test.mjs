import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const publicApp=readFileSync(new URL('../inovatec/app.js',import.meta.url),'utf8');
const admin=readFileSync(new URL('../inovatec-admin.js',import.meta.url),'utf8');
const sql=readFileSync(new URL('../supabase_inovatec.sql',import.meta.url),'utf8');

assert.match(publicApp,/max_participantes\|\|4/);
assert.match(publicApp,/Nome completo/);
assert.match(publicApp,/E-mail/);
assert.match(publicApp,/WhatsApp/);
assert.match(publicApp,/Breve resumo/);
assert.match(publicApp,/Materiais, equipamentos ou apoio necessários/);
assert.match(publicApp,/Projetos de IA/);
assert.match(publicApp,/GitHub e portfólio pessoal/);
assert.match(admin,/INOVATEC Showcase/);
assert.match(sql,/enable row level security/);
assert.match(sql,/security definer/);
assert.match(sql,/jsonb_array_length\(p_participantes\)/);
assert.match(sql,/grant execute on function public\.enviar_inscricao_inovatec/);

console.log('INOVATEC: formulário, painel e segurança essencial validados.');
