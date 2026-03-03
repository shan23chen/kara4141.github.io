(function () {
  function animateCards(cards) {
    if (!('IntersectionObserver' in window)) {
      cards.forEach(function (c) { c.classList.add('card-visible'); });
      return;
    }

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var card = entry.target;
        var idx = Array.prototype.indexOf.call(cards, card);
        var delay = Math.min(idx * 60, 600);
        card.style.transitionDelay = delay + 'ms';
        card.classList.add('card-visible');
        card.addEventListener('transitionend', function clear() {
          card.style.transitionDelay = '';
          card.removeEventListener('transitionend', clear);
        });
        obs.unobserve(card);
      });
    }, { threshold: 0.1 });

    cards.forEach(function (c) { obs.observe(c); });
  }

  var grid = document.getElementById('chapter-grid');
  if (!grid) return;

  // Opt-in: only hide cards for animation if JS is running
  grid.classList.add('js-animated');

  var cards = Array.prototype.slice.call(grid.querySelectorAll('.chapter-card'));
  animateCards(cards);
})();
