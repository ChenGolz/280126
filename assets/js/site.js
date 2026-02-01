// KBWG site helpers (RTL-first)

(function () {
  // Build marker: use this to verify you loaded the latest JS
  window.KBWG_BUILD = '2026-02-01-v16';
  try { console.info('[KBWG] build', window.KBWG_BUILD); } catch(e) {}
    
function kbwgInjectFaqSchema(){
  try{
    if (window.__KBWG_FAQ_SCHEMA_DONE) return;
    window.__KBWG_FAQ_SCHEMA_DONE = true;

    let faqs = null;
    const el = document.getElementById('kbwgFaqData');
    if (el && el.textContent && el.textContent.trim()){
      try{
        const parsed = JSON.parse(el.textContent.trim());
        if (Array.isArray(parsed) && parsed.length){
          faqs = parsed.filter(x => x && x.q && x.a).slice(0, 12);
        }
      }catch(_){}
    }

    if (!faqs){
      faqs = [
        { q: 'מה זה “100% טבעוני”?', a: 'מוצר ללא רכיבים מן החי — כולל נגזרות כמו דבש, לנולין, קרמין וכדומה.' },
        { q: 'מה זה “לא נוסה על בעלי חיים”?', a: 'אנחנו מציגים רק מותגים ומוצרים שמוצהרים/מאומתים כלא מבצעים ניסויים בבעלי חיים.' },
        { q: 'איך אתם בודקים מותגים?', a: 'משלבים הצהרה רשמית של מותג + הצלבה עם מקורות מוכרים ובדיקה תקופתית. פירוט בעמוד “שיטה”.' },
        { q: 'מה לעשות אם מצאתי מידע שגוי?', a: 'שלחי לנו דרך “צור קשר” — זה עוזר לשמור את המאגר חינמי ומדויק.' }
      ];
    }

    const schema = {
      "@context":"https://schema.org",
      "@type":"FAQPage",
      "mainEntity": faqs.map(f => ({
        "@type":"Question",
        "name": String(f.q),
        "acceptedAnswer": { "@type":"Answer", "text": String(f.a) }
      }))
    };

    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(schema);
    document.head.appendChild(s);
  }catch(_){}
}

function kbwgSetActiveNav() {
    // Auto-highlight active nav (fallback if aria-current isn't set)
      const pathname = window.location.pathname || '';
      document.querySelectorAll('.nav a').forEach(a => {
        const href = a.getAttribute('href');
        if (!href) return;
    
        const isHomeLink = (href === 'index.html' || href.endsWith('/index.html'));
        const onHome = (
          pathname === '/' ||
          pathname === '' ||
          /\/index\.html?$/.test(pathname) ||
          /\/$/.test(pathname)
        );
    
        if (
          (isHomeLink && onHome) ||
          pathname.endsWith('/' + href) ||
          pathname.endsWith(href)
        ) {
          a.classList.add('active');
          a.setAttribute('aria-current', 'page');
        }
      });
  }

  // Run now + after dynamic header injection
  kbwgSetActiveNav();
  window.addEventListener('kbwg:layout-ready', kbwgSetActiveNav);

// Hero quote rotator (rotates through the 5 quotes)
  const QUOTES = [
    "היו טובים לכל היצורים.",
    "חמלה היא האופנה הכי יפה.",
    "חיה ותן לחיות.",
    "חמלה היא דרך חיים."
  ];

  const el = document.querySelector('[data-quote]');
  if (el) {
    let i = 0;
    const tick = () => {
      el.textContent = QUOTES[i % QUOTES.length];
      i++;
    };
    tick();
    window.setInterval(tick, 4200);
  }

  // Contact: copy email button
  const copyBtn = document.getElementById('copyEmailBtn');
  const emailLink = document.getElementById('emailLink');
  if (copyBtn && emailLink) {
    copyBtn.addEventListener('click', async () => {
      const email = emailLink.textContent.trim();
      try {
        await navigator.clipboard.writeText(email);
        copyBtn.textContent = "הועתק ✓";
        window.setTimeout(() => (copyBtn.textContent = "העתקת כתובת"), 1800);
      } catch (e) {
        alert("לא הצליח להעתיק. אפשר להעתיק ידנית: " + email);
      }
    });
  }

    function kbwgInitNavAccordion(navRoot){
      try{
        if (!navRoot || navRoot.dataset.kbwgAccordionInit) return;
        navRoot.dataset.kbwgAccordionInit = '1';

        const groups = Array.from(navRoot.querySelectorAll('details.navGroup'));
        if (!groups.length) return;

        const closeAllExcept = (keep) => {
          groups.forEach(d => {
            if (d !== keep) d.open = false;
          });
        };

        // Ensure only one group is open at a time (desktop + mobile)
        groups.forEach(d => {
          d.addEventListener('toggle', () => {
            if (d.open) closeAllExcept(d);
          });
        });
      }catch(_){ }
    }

    function kbwgCloseAllNavGroups(navRoot){
      try{
        if (!navRoot) return;
        navRoot.querySelectorAll('details.navGroup[open]').forEach(d => { d.open = false; });
      }catch(_){ }
    }

    function kbwgInitMobileNav() {
      // Mobile nav (drawer): inject a hamburger button and wire up open/close.
      // This function is idempotent and safe to call multiple times.

      const header = document.getElementById('siteHeader');
      const headerRow = header ? header.querySelector('.headerRow') : null;
      const nav = header ? header.querySelector('.nav') : null;

      if (!header || !headerRow || !nav) return false;

      // Nav groups (details/summary): make it behave like an accordion
      kbwgInitNavAccordion(nav);

      // Ensure nav has an id for aria-controls
      if (!nav.id) nav.id = 'primaryNav';

      // Backdrop overlay for mobile drawer (created once)
      let overlay = document.querySelector('.navOverlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'navOverlay';
        document.body.appendChild(overlay);
      }

      // Ensure toggle button exists
      let btn = header.querySelector('.navToggle');
      if (!btn) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'navToggle';
        btn.setAttribute('aria-label', 'פתיחת תפריט');
        btn.setAttribute('aria-controls', nav.id);
        btn.setAttribute('aria-expanded', 'false');
        btn.innerHTML = '<span class="navToggleIcon" aria-hidden="true">☰</span><span class="navToggleText">תפריט</span>';
        // Place next to logo (before nav)
        headerRow.insertBefore(btn, nav);
      }

      const isMobileDrawer = () => (window.matchMedia ? window.matchMedia('(max-width: 920px)').matches : false);

      // Inline fallback styles (helps if CSS is cached/broken on mobile)
      const applyDrawerState = (isOpen) => {
        if (!isMobileDrawer()) return;

        // Overlay
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.background = 'rgba(2,6,23,.35)';
        overlay.style.backdropFilter = 'blur(2px)';
        overlay.style.transition = 'opacity .2s ease';
        overlay.style.zIndex = '99998';

        // Drawer
        nav.style.position = 'fixed';
        nav.style.top = '0';
        nav.style.bottom = '0';
        nav.style.right = '0';
        nav.style.width = 'min(88vw, 340px)';
        nav.style.maxWidth = '340px';
        nav.style.background = '#fff';
        nav.style.boxShadow = '0 16px 40px rgba(2,6,23,.22)';
        nav.style.transition = 'transform .22s ease';
        nav.style.zIndex = '99999';

        // Toggle button above overlay
        btn.style.position = 'relative';
        btn.style.zIndex = '100000';

        if (isOpen) {
          overlay.style.opacity = '1';
          overlay.style.pointerEvents = 'auto';
          nav.style.transform = 'translateX(0)';
          nav.style.pointerEvents = 'auto';
          nav.style.visibility = 'visible';
        } else {
          overlay.style.opacity = '0';
          overlay.style.pointerEvents = 'none';
          nav.style.transform = 'translateX(105%)';
          nav.style.pointerEvents = 'none';
          nav.style.visibility = 'hidden';
        }
      };

      const close = () => {
        header.classList.remove('navOpen'); header.classList.remove('navopen');
        document.body.classList.remove('menuOpen'); document.body.classList.remove('menuopen');
        btn.setAttribute('aria-expanded', 'false');
        kbwgCloseAllNavGroups(nav);
        applyDrawerState(false);
      };
      const open = () => {
        header.classList.add('navOpen'); header.classList.add('navopen');
        document.body.classList.add('menuOpen'); document.body.classList.add('menuopen');
        btn.setAttribute('aria-expanded', 'true');
        applyDrawerState(true);
      };

      // Insert a branded header inside the drawer (mobile only)
      if (!nav.querySelector('.navDrawerHeader')) {
        const drawerHeader = document.createElement('div');
        drawerHeader.className = 'navDrawerHeader';
        drawerHeader.innerHTML = `
          <a class="navDrawerLogo" href="index.html" aria-label="דף הבית">
            <img class="navDrawerLogoImg" src="assets/img/logo.png" alt="ללא ניסויים" width="34" height="34" />
            <span class="navDrawerLogoText">ללא ניסויים</span>
          </a>
          <button type="button" class="navDrawerClose" aria-label="סגירה">×</button>
        `;
        nav.insertBefore(drawerHeader, nav.firstChild);

        const closeBtn = drawerHeader.querySelector('.navDrawerClose');
        const homeLogo = drawerHeader.querySelector('.navDrawerLogo');
        if (closeBtn) closeBtn.addEventListener('click', close);
        if (homeLogo) homeLogo.addEventListener('click', close);
      }

      // Bind events once
      if (!btn.dataset.kbwgBound) {
        btn.dataset.kbwgBound = '1';

        btn.addEventListener('click', () => {
          const isOpen = header.classList.contains('navOpen');
          isOpen ? close() : open();
        });

        overlay.addEventListener('click', close);

        // Close when a link is clicked
        nav.querySelectorAll('a').forEach(a => a.addEventListener('click', close));

        // Close on Escape
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') close();
        });

        // Close when switching to desktop width (keep in sync with CSS breakpoint)
        const mq = window.matchMedia('(min-width: 921px)');
        const onMq = () => { if (mq.matches) close(); };
        mq.addEventListener ? mq.addEventListener('change', onMq) : mq.addListener(onMq);
        onMq();
      }

      // Ensure a clean initial state (prevents a stuck gray overlay on some mobile browsers)
      close();

      return true;
    }

    function kbwgEnsureMobileNavInit() {
      // Some pages inject the header asynchronously; also, caching can make layout-ready fire early.
      // Retry a few times + watch the header mount so the mobile menu always wires up.
      let attempts = 0;
      const maxAttempts = 30; // ~6s total

      const tick = () => {
        attempts++;
        const ok = kbwgInitMobileNav();
        if (ok || attempts >= maxAttempts) return;
        setTimeout(tick, 200);
      };

      tick();

      const mount = document.getElementById('siteHeaderMount');
      if (mount && !mount.dataset.kbwgObs) {
        mount.dataset.kbwgObs = '1';
        const obs = new MutationObserver(() => {
          if (kbwgInitMobileNav()) {
            try { obs.disconnect(); } catch (_) {}
          }
        });
        obs.observe(mount, { childList: true, subtree: true });
      }
    }

    // Run now + after dynamic header injection
    kbwgEnsureMobileNavInit();
    document.addEventListener('kbwg:layout-ready', kbwgEnsureMobileNavInit);

// מוצרים page: collapsible Amazon US/UK info box
    // Makes the heading "איך זה עובד עם אמזון ארה"ב ואנגליה?" clickable and toggles the extra details.
    document.addEventListener('DOMContentLoaded', function () {
      var btn = document.querySelector('.amazon-toggle');
      var details = document.getElementById('amazonInfoDetails');
      if (!btn || !details) return;

      btn.addEventListener('click', function () {
        var expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!expanded));
        // If it was expanded -> collapse (hidden = true). If collapsed -> show (hidden = false).
        details.hidden = expanded;
      });
    });



  // Recommended brands page: search, category filter, and accordion sections
  document.addEventListener('DOMContentLoaded', function () {
    if (!document.body.classList.contains('page-recommended-brands')) return;

    var grid = document.querySelector('.cardsGrid--brands');
    if (!grid) return;


    // v17: This page now uses the inline filtering UI in recommended-brands.html.
    // The legacy accordion rebuild below can collapse the 4-column grid into a single column after filtering.
    // If the inline controls exist, skip the legacy rebuild entirely.
    if (document.getElementById('brandGrid') && document.getElementById('brandCategoryFilter') && document.getElementById('brandSearch')) {
      return;
    }
    var originalCards = Array.prototype.slice.call(
      grid.querySelectorAll('.brandCard')
    );
    if (!originalCards.length) return;

    // Define high-level categories for accordion
    var CATEGORY_DEFS = [
      { key: 'makeup', title: 'מותגי איפור' },
      { key: 'face', title: 'טיפוח לפנים' },
      { key: 'hair', title: 'טיפוח לשיער' },
      { key: 'body', title: 'טיפוח גוף' },
      { key: 'fragrance', title: 'בישום' },
      { key: 'home', title: 'טיפוח לבית וניקיון' },
      { key: 'other', title: 'קטגוריות נוספות' }
    ];

    // Clear grid and build accordion sections
    grid.innerHTML = '';
    var sectionMap = new Map();

    CATEGORY_DEFS.forEach(function (def) {
      var section = document.createElement('section');
      section.className = 'brandSection';
      section.dataset.sectionKey = def.key;

      var headerBtn = document.createElement('button');
      headerBtn.type = 'button';
      headerBtn.className = 'brandSection__header';
      headerBtn.setAttribute('aria-expanded', 'true');

      headerBtn.innerHTML =
        '<span class="brandSection__title">' +
        def.title +
        '</span>' +
        '<span class="brandSection__count" data-section-count>0</span>' +
        '<span class="brandSection__chevron" aria-hidden="true">⌄</span>';

      var body = document.createElement('div');
      body.className = 'brandSection__body';

      headerBtn.addEventListener('click', function () {
        var expanded = headerBtn.getAttribute('aria-expanded') === 'true';
        headerBtn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        body.hidden = expanded;
      });

      section.appendChild(headerBtn);
      section.appendChild(body);
      grid.appendChild(section);

      sectionMap.set(def.key, {
        section: section,
        header: headerBtn,
        body: body,
        countEl: section.querySelector('[data-section-count]'),
        totalCount: 0
      });
    });

    function detectCategories(card) {
      var catsEl = card.querySelector('.brandCard__cats');
      var text = (catsEl ? catsEl.textContent : '').toLowerCase();

      var cats = [];
      if (text.indexOf('איפור') !== -1) cats.push('makeup');
      if (text.indexOf('פנים') !== -1) cats.push('face');
      if (text.indexOf('שיער') !== -1) cats.push('hair');
      if (text.indexOf('גוף') !== -1 || text.indexOf('ידיים') !== -1 || text.indexOf('רגליים') !== -1)
        cats.push('body');
      if (
        text.indexOf('בישום') !== -1 ||
        text.indexOf('בשמים') !== -1 ||
        text.indexOf('בושם') !== -1 ||
        text.indexOf('ניחוח') !== -1
      )
        cats.push('fragrance');
      if (
        text.indexOf('בית') !== -1 ||
        text.indexOf('ניקיון') !== -1 ||
        text.indexOf('כביסה') !== -1
      )
        cats.push('home');

      if (!cats.length) cats.push('other');
      return cats;
    }

    var allCards = [];

    originalCards.forEach(function (card) {
      var searchText = (card.getAttribute('data-search') || '').toLowerCase();
      var cats = detectCategories(card);
      cats.forEach(function (catKey) {
        var sectionInfo = sectionMap.get(catKey);
        if (!sectionInfo) return;

        var clone = card.cloneNode(true);
        clone.dataset.cats = cats.join(',');
        clone.dataset.sectionKey = catKey;
        clone.dataset.search = searchText;

        sectionInfo.body.appendChild(clone);
        sectionInfo.totalCount += 1;
        allCards.push(clone);
      });
    });

    // Update counts and hide completely empty sections
    sectionMap.forEach(function (info) {
      if (info.countEl) {
        if (info.totalCount === 0) {
          info.countEl.textContent = 'אין מותגים כרגע';
          info.section.hidden = true;
        } else if (info.totalCount === 1) {
          info.countEl.textContent = 'מותג אחד';
        } else {
          info.countEl.textContent = info.totalCount + ' מותגים';
        }
      }
    });

    var searchInput = document.getElementById('brandSearch');
    var categorySelect = document.getElementById('brandCategoryFilter');
    var totalCountLabel = document.querySelector('[data-brands-count]');

    function applyFilters() {
      var q = (searchInput && searchInput.value ? searchInput.value : '')
        .trim()
        .toLowerCase();
      var catFilter = categorySelect ? categorySelect.value : 'all';

      var visiblePerSection = {};
      var totalVisible = 0;

      sectionMap.forEach(function (info, key) {
        visiblePerSection[key] = 0;
      });

      allCards.forEach(function (card) {
        var sectionKey = card.dataset.sectionKey;
        var visible = true;

        if (catFilter && catFilter !== 'all' && sectionKey !== catFilter) {
          visible = false;
        }

        if (visible && q) {
          var text = (card.dataset.search || '').toLowerCase();
          if (text.indexOf(q) === -1) visible = false;
        }

        card.hidden = !visible;
        card.classList.toggle('brandCard--hidden', !visible);

        if (visible && sectionKey && visiblePerSection.hasOwnProperty(sectionKey)) {
          visiblePerSection[sectionKey] += 1;
          totalVisible += 1;
        }
      });

      sectionMap.forEach(function (info, key) {
        var visibleCount = visiblePerSection[key] || 0;
        var isFilteredByCategory = catFilter && catFilter !== 'all';

        if (isFilteredByCategory) {
          info.section.hidden = visibleCount === 0;
        } else {
          info.section.hidden = info.totalCount === 0;
        }

        if (info.countEl) {
          var labelCount = isFilteredByCategory ? visibleCount : info.totalCount;
          if (labelCount === 0) {
            info.countEl.textContent = 'אין מותגים כרגע';
          } else if (labelCount === 1) {
            info.countEl.textContent = 'מותג אחד';
          } else {
            info.countEl.textContent = labelCount + ' מותגים';
          }
        }
      });

      if (totalCountLabel) {
        if (totalVisible === 0) {
          totalCountLabel.textContent = 'לא נמצאו מותגים תואמים';
        } else if (totalVisible === 1) {
          totalCountLabel.textContent = 'מותג אחד תואם';
        } else {
          totalCountLabel.textContent = totalVisible + ' מותגים תואמים';
        }
      }
    }

    if (searchInput) {
      searchInput.addEventListener('input', applyFilters);
    }
    if (categorySelect) {
      categorySelect.addEventListener('change', applyFilters);
    }

    applyFilters();
  });


})();



function setupMobileFilterCollapse(){
  // Collapses ONLY dedicated filter/search blocks (marked with .filterPanel__collapseArea)
  // on small screens to reduce scrolling.
  const panels = Array.from(document.querySelectorAll('.filter-panel'));
  if (!panels.length) return;

  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  panels.forEach(panel => {
    const collapseArea = panel.querySelector('.filterPanel__collapseArea');
    const wrap = panel.querySelector('.wrap');
    if (!wrap || !collapseArea) return; // do not touch panels without explicit collapse area

    let btn = panel.querySelector('.mobileFilterToggle');

    if (!isMobile){
      panel.classList.remove('mobileCollapsed');
      if (btn) btn.remove();
      return;
    }

    // Create toggle once
    if (!btn){
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mobileFilterToggle';
      btn.setAttribute('aria-expanded', 'false');
      btn.innerHTML = '<span class="mfText"><span class="mfTitle">סינון וחיפוש</span><span class="mfMeta" aria-hidden="true"></span></span><span class="chev" aria-hidden="true">▾</span>';
      panel.insertBefore(btn, wrap);
    }

    // Bind click once
    if (!btn.dataset.bound){
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => {
        panel.classList.toggle('mobileCollapsed');
        sync();
        updateMeta();
      });
    }

    // Default: ALWAYS collapsed on first init (even if a filter is active)
    if (!panel.dataset.mobileCollapseInit){
      panel.classList.add('mobileCollapsed');
      panel.dataset.mobileCollapseInit = '1';
    }

    const sync = () => {
      btn.setAttribute('aria-expanded', panel.classList.contains('mobileCollapsed') ? 'false' : 'true');
    };

    const updateMeta = () => {
      try {
        const metaEl = btn.querySelector('.mfMeta');
        if (!metaEl) return;

        const parts = [];
        // קטגוריה select
        const sel = panel.querySelector('select');
        if (sel && sel.value && sel.value !== 'all' && sel.selectedOptions && sel.selectedOptions[0]){
          const t = (sel.selectedOptions[0].textContent || '').trim();
          if (t) parts.push(t);
        }
        // Text/search
        const input = panel.querySelector('input[type="search"], input[type="text"]');
        if (input){
          const v = (input.value || '').trim();
          if (v) parts.push(v);
        }

        if (parts.length){
          metaEl.textContent = ' – ' + parts.join(' • ');
          btn.classList.add('hasMeta');
        } else {
          metaEl.textContent = '';
          btn.classList.remove('hasMeta');
        }
      } catch(e) {}
    };

    sync();
    updateMeta();
    // Keep the summary in sync when user changes filters
    try {
      const input = panel.querySelector('input[type="search"], input[type="text"]');
      if (input && !input.dataset.mfMetaBound){
        input.dataset.mfMetaBound = '1';
        input.addEventListener('input', updateMeta);
        input.addEventListener('change', updateMeta);
      }
      const sel = panel.querySelector('select');
      if (sel && !sel.dataset.mfMetaBound){
        sel.dataset.mfMetaBound = '1';
        sel.addEventListener('change', updateMeta);
      }
    } catch(e) {}
  });
}
// Re-run on resize to keep behavior consistent
window.addEventListener('resize', () => {
  try { setupMobileFilterCollapse(); } catch(e) {}
});



function fixEnglishNavLabels(){
  try{
    const normalize = () => {
      const lang = (document.documentElement.getAttribute('lang') || '').toLowerCase();
      const translated = (document.documentElement.getAttribute('data-wg-translated') || '').toLowerCase();
      const isEn = lang.startsWith('en') || translated.startsWith('en') || String(location.pathname || '').includes('/en/');
      if (!isEn) return;

      const anchors = document.querySelectorAll('.siteHeader a, .navDrawer a, nav a');
      anchors.forEach((a) => {
        if (!a) return;
        const href = String(a.getAttribute('href') || '').toLowerCase();
        const txt = String(a.textContent || '').trim();
        const lower = txt.toLowerCase();

        // Prefer href-based detection (robust against auto-translation glitches)
        if (href.includes('contact')){
          if (txt !== 'Contact us') a.textContent = 'Contact us';
          return;
        }

        // Guard against weird auto-translator outputs like "Us Contact Us"
        const usCount = (lower.match(/\bus\b/g) || []).length;
        if (lower === 'us contact us' || lower === 'contact us us' || (lower.includes('contact') && usCount >= 2)){
          if (txt !== 'Contact us') a.textContent = 'Contact us';
        }
      });
    };

    // Run now + a couple of delayed retries (catches late translator mutations)
    normalize();
    window.setTimeout(normalize, 400);
    window.setTimeout(normalize, 1200);

    // If Weglot is installed, hook into its lifecycle instead of using MutationObserver.
    // MutationObserver + translators can cause infinite DOM-churn and heavy CPU usage.
    if (window.Weglot && typeof window.Weglot.on === 'function' && !window.__KBWG_WEGLOT_NAV_FIX_BOUND){
      window.__KBWG_WEGLOT_NAV_FIX_BOUND = true;
      try { window.Weglot.on('initialized', normalize); } catch(e) {}
      try {
        window.Weglot.on('languageChanged', function(){
          normalize();
          window.setTimeout(normalize, 400);
          window.setTimeout(normalize, 1200);
        });
      } catch(e) {}
    }

    // Some translators mutate late; run again after full load.
    window.addEventListener('load', () => {
      try { normalize(); } catch(e) {}
    }, { once: true });
  } catch(e) {}
}


// Initial run
try { setupMobileFilterCollapse(); } catch(e) {}
window.addEventListener('DOMContentLoaded', () => {
  try { setupMobileFilterCollapse(); } catch(e) {}
  try { fixEnglishNavLabels(); } catch(e) {}
  try {
    // Remove the old global notice banner (now shown inside the navy hero header).
    const legacy = document.getElementById('kbwgGlobalVeganNotice');
    if (legacy) legacy.remove();
  } catch(e) {}

  try {
    // Ensure the key promise appears in the hero/header section on every page.
    const hero = document.querySelector('.hero .heroCopy');
    if (hero && !hero.querySelector('.heroVeganLine')) {
      const p = document.createElement('p');
      p.className = 'heroVeganLine';
      p.innerHTML = 'כל המותגים והמוצרים באתר הם <b>100% טבעוניים</b> ו<b>שלא נוסו על בעלי חיים</b> .';

      // Insert near the top of the hero copy, after the main description if present.
      const firstP = hero.querySelector('p');
      if (firstP && firstP.parentElement === hero) {
        firstP.insertAdjacentElement('afterend', p);
      } else {
        hero.appendChild(p);
      }
    }
  } catch(e) {}

  try {
    // Optional: fix an older awkward homepage hero sentence (safe, exact-match only)
    const heroP = document.querySelector('.page-home .hero .heroCopy p');
    if (heroP) {
      const t = (heroP.textContent || '').trim();
      if (t === 'הבית שלך לקניות אשר לא נוסו על בעלי חיים — חיפוש מוצרים, בודק רכיבים ולוח מבצעים') {
        heroP.textContent = 'המדריך לקניות 100% טבעוניות ושלא נוסו על בעלי חיים — מוצרים, מותגים, בודק רכיבים ולוח מבצעים.';
      }
    }
  } catch(e) {}
});
