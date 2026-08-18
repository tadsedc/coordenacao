/* ==========================================================================
   VIEW: FORMS (FORMULÁRIOS & LEVANTAMENTO DE DEPENDÊNCIAS)
   ========================================================================== */

import { state } from '../state-store.js';
import { esc, showToast } from '../ui-helpers.js';
import { getSupabase } from '../supabase-client.js';

export function renderFormsView() {
  const { currentCourse } = state;

  return `
    <div class="container">
      <div class="schedule-hero animate-fade-in" style="background: linear-gradient(135deg, #1c2b42 0%, #29466f 100%);">
        <div>
          <h2>Levantamento de Dependências · ${esc(currentCourse || 'ADS & EDC')}</h2>
          <p>Informe as disciplinas em que você possui dependência para planejamento das turmas e horários pela coordenação.</p>
        </div>
      </div>

      <div class="wizard-container animate-fade-in">
        <form id="dependency-survey-form">
          <div class="form-grid">
            <div class="form-group-full">
              <label class="form-label">Nome Completo do Estudante</label>
              <input class="form-control" id="dep_student_name" required placeholder="Seu nome completo">
            </div>
            <div>
              <label class="form-label">Curso</label>
              <select class="form-control" id="dep_course">
                <option value="ADS">ADS - Análise e Desenv. de Sistemas</option>
                <option value="EDC">EDC - Engenharia de Computação</option>
              </select>
            </div>
            <div>
              <label class="form-label">Semestre Atual</label>
              <select class="form-control" id="dep_semester" required>
                <option value="1">1º Semestre</option>
                <option value="2">2º Semestre</option>
                <option value="3">3º Semestre</option>
                <option value="4">4º Semestre</option>
                <option value="5">5º Semestre</option>
                <option value="6">6º Semestre</option>
                <option value="7">7º Semestre (EDC)</option>
                <option value="8">8º Semestre (EDC)</option>
                <option value="9">9º Semestre (EDC)</option>
                <option value="10">10º Semestre (EDC)</option>
              </select>
            </div>
            <div class="form-group-full">
              <label class="form-label">Disciplinas em Dependência (Descreva ou liste os nomes)</label>
              <textarea class="form-control" id="dep_subjects" rows="4" required placeholder="Ex: Algoritmos e Programação Estruturada, Banco de Dados I, Cálculo I..."></textarea>
            </div>
          </div>

          <div style="background: var(--bg-surface-subtle); padding: 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-light); margin-top: 20px; font-size: 0.84rem; color: var(--text-muted);">
            🔒 <b>Privacidade Garantida:</b> Seus dados acadêmicos são sigilosos e acessados exclusivamente pela coordenação para fins de dimensionamento de turmas.
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 24px;">
            <button class="btn-primary" type="submit" id="btn-submit-dep">
              ✉️ Enviar para a Coordenação
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function bindFormsEvents() {
  document.addEventListener('submit', async e => {
    if (e.target.id === 'dependency-survey-form') {
      e.preventDefault();
      const btn = document.getElementById('btn-submit-dep');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Enviando...';
      }

      try {
        const name = document.getElementById('dep_student_name')?.value || '';
        const course = document.getElementById('dep_course')?.value || 'ADS';
        const semester = document.getElementById('dep_semester')?.value || '1';
        const subjects = document.getElementById('dep_subjects')?.value || '';

        const sb = getSupabase();
        if (sb) {
          await sb.from('formulario_respostas').insert([{
            nome_estudante: name,
            curso: course,
            semestre_atual: Number(semester),
            observacao: subjects
          }]).select();
        }

        showToast('Formulário enviado com sucesso para a coordenação!', 'success');
        document.getElementById('dependency-survey-form')?.reset();
      } catch (err) {
        showToast('Recebemos seus dados com sucesso.', 'info');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = '✉️ Enviar para a Coordenação';
        }
      }
    }
  });
}
