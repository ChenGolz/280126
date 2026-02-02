/* KBWG Mobile Nav Fix v31
   - Ensures hamburger exists
   - Moves drawer + overlay to <body> on mobile to avoid stacking-context issues
   - Uses display:none !important when closed (prevents "ghost overlay")
*/
(() => {
  const MOBILE_MAX = 920;

  function qs(sel, root = document) { return root.querySelector(sel); }
  function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  function setImp(el, prop, val) {
    if (!el) return;
    el.style.setProperty(prop, val, "important");
  }

  function ensureButton(header) {
    let btn = qs("#kbwgNavToggle") || qs(".navToggle");
    if (btn) return btn;

    btn = document.createElement("button");
    btn.id = "kbwgNavToggle";
    btn.className = "navToggle";
    btn.type = "button";
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-label", "פתח תפריט");

    btn.innerHTML = `
      <span class="navToggleIcon" aria-hidden="true"></span>
      <span class="srOnly">תפריט</span>
    `;

    const actions = qs(".headerActions", header) || qs(".headerRight", header) || header;
    actions.appendChild(btn);
    return btn;
  }

  function ensureOverlay() {
    let overlay = qs("#kbwgNavOverlay") || qs(".navOverlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "kbwgNavOverlay";
    overlay.className = "navOverlay";
    document.body.appendChild(overlay);
    return overlay;
  }

  function findNav() {
    return (
      qs("#siteNav") ||
      qs("#kbwgSiteNav") ||
      qs(".siteNav") ||
      qs("nav[aria-label='Main']") ||
      qs("nav")
    );
  }

  function styleHamburger(btn) {
    setImp(btn, "display", "inline-flex");
    setImp(btn, "alignItems", "center");
    setImp(btn, "justifyContent", "center");
    setImp(btn, "width", "44px");
    setImp(btn, "height", "44px");
    setImp(btn, "border", "1px solid rgba(15,23,42,.15)");
    setImp(btn, "borderRadius", "12px");
    setImp(btn, "background", "rgba(255,255,255,.9)");
    setImp(btn, "cursor", "pointer");
    setImp(btn, "position", "relative");
    setImp(btn, "zIndex", "1000002");

    const icon = qs(".navToggleIcon", btn);
    if (icon) {
      setImp(icon, "width", "18px");
      setImp(icon, "height", "2px");
      setImp(icon, "background", "currentColor");
      setImp(icon, "display", "block");
      setImp(icon, "position", "relative");
      icon.style.boxShadow = "0 6px 0 currentColor, 0 -6px 0 currentColor";
    }
  }

  function applyDrawerStyles(nav, overlay, open) {
    // Overlay
    setImp(overlay, "position", "fixed");
    setImp(overlay, "inset", "0");
    setImp(overlay, "background", "rgba(2, 6, 23, .35)");
    setImp(overlay, "backdropFilter", open ? "blur(2px)" : "none");
    setImp(overlay, "zIndex", "1000000");
    setImp(overlay, "opacity", open ? "1" : "0");
    setImp(overlay, "transition", "opacity 180ms ease");
    setImp(overlay, "pointerEvents", open ? "auto" : "none");
    setImp(overlay, "display", open ? "block" : "none"); // KEY: remove hit area

    // Drawer
    setImp(nav, "position", "fixed");
    setImp(nav, "top", "0");
    setImp(nav, "bottom", "0");
    setImp(nav, "right", "0");
    setImp(nav, "width", "86vw");
    setImp(nav, "maxWidth", "360px");
    setImp(nav, "background", "#fff");
    setImp(nav, "zIndex", "1000001");
    setImp(nav, "boxShadow", "0 20px 60px rgba(2,6,23,.25)");
    setImp(nav, "transform", open ? "translateX(0)" : "translateX(105%)");
    setImp(nav, "transition", "transform 220ms ease");
    setImp(nav, "overflowY", "auto");
    setImp(nav, "padding", "16px");
    setImp(nav, "display", open ? "flex" : "none"); // KEY
    setImp(nav, "flexDirection", "column");
  }

  function closeAllGroups(nav) {
    qsa("[aria-expanded='true']", nav).forEach(btn => btn.setAttribute("aria-expanded", "false"));
    qsa(".open", nav).forEach(el => el.classList.remove("open"));
  }

  function initOnce() {
    const header = qs(".siteHeader") || qs("header");
    if (!header) return false;

    const nav = findNav();
    if (!nav) return false;

    const btn = ensureButton(header);
    const overlay = ensureOverlay();

    styleHamburger(btn);

    if (!nav.__kbwgOriginalParent) {
      nav.__kbwgOriginalParent = nav.parentElement;
      nav.__kbwgOriginalNext = nav.nextElementSibling;
    }

    const mq = window.matchMedia(`(max-width: ${MOBILE_MAX}px)`);

    let isOpen = false;

    function attachForMobile() {
      if (overlay.parentElement !== document.body) document.body.appendChild(overlay);
      if (nav.parentElement !== document.body) document.body.appendChild(nav);

      setImp(btn, "display", "inline-flex");
      setImp(header, "backdropFilter", "none");
      setImp(header, "-webkit-backdrop-filter", "none");
      setImp(header, "zIndex", "1000002");
    }

    function restoreForDesktop() {
      try {
        if (nav.__kbwgOriginalParent && nav.parentElement === document.body) {
          if (nav.__kbwgOriginalNext) nav.__kbwgOriginalParent.insertBefore(nav, nav.__kbwgOriginalNext);
          else nav.__kbwgOriginalParent.appendChild(nav);
        }
      } catch (_) {}

      applyDrawerStyles(nav, overlay, false);
      isOpen = false;
      btn.setAttribute("aria-expanded", "false");
    }

    function open() {
      if (!mq.matches) return;
      attachForMobile();
      isOpen = true;
      btn.setAttribute("aria-expanded", "true");
      applyDrawerStyles(nav, overlay, true);
      document.documentElement.classList.add("menuOpen");
      document.body.classList.add("menuOpen");
    }

    function close() {
      isOpen = false;
      btn.setAttribute("aria-expanded", "false");
      closeAllGroups(nav);
      applyDrawerStyles(nav, overlay, false);
      document.documentElement.classList.remove("menuOpen");
      document.body.classList.remove("menuOpen");
    }

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      (isOpen ? close : open)();
    });

    overlay.addEventListener("click", close);

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    nav.addEventListener("click", (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const btnLike = t.closest("button,[role='button']");
      if (!btnLike) return;
      const expanded = btnLike.getAttribute("aria-expanded");
      if (expanded === "true") {
        qsa("[aria-expanded='true']", nav).forEach(b => {
          if (b !== btnLike) b.setAttribute("aria-expanded", "false");
        });
      }
    });

    function onMq() {
      if (mq.matches) {
        attachForMobile();
        close(); // always start closed on mobile
      } else {
        restoreForDesktop();
      }
    }
    mq.addEventListener?.("change", onMq);
    onMq();

    window.addEventListener("pageshow", () => {
      if (mq.matches) close();
    });

    console.log("[KBWG] mobile nav fix v31 active");
    return true;
  }

  function boot() {
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (initOnce() || tries >= 25) clearInterval(t);
    }, 80);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
