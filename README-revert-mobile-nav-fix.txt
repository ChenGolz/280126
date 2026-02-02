KBWG Revert Mobile Menu Fix (v31)

This patch removes the mobile-nav-fix.js loader line from your HTML pages,
bringing the site back to the previous behavior/appearance.

IMPORTANT (manual step):
If you already added this file earlier, delete it from your repo:
  assets/js/mobile-nav-fix.js

After deploying, do a hard refresh on mobile (or open in a private tab)
to bypass cached scripts/partials.
