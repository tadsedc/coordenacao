(() => {
  const management = document.getElementById('management');
  if (!management) return;

  const sections = [...management.querySelectorAll('section.panel')];
  const labels = ['Divulgação', 'Oficinas', 'Programação', 'Estudantes', 'Inscrições', 'Frequência', 'Presença manual'];
  const navigation = document.createElement('nav');
  navigation.className = 'management-navigation';
  navigation.setAttribute('aria-label', 'Seções da gestão do INOVATEC');
  sections.forEach((section, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary';
    button.textContent = labels[index] || section.querySelector('h2')?.textContent;
    button.onclick = () => {
      sections.forEach(item => { item.hidden = item !== section; });
      [...navigation.children].forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    };
    navigation.append(button);
  });
  management.prepend(navigation);
  navigation.firstElementChild?.click();

  const prepared = new WeakSet();
  function prepareTables() {
    management.querySelectorAll('table').forEach(table => {
      if (prepared.has(table)) return;
      prepared.add(table);
      const rows = [...table.querySelectorAll('tbody > tr')];
      if (rows.length <= 15) return;
      const controls = document.createElement('div');
      controls.className = 'list-controls';
      const search = document.createElement('input');
      search.type = 'search';
      search.placeholder = 'Pesquisar nesta lista';
      search.setAttribute('aria-label', 'Pesquisar nesta lista');
      const previous = document.createElement('button');
      const next = document.createElement('button');
      const counter = document.createElement('span');
      counter.setAttribute('aria-live', 'polite');
      [previous, next].forEach(button => { button.type = 'button'; button.className = 'secondary'; });
      previous.textContent = 'Anterior';
      next.textContent = 'Próxima';
      let page = 0;
      const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      function render() {
        const query = normalize(search.value.trim());
        const matches = rows.filter(row => normalize(row.textContent).includes(query));
        const pages = Math.max(1, Math.ceil(matches.length / 15));
        page = Math.min(page, pages - 1);
        rows.forEach(row => { row.hidden = true; });
        matches.slice(page * 15, (page + 1) * 15).forEach(row => { row.hidden = false; });
        counter.textContent = matches.length + ' registros · página ' + (page + 1) + ' de ' + pages;
        previous.disabled = page === 0;
        next.disabled = page >= pages - 1;
      }
      search.oninput = () => { page = 0; render(); };
      previous.onclick = () => { page--; render(); };
      next.onclick = () => { page++; render(); };
      controls.append(search, counter, previous, next);
      table.before(controls);
      render();
    });
  }
  new MutationObserver(prepareTables).observe(management, {childList: true, subtree: true});
  prepareTables();
})();
