/* =============================================
   EFECTO CHISPAS HERO
   ============================================= */
(function () {
  const SYMBOLS = ['✦', '✧', '◆', '✴', '⋆', '✵', '❋', '✼'];
  const MAX_SPARKLES = 14;
  let timer = null;

  function heroSparkles() {
    const hero = document.getElementById('hero');
    if (!hero) return;

    hero.style.position = 'relative';
    hero.style.overflow = 'hidden';

    function spawn() {
      // Pausar si la pestaña no está visible o si ya hay muchas
      if (document.hidden || hero.querySelectorAll('.hero-sparkle').length >= MAX_SPARKLES) {
        timer = setTimeout(spawn, 600);
        return;
      }

      const el = document.createElement('span');
      el.className = 'hero-sparkle';
      el.textContent = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];

      const dur  = (Math.random() * 2 + 1.4).toFixed(2);
      const size = (Math.random() * 9 + 5).toFixed(0);

      el.style.cssText = `
        left: ${Math.random() * 90 + 5}%;
        top:  ${Math.random() * 80 + 10}%;
        font-size: ${size}px;
        --dur: ${dur}s;
      `;

      hero.appendChild(el);
      el.addEventListener('animationend', () => el.remove(), { once: true });

      timer = setTimeout(spawn, Math.random() * 500 + 250);
    }

    spawn();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', heroSparkles);
  } else {
    heroSparkles();
  }
})();
