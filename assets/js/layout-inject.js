// Shared layout injector (header + footer) for KBWG static pages
// Loads partials/header.html into #siteHeaderMount and partials/footer.html into #siteFooterMount
(function () {
  const scriptEl = document.currentScript;
  const base = (scriptEl && scriptEl.dataset && scriptEl.dataset.base) ? scriptEl.dataset.base : '';
  const HEADER_URL = base + 'partials/header.html';
  const FOOTER_URL = base + 'partials/footer.html';

  function cacheKey(url){ return 'kbwg:partial:' + url; }

  async function inject(url, mountSelector) {
    const mount = document.querySelector(mountSelector);
    if (!mount) return false;

    // Try session cache first (fast navigation between pages)
    try {
      const cached = sessionStorage.getItem(cacheKey(url));
      if (cached) {
        mount.innerHTML = cached;
        return true;
      }
    } catch (e) {}

    try {
      const res = await fetch(url, { cache: 'force-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const html = await res.text();
      mount.innerHTML = html;
      try { sessionStorage.setItem(cacheKey(url), html); } catch (e) {}
      return true;
    } catch (e) {
      // Fail silently – page still works without injected layout
      return false;
    }
  }

  function fireReady() {
    try { window.dispatchEvent(new CustomEvent('kbwg:layout-ready')); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('kbwg:content-rendered')); } catch (e) {}
    try { if (window.Weglot && typeof Weglot.refresh === 'function') Weglot.refresh(); } catch (e) {}
  }

  Promise.all([
    inject(HEADER_URL, '#siteHeaderMount'),
    inject(FOOTER_URL, '#siteFooterMount')
  ]).then(fireReady);
})();