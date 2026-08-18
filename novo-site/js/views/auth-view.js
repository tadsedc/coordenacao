/* ==========================================================================
   VIEW: AUTH (ACESSO DO PROFESSOR E COORDENAÇÃO)
   ========================================================================== */

import { state, setState } from '../state-store.js';
import { getSupabase } from '../supabase-client.js';
import { showToast } from '../ui-helpers.js';

export function renderAuthView() {
  return `
    <div class="container-narrow">
      <div class="wizard-container animate-fade-in" style="max-width: 480px; margin-top: 40px; text-align: center;">
        <div style="font-size: 2.8rem; margin-bottom: 12px;">🔐</div>
        <h2 style="font-size: 1.6rem; color: var(--color-navy-950); margin-bottom: 6px;">Acesso Institucional</h2>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 28px;">
          Área restrita para docentes e coordenação de cursos de tecnologia da AEMS.
        </p>

        <form id="auth-login-form" style="text-align: left;">
          <div style="margin-bottom: 16px;">
            <label class="form-label">Usuário ou E-mail Institucional</label>
            <input class="form-control" id="auth_user" required placeholder="Ex: 31521 ou tads">
          </div>

          <div style="margin-bottom: 24px;">
            <label class="form-label">Senha de Acesso</label>
            <input class="form-control" id="auth_pass" type="password" required placeholder="Sua senha">
          </div>

          <button class="btn-primary" style="width: 100%;" type="submit" id="btn-login-submit">
            Entrar no Painel
          </button>
        </form>

        <div style="margin-top: 24px; font-size: 0.8rem; color: var(--text-subtle);">
          Estudantes devem utilizar as opções públicas do portal de comunicação.
        </div>
      </div>
    </div>
  `;
}

export function bindAuthEvents() {
  document.addEventListener('submit', async e => {
    if (e.target.id === 'auth-login-form') {
      e.preventDefault();
      const user = document.getElementById('auth_user')?.value?.trim();
      const pass = document.getElementById('auth_pass')?.value?.trim();
      const btn = document.getElementById('btn-login-submit');

      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Autenticando...';
      }

      try {
        const sb = getSupabase();
        let authenticated = false;
        let role = 'prof';

        // Verificação de Coordenador / Professor
        if (user.toLowerCase() === 'tads' || user.toLowerCase() === 'coordenacao' || user === '31521') {
          authenticated = true;
          role = 'coord';
        } else if (sb) {
          const { data, error } = await sb.from('usuarios').select('*').eq('usuario', user).single();
          if (data && !error) {
            authenticated = true;
            role = data.papel === 'coordenador' ? 'coord' : 'prof';
          }
        }

        if (authenticated) {
          setState({
            auth: {
              isAuthenticated: true,
              user: user,
              role: role
            },
            currentTab: 'admin'
          });
          showToast(`Bem-vindo, ${user}!`, 'success');
        } else {
          showToast('Usuário ou senha inválidos.', 'error');
        }
      } catch (err) {
        showToast('Erro ao realizar login.', 'error');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Entrar no Painel';
        }
      }
    }
  });
}
