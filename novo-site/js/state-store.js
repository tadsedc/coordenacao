/* ==========================================================================
   STATE STORE - PORTAL ACADÊMICO ADS & EDC (AEMS)
   ========================================================================== */

const today = new Date().getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
const initialWeekday = today >= 1 && today <= 6 ? today : 1;

export const state = {
  currentCourse: null, // 'ADS', 'EDC', null (Tela Inicial)
  currentTab: 'grade', // 'grade', 'avisos', 'provas', 'professores', 'estagio', 'dependencias'
  selectedWeekday: initialWeekday,
  searchQuery: '',
  theme: localStorage.getItem('tadsedc_theme') || 'light',
  auth: {
    isAuthenticated: false,
    user: null,
    role: 'student' // 'student', 'prof', 'coord'
  },
  data: {
    aulas: [],
    informes: [],
    provas: [],
    turmas: [],
    professores: [],
    forms: []
  },
  loading: false
};

const listeners = new Set();

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setState(updater) {
  if (typeof updater === 'function') {
    updater(state);
  } else {
    Object.assign(state, updater);
  }
  listeners.forEach(fn => fn(state));
}
