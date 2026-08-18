/* ==========================================================================
   VIEW: STAGE WIZARD (ASSISTENTE DE ESTÁGIO PASSO A PASSO)
   ========================================================================== */

import { generateDocx } from '../services/docx-generator.js';
import { api } from '../supabase-client.js';
import { masks, showToast } from '../ui-helpers.js';

let currentStep = 1;

const formData = {
  // Aluno
  nome_aluno: '',
  ra: '',
  curso: 'ADS',
  cpf: '',
  rg: '',
  endereco_aluno: '',
  telefone_aluno: '',
  email_aluno: '',
  // Empresa
  razao_social: '',
  cnpj: '',
  endereco_empresa: '',
  representante_empresa: '',
  cargo_representante: '',
  supervisor_estagio: '',
  cargo_supervisor: '',
  // Estágio
  data_inicio: '',
  data_fim: '',
  carga_horaria_semanal: '30',
  horario_inicio: '13:00',
  horario_fim: '19:00',
  atividades: '',
  tipo_documento: 'termo_compromisso'
};

export function setWizardStep(step) {
  currentStep = Math.max(1, Math.min(4, step));
  const container = document.getElementById('stage-wizard-content');
  if (container) container.innerHTML = renderStepContent();
  updateStepHeader();
}

function updateStepHeader() {
  document.querySelectorAll('.step-item').forEach((item, idx) => {
    const stepNum = idx + 1;
    item.classList.toggle('active', stepNum === currentStep);
    item.classList.toggle('completed', stepNum < currentStep);
  });
}

function renderStepContent() {
  if (currentStep === 1) {
    return `
      <div class="animate-fade-in">
        <h3 style="margin-bottom: 20px; font-size: 1.3rem;">1. Dados do Estudante</h3>
        <div class="form-grid">
          <div class="form-group-full">
            <label class="form-label">Nome Completo</label>
            <input class="form-control" id="w_nome_aluno" value="${formData.nome_aluno}" placeholder="Ex: João da Silva">
          </div>
          <div>
            <label class="form-label">Curso</label>
            <select class="form-control" id="w_curso">
              <option value="ADS" ${formData.curso === 'ADS' ? 'selected' : ''}>ADS - Análise e Desenv. de Sistemas</option>
              <option value="EDC" ${formData.curso === 'EDC' ? 'selected' : ''}>EDC - Engenharia de Computação</option>
            </select>
          </div>
          <div>
            <label class="form-label">R.A. (Registro Acadêmico)</label>
            <input class="form-control" id="w_ra" value="${formData.ra}" placeholder="Ex: 12345">
          </div>
          <div>
            <label class="form-label">CPF</label>
            <input class="form-control" id="w_cpf" value="${formData.cpf}" placeholder="000.000.000-00">
          </div>
          <div>
            <label class="form-label">RG</label>
            <input class="form-control" id="w_rg" value="${formData.rg}" placeholder="Ex: 1.234.567 SSP/MS">
          </div>
          <div class="form-group-full">
            <label class="form-label">Endereço Completo (Rua, Nº, Bairro, Cidade/UF)</label>
            <input class="form-control" id="w_endereco_aluno" value="${formData.endereco_aluno}" placeholder="Rua das Flores, 123 - Centro - Três Lagoas/MS">
          </div>
          <div>
            <label class="form-label">Telefone / WhatsApp</label>
            <input class="form-control" id="w_telefone_aluno" value="${formData.telefone_aluno}" placeholder="(67) 99999-9999">
          </div>
          <div>
            <label class="form-label">E-mail</label>
            <input class="form-control" id="w_email_aluno" type="email" value="${formData.email_aluno}" placeholder="aluno@email.com">
          </div>
        </div>
        <div style="display: flex; justify-content: flex-end; margin-top: 28px;">
          <button class="btn-primary" id="w_next_1">Próximo: Empresa →</button>
        </div>
      </div>
    `;
  }

  if (currentStep === 2) {
    return `
      <div class="animate-fade-in">
        <h3 style="margin-bottom: 20px; font-size: 1.3rem;">2. Empresa Concedente</h3>
        <div class="form-grid">
          <div class="form-group-full">
            <label class="form-label">Razão Social da Empresa</label>
            <input class="form-control" id="w_razao_social" value="${formData.razao_social}" placeholder="Nome Oficial da Empresa LTDA">
          </div>
          <div>
            <label class="form-label">CNPJ</label>
            <input class="form-control" id="w_cnpj" value="${formData.cnpj}" placeholder="00.000.000/0001-00">
          </div>
          <div>
            <label class="form-label">Representante Legal da Empresa</label>
            <input class="form-control" id="w_representante_empresa" value="${formData.representante_empresa}" placeholder="Nome do Administrador/Diretor">
          </div>
          <div class="form-group-full">
            <label class="form-label">Endereço da Empresa</label>
            <input class="form-control" id="w_endereco_empresa" value="${formData.endereco_empresa}" placeholder="Av. Principal, 500 - Três Lagoas/MS">
          </div>
          <div>
            <label class="form-label">Supervisor do Estágio na Empresa</label>
            <input class="form-control" id="w_supervisor_estagio" value="${formData.supervisor_estagio}" placeholder="Nome do Supervisor">
          </div>
          <div>
            <label class="form-label">Cargo do Supervisor</label>
            <input class="form-control" id="w_cargo_supervisor" value="${formData.cargo_supervisor}" placeholder="Ex: Gerente de TI, Tech Lead">
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 28px;">
          <button class="btn-secondary" id="w_prev_2">← Voltar</button>
          <button class="btn-primary" id="w_next_2">Próximo: Horários & Atividades →</button>
        </div>
      </div>
    `;
  }

  if (currentStep === 3) {
    return `
      <div class="animate-fade-in">
        <h3 style="margin-bottom: 20px; font-size: 1.3rem;">3. Atividades & Horários do Estágio</h3>
        <div class="form-grid">
          <div>
            <label class="form-label">Data de Início do Estágio</label>
            <input class="form-control" id="w_data_inicio" type="date" value="${formData.data_inicio}">
          </div>
          <div>
            <label class="form-label">Data de Término Prevista</label>
            <input class="form-control" id="w_data_fim" type="date" value="${formData.data_fim}">
          </div>
          <div>
            <label class="form-label">Carga Horária Semanal (horas)</label>
            <input class="form-control" id="w_carga_horaria_semanal" type="number" max="30" value="${formData.carga_horaria_semanal}">
          </div>
          <div>
            <label class="form-label">Horário de Estágio (Ex: 13:00 às 19:00)</label>
            <input class="form-control" id="w_horario_estagio" value="${formData.horario_inicio} às ${formData.horario_fim}">
          </div>
          <div class="form-group-full">
            <label class="form-label">Plano de Atividades a Desenvolver</label>
            <textarea class="form-control" id="w_atividades" rows="4" placeholder="Descreva sucintamente as principais atividades de desenvolvimento de software, redes, banco de dados ou suporte que você executará.">${formData.atividades}</textarea>
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 28px;">
          <button class="btn-secondary" id="w_prev_3">← Voltar</button>
          <button class="btn-primary" id="w_next_3">Próximo: Gerar Documento →</button>
        </div>
      </div>
    `;
  }

  if (currentStep === 4) {
    return `
      <div class="animate-fade-in" style="text-align: center;">
        <div style="font-size: 3rem; margin-bottom: 12px;">📄</div>
        <h3 style="margin-bottom: 10px; font-size: 1.4rem;">Tudo Pronto para Emissão!</h3>
        <p style="color: var(--text-muted); max-width: 580px; margin: 0 auto 24px;">
          Os dados informados foram formatados no padrão institucional da AEMS. Selecione o modelo desejado para baixar o arquivo Word (.docx) pronto para assinatura.
        </p>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 32px; text-align: left;">
          <button class="btn-secondary" style="padding: 16px; display: flex; flex-direction: column; gap: 6px;" id="btn_generate_termo">
            <b style="color: var(--color-blue-600);">Termo de Compromisso</b>
            <small style="color: var(--text-muted);">Estágio Obrigatório AEMS</small>
          </button>
          <button class="btn-secondary" style="padding: 16px; display: flex; flex-direction: column; gap: 6px;" id="btn_generate_plano">
            <b style="color: var(--color-blue-600);">Plano de Atividades</b>
            <small style="color: var(--text-muted);">Anexo do Termo de Estágio</small>
          </button>
          <button class="btn-secondary" style="padding: 16px; display: flex; flex-direction: column; gap: 6px;" id="btn_generate_convenio">
            <b style="color: var(--color-blue-600);">Convênio de Concessão</b>
            <small style="color: var(--text-muted);">Entre Empresa e AEMS</small>
          </button>
        </div>

        <div style="display: flex; justify-content: flex-start;">
          <button class="btn-secondary" id="w_prev_4">← Revisar Dados</button>
        </div>
      </div>
    `;
  }
}

export function renderStageWizardView() {
  return `
    <div class="container">
      <div class="schedule-hero animate-fade-in" style="background: linear-gradient(135deg, #1f3d60 0%, #2f6096 100%);">
        <div>
          <h2>Assistente de Estágio Supervisionado</h2>
          <p>Preencha os dados em 4 passos simples para gerar seus documentos em Word (.docx) padronizados.</p>
        </div>
      </div>

      <div class="wizard-container animate-fade-in">
        <div class="wizard-steps">
          <div class="step-item ${currentStep === 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}">
            <div class="step-circle">1</div>
            <span class="step-label">Estudante</span>
          </div>
          <div class="step-item ${currentStep === 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}">
            <div class="step-circle">2</div>
            <span class="step-label">Empresa</span>
          </div>
          <div class="step-item ${currentStep === 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}">
            <div class="step-circle">3</div>
            <span class="step-label">Atividades</span>
          </div>
          <div class="step-item ${currentStep === 4 ? 'active' : ''}">
            <div class="step-circle">4</div>
            <span class="step-label">Download</span>
          </div>
        </div>

        <div id="stage-wizard-content">
          ${renderStepContent()}
        </div>
      </div>
    </div>
  `;
}

export function bindStageWizardEvents() {
  document.addEventListener('input', e => {
    if (e.target.id === 'w_cpf') e.target.value = masks.cpf(e.target.value);
    if (e.target.id === 'w_cnpj') e.target.value = masks.cnpj(e.target.value);
    if (e.target.id === 'w_telefone_aluno') e.target.value = masks.phone(e.target.value);
  });

  document.addEventListener('click', async e => {
    if (e.target.id === 'w_next_1') {
      formData.nome_aluno = document.getElementById('w_nome_aluno')?.value || '';
      formData.curso = document.getElementById('w_curso')?.value || 'ADS';
      formData.ra = document.getElementById('w_ra')?.value || '';
      formData.cpf = document.getElementById('w_cpf')?.value || '';
      formData.rg = document.getElementById('w_rg')?.value || '';
      formData.endereco_aluno = document.getElementById('w_endereco_aluno')?.value || '';
      formData.telefone_aluno = document.getElementById('w_telefone_aluno')?.value || '';
      formData.email_aluno = document.getElementById('w_email_aluno')?.value || '';
      if (!formData.nome_aluno) return showToast('Preencha o nome do estudante.', 'warning');
      setWizardStep(2);
    }
    if (e.target.id === 'w_prev_2') setWizardStep(1);

    if (e.target.id === 'w_next_2') {
      formData.razao_social = document.getElementById('w_razao_social')?.value || '';
      formData.cnpj = document.getElementById('w_cnpj')?.value || '';
      formData.representante_empresa = document.getElementById('w_representante_empresa')?.value || '';
      formData.endereco_empresa = document.getElementById('w_endereco_empresa')?.value || '';
      formData.supervisor_estagio = document.getElementById('w_supervisor_estagio')?.value || '';
      formData.cargo_supervisor = document.getElementById('w_cargo_supervisor')?.value || '';
      if (!formData.razao_social) return showToast('Preencha a razão social da empresa.', 'warning');
      setWizardStep(3);
    }
    if (e.target.id === 'w_prev_3') setWizardStep(2);

    if (e.target.id === 'w_next_3') {
      formData.data_inicio = document.getElementById('w_data_inicio')?.value || '';
      formData.data_fim = document.getElementById('w_data_fim')?.value || '';
      formData.carga_horaria_semanal = document.getElementById('w_carga_horaria_semanal')?.value || '30';
      formData.atividades = document.getElementById('w_atividades')?.value || '';
      setWizardStep(4);
    }
    if (e.target.id === 'w_prev_4') setWizardStep(3);

    // Geração de Documentos
    if (e.target.closest('#btn_generate_termo')) {
      try {
        showToast('Gerando Termo de Compromisso...', 'info');
        await generateDocx('../models/termo-compromisso-estagio-obrigatorio-aems.docx', formData, `Termo_Estagio_${formData.nome_aluno || 'Aluno'}.docx`);
        showToast('Documento gerado com sucesso!', 'success');
      } catch (err) {
        showToast(`Erro ao gerar documento: ${err.message}`, 'error');
      }
    }

    if (e.target.closest('#btn_generate_plano')) {
      try {
        showToast('Gerando Plano de Atividades...', 'info');
        await generateDocx('../models/plano-atividades-estagio-aems.docx', formData, `Plano_Atividades_${formData.nome_aluno || 'Aluno'}.docx`);
        showToast('Documento gerado com sucesso!', 'success');
      } catch (err) {
        showToast(`Erro ao gerar documento: ${err.message}`, 'error');
      }
    }

    if (e.target.closest('#btn_generate_convenio')) {
      try {
        showToast('Gerando Convênio de Estágio...', 'info');
        await generateDocx('../models/convenio-estagio-aems.docx', formData, `Convenio_Estagio_${formData.razao_social || 'Empresa'}.docx`);
        showToast('Documento gerado com sucesso!', 'success');
      } catch (err) {
        showToast(`Erro ao gerar documento: ${err.message}`, 'error');
      }
    }
  });
}
