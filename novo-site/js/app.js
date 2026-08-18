/* ==========================================================================
   APP BOOTSTRAP & ROUTER - PORTAL ACADÊMICO ADS & EDC (AEMS)
   ========================================================================== */

import { state, setState, subscribe } from './state-store.js';
import { api } from './supabase-client.js';
import { renderPortalGate } from './views/portal-gate.js';
import { renderScheduleView } from './views/schedule-view.js';
import { renderNoticesView } from './views/notices-view.js';
import { renderExamsView } from './views/exams-view.js';
import { renderTeachersView } from './views/teachers-view.js';
import { renderStageWizardView, bindStageWizardEvents } from './views/stage-wizard.js';
import { renderFormsView, bindFormsEvents } from './views/forms-view.js';
import { renderAuthView, bindAuthEvents } from './views/auth-view.js';
import { renderAdminView, bindAdminEvents } from './views/admin-view.js';
import { showToast, exportToICS } from './ui-helpers.js';

// Renderização Geral do App
function renderApp() {
  const root = document.getElementById('app-root');
  if (!root) return;

  // Atualização do Tema
  document.documentElement.setAttribute('data-theme', state.theme);

  // Topbar
  const headerHtml = `
    <header class="app-header">
      <div class="container header-container">
        <a href="#" class="brand-wrapper" data-nav-home>
          <img src="./assets/logo-tads-edc-lado.png" alt="AEMS Tecnologia" class="brand-logo">
          <div class="brand-text">
            <span class="brand-title">Portal de Tecnologia</span>
            <span class="brand-subtitle">ADS & Engenharia de Computação</span>
          </div>
        </a>

        <div class="header-actions">
          ${state.currentCourse ? `
            <button class="btn-header ${state.currentCourse === 'ADS' ? 'active' : ''}" data-nav-course="ADS">ADS</button>
            <button class="btn-header ${state.currentCourse === 'EDC' ? 'active' : ''}" data-nav-course="EDC">EDC</button>
          ` : ''}

          <button class="btn-header ${state.currentTab === 'estagio' ? 'active' : ''}" data-nav-tab="estagio">Estágio</button>
          <button class="btn-header ${state.currentTab === 'auth' || state.currentTab === 'admin' ? 'active' : ''}" data-nav-tab="auth">
            ${state.auth.isAuthenticated ? '⚙️ Painel' : '👤 Docente'}
          </button>

          <button class="theme-toggle-btn" id="theme-toggle" title="Alternar tema claro/escuro">
            ${state.theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </header>
  `;

  // Abas de Navegação quando dentro de um Curso
  let tabsHtml = '';
  if (state.currentCourse && state.currentTab !== 'auth' && state.currentTab !== 'admin') {
    tabsHtml = `
      <div class="container">
        <nav class="portal-nav-tabs" aria-label="Abas do Portal">
          <button class="tab-btn ${state.currentTab === 'grade' ? 'active' : ''}" data-nav-tab="grade">📅 Grade de Aulas</button>
          <button class="tab-btn ${state.currentTab === 'avisos' ? 'active' : ''}" data-nav-tab="avisos">📢 Informes & Avisos</button>
          <button class="tab-btn ${state.currentTab === 'provas' ? 'active' : ''}" data-nav-tab="provas">📝 Calendário de Provas</button>
          <button class="tab-btn ${state.currentTab === 'professores' ? 'active' : ''}" data-nav-tab="professores">👨‍🏫 Corpo Docente</button>
          <button class="tab-btn ${state.currentTab === 'dependencias' ? 'active' : ''}" data-nav-tab="dependencias">📋 Dependências</button>
          <button class="tab-btn ${state.currentTab === 'estagio' ? 'active' : ''}" data-nav-tab="estagio">💼 Estágio</button>
        </nav>
      </div>
    `;
  }

  // Conteúdo Principal da View Ativa
  let mainContent = '';
  if (state.currentTab === 'auth') {
    mainContent = renderAuthView();
  } else if (state.currentTab === 'admin') {
    mainContent = renderAdminView();
  } else if (state.currentTab === 'estagio') {
    mainContent = renderStageWizardView();
  } else if (state.currentTab === 'dependencias') {
    mainContent = renderFormsView();
  } else if (!state.currentCourse) {
    mainContent = renderPortalGate();
  } else {
    switch (state.currentTab) {
      case 'grade': mainContent = renderScheduleView(); break;
      case 'avisos': mainContent = renderNoticesView(); break;
      case 'provas': mainContent = renderExamsView(); break;
      case 'professores': mainContent = renderTeachersView(); break;
      default: mainContent = renderScheduleView(); break;
    }
  }

  root.innerHTML = `
    ${headerHtml}
    <main style="padding: 24px 0 64px;">
      ${tabsHtml}
      ${mainContent}
    </main>
  `;
}

// Binds de Eventos Globais
function bindGlobalEvents() {
  document.addEventListener('click', e => {
    // Navegação para Home
    if (e.target.closest('[data-nav-home]')) {
      e.preventDefault();
      setState({ currentCourse: null, currentTab: 'grade' });
      return;
    }

    // Navegação de Curso (ADS / EDC)
    const courseBtn = e.target.closest('[data-nav-course]');
    if (courseBtn) {
      const course = courseBtn.dataset.navCourse;
      setState({ currentCourse: course, currentTab: 'grade' });
      return;
    }

    const courseCard = e.target.closest('[data-navigate-course]');
    if (courseCard) {
      const course = courseCard.dataset.navigateCourse;
      setState({ currentCourse: course, currentTab: 'grade' });
      return;
    }

    // Navegação de Aba
    const tabBtn = e.target.closest('[data-nav-tab]');
    if (tabBtn) {
      const tab = tabBtn.dataset.navTab;
      setState({ currentTab: tab });
      return;
    }

    const tabCard = e.target.closest('[data-navigate-tab]');
    if (tabCard) {
      const tab = tabCard.dataset.navigateTab;
      setState({ currentTab: tab });
      return;
    }

    // Botão de Trocar Curso
    if (e.target.closest('#switch-course-btn')) {
      setState({ currentCourse: null });
      return;
    }

    // Seletor de Dia da Semana
    const weekdayBtn = e.target.closest('[data-weekday]');
    if (weekdayBtn) {
      const day = Number(weekdayBtn.dataset.weekday);
      setState({ selectedWeekday: day });
      return;
    }

    // Alternar Tema Claro / Escuro
    if (e.target.closest('#theme-toggle')) {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('tadsedc_theme', newTheme);
      setState({ theme: newTheme });
      return;
    }

    // Exportar Prova para Google Agenda / iCal (.ics)
    const icsBtn = e.target.closest('[data-export-ics]');
    if (icsBtn) {
      const disc = icsBtn.dataset.exportIcs;
      const dt = icsBtn.dataset.date;
      if (dt) {
        exportToICS(`Avaliação: ${disc}`, `Prova da disciplina ${disc} no portal AEMS`, dt, '19:00', '22:30', 'AEMS');
        showToast('Arquivo de calendário (.ics) baixado!', 'success');
      }
    }
  });

  // Vincular eventos de submódulos
  bindStageWizardEvents();
  bindFormsEvents();
  bindAuthEvents();
  bindAdminEvents();
}

// Carga de Dados do Supabase em Produção
async function loadProductionData() {
  setState({ loading: true });
  try {
    const [salas, turmas, informes, professores, matriz] = await Promise.all([
      api.fetchSalas(),
      api.fetchTurmas(),
      api.fetchInformes(),
      api.fetchProfessores(),
      api.fetchMatriz()
    ]);

    const [aulas, provas] = await Promise.all([
      api.fetchAulas(salas, turmas),
      api.fetchProvas(salas)
    ]);

    setState({
      data: { salas, turmas, aulas, informes, provas, professores, matriz, forms: [] },
      loading: false
    });
  } catch (err) {
    console.error('Erro ao carregar dados do Supabase:', err);
    setState({ loading: false });
  }
}

// Inicialização da Aplicação
export async function initApp() {
  // Observa mudanças de estado
  subscribe(renderApp);

  // Renderiza primeira tela
  renderApp();
  bindGlobalEvents();

  // Carrega dados de produção do Supabase
  await loadProductionData();

  // Registro de Service Worker PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.warn('Registro de ServiceWorker falhou:', err);
    });
  }
}

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initApp);
