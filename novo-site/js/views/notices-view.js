/* ==========================================================================
   VIEW: NOTICES (MURAL DE INFORMES & AVISOS)
   ========================================================================== */

import { state } from '../state-store.js';
import { esc } from '../ui-helpers.js';

export function renderNoticesView() {
  const { currentCourse, data, searchQuery } = state;

  let filteredNotices = data.informes.filter(item => {
    if (currentCourse && item.curso && item.curso !== currentCourse && item.curso !== 'Geral') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (item.titulo?.toLowerCase().includes(q) || item.conteudo?.toLowerCase().includes(q));
    }
    return true;
  });

  const cards = filteredNotices.length ? filteredNotices.map(notice => {
    const isUrgent = notice.categoria === 'urgente' || notice.prioridade > 1;
    const dateFormatted = notice.criado_em ? new Date(notice.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recente';

    return `
      <article class="class-card animate-fade-in" style="border-left: 5px solid ${isUrgent ? 'var(--color-rose-500)' : 'var(--color-blue-500)'};">
        <div class="class-card-top">
          <span style="font-size: 0.78rem; font-weight: 700; color: ${isUrgent ? 'var(--color-rose-600)' : 'var(--color-blue-600)'}; text-transform: uppercase;">
            ${isUrgent ? '🚨 Urgente' : '📢 Comunicado'}
          </span>
          <span style="font-size: 0.8rem; color: var(--text-subtle);">
            ${dateFormatted}
          </span>
        </div>

        <h3 style="font-size: 1.2rem; margin-bottom: 8px; color: var(--color-navy-950);">${esc(notice.titulo)}</h3>
        <p style="color: var(--text-muted); font-size: 0.92rem; line-height: 1.5; margin-bottom: 16px;">
          ${esc(notice.conteudo)}
        </p>

        <div class="class-card-bottom" style="font-size: 0.82rem; color: var(--text-subtle);">
          <span>Destinado: <b>${esc(notice.curso || 'Todos os cursos')}</b></span>
        </div>
      </article>
    `;
  }).join('') : `
    <div style="grid-column: 1 / -1; padding: 48px; text-align: center; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--border-light);">
      <p style="font-size: 1.1rem; font-weight: 600;">Nenhum informe publicado no momento.</p>
    </div>
  `;

  return `
    <div class="container">
      <div class="schedule-hero animate-fade-in" style="background: linear-gradient(135deg, var(--color-navy-950) 0%, var(--color-blue-600) 100%);">
        <div>
          <h2>Mural de Informes Oficiais</h2>
          <p>Fique por dentro de datas, avisos da coordenação e comunicados importantes.</p>
        </div>
      </div>

      <div class="schedule-grid">
        ${cards}
      </div>
    </div>
  `;
}
