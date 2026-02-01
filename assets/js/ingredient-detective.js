(function () {
  const input = document.getElementById('qIng');
  const out = document.getElementById('out');
  const hint = document.getElementById('hint');
  const sugs = document.getElementById('sugs');

  if (!input || !out || !hint || !sugs) return;

  // Minimal fallback in case JSON fails to load
  const DB_FALLBACK = [
    {
      name: 'Lanolin',
      he: 'לנולין',
      keys: ['lanolin', 'לנולין'],
      status: 'רכיב מן החי',
      why: 'לנולין מופק מצמר כבשים (שומן/שעווה טבעית). אם את מעדיפה להימנע — חפשי חלופות צמחיות או סינתטיות.'
    },
    {
      name: 'Carmine',
      he: 'קרמין',
      keys: ['carmine', 'cochineal', 'carminic acid', 'קרמין', 'קוכיניל', 'E120', 'CI 75470', 'C.I. 75470'],
      status: 'רכיב מן החי',
      why: 'קרמין (E120 / CI 75470) מופק מחרק הקוכיניל ונמצא לעיתים באיפור ומזון.'
    },
    {
      name: 'Glycerin',
      he: 'גליצרין',
      keys: ['glycerin', 'glycerol', 'גליצרין'],
      status: 'תלוי מקור',
      why: 'גליצרין יכול להיות ממקור צמחי או מן החי. לרוב בתמרוקים הוא צמחי אבל לא תמיד מצוין.'
    },
    {
      name: 'Squalene / Squalane',
      he: 'סקוואלן / סקוואלן',
      keys: ['squalene', 'squalane', 'סקוואלן', 'סקוואלן'],
      status: 'תלוי מקור',
      why: 'יכול להגיע מכריש או ממקור צמחי (קנה סוכר/זית).'
    }
  ];

  let DB = DB_FALLBACK;
  let DB_READY = false;

  // Resolve DB URL robustly (works from /, /en/, and GitHub Pages subfolders)
  const scriptEl =
    document.currentScript ||
    document.querySelector('script[src*="ingredient-detective.js"]');

  const scriptUrl = scriptEl && scriptEl.src ? new URL(scriptEl.src, location.href) : null;

  // Allow override via: <script data-db="assets/data/ingredient-db.json" ...>
  const overrideDb = scriptEl && scriptEl.dataset ? scriptEl.dataset.db : '';

  const buildTag = scriptUrl ? (scriptUrl.searchParams.get('v') || '') : '';
  const defaultDbUrl = (function () {
    if (overrideDb) return new URL(overrideDb, location.href);
    if (!scriptUrl) return new URL('assets/data/ingredient-db.json', location.href);
    return new URL('../data/ingredient-db.json', scriptUrl);
  })();

  if (buildTag && !defaultDbUrl.searchParams.get('v')) {
    defaultDbUrl.searchParams.set('v', buildTag);
  }

  const DB_URL = defaultDbUrl.toString();

  // If the default filename isn't present on the server, try a couple of known alternatives
  // (only when user didn't explicitly set data-db).
  const DB_CANDIDATES = (function () {
    const list = [DB_URL];
    try {
      if (!overrideDb) {
        const base = new URL(DB_URL, location.href);
        // Swap filename only (keep folder & ?v=)
        const v = base.searchParams.get('v');
        base.search = '';
        base.pathname = base.pathname.replace(/ingredient-db\.json$/i, '');
        const mk = (fname) => {
          const u = new URL(fname, base);
          if (v) u.searchParams.set('v', v);
          return u.toString();
        };
        list.push(mk('ingredient-db.v18.cleaned.json'));
        list.push(mk('ingredient-vegan-watchlist.json'));
      }
    } catch (e) {}
    // De-dupe
    return Array.from(new Set(list));
  })();


  function norm(s) {
    return (s || '')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\([^)]*\)/g, ' ')                 // remove parenthetical notes
      .replace(/["'`.,:;()\[\]{}<>!?]/g, ' ')
      .replace(/[^a-z0-9\u0590-\u05FF\s-]/g, ' ') // keep english/hebrew/digits
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function displayName(item) {
    const parts = [];
    if (item.name) parts.push(item.name);
    if (item.he) parts.push(item.he);
    return parts.join(' · ');
  }

  function clearUI() {
    out.innerHTML = '';
    sugs.innerHTML = '';
  }

  function renderHint(text) {
    hint.textContent = text;
  }

  function notifyRendered() {
    try { window.dispatchEvent(new Event('kbwg:content-rendered')); } catch (e) {}
  }

  function renderSuggestions(matches) {
    sugs.innerHTML = '';
    matches.slice(0, 12).forEach((m) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sugBtn';
      btn.textContent = displayName(m.item);
      btn.addEventListener('click', () => {
        input.value = (m.item.name || (m.item.keys && m.item.keys[0]) || '').toString();
        showDetails(m.item);
      });
      sugs.appendChild(btn);
    });
  }

  function cardHTML(item) {
    return `
      <article class="resultCard">
        <h3>${displayName(item)}</h3>
        <p><strong>סטטוס:</strong> ${item.status || ''}</p>
        ${item.why ? `<p>${item.why}</p>` : ''}
        ${item.alt ? `<p><strong>חלופות:</strong> ${item.alt}</p>` : ''}
        ${(item.meta_sources && (item.meta_sources.inci || item.meta_sources.cas || item.meta_sources.max)) ? `
          <p class="muted" style="margin-top:8px;">
            ${(item.meta_sources.inci ? `<span><strong>INCI:</strong> ${item.meta_sources.inci}</span>` : '')}
            ${(item.meta_sources.cas ? `<span style="margin-inline-start:10px;"><strong>CAS:</strong> ${item.meta_sources.cas}</span>` : '')}
            ${(item.meta_sources.max ? `<span style="margin-inline-start:10px;"><strong>מגבלה:</strong> ${item.meta_sources.max}</span>` : '')}
          </p>` : ''}
      </article>
    `;
  }

  function showDetails(item) {
    sugs.innerHTML = '';
    renderHint('');
    out.innerHTML = cardHTML(item);
    notifyRendered();
  }

  function findMatches(q) {
    if (!DB_READY) return [];
    const nq = norm(q);
    if (!nq) return [];

    const scored = [];
    for (const item of DB) {
      const keys = (item.keys || []).map(norm).filter(Boolean);

      // also match canonical name
      if (item.name) keys.push(norm(item.name));
      if (item.he) keys.push(norm(item.he));

      let best = Infinity;
      for (const k of keys) {
        if (!k) continue;
        if (k === nq) best = Math.min(best, 0);
        else if (k.startsWith(nq)) best = Math.min(best, 1);
        else if (k.includes(nq)) best = Math.min(best, 2);
      }
      if (best !== Infinity) scored.push({ item, score: best });
    }

    scored.sort((a, b) => a.score - b.score || displayName(a.item).localeCompare(displayName(b.item)));
    return scored;
  }

  function onInput() {
    const raw = input.value || '';
    const q = norm(raw);

    if (!DB_READY) {
      clearUI();
      renderHint('טוען מאגר רכיבים…');
      return;
    }

    if (q.length < 2) {
      clearUI();
      renderHint('הזינו שתי אותיות לפחות להתחיל');
      return;
    }

    const matches = findMatches(q);

    if (!matches.length) {
      clearUI();
      renderHint('לא נמצאו תוצאות');
      return;
    }

    const exact = matches.find((m) => {
      const nq = norm(raw);
      return (m.item.keys || []).some((k) => norm(k) === nq) ||
             (m.item.name && norm(m.item.name) === nq) ||
             (m.item.he && norm(m.item.he) === nq);
    });

    if (exact) {
      showDetails(exact.item);
      return;
    }

    out.innerHTML = '';
    renderHint('בחרי רכיב מהרשימה');
    renderSuggestions(matches);
    notifyRendered();
  }

  input.addEventListener('input', onInput);

  // Paste list helper
  const togglePaste = document.getElementById('togglePaste');
  const pasteBlock = document.getElementById('pasteBlock');
  const pasteIng = document.getElementById('pasteIng');
  const runPaste = document.getElementById('runPaste');

  function findIngredient(token) {
    if (!DB_READY) return null;
    const t = norm(token);
    if (!t) return null;
    for (const item of DB) {
      const keys = (item.keys || []).map(norm).filter(Boolean);
      if (item.name) keys.push(norm(item.name));
      if (item.he) keys.push(norm(item.he));
      for (const k of keys) {
        if (k === t) return item;
      }
    }
    return null;
  }

  function renderPasteResults(text) {
    if (!DB_READY) {
      clearUI();
      renderHint('טוען מאגר רכיבים…');
      return;
    }

    const raw = String(text || '');
    const parts = raw
      .split(/[\n,;，]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (!parts.length) {
      out.innerHTML = '';
      return;
    }

    const seen = new Set();
    const found = [];
    const unknown = [];

    for (const p of parts) {
      const n = norm(p);
      if (!n || seen.has(n)) continue;
      seen.add(n);
      const match = findIngredient(n);
      if (match) found.push(match);
      else unknown.push(p);
    }

    const frag = document.createDocumentFragment();
    if (found.length) {
      for (const item of found) {
        const wrap = document.createElement('div');
        wrap.innerHTML = cardHTML(item);
        frag.appendChild(wrap.firstElementChild);
      }
    } else {
      const div = document.createElement('div');
      div.className = 'resultCard';
      div.innerHTML = '<h3>לא מצאנו התאמות ברשימה</h3><p class="muted">נסי לחפש רכיב ספציפי בשדה למעלה.</p>';
      frag.appendChild(div);
    }

    if (unknown.length) {
      const div = document.createElement('div');
      div.className = 'resultCard';
      div.innerHTML =
        '<h3>רכיבים שלא זוהו</h3>' +
        '<p class="muted">זה לא אומר שהם לא טבעוניים — פשוט לא קיימים עדיין במאגר הבודק. אפשר לשלוח לנו להוספה.</p>' +
        '<p class="muted" style="margin-top:8px; white-space:pre-wrap;">' +
        unknown.slice(0, 30).join(', ') +
        (unknown.length > 30 ? '…' : '') +
        '</p>';
      frag.appendChild(div);
    }

    out.innerHTML = '';
    out.appendChild(frag);
    notifyRendered();
  }

  if (togglePaste && pasteBlock) {
    togglePaste.addEventListener('click', () => {
      const isOpen = pasteBlock.style.display !== 'none';
      pasteBlock.style.display = isOpen ? 'none' : 'block';
      togglePaste.textContent = isOpen ? 'הדביקי רשימת רכיבים (אופציונלי)' : 'סגירה';
      if (!isOpen && pasteIng) pasteIng.focus();
    });
  }

  if (runPaste && pasteIng) {
    runPaste.addEventListener('click', () => renderPasteResults(pasteIng.value));
  }

  async function loadDB() {
    try {
      DB_READY = false;
      input.disabled = true;
      clearUI();
      renderHint('טוען מאגר רכיבים…');

      let lastErr = null;
      let data = null;
      let usedUrl = DB_URL;

      for (const cand of DB_CANDIDATES) {
        try {
          usedUrl = cand;
          const r = await fetch(cand, { cache: 'no-store' });
          if (!r.ok) throw new Error('HTTP ' + r.status);
          data = await r.json();
          break;
        } catch (err) {
          lastErr = err;
          data = null;
        }
      }

      if (!data) throw lastErr || new Error('DB fetch failed');
      const arr = Array.isArray(data) ? data : (data && Array.isArray(data.items) ? data.items : null);
      if (!arr || !arr.length) throw new Error('Bad JSON payload');

      DB = arr;
      DB_READY = true;

      // Debug/proof:
      window.__KBWG_ING_DB = { url: usedUrl, count: arr.length, loadedAt: new Date().toISOString() };
      console.log('[KBWG] Ingredients DB loaded from JSON:', arr.length, 'items', usedUrl);
    } catch (e) {
      console.warn('[KBWG] Ingredients DB load failed; using fallback DB', e);
      DB = DB_FALLBACK;
      DB_READY = true;
      window.__KBWG_ING_DB = { url: DB_URL, count: DB.length, loadedAt: new Date().toISOString(), fallback: true };
    } finally {
      input.disabled = false;
      if (norm(input.value || '').length >= 2) onInput();
      else {
        clearUI();
        renderHint('הזינו שתי אותיות לפחות להתחיל');
      }
    }
  }

  // Initial
  loadDB();
})();