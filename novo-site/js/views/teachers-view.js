/* ==========================================================================
   VIEW: TEACHERS (CORPO DOCENTE & CONTATOS)
   ========================================================================== */

import { state } from '../state-store.js';
import { esc } from '../ui-helpers.js';

export function renderTeachersView() {
  const { data, searchQuery } = state;

  let filteredProfs = data.professores.filter(p => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (p.nome?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q));
    }
    return true;
  });

  const cards = filteredProfs.length ? filteredProfs.map(p => {
    const initials = p.nome ? p.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'PR';

    return `
      <article class="class-card animate-fade-in">
        <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 14px;">
          <div style="width: 48px; height: 48px; border-radius: var(--radius-md); background: var(--color-blue-100); color: var(--color-blue-600); font-weight: 800; font-size: 1.1rem; display: grid; place-items: center;">
            ${initials}
          </div>
          <div>
            <h3 style="font-size: 1.1rem; color: var(--color-navy-950); margin-bottom: 2px;">${esc(p.nome)}</h3>
            <span style="font-size: 0.8rem; color: var(--text-subtle);">${esc(p.titulacao || 'Professor(a)')}</span>
          </div>
        </div>

        <div style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 16px;">
          <p>📧 <a href="mailto:${esc(p.email)}">${esc(p.email || 'Não informado')}</a></p>
        </div>

        <div class="class-card-bottom">
          <span style="font-size: 0.8rem; color: var(--text-subtle);">Atendimento: ${esc(p.horario_atendimento || 'Sob agendamento')}</span>
        </div>
      </article>
    `;
  }).join('') : `
    <div style="grid-column: 1 / -1; padding: 48px; text-align: center; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--border-light);">
      <p style="font-size: 1.1rem; font-weight: 600;">Nenhum docente encontrado.</p>
    </div>
  `;

  return `
    <div class="container">
      <div class="schedule-hero animate-fade-in" style="background: linear-gradient(135deg, #073830 0%, #0d6e5e 100%);">
        <div>
          <h2>Corpo Docente</h2>
          <p>Conheça os professores, e-mails institucionais e canais de contato acadêmico.</p>
        </div>
      </div>

      <div class="schedule-grid">
        ${cards}
      </div>
    </div>
  `;
}
