(function () {
  const input = document.getElementById('qIng');
  const out = document.getElementById('out');
  const hint = document.getElementById('hint');
  const sugs = document.getElementById('sugs');

  if (!input || !out || !hint || !sugs) return;

  // Fallback DB (used until JSON loads, and if JSON fails to load)
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
      keys: ['carmine', 'cochineal', 'קרמין', 'קוכיניל', 'E120'],
      status: 'רכיב מן החי',
      why: 'קרמין (E120) מופק מחרק הקוכיניל ונמצא לעיתים באיפור ומזון.',
      alt: 'חלופות נפוצות: iron oxides, red lake, beet extract.'
    },
    {
      name: 'Glycerin',
      he: 'גליצרין',
      keys: ['glycerin', 'גליצרין', 'glycerol'],
      status: 'תלוי מקור',
      why: 'גליצרין יכול להיות ממקור צמחי או מן החי. לרוב בתמרוקים הוא צמחי אבל לא תמיד מצוין.',
      alt: 'אם חשוב לך — חפשי “vegetable glycerin” או שאלי את המותג.'
    },
    {
      name: 'Squalene / Squalane',
      he: 'סקוואלן / סקוואלן',
      keys: ['squalene', 'squalane', 'סקוואלן', 'סקוואלן'],
      status: 'תלוי מקור',
      why: 'יכול להגיע מכריש (פחות נפוץ היום) או ממקור צמחי (קנה סוכר/זית).',
      alt: 'חפשי “plant-derived squalane”.'
    }
  ];

  // Main DB (loaded from JSON)
  let DB = DB_FALLBACK;
  let DB_READY = false;

  // Fast indexes
  let KEY_MAP = new Map();       // norm(key) -> item
  let SEARCHABLE = [];           // [{ item, keys: [normed keys...] }]

  // Build a DB URL relative to THIS script (works from / and /en/ etc)
  const SCRIPT_URL = (document.currentScript && document.currentScript.src)
    ? new URL(document.currentScript.src, location.href)
    : null;
  const DB_URL = SCRIPT_URL
    ? new URL('../data/ingredient-db.json', SCRIPT_URL).toString()
    : 'assets/data/ingredient-db.json';

  function norm(s) {
    return (s || '')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/["'`.,:;()\[\]{}<>!?]+/g, '')
      .replace(/\s+/g, ' ');
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

  function buildIndex() {
    KEY_MAP = new Map();
    SEARCHABLE = [];

    for (const item of DB) {
      const rawKeys = []
        .concat(item.name ? [item.name] : [])
        .concat(item.he ? [item.he] : [])
        .concat(item.keys || []);

      const keys = [];
      for (const k of rawKeys) {
        const nk = norm(k);
        if (!nk) continue;
        if (!keys.includes(nk)) keys.push(nk);
        if (!KEY_MAP.has(nk)) KEY_MAP.set(nk, item);
      }
      SEARCHABLE.push({ item, keys });
    }
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
    for (const row of SEARCHABLE) {
      let best = Infinity;
      for (const k of row.keys) {
        if (k === nq) best = 0;
        else if (best > 1 && k.startsWith(nq)) best = 1;
        else if (best > 2 && k.includes(nq)) best = 2;
        if (best === 0) break;
      }
      if (best !== Infinity) scored.push({ item: row.item, score: best });
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

    const exact = KEY_MAP.get(q);
    if (exact) {
      showDetails(exact);
      return;
    }

    const matches = findMatches(q);
    if (!matches.length) {
      clearUI();
      renderHint('לא נמצאו תוצאות');
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
      const t = norm(p);
      if (!t || seen.has(t)) continue;
      seen.add(t);

      const match = KEY_MAP.get(t);
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

      const r = await fetch(DB_URL, { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      const arr = Array.isArray(data) ? data : (data && Array.isArray(data.items) ? data.items : null);
      if (!arr || !arr.length) throw new Error('Bad JSON payload');

      DB = arr;
      buildIndex();
      DB_READY = true;
    } catch (e) {
      console.warn('[Ingredient Detective] DB load failed; using fallback', e);
      DB = DB_FALLBACK;
      buildIndex();
      DB_READY = true;
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
  buildIndex();
  loadDB();
})();