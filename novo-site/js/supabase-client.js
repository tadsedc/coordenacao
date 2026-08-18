/* ==========================================================================
   SUPABASE CLIENT - PORTAL ACADÊMICO ADS & EDC (AEMS)
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
  async fetchAulas(dia = null) {
    const sb = getSupabase();
    if (!sb) return [];
    try {
      let query = sb.from('aulas').select(`
        id, dia_semana, horario_inicio, horario_fim,
        disciplinas (id, nome, curso, semestre),
        professores (id, nome, email),
        salas (id, nome, tipo, bloco),
        turmas (id, nome, curso)
      `);
      if (dia !== null) query = query.eq('dia_semana', dia);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('Fallback ao carregar aulas:', err.message);
      return [];
    }
  },

  async fetchInformes() {
    const sb = getSupabase();
    if (!sb) return [];
    try {
      const { data, error } = await sb.from('informes').select('*').order('criado_em', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('Fallback ao carregar informes:', err.message);
      return [];
    }
  },

  async fetchProvas() {
    const sb = getSupabase();
    if (!sb) return [];
    try {
      const { data, error } = await sb.from('provas').select('*').order('data', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('Fallback ao carregar provas:', err.message);
      return [];
    }
  },

  async fetchTurmas() {
    const sb = getSupabase();
    if (!sb) return [];
    try {
      const { data, error } = await sb.from('turmas').select('*').order('ordem', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('Fallback ao carregar turmas:', err.message);
      return [];
    }
  },

  async fetchProfessores() {
    const sb = getSupabase();
    if (!sb) return [];
    try {
      const { data, error } = await sb.from('professores').select('*').order('nome', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('Fallback ao carregar professores:', err.message);
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
