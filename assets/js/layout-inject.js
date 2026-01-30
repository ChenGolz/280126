// Shared layout injector (header + footer) for KBWG static pages
// Loads partials/header.html into #siteHeaderMount and partials/footer.html into #siteFooterMount
(function () {
  const scriptEl = document.currentScript;
  const base = (scriptEl && scriptEl.dataset && scriptEl.dataset.base) ? scriptEl.dataset.base : '';
  const HEADER_URL = base + 'partials/header.html';
  const FOOTER_URL = base + 'partials/footer.html';

  async function inject(url, mountSelector) {
    const mount = document.querySelector(mountSelector);
    if (!mount) return false;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const html = await res.text();
      mount.innerHTML = html;
      return true;
    } catch (e) {
      console.warn('[KBWG] layout inject failed for', url, e);
      return false;
    }
  }

  function fireReady() {
    // Let other scripts know layout is in place
    try { window.dispatchEvent(new CustomEvent('kbwg:layout-ready')); } catch (e) {}
    // Also keep your existing Weglot workflow
    try { window.dispatchEvent(new CustomEvent('kbwg:content-rendered')); } catch (e) {}
    try { if (window.Weglot && typeof Weglot.refresh === 'function') Weglot.refresh(); } catch (e) {}
  }

  // Inject header and footer; then fire layout-ready once (even if one is missing)
  Promise.all([
    inject(HEADER_URL, '#siteHeaderMount'),
    inject(FOOTER_URL, '#siteFooterMount')
  ]).then(fireReady);
})();
