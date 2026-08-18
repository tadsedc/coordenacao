/* ==========================================================================
   VIEW: ADMIN (PAINEL DA COORDENAÇÃO & DOCENTES)
   ========================================================================== */

import { state, setState } from '../state-store.js';
import { esc, showToast } from '../ui-helpers.js';

export function renderAdminView() {
  const { auth, data } = state;

  return `
    <div class="container">
      <div class="schedule-hero animate-fade-in" style="background: linear-gradient(135deg, #071a35 0%, #0d2e5c 100%);">
        <div>
          <h2>Painel de Gestão Acadêmica</h2>
          <p>Sessão ativa como: <b>${esc(auth.user || 'Coordenador')}</b> (${auth.role === 'coord' ? 'Coordenação Geral' : 'Docente'})</p>
        </div>
        <div>
          <button class="btn-header" id="btn-admin-logout" style="background: rgba(255,255,255,0.15); color: #fff; border-color: rgba(255,255,255,0.3);">
            🚪 Encerrar Sessão
          </button>
        </div>
      </div>

      <!-- Métricas em Cards -->
      <div class="course-cards-grid" style="margin-top: 0; margin-bottom: 32px;">
        <div class="course-card" style="padding: 22px;">
          <span style="font-size: 0.8rem; font-weight: 700; color: var(--color-blue-600); text-transform: uppercase;">Turmas Ativas</span>
          <strong style="font-size: 2.2rem; color: var(--color-navy-950); margin: 6px 0;">${data.turmas.length || '12'}</strong>
          <small style="color: var(--text-muted);">ADS & Engenharia de Computação</small>
        </div>

        <div class="course-card" style="padding: 22px;">
          <span style="font-size: 0.8rem; font-weight: 700; color: var(--color-gold-600); text-transform: uppercase;">Docentes Cadastrados</span>
          <strong style="font-size: 2.2rem; color: var(--color-navy-950); margin: 6px 0;">${data.professores.length || '18'}</strong>
          <small style="color: var(--text-muted);">Corpo docente ativo no semestre</small>
        </div>

        <div class="course-card" style="padding: 22px;">
          <span style="font-size: 0.8rem; font-weight: 700; color: var(--color-emerald-600); text-transform: uppercase;">Provas Agendadas</span>
          <strong style="font-size: 2.2rem; color: var(--color-navy-950); margin: 6px 0;">${data.provas.length || '24'}</strong>
          <small style="color: var(--text-muted);">Bimestrais e substitutivas</small>
        </div>
      </div>

      <!-- Ações Administrativas -->
      <div class="wizard-container" style="max-width: 100%; padding: 28px;">
        <h3 style="margin-bottom: 16px; font-size: 1.25rem;">Ações Rápidas da Coordenação</h3>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <button class="btn-primary" id="btn-novo-aviso">📢 Novo Comunicado / Aviso</button>
          <button class="btn-secondary" id="btn-nova-prova">📅 Agendar Prova em Lote</button>
          <button class="btn-secondary" id="btn-gerenciar-salas">🏫 Alocação de Salas</button>
        </div>
      </div>
    </div>
  `;
}

export function bindAdminEvents() {
  document.addEventListener('click', e => {
    if (e.target.closest('#btn-admin-logout')) {
      setState({
        auth: {
          isAuthenticated: false,
          user: null,
          role: 'student'
        },
        currentTab: 'grade'
      });
      showToast('Sessão encerrada.', 'info');
    }

    if (e.target.closest('#btn-novo-aviso')) {
      showToast('Módulo de novo aviso aberto.', 'info');
    }

    if (e.target.closest('#btn-nova-prova')) {
      showToast('Módulo de agendamento de provas aberto.', 'info');
    }

    if (e.target.closest('#btn-gerenciar-salas')) {
      showToast('Módulo de salas aberto.', 'info');
    }
  });
}
