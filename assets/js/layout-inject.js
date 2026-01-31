/* Shared header/footer injector (v24) */
(function () {
  "use strict";

  const BUILD = "2026-02-02-v24";
  const HEADER_URL = `partials/header.html?v=${BUILD}`;
  const FOOTER_URL = `partials/footer.html?v=${BUILD}`;

  const H_KEY = `kbwg:header:${BUILD}`;
  const F_KEY = `kbwg:footer:${BUILD}`;

  async function getOrFetch(url, key) {
    try {
      const cached = sessionStorage.getItem(key);
      if (cached) return cached;
    } catch (_) {}

    const res = await fetch(url, { cache: "force-cache" });
    const html = await res.text();

    try {
      sessionStorage.setItem(key, html);
    } catch (_) {}

    return html;
  }

  function inject(targetId, html) {
    const el = document.getElementById(targetId);
    if (el) el.innerHTML = html;
  }

  async function boot() {
    try {
      const [headerHTML, footerHTML] = await Promise.all([
        getOrFetch(HEADER_URL, H_KEY),
        getOrFetch(FOOTER_URL, F_KEY),
      ]);

      inject("siteHeaderMount", headerHTML);
      inject("siteFooterMount", footerHTML);

      // Let page scripts know the layout is ready
      document.dispatchEvent(new CustomEvent("kbwg:layout-ready"));
    } catch (e) {
      console.error("layout-inject failed", e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
