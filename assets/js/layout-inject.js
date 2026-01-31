// Build: 2026-01-31-v20
// KBWG layout injector (shared header/footer) — Build 2026-01-31-v20
(function() {
  const BUILD = '2026-01-31-v20';
  const fetchText = async (url) => {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) throw new Error('Failed to fetch ' + url + ' (' + res.status + ')');
    return await res.text();
  };

  async function inject() {
    const headerMount = document.getElementById('siteHeaderMount');
    const footerMount = document.getElementById('siteFooterMount');

    try {
      if (headerMount) {
        headerMount.innerHTML = await fetchText('partials/header.html?v=' + BUILD);
      }
      if (footerMount) {
        footerMount.innerHTML = await fetchText('partials/footer.html?v=' + BUILD);
      }
    } catch (e) {
      try { console.warn('[KBWG] layout inject failed', e); } catch(_e) {}
    }

    // Signal to site.js that header/footer are now in the DOM
    try {
      document.dispatchEvent(new CustomEvent('kbwg:layoutReady', { detail: { build: BUILD } }));
    } catch (e) {
      try { const ev = document.createEvent('Event'); ev.initEvent('kbwg:layoutReady', true, true); document.dispatchEvent(ev); } catch(_e) {}
    }
  }

  // Start asap (defer scripts run after HTML is parsed)
  inject();
})();
