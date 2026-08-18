/* ==========================================================================
   VIEW: SCHEDULE (GRADE DE HORÁRIOS & SALAS)
   ========================================================================== */

import { state, setState } from '../state-store.js';
import { esc } from '../ui-helpers.js';

const WEEKDAYS = [
  { id: 1, name: 'Segunda-feira', short: 'Seg' },
  { id: 2, name: 'Terça-feira', short: 'Ter' },
  { id: 3, name: 'Quarta-feira', short: 'Qua' },
  { id: 4, name: 'Quinta-feira', short: 'Qui' },
  { id: 5, name: 'Sexta-feira', short: 'Sex' },
  { id: 6, name: 'Sábado', short: 'Sáb' }
];

function isClassLive(startTimeStr, endTimeStr, weekdayId) {
  const now = new Date();
  const currentDay = now.getDay();
  if (currentDay !== weekdayId) return false;

  const [sH, sM] = (startTimeStr || '19:00').split(':').map(Number);
  const [eH, eM] = (endTimeStr || '22:30').split(':').map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = sH * 60 + sM;
  const endMinutes = eH * 60 + eM;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

export function renderScheduleView() {
  const { currentCourse, selectedWeekday, data, searchQuery } = state;
  const courseLabel = currentCourse === 'ADS' ? 'Análise e Desenvolvimento de Sistemas' : (currentCourse === 'EDC' ? 'Engenharia de Computação' : 'Todos os Cursos');

  // Filtragem de Aulas do Supabase
  let filteredAulas = data.aulas.filter(a => {
    if (a.dia_semana !== selectedWeekday) return false;
    if (currentCourse && a.cursos && a.cursos.length && !a.cursos.includes(currentCourse)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = (a.disciplina || '').toLowerCase().includes(q);
      const matchProf = (a.professor_nome || '').toLowerCase().includes(q);
      const matchRoom = (a.sala_nome || '').toLowerCase().includes(q);
      const matchGroup = (a.turma_nome || '').toLowerCase().includes(q);
      return matchName || matchProf || matchRoom || matchGroup;
    }
    return true;
  });

  const weekdayPills = WEEKDAYS.map(w => `
    <button class="weekday-pill ${w.id === selectedWeekday ? 'active' : ''}" data-weekday="${w.id}">
      ${w.name}
    </button>
  `).join('');

  const classCards = filteredAulas.length ? filteredAulas.map(aula => {
    const isLive = isClassLive(aula.inicio, aula.fim, aula.dia_semana);
    const roomType = aula.sala_tipo === 'laboratorio' ? '💻 Lab' : '🏫 Sala';
    
    return `
      <article class="class-card animate-fade-in">
        <div class="class-card-top">
          <span class="class-time">
            🕒 ${esc(aula.inicio || '19:00')} - ${esc(aula.fim || '22:30')}
          </span>
          ${isLive ? `
            <span class="live-indicator">
              <span class="live-pulse"></span> Ao vivo agora
            </span>
          ` : ''}
        </div>

        <h3 class="class-subject">${esc(aula.disciplina || 'Disciplina')}</h3>
        <span class="class-group-badge">${esc(aula.turma_nome || 'Turma Geral')}</span>

        <div class="class-card-bottom">
          <div class="teacher-info">
            <span>👤 ${esc(aula.professor_nome || 'Docente')}</span>
          </div>
          <span class="room-badge">
            ${roomType}: <b>${esc(aula.sala_nome || 'A definir')}</b>
          </span>
        </div>
      </article>
    `;
  }).join('') : `
    <div style="grid-column: 1 / -1; padding: 48px; text-align: center; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--border-light);">
      <p style="font-size: 1.1rem; font-weight: 600;">Nenhuma aula cadastrada para este dia na grade.</p>
      <p style="font-size: 0.9rem; margin-top: 6px;">Selecione outro dia da semana ou limpe os filtros de busca.</p>
    </div>
  `;

  return `
    <div class="container">
      <div class="schedule-hero animate-fade-in">
        <div>
          <h2>Grade de Aulas & Salas · ${esc(currentCourse || 'Geral')}</h2>
          <p>${courseLabel} · ${filteredAulas.length} aula(s) neste dia</p>
        </div>
        <div>
          <button class="btn-header" id="switch-course-btn" style="background: rgba(255,255,255,0.15); color: #fff; border-color: rgba(255,255,255,0.3);">
            🔄 Trocar Curso
          </button>
        </div>
      </div>

      <div class="weekday-bar">
        ${weekdayPills}
      </div>

      <div class="schedule-grid">
        ${classCards}
      </div>
    </div>
  `;
}
