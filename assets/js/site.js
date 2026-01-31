/* KBWG shared UI (v24) */
/* Keeps this file lightweight: navigation + small utilities only. */

(function () {
  "use strict";

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function closeAllNavGroups(except) {
    qsa("details.navGroup").forEach(d => {
      if (d !== except) d.removeAttribute("open");
    });
  }

  function setupNavGroups() {
    const groups = qsa("details.navGroup");
    if (!groups.length) return;

    groups.forEach(d => {
      d.addEventListener("toggle", () => {
        if (d.open) closeAllNavGroups(d);
      });
    });

    // Close when clicking outside
    document.addEventListener("click", (e) => {
      const inside = e.target.closest("details.navGroup");
      if (!inside) closeAllNavGroups(null);
    });

    // Close on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAllNavGroups(null);
    });

    // Close after selecting a link
    qsa("details.navGroup .navDrop a").forEach(a => {
      a.addEventListener("click", () => closeAllNavGroups(null));
    });
  }

  function setActiveNav() {
    const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();

    const links = qsa(".siteHeader .nav a[href]");
    links.forEach(a => a.classList.remove("active"));

    let activeLink = links.find(a => (a.getAttribute("href") || "").toLowerCase() === path);

    // handle root "/"
    if (!activeLink && (path === "" || path === "/")) {
      activeLink = links.find(a => (a.getAttribute("href") || "").toLowerCase() === "index.html");
    }

    if (activeLink) {
      activeLink.classList.add("active");
      // If inside a group, highlight the summary too
      const parentDetails = activeLink.closest("details.navGroup");
      if (parentDetails) {
        const sum = qs("summary", parentDetails);
        if (sum) sum.classList.add("active");
      }
    }
  }

  function initSharedUI() {
    setupNavGroups();
    setActiveNav();
  }

  // Run once the header/footer are injected
  document.addEventListener("kbwg:layout-ready", initSharedUI);

  // Fallback: if no injector is used
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSharedUI);
  } else {
    initSharedUI();
  }
})();
