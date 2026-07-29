const PORTAL_ROOT = '/';

class PortalModernDock extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <span>PORTAL TADS · EDC</span>
      <button type="button" data-np-top title="Voltar ao topo" aria-label="Voltar ao topo">↑</button>
      <button type="button" data-np-focus title="Alternar modo de foco" aria-label="Alternar modo de foco">◫</button>
    `;
    this.querySelector('[data-np-top]').addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
    this.querySelector('[data-np-focus]').addEventListener('click', () => {
      document.body.classList.toggle('np-focus-mode');
      const sidebar = document.querySelector('.side');
      if (sidebar) sidebar.classList.remove('open');
    });
  }
}
customElements.define('portal-modern-dock', PortalModernDock);

function modernizeRoutes(root = document) {
  root.querySelectorAll('a[href]').forEach(link => {
    if (link.dataset.npRouteReady) return;
    let url;
    try { url = new URL(link.href, location.href); } catch { return; }
    if (url.origin !== location.origin) return;
    if (link.classList.contains('loginbrand') || link.classList.contains('side-brand-link')) link.href = PORTAL_ROOT;
    link.dataset.npRouteReady = 'true';
  });
}

function addRipple(button, event) {
  const rect = button.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'np-ripple';
  ripple.style.left = `${event.clientX - rect.left}px`;
  ripple.style.top = `${event.clientY - rect.top}px`;
  ripple.style.width = ripple.style.height = `${Math.max(rect.width, rect.height) / 4}px`;
  button.append(ripple);
  setTimeout(() => ripple.remove(), 600);
}

function enhance(root = document) {
  modernizeRoutes(root);
  root.querySelectorAll('button,.btn,.mini,.course-option').forEach(button => {
    if (button.dataset.npEnhanced) return;
    button.dataset.npEnhanced = 'true';
    button.addEventListener('pointerdown', event => addRipple(button, event));
  });
}

const observer = new MutationObserver(records => {
  for (const record of records) {
    record.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) enhance(node);
    });
  }
});

observer.observe(document.documentElement, { childList: true, subtree: true });
enhance();

const dock = document.createElement('portal-modern-dock');
document.body.append(dock);
