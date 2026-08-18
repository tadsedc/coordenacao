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
  const courseLabel = currentCourse === 'ADS' ? 'Análise e Desenvolvimento de Sistemas' : 'Engenharia de Computação';

  // Filtragem de Aulas
  let filteredAulas = data.aulas.filter(a => {
    if (a.dia_semana !== selectedWeekday) return false;
    if (currentCourse && a.disciplinas?.curso && a.disciplinas.curso !== currentCourse && a.disciplinas.curso !== 'Compartilhada') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = a.disciplinas?.nome?.toLowerCase().includes(q);
      const matchProf = a.professores?.nome?.toLowerCase().includes(q);
      const matchRoom = a.salas?.nome?.toLowerCase().includes(q);
      return matchName || matchProf || matchRoom;
    }
    return true;
  });

  const weekdayPills = WEEKDAYS.map(w => `
    <button class="weekday-pill ${w.id === selectedWeekday ? 'active' : ''}" data-weekday="${w.id}">
      ${w.name}
    </button>
  `).join('');

  const classCards = filteredAulas.length ? filteredAulas.map(aula => {
    const isLive = isClassLive(aula.horario_inicio, aula.horario_fim, aula.dia_semana);
    const roomType = aula.salas?.tipo === 'laboratorio' ? '💻 Lab' : '🏫 Sala';
    
    return `
      <article class="class-card animate-fade-in">
        <div class="class-card-top">
          <span class="class-time">
            🕒 ${esc(aula.horario_inicio || '19:00')} - ${esc(aula.horario_fim || '22:30')}
          </span>
          ${isLive ? `
            <span class="live-indicator">
              <span class="live-pulse"></span> Ao vivo agora
            </span>
          ` : ''}
        </div>

        <h3 class="class-subject">${esc(aula.disciplinas?.nome || 'Disciplina')}</h3>
        <span class="class-group-badge">${esc(aula.turmas?.nome || 'Turma Geral')}</span>

        <div class="class-card-bottom">
          <div class="teacher-info">
            <span>👤 ${esc(aula.professores?.nome || 'Docente')}</span>
          </div>
          <span class="room-badge">
            ${roomType} ${esc(aula.salas?.nome || 'A definir')}
          </span>
        </div>
      </article>
    `;
  }).join('') : `
    <div style="grid-column: 1 / -1; padding: 48px; text-align: center; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--border-light);">
      <p style="font-size: 1.1rem; font-weight: 600;">Nenhuma aula cadastrada para este dia ou filtro.</p>
      <p style="font-size: 0.9rem; margin-top: 6px;">Verifique os outros dias da semana na barra acima.</p>
    </div>
  `;

  return `
    <div class="container">
      <div class="schedule-hero animate-fade-in">
        <div>
          <h2>Grade de Aulas & Salas · ${esc(currentCourse || 'Geral')}</h2>
          <p>${courseLabel}</p>
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
