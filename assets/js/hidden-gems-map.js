(function () {
  if (window.__kbHiddenGemsMapLoaded) return;
  window.__kbHiddenGemsMapLoaded = true;
// --- Helpers (match site conventions / Weglot subpaths) ---
  function safeText(v) { return (v == null) ? '' : String(v); }
  function esc(s) {
    return safeText(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function isFileProtocol() {
    try { return location && location.protocol === 'file:'; } catch (e) { return false; }
  }

  // Resolve correctly when Weglot serves pages under /en/... (or when hosted under a subpath).
  function siteBaseFromScript() {
    try {
      if (typeof window.__kbwgSiteBase === 'string' && window.__kbwgSiteBase) return window.__kbwgSiteBase;
      if (typeof window.__kbwgResolveFromSiteBase === 'function') { /* fall through */ }
    } catch (e) {}

    try {
      var src = '';
      try { src = (document.currentScript && document.currentScript.src) ? document.currentScript.src : ''; } catch (e) { src = ''; }
      if (!src) {
        var scripts = document.getElementsByTagName('script');
        for (var i = scripts.length - 1; i >= 0; i--) {
          var ssrc = scripts[i] && scripts[i].src ? String(scripts[i].src) : '';
          if (ssrc.indexOf('hidden-gems-map.js') !== -1) { src = ssrc; break; }
        }
      }
      if (!src) return '/';
      var u = new URL(src, location.href);
      var p = u.pathname || '/';
      var idx = p.indexOf('/assets/js/');
      var base = idx >= 0 ? p.slice(0, idx) : p.replace(/\/[^\/]+$/, '');
      base = base.replace(/\/+$/, '');
      var parts = base.split('/').filter(Boolean);
      var langs = { en: 1, he: 1, iw: 1, ar: 1, fr: 1, es: 1, de: 1, ru: 1 };
      if (parts.length && langs[parts[parts.length - 1]]) parts.pop();
      return '/' + parts.join('/');
    } catch (e) {
      return '/';
    }
  }

  function resolveFromBase(rel) {
    try {
      if (!rel) return rel;
      if (typeof window.__kbwgResolveFromSiteBase === 'function') return window.__kbwgResolveFromSiteBase(rel);
      var p = String(rel).replace(/^\.\//, '');
      if (/^https?:\/\//i.test(p)) return p;
      var base = siteBaseFromScript() || '/';
      if (base === '/') return '/' + p.replace(/^\//, '');
      return base + '/' + p.replace(/^\//, '');
    } catch (e) {
      return rel;
    }
  }

  function uniqId() {
    return 'g' + Math.random().toString(16).slice(2) + Date.now().toString(16);
  }

  function toLower(s) { return safeText(s).toLowerCase(); }

  function isFiniteNumber(v) {
    return (typeof v === 'number') && isFinite(v);
  }

  // --- Data (fallback / example pins) ---
  // Tip: Prefer adding your real pins in data/hidden-gems.json (the code will try to load it).
  var DEFAULT_GEMS = [
    { id: 'ex-boutique-1', name: 'Vegan Boutique (דוגמה)', kind: 'boutique', city: 'Barcelona', country: 'Spain', region: 'europe', lat: 41.3851, lng: 2.1734, url: '', note: 'החליפי/הוסף נקודות אמיתיות בקובץ data/hidden-gems.json' },
    { id: 'ex-salon-1', name: 'PETA-approved Salon (דוגמה)', kind: 'salon', city: 'London', country: 'UK', region: 'europe', lat: 51.5072, lng: -0.1276, url: '', note: '' },
    { id: 'ex-sanct-1', name: 'Freedom Farm Sanctuary (דוגמה)', kind: 'sanctuary', city: '—', country: 'Israel', region: 'middle-east', lat: 31.76, lng: 35.21, url: '', note: 'דוגמה בלבד — עדכני לפי המידע הנכון' },
    { id: 'ex-boutique-2', name: 'חנות טבעונית (דוגמה)', kind: 'boutique', city: 'New York', country: 'USA', region: 'north-america', lat: 40.7128, lng: -74.0060, url: '', note: '' },
    { id: 'ex-salon-2', name: 'Vegan Hair Studio (דוגמה)', kind: 'salon', city: 'Tokyo', country: 'Japan', region: 'asia', lat: 35.6762, lng: 139.6503, url: '', note: '' },
    { id: 'ex-sanct-2', name: 'Animal Sanctuary (דוגמה)', kind: 'sanctuary', city: 'Cape Town', country: 'South Africa', region: 'africa', lat: -33.9249, lng: 18.4241, url: '', note: '' },
    { id: 'ex-boutique-3', name: 'Vegan Boutique (דוגמה)', kind: 'boutique', city: 'Sydney', country: 'Australia', region: 'oceania', lat: -33.8688, lng: 151.2093, url: '', note: '' }
  ];

  var KIND_LABEL = {
    boutique: 'בוטיק טבעוני',
    restaurant: 'מסעדה טבעונית',
    salon: 'סלון (PETA‑approved)',
    sanctuary: 'חווה/מקלט',
    suggestion: 'המלצה מהקהילה'
  };

  // --- Storage for community suggestions ---
  var LS_KEY = 'kb_hidden_gems_suggestions_v1';
  function loadSuggestions() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function saveSuggestions(arr) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(arr || [])); } catch (e) {}
  }

  // --- Map state ---
  var map = null;
  var markers = [];          // {gem, marker}
  var filtered = [];         // gems after filters
  var dataAll = [];          // gems from JSON + suggestions + fallback
  var suggestions = [];      // community suggestions
  var el = {};

  // --- Optional geocoding (for pins missing coordinates) ---
  // We keep it OFF by default to avoid hammering geocoders.
  // When you click “טעני מיקומים”, we geocode missing items gradually and cache results locally.
  var GEO_LS_KEY = 'kb_hidden_gems_geocode_cache_v1';
  var geoCache = {};
  var geoRunning = false;
  var geoQueue = [];
  var geoDone = 0;
  var geoTimer = null;

  function loadGeoCache() {
    try {
      var raw = localStorage.getItem(GEO_LS_KEY);
      if (!raw) return {};
      var obj = JSON.parse(raw);
      return (obj && typeof obj === 'object') ? obj : {};
    } catch (e) { return {}; }
  }
  function saveGeoCache() {
    try { localStorage.setItem(GEO_LS_KEY, JSON.stringify(geoCache || {})); } catch (e) {}
  }
  function geoKeyForGem(g) {
    // Prefer stable id; fallback to name+address
    var a = safeText(g.address || '');
    var c = safeText(g.city || '');
    var co = safeText(g.country || '');
    return safeText(g.id || '') || (toLower(g.name) + '|' + toLower(a) + '|' + toLower(c) + '|' + toLower(co));
  }
  function applyGeoCacheTo(list) {
    for (var i = 0; i < list.length; i++) {
      var g = list[i];
      if (isFiniteNumber(g.lat) && isFiniteNumber(g.lng)) continue;
      var k = geoKeyForGem(g);
      var hit = geoCache[k];
      if (hit && isFinite(parseFloat(hit.lat)) && isFinite(parseFloat(hit.lng))) {
        g.lat = parseFloat(hit.lat);
        g.lng = parseFloat(hit.lng);
      }
    }
  }
  function geoQueryFor(g) {
    // Most reliable: address. Otherwise name + city/country.
    var q = safeText(g.address || '').trim();
    if (!q) q = [g.name, g.city, g.country].filter(Boolean).join(', ');
    return q.trim();
  }
  function countMissingCoords(list) {
    var n = 0;
    for (var i = 0; i < list.length; i++) {
      if (!isFiniteNumber(list[i].lat) || !isFiniteNumber(list[i].lng)) n++;
    }
    return n;
  }
  function updateGeocodeButton() {
    var b = document.getElementById('btnGeocode');
    if (!b) return;
    var missing = countMissingCoords(dataAll || []);
    if (!missing) { b.style.display = 'none'; return; }
    b.style.display = '';
    if (geoRunning) {
      b.textContent = '⏳ טוען מיקומים… (' + geoDone + '/' + (geoDone + geoQueue.length) + ')';
      b.disabled = true;
    } else {
      b.textContent = '📌 טעני מיקומים (' + missing + ')';
      b.disabled = false;
    }
  }

  function geocodeNext() {
    if (!geoQueue.length) {
      geoRunning = false;
      try { if (geoTimer) clearTimeout(geoTimer); } catch (e) {}
      geoTimer = null;
      saveGeoCache();
      updateGeocodeButton();
      render();
      return;
    }

    var g = geoQueue.shift();
    var q = geoQueryFor(g);
    if (!q) {
      geoDone++;
      updateGeocodeButton();
      geoTimer = setTimeout(geocodeNext, 450);
      return;
    }

    var url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(q);

    fetch(url, { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (arr) {
        if (Array.isArray(arr) && arr[0] && arr[0].lat && arr[0].lon) {
          var lat = parseFloat(arr[0].lat);
          var lng = parseFloat(arr[0].lon);
          if (isFinite(lat) && isFinite(lng)) {
            g.lat = lat;
            g.lng = lng;
            var k = geoKeyForGem(g);
            geoCache[k] = { lat: lat, lng: lng };
          }
        }
      })
      .catch(function () { /* ignore */ })
      .finally(function () {
        geoDone++;
        // Save every ~10 results to persist progress
        if (geoDone % 10 === 0) saveGeoCache();
        updateGeocodeButton();
        // Render occasionally so pins appear progressively without too much jank
        if (geoDone % 5 === 0) render();
        geoTimer = setTimeout(geocodeNext, 1250); // polite throttle
      });
  }

  function startGeocodeMissing() {
    if (geoRunning) return;
    geoCache = loadGeoCache() || {};
    applyGeoCacheTo(dataAll || []);
    geoQueue = [];
    geoDone = 0;

    for (var i = 0; i < dataAll.length; i++) {
      var g = dataAll[i];
      // Only geocode real pins (not suggestions unless they have address)
      if (!isFiniteNumber(g.lat) || !isFiniteNumber(g.lng)) {
        geoQueue.push(g);
      }
    }
    if (!geoQueue.length) {
      updateGeocodeButton();
      render();
      return;
    }
    geoRunning = true;
    updateGeocodeButton();
    geocodeNext();
  }

  function makePin(kind) {
    var cls = 'kbPin';
    var emoji = '📍';
    if (kind === 'boutique') { cls += ' kbPinBoutique'; emoji = '🛍️'; }
    else if (kind === 'restaurant') { cls += ' kbPinRestaurant'; emoji = '🍽️'; }
    else if (kind === 'salon') { cls += ' kbPinSalon'; emoji = '💇‍♀️'; }
    else if (kind === 'sanctuary') { cls += ' kbPinSanctuary'; emoji = '🐮'; }
    else { cls += ' kbPinSuggest'; emoji = '⭐'; }

    return L.divIcon({
      className: '',
      html: '<div class="' + cls + '" aria-hidden="true">' + emoji + '</div>',
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -14]
    });
  }

  function setCountText(n) {
    if (!el.mapCount) return;
    if (n === 0) el.mapCount.textContent = 'לא נמצאו נקודות לפי הסינון.';
    else if (n === 1) el.mapCount.textContent = 'נקודה אחת נמצאה.';
    else el.mapCount.textContent = 'נמצאו ' + n + ' נקודות.';
  }

  function cardHTML(g) {
    var typeCls = 'gemType';
    if (g.kind === 'boutique') typeCls += ' typeBoutique';
    else if (g.kind === 'restaurant') typeCls += ' typeRestaurant';
    else if (g.kind === 'salon') typeCls += ' typeSalon';
    else if (g.kind === 'sanctuary') typeCls += ' typeSanctuary';
    else typeCls += ' typeSuggest';

    var place = [];
    if (g.city) place.push(g.city);
    if (g.country) place.push(g.country);

    var link = g.url ? ('<a class="gemLink" href="' + esc(g.url) + '" target="_blank" rel="noopener">פתיחה באתר ↗</a>') : '';
    var addr = g.address ? ('<div class="gemMeta" style="margin-top:4px">' + esc(g.address) + '</div>') : '';
    var note = g.note ? ('<div class="gemMeta" style="margin-top:8px">' + esc(g.note) + '</div>') : '';

    return (
      '<article class="gemCard" data-id="' + esc(g.id) + '" role="button" tabindex="0">' +
        '<div class="gemTop">' +
          '<div class="gemName">' + esc(g.name) + '</div>' +
          '<div class="' + typeCls + '">' + esc(KIND_LABEL[g.kind] || KIND_LABEL.suggestion) + '</div>' +
        '</div>' +
        '<div class="gemMeta">' + esc(place.join(' · ')) + '</div>' +
        addr +
        link +
        note +
      '</article>'
    );
  }

  function popupHTML(g) {
    var place = [];
    if (g.city) place.push(g.city);
    if (g.country) place.push(g.country);

    var link = g.url ? ('<div style="margin-top:8px"><a href="' + esc(g.url) + '" target="_blank" rel="noopener">פתיחה באתר ↗</a></div>') : '';
    var addr = g.address ? ('<div style="margin-top:6px;color:rgba(15,23,42,.78)">' + esc(g.address) + '</div>') : '';
    var note = g.note ? ('<div style="margin-top:8px;color:rgba(15,23,42,.78)">' + esc(g.note) + '</div>') : '';

    return (
      '<div style="font-family:inherit">' +
        '<div style="font-weight:900; margin-bottom:4px">' + esc(g.name) + '</div>' +
        '<div style="font-weight:800; font-size:12.5px; opacity:.85">' + esc(KIND_LABEL[g.kind] || '') + '</div>' +
        '<div style="margin-top:6px; font-size:13px; opacity:.85">' + esc(place.join(' · ')) + '</div>' +
        addr +
        link +
        note +
      '</div>'
    );
  }

  function clearMarkers() {
    for (var i = 0; i < markers.length; i++) {
      try { map.removeLayer(markers[i].marker); } catch (e) {}
    }
    markers = [];
  }

  function addMarkers(list) {
    for (var i = 0; i < list.length; i++) {
      var g = list[i];
      if (!isFiniteNumber(g.lat) || !isFiniteNumber(g.lng)) continue;
      var mk = L.marker([g.lat, g.lng], { icon: makePin(g.kind) });
      mk.bindPopup(popupHTML(g), { maxWidth: 280 });
      mk.addTo(map);
      markers.push({ gem: g, marker: mk });
    }
  }

  function getChecked(id) {
    var node = document.getElementById(id);
    return !!(node && node.checked);
  }

  function currentSearch() {
    var s = el.mapSearch ? safeText(el.mapSearch.value).trim() : '';
    return toLower(s);
  }

  function currentRegion() {
    var v = el.mapRegion ? safeText(el.mapRegion.value) : 'all';
    return v || 'all';
  }

  function passesFilters(g) {
    // kind toggles
    var kindOk = false;
    if (g.kind === 'boutique' && getChecked('fBoutique')) kindOk = true;
    if (g.kind === 'restaurant' && getChecked('fRestaurant')) kindOk = true;
    if (g.kind === 'salon' && getChecked('fSalon')) kindOk = true;
    if (g.kind === 'sanctuary' && getChecked('fSanctuary')) kindOk = true;
    if (g.kind === 'suggestion' && getChecked('fSuggest')) kindOk = true;
    if (!kindOk) return false;

    // region
    var reg = currentRegion();
    if (reg && reg !== 'all' && safeText(g.region) && g.region !== reg) return false;

    // search
    var q = currentSearch();
    if (q) {
      var hay = toLower([g.name, g.city, g.country].join(' '));
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  }

  function render() {
    // Filter
    filtered = [];
    for (var i = 0; i < dataAll.length; i++) {
      var g = dataAll[i];
      if (passesFilters(g)) filtered.push(g);
    }

    // Update markers + list
    clearMarkers();
    addMarkers(filtered);

    if (el.gemsList) {
      if (!filtered.length) {
        el.gemsList.innerHTML = '<div class="muted" style="grid-column: 1/-1; padding: 10px 4px">אין תוצאות לפי הסינון. נסי לשנות אזור/חיפוש.</div>';
      } else {
        var out = '';
        for (var j = 0; j < filtered.length; j++) out += cardHTML(filtered[j]);
        el.gemsList.innerHTML = out;
      }
    }

    setCountText(filtered.length);
    updateGeocodeButton();

    // Let Weglot refresh (optional)
    try { window.dispatchEvent(new Event('kbwg:content-rendered')); } catch (e) {}
  }

  function focusGemById(id) {
    if (!id) return;
    for (var i = 0; i < markers.length; i++) {
      if (markers[i].gem && markers[i].gem.id === id) {
        try {
          map.setView(markers[i].marker.getLatLng(), Math.max(map.getZoom(), 12), { animate: true });
          markers[i].marker.openPopup();
        } catch (e) {}
        break;
      }
    }
  }

  function handleListClicks() {
    if (!el.gemsList) return;
    el.gemsList.addEventListener('click', function (ev) {
      var node = ev.target;
      while (node && node !== el.gemsList) {
        if (node.getAttribute && node.getAttribute('data-id')) {
          focusGemById(node.getAttribute('data-id'));
          return;
        }
        node = node.parentNode;
      }
    });

    el.gemsList.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      var node = ev.target;
      if (node && node.getAttribute && node.getAttribute('data-id')) {
        ev.preventDefault();
        focusGemById(node.getAttribute('data-id'));
      }
    });
  }

  function notify(text) {
    // lightweight notice near count
    if (!el.mapCount) return;
    var old = el.mapCount.textContent;
    el.mapCount.textContent = text;
    setTimeout(function () { el.mapCount.textContent = old; }, 2200);
  }

  function locateMe() {
    if (!navigator.geolocation) {
      notify('הדפדפן לא תומך במיקום.');
      return;
    }
    notify('מבקש מיקום…');
    navigator.geolocation.getCurrentPosition(function (pos) {
      var lat = pos.coords.latitude;
      var lng = pos.coords.longitude;
      try { map.setView([lat, lng], 12, { animate: true }); } catch (e) {}
      notify('עודכן לפי המיקום שלך.');
    }, function () {
      notify('לא הצלחנו לקבל מיקום.');
    }, { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 });
  }

  function resetFilters() {
    try { document.getElementById('fBoutique').checked = true; } catch (e) {}
    try { document.getElementById('fRestaurant').checked = true; } catch (e) {}
    try { document.getElementById('fSalon').checked = true; } catch (e) {}
    try { document.getElementById('fSanctuary').checked = true; } catch (e) {}
    try { document.getElementById('fSuggest').checked = true; } catch (e) {}
    try { el.mapSearch.value = ''; } catch (e) {}
    try { el.mapRegion.value = 'all'; } catch (e) {}
    try { map.setView([20, 0], 2); } catch (e) {}
    render();
  }

  // --- Suggestion dialog ---
  function parseLatLngFromText(raw) {
    var s = safeText(raw).trim();
    if (!s) return null;

    // direct "lat,lng"
    var m = s.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };

    // google maps patterns: @lat,lng or q=lat,lng
    m = s.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
    m = s.match(/[?&]q=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };

    return null;
  }

  function openSuggestDialog() {
    var dlg = document.getElementById('suggestDialog');
    if (!dlg) return;
    try { dlg.showModal(); } catch (e) { dlg.setAttribute('open', 'open'); }
  }

  function closeSuggestDialog() {
    var dlg = document.getElementById('suggestDialog');
    if (!dlg) return;
    try { dlg.close(); } catch (e) { dlg.removeAttribute('open'); }
  }

  function ensureDialog() {
    // Inject <dialog> once (keeps HTML files cleaner if you prefer)
    if (document.getElementById('suggestDialog')) return;

    var dlg = document.createElement('dialog');
    dlg.className = 'kbDialog';
    dlg.id = 'suggestDialog';
    dlg.innerHTML =
      '<div class="kbDialogCard">' +
        '<div class="kbDialogHeader">' +
          '<h3>להציע פנינה חדשה</h3>' +
          '<button class="kbClose" type="button" data-kb-close>סגירה</button>' +
        '</div>' +
        '<p class="kbSmall">ההמלצות נשמרות אצלך בדפדפן (LocalStorage). אפשר לייצא JSON כדי להעתיק ל־data/hidden-gems.json.</p>' +
        '<form id="suggestForm" method="dialog">' +
          '<div class="kbDialogGrid">' +
            '<div class="kbField"><label>שם המקום</label><input class="kbInput" name="name" required placeholder="למשל: Vegan Beauty Boutique"/></div>' +
            '<div class="kbField"><label>סוג</label>' +
              '<select class="kbSelect" name="kind" required>' +
                '<option value="boutique">בוטיק טבעוני</option>' +
                '<option value="salon">סלון (PETA‑approved)</option>' +
                '<option value="sanctuary">חווה/מקלט</option>' +
              '</select>' +
            '</div>' +
            '<div class="kbField"><label>עיר</label><input class="kbInput" name="city" placeholder="עיר"/></div>' +
            '<div class="kbField"><label>מדינה</label><input class="kbInput" name="country" placeholder="מדינה"/></div>' +
            '<div class="kbField"><label>קישור</label><input class="kbInput" name="url" placeholder="https://..."/></div>' +
            '<div class="kbField"><label>מיקום (lat,lng או לינק Google Maps)</label><input class="kbInput" name="latlng" required placeholder="31.76, 35.21"/></div>' +
          '</div>' +
          '<div class="kbField"><label>הערה (אופציונלי)</label><input class="kbInput" name="note" placeholder="למשל: טבעוני 100% + מוצרים מאושרי PETA"/></div>' +
          '<div class="kbDialogFooter">' +
            '<div class="kbSmall" id="suggestMsg"></div>' +
            '<div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end">' +
              '<button class="kbBtn kbBtnGhost" type="button" id="btnExportSuggest">ייצוא JSON</button>' +
              '<button class="kbBtn kbBtnPrimary" type="submit">שמירה</button>' +
            '</div>' +
          '</div>' +
        '</form>' +
      '</div>';

    document.body.appendChild(dlg);

    dlg.addEventListener('click', function (ev) {
      // click backdrop closes
      if (ev.target === dlg) closeSuggestDialog();
    });

    var closeBtn = dlg.querySelector('[data-kb-close]');
    if (closeBtn) closeBtn.addEventListener('click', function () { closeSuggestDialog(); });

    var form = dlg.querySelector('#suggestForm');
    var msg = dlg.querySelector('#suggestMsg');
    var btnExport = dlg.querySelector('#btnExportSuggest');

    if (btnExport) {
      btnExport.addEventListener('click', function () {
        var arr = loadSuggestions();
        var blob = new Blob([JSON.stringify(arr, null, 2)], { type: 'application/json;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'hidden-gems-suggestions.json';
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 8000);
        if (msg) msg.textContent = 'הורד קובץ JSON. אפשר להעתיק את התוכן ל־data/hidden-gems.json.';
      });
    }

    if (form) {
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();

        var fd = new FormData(form);
        var name = safeText(fd.get('name')).trim();
        var kind = safeText(fd.get('kind')).trim();
        var city = safeText(fd.get('city')).trim();
        var country = safeText(fd.get('country')).trim();
        var url = safeText(fd.get('url')).trim();
        var note = safeText(fd.get('note')).trim();
        var latlngRaw = safeText(fd.get('latlng')).trim();

        var ll = parseLatLngFromText(latlngRaw);
        if (!ll || !isFinite(ll.lat) || !isFinite(ll.lng)) {
          if (msg) msg.textContent = 'לא זיהיתי מיקום. נסי "lat,lng" או לינק Google Maps.';
          return;
        }

        var s = {
          id: uniqId(),
          name: name,
          kind: 'suggestion', // keep community separate visually
          suggestedKind: kind, // original kind requested
          city: city,
          country: country,
          region: '', // optional
          lat: ll.lat,
          lng: ll.lng,
          url: url,
          note: note ? (note + ' (הצעת קהילה)') : 'הצעת קהילה'
        };

        var arr = loadSuggestions();
        arr.unshift(s);
        saveSuggestions(arr);

        suggestions = arr.slice();
        rebuildDataAll(); // refresh list/markers
        render();

        try { form.reset(); } catch (e) {}
        if (msg) msg.textContent = 'נשמר! תודה 💛';
        setTimeout(function () { closeSuggestDialog(); }, 650);
      });
    }
  }

  function rebuildDataAll() {
    // merge main data + suggestions (as kind=suggestion)
    dataAll = [];
    // main pins
    for (var i = 0; i < (window.__kbHiddenGemsData || []).length; i++) dataAll.push(window.__kbHiddenGemsData[i]);
    // suggestions
    for (var j = 0; j < suggestions.length; j++) {
      var s = suggestions[j];
      // normalize kind to suggestion
      var g = {
        id: safeText(s.id || uniqId()),
        name: safeText(s.name || 'הצעת קהילה'),
        kind: 'suggestion',
        city: safeText(s.city || ''),
        country: safeText(s.country || ''),
        region: safeText(s.region || ''),
        lat: (typeof s.lat === 'number') ? s.lat : parseFloat(s.lat),
        lng: (typeof s.lng === 'number') ? s.lng : parseFloat(s.lng),
        url: safeText(s.url || ''),
        note: safeText(s.note || 'הצעת קהילה')
      };
      dataAll.push(g);
    }
  }

  function normalizeGems(arr) {
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var g = arr[i] || {};
      var kind = safeText(g.kind).trim();
      if (!kind) kind = safeText(g.type).trim(); // alias
      kind = kind || 'boutique';
      if (kind !== 'boutique' && kind !== 'restaurant' && kind !== 'salon' && kind !== 'sanctuary' && kind !== 'suggestion') kind = 'boutique';

      var lat = (typeof g.lat === 'number') ? g.lat : parseFloat(g.lat);
      var lng = (typeof g.lng === 'number') ? g.lng : parseFloat(g.lng);
      if (!isFinite(lat)) lat = null;
      if (!isFinite(lng)) lng = null;

      out.push({
        id: safeText(g.id || uniqId()),
        name: safeText(g.name || ''),
        kind: kind,
        city: safeText(g.city || ''),
        country: safeText(g.country || ''),
        region: safeText(g.region || ''),
        address: safeText(g.address || ''),
        lat: lat,
        lng: lng,
        url: safeText(g.url || ''),
        note: safeText(g.note || '')
      });
    }
    return out;
  }

  function loadMainDataThenInit() {
    var __didReady = false;
    // suggestions from local storage
    suggestions = loadSuggestions();

    // Try to load data/hidden-gems.json, fall back to DEFAULT_GEMS
    var jsonUrl = resolveFromBase('data/hidden-gems.json?v=2026-01-30-v5');
    var onReady = function (mainPins) {
      if (__didReady) return;
      __didReady = true;
window.__kbHiddenGemsData = normalizeGems(mainPins || []);
      geoCache = loadGeoCache() || {};
      rebuildDataAll();
      applyGeoCacheTo(dataAll || []);
      initUI();
      initMap();
      render();
    };

    // If fetch fails (CORS on file://), still show defaults.
    try {
      if (typeof fetch !== 'function') return onReady(DEFAULT_GEMS);

      fetch(jsonUrl, { cache: 'force-cache' })
        .then(function (r) { if (!r.ok) throw new Error('bad status'); return r.json(); })
        .then(function (data) {
          if (!Array.isArray(data)) throw new Error('JSON must be an array');
          onReady(data);
        })
        .catch(function () {
          // fallback
          onReady(DEFAULT_GEMS);
        });
    } catch (e) {
      onReady(DEFAULT_GEMS);
    }
  }

  function initUI() {
    el.mapSearch = document.getElementById('mapSearch');
    el.mapRegion = document.getElementById('mapRegion');
    el.mapCount = document.getElementById('mapCount');
    el.gemsList = document.getElementById('gemsList');

    var watchIds = ['mapSearch', 'mapRegion', 'fBoutique', 'fRestaurant', 'fSalon', 'fSanctuary', 'fSuggest'];
    for (var i = 0; i < watchIds.length; i++) {
      var n = document.getElementById(watchIds[i]);
      if (!n) continue;
      var evName = (watchIds[i] === 'mapSearch') ? 'input' : 'change';
      n.addEventListener(evName, function () { render(); });
    }

    var bLocate = document.getElementById('btnLocate');
    if (bLocate) bLocate.addEventListener('click', locateMe);

    var bReset = document.getElementById('btnReset');
    if (bReset) bReset.addEventListener('click', resetFilters);

    var bGeo = document.getElementById('btnGeocode');
    if (bGeo) bGeo.addEventListener('click', startGeocodeMissing);

    var bSuggest = document.getElementById('btnSuggest');
    if (bSuggest) bSuggest.addEventListener('click', function () {
      ensureDialog();
      openSuggestDialog();
    });

    handleListClicks();

    // If opened from file:// and JSON not loading, show a gentle hint.
    if (isFileProtocol()) {
      // no-op; page still works via fallback pins
    }
  }

  function initMap() {
    if (!window.L) return;
    var el = document.getElementById('gemsMap');
    if (!el) return;

    // If the script runs twice or the page re-renders, clean up previous Leaflet instance.
    try {
      if (map) { map.remove(); map = null; }
    } catch (e) { map = null; }

    // Leaflet marks the container; clear it to avoid "already initialized".
    try {
      if (el._leaflet_id) { delete el._leaflet_id; }
    } catch (e) {
      try { el._leaflet_id = null; } catch (e2) {}
    }

    map = L.map('gemsMap', {
      zoomControl: true,
      scrollWheelZoom: false,
      worldCopyJump: true
    }).setView([20, 0], 2);

    // OSM tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
  }

  function main() {
    loadMainDataThenInit();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }
})();