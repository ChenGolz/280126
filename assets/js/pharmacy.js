
/* Pharmacy page (v15) */
(function(){
  const state = { q: '', store: 'all' };
  function $(sel, root=document){ return root.querySelector(sel); }
  function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }
  function normalize(s){ return String(s||'').trim().toLowerCase(); }
  function storeLabel(id){
    if(id==='superpharm') return 'סופר-פארם';
    if(id==='be') return 'Be';
    if(id==='goodpharm') return 'Good Pharm';
    return id;
  }
  function itemMatches(item){
    const q = normalize(state.q);
    if(q){
      const hay = normalize([item.name,item.brand,item.category,(item.tags||[]).join(' '),(item.notes||'')].join(' '));
      if(!hay.includes(q)) return false;
    }
    if(state.store==='all') return true;
    return (item.stores||[]).includes(state.store);
  }
  function badgeHTML(t, cls){ return `<span class="pill ${cls||''}">${t}</span>`; }
  function cardHTML(item){
    const tags = (item.tags||[]).slice(0,3).map(t=>badgeHTML(t,'pill--soft')).join('');
    const stores = (item.stores||[]).map(s=>badgeHTML(storeLabel(s),'pill--muted')).join('');
    const brand = item.brand && item.brand !== '(הוסיפי מותג)' ? `<div class="muted">מותג: <b>${item.brand}</b></div>` : '';
    const notes = item.notes ? `<div class="muted" style="margin-top:6px;">${item.notes}</div>` : '';
    const link = item.link ? `<a class="btn ghost" href="${item.link}">חיפוש במאגר</a>` : '';
    return `
      <article class="phCard">
        <div class="phTop">
          <div>
            <h3 class="phTitle">${item.name}</h3>
            ${brand}
            <div class="phBadges">${tags}</div>
            <div class="phStores">${stores}</div>
            ${notes}
          </div>
        </div>
        <div class="phActions">
          ${link}
          <a class="btn ghost" href="ingredient-detective.html">בדיקת רכיבים</a>
        </div>
      </article>
    `;
  }
  function render(items){
    const mount = $('#phList'); if(!mount) return;
    const filtered = items.filter(itemMatches);
    $('#phCount').textContent = filtered.length ? `${filtered.length} תוצאות` : 'אין תוצאות';
    mount.innerHTML = filtered.map(cardHTML).join('') || `<div class="contentCard"><p class="muted" style="margin:0;">לא מצאנו התאמות. נסי מילה אחרת או החליפי רשת.</p></div>`;
  }
  function setActiveStoreButtons(){
    $all('[data-store]').forEach(btn=>{
      const on = btn.getAttribute('data-store')===state.store;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  async function init(){
    const res = await fetch('data/pharmacy.json?v=2026-01-31-v15', { cache: 'force-cache' });
    const data = await res.json();
    const lu = data.updated ? new Date(data.updated).toLocaleDateString('he-IL', {year:'numeric',month:'2-digit',day:'2-digit'}) : '';
    if($('#phUpdated') && lu) $('#phUpdated').textContent = `עודכן לאחרונה: ${lu}`;
    const storeRow = $('#storeRow');
    if(storeRow){
      if(!storeRow.querySelector('[data-store="all"]')){
        storeRow.insertAdjacentHTML('beforeend', `<button class="pillBtn is-active" type="button" data-store="all" aria-pressed="true">הכל</button>`);
      }
      (data.stores||[]).forEach(s=>{
        storeRow.insertAdjacentHTML('beforeend', `<button class="pillBtn" type="button" data-store="${s.id}" aria-pressed="false">${s.name}</button>`);
      });
      storeRow.addEventListener('click', (e)=>{
        const b = e.target.closest('[data-store]'); if(!b) return;
        state.store = b.getAttribute('data-store');
        setActiveStoreButtons();
        render(data.items||[]);
      });
    }
    const q = $('#phSearch');
    if(q){
      q.addEventListener('input', ()=>{ state.q = q.value; render(data.items||[]); });
    }
    try{
      const faqScript = document.getElementById('kbwgFaqData');
      if(faqScript && !faqScript.textContent.trim()){
        faqScript.textContent = JSON.stringify(data.faqs||[]);
      }
    }catch(_){}
    render(data.items||[]);
  }
  document.addEventListener('DOMContentLoaded', init);
})();
