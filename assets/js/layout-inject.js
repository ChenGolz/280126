// Shared layout injector (header/nav) for KBWG static pages
// Loads partials/header.html into #siteHeaderMount
(function () {
  const scriptEl = document.currentScript;
  const base = (scriptEl && scriptEl.dataset && scriptEl.dataset.base) ? scriptEl.dataset.base : '';
  const HEADER_URL = base + 'partials/header.html';

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
    try { window.dispatchEvent(new CustomEvent('kbwg:layout-ready')); } catch(e) {}
    try { window.dispatchEvent(new CustomEvent('kbwg:content-rendered')); } catch(e) {}
    try { if (window.Weglot && typeof Weglot.refresh === 'function') Weglot.refresh(); } catch(e) {}
  }

  // Run ASAP (script is defer, so DOM is parsed)
  inject(HEADER_URL, '#siteHeaderMount').then((ok) => {
    if (ok) fireReady();
  });
})();
