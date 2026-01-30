/* Vegan in Israel page logic (page-only) */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const DATA_URL = 'data/vegan-in-israel.json';
  const STATE = {
    places: [],
    filter: {
      q: '',
      region: 'all',
      type: 'all' // restaurant | shop | all
    },
    map: null,
    markers: []
  };

  function normalize(str) {
    return (str || '')
      .toString()
      .toLowerCase()
      .trim();
  }

  function formatAddress(p) {
    return (document.documentElement.lang === 'he' || document.documentElement.dir === 'rtl')
      ? (p.address_he || p.address || '')
      : (p.address || p.address_he || '');
  }

  function formatName(p) {
    return (document.documentElement.lang === 'he' || document.documentElement.dir === 'rtl')
      ? (p.name_he || p.name || '')
      : (p.name || p.name_he || '');
  }

  function formatNotes(p) {
    return (document.documentElement.lang === 'he' || document.documentElement.dir === 'rtl')
      ? (p.notes_he || '')
      : (p.notes_en || p.notes_he || '');
  }

  function mapQueryLink(p) {
    const addr = encodeURIComponent(p.address || p.address_he || p.name || '');
    return `https://www.google.com/maps/search/?api=1&query=${addr}`;
  }

  function passesFilter(p) {
    const q = normalize(STATE.filter.q);
    const regionOk = (STATE.filter.region === 'all') || (normalize(p.region) === STATE.filter.region);
    const typeOk = (STATE.filter.type === 'all') || (p.type === STATE.filter.type);

    if (!regionOk || !typeOk) return false;
    if (!q) return true;

    const hay = [
      p.name, p.name_he, p.city, p.city_he, p.address, p.address_he,
      p.region, p.region_he, p.typeLabel_he, p.notes_he, p.notes_en
    ].filter(Boolean).map(normalize).join(' ');
    return hay.includes(q);
  }

  function pill(label) {
    return `<span class="pill">${label}</span>`;
  }

  function typeLabel(p) {
    if (document.documentElement.lang === 'he' || document.documentElement.dir === 'rtl') {
      return p.typeLabel_he || (p.type === 'shop' ? 'חנות' : 'מסעדה');
    }
    return p.type === 'shop' ? 'Shop' : 'Restaurant';
  }

  function renderList() {
    const grid = $('#placesGrid');
    const items = STATE.places.filter(passesFilter);

    if (!items.length) {
      grid.innerHTML = `
        <div class="contentCard" style="grid-column:1/-1;">
          <h3 style="margin:0 0 .25rem;">לא מצאנו התאמה</h3>
          <p style="margin:0;">נסו לשנות חיפוש/אזור או להסיר פילטרים.</p>
        </div>`;
      return;
    }

    grid.innerHTML = items.map(p => {
      const name = formatName(p);
      const addr = formatAddress(p);
      const notes = formatNotes(p);
      const city = (document.documentElement.lang === 'he' || document.documentElement.dir === 'rtl') ? (p.city_he || p.city) : (p.city || p.city_he);
      const region = (document.documentElement.lang === 'he' || document.documentElement.dir === 'rtl') ? (p.region_he || p.region) : (p.region || p.region_he);

      const pills = [
        pill(typeLabel(p)),
        city ? pill(city) : '',
        region ? pill(region) : '',
      ].join('');

      const siteLink = p.website ? `<a class="btnSmall" href="${p.website}" target="_blank" rel="noopener">אתר</a>` : '';
      const igLink = p.instagram ? `<a class="btnSmall" href="${p.instagram}" target="_blank" rel="noopener">אינסטגרם</a>` : '';
      const mapsLink = `<a class="btnSmall" href="${mapQueryLink(p)}" target="_blank" rel="noopener">מפות</a>`;

      return `
        <article class="placeCard contentCard">
          <div class="placeCardTop">
            <h3 class="placeTitle">${escapeHtml(name)}</h3>
            <div class="pillRow">${pills}</div>
          </div>

          <p class="placeAddr">${escapeHtml(addr)}</p>
          ${notes ? `<p class="placeNotes">${escapeHtml(notes)}</p>` : ''}

          <div class="placeActions">
            ${mapsLink}
            ${siteLink}
            ${igLink}
            <button class="btnSmall btnGhost" data-focus="${p.id}">הצג במפה</button>
          </div>
        </article>`;
    }).join('');

    // attach handlers
    $$('#placesGrid [data-focus]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-focus');
        focusOn(id);
      });
    });
  }

  function clearMarkers() {
    STATE.markers.forEach(m => m.remove());
    STATE.markers = [];
  }

  function renderMap() {
    const mapEl = $('#veganMap');
    if (!mapEl) return;

    if (!STATE.map) {
      // Leaflet must exist
      if (!window.L) {
        mapEl.innerHTML = '<p style="margin:0;">המפה לא נטענה (Leaflet לא זמין).</p>';
        return;
      }
      STATE.map = L.map('veganMap', { scrollWheelZoom: false }).setView([31.7, 34.8], 7);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(STATE.map);
    }

    clearMarkers();

    const items = STATE.places.filter(passesFilter).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    items.forEach(p => {
      const marker = L.marker([p.lat, p.lng]).addTo(STATE.map);
      marker.bindPopup(`
        <div style="min-width:180px;">
          <strong>${escapeHtml(formatName(p))}</strong><br/>
          <small>${escapeHtml(formatAddress(p))}</small><br/>
          <a href="${mapQueryLink(p)}" target="_blank" rel="noopener">Open in Maps</a>
        </div>
      `);
      marker.__placeId = p.id;
      STATE.markers.push(marker);
    });

    // Fit bounds if we have markers
    if (STATE.markers.length) {
      const group = new L.featureGroup(STATE.markers);
      STATE.map.fitBounds(group.getBounds().pad(0.2));
    } else {
      STATE.map.setView([31.7, 34.8], 7);
    }
  }

  function focusOn(placeId) {
    const p = STATE.places.find(x => x.id === placeId);
    if (!p || !STATE.map || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return;
    STATE.map.setView([p.lat, p.lng], 15, { animate: true });
    const m = STATE.markers.find(mm => mm.__placeId === placeId);
    if (m) m.openPopup();
    // scroll to map on mobile
    $('#mapSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function wireFilters() {
    const q = $('#searchInput');
    const region = $('#regionSelect');
    const type = $('#typeSelect');
    const reset = $('#resetFilters');

    q.addEventListener('input', () => {
      STATE.filter.q = q.value || '';
      renderMap();
      renderList();
    });

    region.addEventListener('change', () => {
      STATE.filter.region = region.value;
      renderMap();
      renderList();
    });

    type.addEventListener('change', () => {
      STATE.filter.type = type.value;
      renderMap();
      renderList();
    });

    reset.addEventListener('click', () => {
      STATE.filter = { q: '', region: 'all', type: 'all' };
      q.value = '';
      region.value = 'all';
      type.value = 'all';
      renderMap();
      renderList();
    });
  }

  async function load() {
    try {
      const res = await fetch(DATA_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error('Bad response');
      const json = await res.json();
      STATE.places = (json.places || []).map(p => ({
        ...p,
        lat: (p.lat === null || p.lat === undefined) ? null : Number(p.lat),
        lng: (p.lng === null || p.lng === undefined) ? null : Number(p.lng),
      }));
      const stamp = $('#dataStamp');
      if (stamp && json.updatedAt) stamp.textContent = json.updatedAt;
    } catch (e) {
      console.warn('Vegan in Israel: failed to load data/vegan-in-israel.json', e);
      STATE.places = [];
    }

    // Regions dropdown options based on data
    const region = $('#regionSelect');
    const regions = Array.from(new Set(STATE.places.map(p => normalize(p.region)).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b));
    region.innerHTML = [
      `<option value="all">כל הארץ</option>`,
      ...regions.map(r => `<option value="${r}">${escapeHtml(r === 'jerusalem' ? 'ירושלים' : (r === 'center' ? 'מרכז' : (r === 'north' ? 'צפון' : (r === 'online' ? 'אונליין' : r))))}</option>`)
    ].join('');

    renderMap();
    renderList();
    wireFilters();
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  document.addEventListener('DOMContentLoaded', load);
})();
