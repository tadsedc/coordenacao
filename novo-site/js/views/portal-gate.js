/* ==========================================================================
   VIEW: PORTAL GATE (TELA INICIAL)
   ========================================================================== */

import { setState } from '../state-store.js';

export function renderPortalGate() {
  return `
    <div class="hero-gate animate-fade-in">
      <div class="container">
        <span class="hero-badge">Tecnologia & Inovação · AEMS</span>
        <h1 class="hero-title">
          Portal de Comunicação da<br><span>Coordenação de ADS & EDC</span>
        </h1>
        <p class="hero-subtitle">
          Acesse horários de aulas em tempo real, calendário de provas, avisos urgentes, requerimentos de estágio e muito mais.
        </p>

        <div class="course-cards-grid">
          <!-- Card ADS -->
          <article class="course-card card-ads" data-navigate-course="ADS">
            <div>
              <div class="card-icon-wrap">💻</div>
              <h3 class="course-card-title">ADS</h3>
              <p class="course-card-desc">
                Análise e Desenvolvimento de Sistemas. Grade de horários, salas de aula e avisos da turma.
              </p>
            </div>
            <span class="card-arrow">Acessar portal de ADS →</span>
          </article>

          <!-- Card EDC -->
          <article class="course-card card-edc" data-navigate-course="EDC">
            <div>
              <div class="card-icon-wrap">⚡</div>
              <h3 class="course-card-title">Engenharia de Computação</h3>
              <p class="course-card-desc">
                Software, hardware e automação. Horários, laboratórios e cronograma de provas.
              </p>
            </div>
            <span class="card-arrow">Acessar portal de EDC →</span>
          </article>

          <!-- Card Estágio -->
          <article class="course-card card-stage" data-navigate-tab="estagio">
            <div>
              <div class="card-icon-wrap">📋</div>
              <h3 class="course-card-title">Estágio Supervisionado</h3>
              <p class="course-card-desc">
                Assistente inteligente para emissão automática de termos de compromisso, convênios e relatórios (.docx).
              </p>
            </div>
            <span class="card-arrow">Gerar documentos →</span>
          </article>

          <!-- Card Professor -->
          <article class="course-card card-prof" data-navigate-tab="auth">
            <div>
              <div class="card-icon-wrap">🎓</div>
              <h3 class="course-card-title">Área do Docente</h3>
              <p class="course-card-desc">
                Acesso exclusivo para professores e coordenação acadêmica gerenciarem salas e turmas.
              </p>
            </div>
            <span class="card-arrow">Fazer login institucional →</span>
          </article>
        </div>
      </div>
    </div>
  `;
}
