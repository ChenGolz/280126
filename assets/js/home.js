// Home page helpers (v11) — fast, minimal
(function(){
  function qs(sel){ return document.querySelector(sel); }

  function bindHomeSearch(){
    var form = qs('#homeSearchForm');
    var input = qs('#homeSearchInput');
    if(!form || !input) return;

    form.addEventListener('submit', function(e){
      e.preventDefault();
      var q = (input.value || '').trim();
      if(!q){
        window.location.href = 'products.html';
        return;
      }
      window.location.href = 'products.html?q=' + encodeURIComponent(q);
    });
  }

  // Defer binding until DOM is ready
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bindHomeSearch, { once:true });
  }else{
    bindHomeSearch();
  }
})();
