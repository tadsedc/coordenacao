import test from 'node:test';
import assert from 'node:assert/strict';
import {buildNotice} from '../supabase/functions/tcc-mail/notice.ts';

test('confirmação informa o código somente ao responsável',()=>{
 const mail=buildNotice({tipo:'protocolo',email:'autor@example.com',titulo:'Pesquisa',codigo:'protocolo-teste'});
 assert.deepEqual(mail.to,['autor@example.com']);
 assert.match(mail.text,/Código de acompanhamento: protocolo-teste/);
});

test('parecer preserva as observações sem incluir código ou anexos',()=>{
 const mail=buildNotice({tipo:'parecer',email:'autor@example.com',titulo:'Pesquisa',situacao:'ajustes',parecer:'Revisar metodologia.',codigo:'reservado'});
 assert.match(mail.text,/Ajustes solicitados/);
 assert.match(mail.text,/Revisar metodologia/);
 assert.doesNotMatch(mail.text,/reservado/);
 assert.equal(mail.attachments,undefined);
});
