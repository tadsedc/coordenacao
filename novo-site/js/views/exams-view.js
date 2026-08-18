/* ==========================================================================
   VIEW: EXAMS (CALENDÁRIO DE PROVAS & AVALIAÇÕES)
   ========================================================================== */

import { state } from '../state-store.js';
import { esc, exportToICS } from '../ui-helpers.js';

export function renderExamsView() {
  const { currentCourse, data, searchQuery } = state;

  let filteredProvas = data.provas.filter(prova => {
    if (currentCourse && prova.cursos && prova.cursos.length && !prova.cursos.includes(currentCourse)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (prova.disciplina || '').toLowerCase().includes(q) ||
        (prova.professor_nome || '').toLowerCase().includes(q) ||
        (prova.tipo || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const cards = filteredProvas.length ? filteredProvas.map(p => {
    const dataObj = p.data ? new Date(p.data + 'T12:00:00') : new Date();
    const dataStr = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const diffDays = Math.ceil((dataObj - new Date()) / (1000 * 60 * 60 * 24));
    
    let countdownBadge = '';
    if (diffDays === 0) {
      countdownBadge = '<span class="live-indicator"><span class="live-pulse"></span> Hoje!</span>';
    } else if (diffDays > 0 && diffDays <= 7) {
      countdownBadge = `<span style="padding: 4px 8px; border-radius: var(--radius-full); background: var(--color-gold-100); color: var(--color-gold-600); font-weight: 700; font-size: 0.75rem;">Faltam ${diffDays} dias</span>`;
    }

    return `
      <article class="class-card animate-fade-in" style="border-left: 5px solid var(--color-gold-500);">
        <div class="class-card-top">
          <span style="font-weight: 800; color: var(--color-gold-600); font-size: 0.85rem; text-transform: uppercase;">
            📅 ${esc(p.tipo || 'Avaliação')}
          </span>
          ${countdownBadge}
        </div>

        <h3 class="class-subject">${esc(p.disciplina || 'Disciplina')}</h3>
        <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 12px;">
          Docente: <b>${esc(p.professor_nome || 'A definir')}</b> · Local: <b>${esc(p.sala_nome || 'A definir')}</b>
        </p>

        ${p.observacoes ? `<p style="font-size: 0.8rem; color: var(--text-subtle); margin-bottom: 10px;">${esc(p.observacoes)}</p>` : ''}

        <div class="class-card-bottom">
          <span style="font-weight: 700; color: var(--color-navy-900);">${dataStr}</span>
          <button class="btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;" data-export-ics="${esc(p.disciplina)}" data-date="${p.data || ''}">
            🗓️ Salvar na Agenda
          </button>
        </div>
      </article>
    `;
  }).join('') : `
    <div style="grid-column: 1 / -1; padding: 48px; text-align: center; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--border-light);">
      <p style="font-size: 1.1rem; font-weight: 600;">Nenhuma avaliação cadastrada para os filtros selecionados.</p>
    </div>
  `;

  return `
    <div class="container">
      <div class="schedule-hero animate-fade-in" style="background: linear-gradient(135deg, #0f2b48 0%, #1e5a8a 100%);">
        <div>
          <h2>Calendário Oficial de Avaliações</h2>
          <p>Confira datas de provas bimestrais, substitutivas, exames finais e provão integrado (${filteredProvas.length} avaliações cadastradas).</p>
        </div>
      </div>

      <div class="schedule-grid">
        ${cards}
      </div>
    </div>
  `;
}
