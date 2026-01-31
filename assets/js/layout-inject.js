// Build: 2026-01-31-v21
(function(){
  const base = (document.currentScript && document.currentScript.dataset && document.currentScript.dataset.base) ? document.currentScript.dataset.base : '';
  const headerMount = document.getElementById('siteHeaderMount');
  const footerMount = document.getElementById('siteFooterMount');

  function fetchInto(url, mount){
    if(!mount) return Promise.resolve();
    return fetch(base + url + '?v=2026-01-31-v21', { cache: 'force-cache' })
      .then(r => r.text())
      .then(html => {
        mount.innerHTML = html;
      });
  }

  Promise.all([
    fetchInto('partials/header.html', headerMount),
    fetchInto('partials/footer.html', footerMount),
  ]).then(() => {
    try {
      document.dispatchEvent(new CustomEvent('kbwg:layout-ready'));
    } catch(e) {
      // IE fallback
      const evt = document.createEvent('Event');
      evt.initEvent('kbwg:layout-ready', true, true);
      document.dispatchEvent(evt);
    }
  }).catch((err) => {
    try { console.warn('[KBWG] layout inject failed', err); } catch(e) {}
  });
})();
