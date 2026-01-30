(function () {
  // Prevent double-load
  if (window.__kbHiddenGemsListLoaded) return;
  window.__kbHiddenGemsListLoaded = true;

  function $(sel){ return document.querySelector(sel); }
  function $$(sel){ return Array.from(document.querySelectorAll(sel)); }

  const DATA_URL = (function(){
    // Works on GitHub Pages + local
    const base = document.currentScript?.dataset?.base || '';
    return base + 'data/hidden-gems.json?v=2026-01-30-v6';
  })();

  const STATE = {
    items: [],
    filtered: [],
    country: 'all',
    q: '',
    sort: 'country',
  };

  function norm(s){
    return String(s ?? '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/[’']/g,'')
      .replace(/\s+/g,' ')
      .trim();
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function googleMapsLink(item){
    const q = [item.name, item.address || '', item.city || '', item.country || ''].filter(Boolean).join(', ');
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
  }

  function dedupe(items){
    const seen = new Map();
    for (const it of items) {
      const key = norm(it.name) + '|' + norm(it.address || (it.city + ',' + it.country));
      if (!seen.has(key)) seen.set(key, it);
    }
    return Array.from(seen.values());
  }

  function matches(item){
    if (STATE.country !== 'all' && norm(item.country) !== STATE.country) return false;

    const q = norm(STATE.q);
    if (!q) return true;

    const hay = norm([item.name, item.address, item.city, item.country, item.note].filter(Boolean).join(' | '));
    return hay.includes(q);
  }

  function sortItems(items){
    const byName = (a,b) => (a.name||'').localeCompare((b.name||''), undefined, {sensitivity:'base'});
    const byCity = (a,b) => (a.city||'').localeCompare((b.city||''), undefined, {sensitivity:'base'}) || byName(a,b);
    const byCountry = (a,b) =>
      (a.country||'').localeCompare((b.country||''), undefined, {sensitivity:'base'}) ||
      byCity(a,b) ||
      byName(a,b);

    if (STATE.sort === 'name') return items.slice().sort(byName);
    if (STATE.sort === 'city') return items.slice().sort(byCity);
    return items.slice().sort(byCountry);
  }

  function groupByCountry(items){
    const map = new Map();
    for (const it of items) {
      const c = it.country || 'Unknown';
      if (!map.has(c)) map.set(c, []);
      map.get(c).push(it);
    }
    // Countries sorted A-Z
    return Array.from(map.entries()).sort((a,b)=>a[0].localeCompare(b[0], undefined, {sensitivity:'base'}));
  }

  function render(){
    const groupsEl = $('#hgGroups');
    const countEl = $('#hgCount');
    if (!groupsEl) return;

    const filtered = STATE.items.filter(matches);
    const sorted = sortItems(filtered);

    countEl && (countEl.textContent = String(sorted.length));

    const grouped = groupByCountry(sorted);

    groupsEl.innerHTML = grouped.map(([country, items]) => {
      // If sorting by name/city, still group by country for scanability.
      const cards = items.map(it => {
        const loc = [it.city, it.country].filter(Boolean).join(', ');
        const addr = it.address || '';
        const note = it.note || '';
        const url = (it.url || '').trim();

        const maps = `<a class="btnSmall" href="${googleMapsLink(it)}" target="_blank" rel="noopener">פתח במפות</a>`;
        const site = url ? `<a class="btnSmall btnGhost" href="${escapeHtml(url)}" target="_blank" rel="noopener">אתר</a>` : '';
        const copy = addr ? `<button class="btnSmall btnGhost" type="button" data-copy="${escapeHtml(addr)}">העתק כתובת</button>` : '';

        return `
          <article class="hgCard">
            <h4 class="hgName">${escapeHtml(it.name || '')}</h4>
            <p class="hgLoc">${escapeHtml(loc)}</p>
            ${addr ? `<p class="hgAddr">${escapeHtml(addr)}</p>` : ''}
            ${note ? `<p class="hgAddr" style="color:rgba(0,0,0,.72);">${escapeHtml(note)}</p>` : ''}
            <div class="hgActions">
              ${maps}
              ${site}
              ${copy}
            </div>
          </article>`;
      }).join('');

      return `
        <div class="contentCard">
          <div class="hgCountryHeader">
            <h3>${escapeHtml(country)}</h3>
            <div class="muted" style="margin:0;">${items.length} מקומות</div>
          </div>
          <div class="hgGrid">${cards}</div>
        </div>`;
    }).join('');

    // copy buttons
    $$('#hgGroups [data-copy]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const text = btn.getAttribute('data-copy') || '';
        try {
          await navigator.clipboard.writeText(text);
          btn.textContent = 'הועתק ✅';
          setTimeout(()=>btn.textContent='העתק כתובת', 1200);
        } catch(e){
          // fallback
          const ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          btn.textContent = 'הועתק ✅';
          setTimeout(()=>btn.textContent='העתק כתובת', 1200);
        }
      });
    });
  }

  function wire(){
    const q = $('#hgSearch');
    const c = $('#hgCountry');
    const s = $('#hgSort');
    const r = $('#hgReset');

    q && q.addEventListener('input', () => { STATE.q = q.value || ''; render(); });
    c && c.addEventListener('change', () => { STATE.country = c.value; render(); });
    s && s.addEventListener('change', () => { STATE.sort = s.value; render(); });
    r && r.addEventListener('click', () => {
      STATE.q = '';
      STATE.country = 'all';
      STATE.sort = 'country';
      if (q) q.value = '';
      if (c) c.value = 'all';
      if (s) s.value = 'country';
      render();
    });
  }

  async function load(){
    try{
      const res = await fetch(DATA_URL, { cache: 'force-cache' });
      const json = await res.json();
      STATE.items = dedupe(Array.isArray(json) ? json : (json.places || []));
    }catch(e){
      STATE.items = [];
      console.warn('Hidden Gems: failed to load data/hidden-gems.json', e);
    }

    // Populate countries
    const countries = Array.from(new Set(STATE.items.map(it => norm(it.country)).filter(Boolean))).sort();
    const countrySel = $('#hgCountry');
    if (countrySel){
      const labelMap = new Map();
      // Use original country casing from data
      STATE.items.forEach(it => {
        const k = norm(it.country);
        if (k && !labelMap.has(k)) labelMap.set(k, it.country);
      });
      countrySel.innerHTML = [
        `<option value="all">כל המדינות</option>`,
        ...countries.map(k => `<option value="${k}">${escapeHtml(labelMap.get(k) || k)}</option>`)
      ].join('');
    }

    wire();
    render();
  }

  document.addEventListener('DOMContentLoaded', load);
})();