/* ==========================================================================
   SUPABASE CLIENT - PORTAL ACADÊMICO ADS & EDC (AEMS)
   Conexão direta com as tabelas de produção do Supabase
   ========================================================================== */

export const SUPABASE_URL = 'https://uvdnejmdqgwdcipctyur.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_Afn5llFEgcHD4Uhmt8N4pA_W0T_NHZk';

let supabaseClient = null;

export function getSupabase() {
  if (!supabaseClient && window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return supabaseClient;
}

// Métodos de Consulta e Mutação
export const api = {
  async fetchSalas() {
    const sb = getSupabase();
    if (!sb) return [];
    try {
      const { data, error } = await sb.from('salas').select('*').eq('ativa', true).order('nome');
      if (error) throw error;
      return (data || []).map(r => ({
        id: r.id,
        nome: r.nome,
        predio: r.predio,
        andar: r.andar,
        capacidade: r.capacidade,
        tipo: (r.nome || '').toLowerCase().includes('lab') ? 'laboratorio' : 'sala'
      }));
    } catch (err) {
      console.warn('Erro ao carregar salas:', err);
      return [];
    }
  },

  async fetchTurmas() {
    const sb = getSupabase();
    if (!sb) return [];
    try {
      const { data, error } = await sb.from('turmas').select('*').eq('ativa', true).order('ordem');
      if (error) throw error;
      return (data || []).map(g => ({
        id: g.id,
        nome: g.nome,
        cursos: g.cursos || ['ADS', 'EDC'],
        ordem: g.ordem
      }));
    } catch (err) {
      console.warn('Erro ao carregar turmas:', err);
      return [];
    }
  },

  async fetchAulas(salas = [], turmas = []) {
    const sb = getSupabase();
    if (!sb) return [];
    try {
      const [aulasRes, linksRes] = await Promise.all([
        sb.from('aulas').select('*').eq('ativa', true).order('inicio'),
        sb.from('aula_turmas').select('aula_id, turma_id, turmas(id, nome, cursos)')
      ]);

      if (aulasRes.error) throw aulasRes.error;

      const linksByAula = {};
      (linksRes.data || []).forEach(l => {
        (linksByAula[l.aula_id] ??= []).push({
          id: l.turma_id,
          nome: l.turmas?.nome || '',
          cursos: l.turmas?.cursos || []
        });
      });

      const salasMap = new Map(salas.map(s => [s.id, s]));
      const turmasMap = new Map(turmas.map(t => [t.id, t]));

      return (aulasRes.data || []).map(c => {
        const gs = linksByAula[c.id] || (c.turma_id ? [{ id: c.turma_id, nome: turmasMap.get(c.turma_id)?.nome || '', cursos: turmasMap.get(c.turma_id)?.cursos || [] }] : []);
        const groupNames = gs.map(g => g.nome).filter(Boolean);
        const sala = salasMap.get(c.sala_padrao_id) || null;

        return {
          id: c.id,
          codigo: c.codigo || 'S/C',
          disciplina: c.disciplina,
          professor_nome: c.professor_nome,
          professor_id: c.professor_id,
          dia_semana: c.dia_semana,
          inicio: String(c.inicio || '19:00:00').slice(0, 5),
          fim: String(c.fim || '22:30:00').slice(0, 5),
          sala_padrao_id: c.sala_padrao_id,
          sala_nome: sala ? `${sala.nome}${sala.predio ? ' · ' + sala.predio : ''}` : 'A definir',
          sala_tipo: sala?.tipo || 'sala',
          cursos: c.cursos || [],
          turmas: gs,
          turma_nome: groupNames.join(' + ') || (c.turma_id ? turmasMap.get(c.turma_id)?.nome : 'Geral') || 'Geral'
        };
      });
    } catch (err) {
      console.warn('Erro ao carregar aulas:', err);
      return [];
    }
  },

  async fetchInformes() {
    const sb = getSupabase();
    if (!sb) return [];
    try {
      const { data, error } = await sb.from('informes').select('*').eq('ativo', true).order('publicado_em', { ascending: false });
      if (error) throw error;
      return (data || []).map(n => ({
        id: n.id,
        titulo: n.titulo,
        conteudo: n.conteudo,
        cursos: n.cursos || ['ADS', 'EDC'],
        publicado_em: n.publicado_em,
        categoria: (n.titulo || '').toLowerCase().includes('urgente') ? 'urgente' : 'geral'
      }));
    } catch (err) {
      console.warn('Erro ao carregar informes:', err);
      return [];
    }
  },

  async fetchProvas(salas = []) {
    const sb = getSupabase();
    if (!sb) return [];
    try {
      const { data, error } = await sb.from('avaliacoes').select('*').eq('ativo', true).order('data');
      if (error) throw error;
      const salasMap = new Map(salas.map(s => [s.id, s]));

      return (data || []).map(e => {
        const sala = salasMap.get(e.sala_id) || null;
        return {
          id: e.id,
          tipo: e.tipo || 'Avaliação',
          data: e.data,
          disciplina: e.disciplina,
          professor_nome: e.professor_nome,
          professor_id: e.professor_id,
          sala_id: e.sala_id,
          sala_nome: sala ? `${sala.nome}${sala.predio ? ' · ' + sala.predio : ''}` : 'A definir',
          cursos: e.cursos || [],
          observacoes: e.observacoes || ''
        };
      });
    } catch (err) {
      console.warn('Erro ao carregar provas:', err);
      return [];
    }
  },

  async fetchProfessores() {
    const sb = getSupabase();
    if (!sb) return [];
    try {
      const { data, error } = await sb.from('professores_publicos').select('*').order('nome');
      if (error) throw error;
      return (data || []).map(p => ({
        id: p.id,
        nome: p.nome,
        email: p.email,
        whatsapp: p.whatsapp,
        classroom_url: p.classroom_url,
        github_url: p.github_url,
        avatar_url: p.avatar_url,
        contatos: p.contatos || [],
        materiais: p.materiais || []
      }));
    } catch (err) {
      console.warn('Erro ao carregar professores:', err);
      return [];
    }
  },

  async fetchMatriz() {
    const sb = getSupabase();
    if (!sb) return [];
    try {
      const { data, error } = await sb.from('matriz_disciplinas').select('*').eq('ativa', true).order('curso').order('semestre').order('disciplina');
      if (error) throw error;
      return (data || []).map(m => ({
        id: m.id,
        curso: m.curso,
        semestre: m.semestre,
        codigo: m.codigo,
        disciplina: m.disciplina,
        carga_horaria: m.carga_horaria
      }));
    } catch (err) {
      console.warn('Erro ao carregar matriz:', err);
      return [];
    }
  },

  async enviarRequerimentoEstagio(payload) {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase não inicializado.');
    return await sb.from('requerimentos_estagio').insert([payload]);
  },

  async uploadComprovanteEstagio(path, file) {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase não inicializado.');
    return await sb.storage.from('estagio-uploads').upload(path, file, { upsert: true });
  }
};
