/* KBWG Ingredient Detective — JSON-backed DB (v19)
   - Loads: assets/data/ingredient-db.json
   - Supports: quick search + paste list analysis
*/

(() => {
  'use strict';

  const BUILD = '2026-02-01-v19';
  console.log('[KBWG] Ingredient Detective', BUILD);

  const $ = (sel, root = document) => root.querySelector(sel);

  const qIng = $('#qIng');
  const hint = $('#hint');
  const sugs = $('#sugs');
  const out = $('#out');

  const togglePaste = $('#togglePaste');
  const pasteBlock = $('#pasteBlock');
  const pasteIng = $('#pasteIng');
  const runPaste = $('#runPaste');

  if (!qIng || !sugs || !out) {
    console.warn('[KBWG] Ingredient Detective: missing expected DOM nodes');
    return;
  }

  const DB_URL = `assets/data/ingredient-db.json?v=${encodeURIComponent(BUILD)}`;

  // --- Helpers ---
  const normalize = (input) => {
    return (input ?? '')
      .toString()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[()\[\]{}<>"'`’]/g, ' ')
      .replace(/[^\p{L}\p{N}\s\-+.]/gu, ' ')
      .replace(/[\s\-+.]+/g, ' ')
      .trim();
  };

  const escapeHtml = (s) => (s ?? '').toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const statusLabel = (status) => {
    if (status === 'רכיב מן החי') return 'רכיב מן החי';
    if (status === 'תלוי מקור') return 'תלוי מקור';
    if (status === 'טבעוני') return 'טבעוני';
    return status || '';
  };

  const statusClass = (status) => {
    if (status === 'רכיב מן החי') return 'bad';
    if (status === 'תלוי מקור') return 'warn';
    if (status === 'טבעוני') return 'ok';
    return '';
  };

  // --- DB loading / indexing ---
  let INDEX = []; // { item, keyNorms:Set<string>, nameNorm, heNorm }

  const buildIndex = (items) => {
    return items.map((item) => {
      const rawKeys = []
        .concat(item?.keys || [])
        .concat(item?.name ? [item.name] : [])
        .concat(item?.he ? [item.he] : []);

      const keyNorms = new Set(
        rawKeys
          .filter(Boolean)
          .map((k) => normalize(k))
          .filter(Boolean)
      );

      return {
        item,
        keyNorms,
        nameNorm: normalize(item?.name || ''),
        heNorm: normalize(item?.he || ''),
      };
    });
  };

  const loadDb = async () => {
    try {
      const res = await fetch(DB_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);

      if (!items.length) throw new Error('Empty DB');

      // Minimal validation / cleanup
      return items
        .filter((x) => x && typeof x === 'object' && (x.name || x.he || (x.keys && x.keys.length)))
        .map((x) => ({
          name: (x.name || '').toString().trim(),
          he: (x.he || '').toString().trim(),
          keys: Array.isArray(x.keys) ? x.keys.map((k) => (k ?? '').toString().trim()).filter(Boolean) : [],
          status: (x.status || '').toString().trim(),
          why: (x.why || '').toString().trim(),
        }));
    } catch (err) {
      console.warn('[KBWG] Ingredient DB load failed', err);
      if (hint) {
        hint.textContent = 'לא הצלחתי לטעון את מאגר הרכיבים (קובץ JSON). ודאו שקיים: assets/data/ingredient-db.json';
      }
      return [];
    }
  };

  // --- Matching ---
  const scoreItem = (rec, q) => {
    if (!q) return 0;
    if (rec.nameNorm === q || rec.heNorm === q) return 100;
    if (rec.nameNorm.includes(q) || rec.heNorm.includes(q)) return 70;

    // key matches
    let best = 0;
    for (const k of rec.keyNorms) {
      if (k === q) return 90;
      if (k.includes(q)) best = Math.max(best, 50);
      if (q.length >= 4 && q.includes(k)) best = Math.max(best, 45);
    }
    return best;
  };

  const findMatches = (query, limit = 8) => {
    const q = normalize(query);
    if (!q) return [];

    const scored = [];
    for (const rec of INDEX) {
      const score = scoreItem(rec, q);
      if (score > 0) scored.push({ score, item: rec.item });
    }

    scored.sort((a, b) => (b.score - a.score) || a.item.name.localeCompare(b.item.name));

    const uniq = new Map();
    for (const r of scored) {
      if (!uniq.has(r.item.name)) uniq.set(r.item.name, r.item);
      if (uniq.size >= limit) break;
    }
    return Array.from(uniq.values());
  };

  const matchToken = (token) => {
    const t = normalize(token);
    if (!t) return null;

    let best = null;
    let bestScore = 0;

    for (const rec of INDEX) {
      const score = scoreItem(rec, t);
      if (score > bestScore) {
        bestScore = score;
        best = rec.item;
      }
      if (bestScore >= 90) break;
    }

    return bestScore >= 45 ? best : null;
  };

  // --- Rendering ---
  const renderCards = (items, title = '') => {
    const grid = document.createElement('div');
    grid.className = 'resultGrid';

    if (title) {
      const h = document.createElement('h3');
      h.textContent = title;
      grid.appendChild(h);
    }

    if (!items.length) {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = 'לא נמצאו התאמות.';
      grid.appendChild(p);
      return grid;
    }

    for (const it of items) {
      const card = document.createElement('div');
      card.className = 'resultCard';

      const name = escapeHtml(it.name || '');
      const he = escapeHtml(it.he || '');
      const why = escapeHtml(it.why || '');
      const st = escapeHtml(statusLabel(it.status));

      const cls = statusClass(it.status);
      const badge = st ? `<span class="badge ${cls}">${st}</span>` : '';

      card.innerHTML = `
        <h3>${name}</h3>
        ${he ? `<div class="small"><strong>${he}</strong></div>` : ''}
        ${badge ? `<div class="small" style="margin-top:6px">${badge}</div>` : ''}
        ${why ? `<p style="margin-top:10px">${why}</p>` : ''}
      `;

      grid.appendChild(card);
    }

    return grid;
  };

  const renderSuggestions = (items) => {
    sugs.innerHTML = '';

    if (!items.length) {
      sugs.style.display = 'none';
      return;
    }

    sugs.style.display = '';

    for (const it of items) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sugBtn';
      btn.textContent = it.he ? `${it.name} · ${it.he}` : it.name;
      btn.addEventListener('click', () => {
        out.innerHTML = '';
        out.appendChild(renderCards([it]));
        sugs.style.display = 'none';
      });
      sugs.appendChild(btn);
    }
  };

  // --- UI wiring ---
  let dbReady = false;

  const ensureReady = async () => {
    if (dbReady) return true;

    if (hint) hint.textContent = 'טוען מאגר רכיבים…';
    const items = await loadDb();
    INDEX = buildIndex(items);
    dbReady = INDEX.length > 0;

    if (hint) {
      hint.textContent = dbReady
        ? 'אפשר לחפש רכיב או להדביק רשימת INCI מלאה.'
        : 'מאגר הרכיבים לא נטען. עדיין אפשר לנסות שוב לאחר רענון.';
    }

    return dbReady;
  };

  const onQuery = async () => {
    await ensureReady();
    const q = qIng.value.trim();

    if (q.length < 2) {
      renderSuggestions([]);
      out.innerHTML = '';
      return;
    }

    const matches = findMatches(q, 8);
    renderSuggestions(matches);
  };

  qIng.addEventListener('input', onQuery);
  qIng.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await ensureReady();
      const matches = findMatches(qIng.value, 1);
      out.innerHTML = '';
      out.appendChild(renderCards(matches));
      renderSuggestions([]);
    }
  });

  // Paste analyzer
  if (togglePaste && pasteBlock && pasteIng && runPaste) {
    togglePaste.addEventListener('click', async () => {
      const isHidden = pasteBlock.style.display === 'none' || !pasteBlock.style.display;
      pasteBlock.style.display = isHidden ? 'block' : 'none';
      togglePaste.textContent = isHidden ? 'הסתרת תיבה' : 'הצגת תיבת הדבקה';
      if (isHidden) {
        pasteIng.focus();
        await ensureReady();
      }
    });

    const splitTokens = (text) => {
      return (text || '')
        .split(/[\n\r,;•·|]+/g)
        .map((t) => t.trim())
        .filter(Boolean);
    };

    runPaste.addEventListener('click', async () => {
      await ensureReady();
      const raw = pasteIng.value;
      const tokens = splitTokens(raw);

      const matched = new Map();
      const unknown = [];

      for (const tok of tokens) {
        const hit = matchToken(tok);
        if (hit) {
          matched.set(hit.name, hit);
        } else {
          unknown.push(tok);
        }
      }

      out.innerHTML = '';

      // Summary card
      const summary = document.createElement('div');
      summary.className = 'resultCard';
      summary.innerHTML = `
        <h3>סיכום</h3>
        <p>סה"כ רכיבים שזוהו ברשימה: <strong>${tokens.length}</strong><br>
        התאמות במאגר: <strong>${matched.size}</strong><br>
        לא זוהו: <strong>${unknown.length}</strong></p>
      `;
      out.appendChild(summary);

      if (matched.size) {
        out.appendChild(renderCards(Array.from(matched.values()), 'נמצאו במאגר'));
      }

      if (unknown.length) {
        const u = document.createElement('div');
        u.className = 'resultCard';
        u.innerHTML = `
          <h3>לא זוהו במאגר</h3>
          <p class="muted">הדבר יכול לקרות אם הרכיב לא נמצא עדיין במאגר או אם מדובר בשגיאת כתיב. אם תרצו, שלחו לי את הרשימה הזו ואוסיף.</p>
          <div class="small" style="white-space:pre-wrap;line-height:1.5">${escapeHtml(unknown.join('\n'))}</div>
        `;
        out.appendChild(u);
      }

      // Scroll into view
      out.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // Initial load
  ensureReady();
})();
