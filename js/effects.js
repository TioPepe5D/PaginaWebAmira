/* =============================================
   EFECTO CHISPAS HERO
   ============================================= */
(function () {
  const SYMBOLS = ['✦', '✧', '◆', '✴', '⋆', '✵', '❋', '✼'];

  function heroSparkles() {
    const hero = document.getElementById('hero');
    if (!hero) return;

    hero.style.position = 'relative';
    hero.style.overflow = 'hidden';

    function spawn() {
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

      // Siguiente chispa entre 120–500 ms
      setTimeout(spawn, Math.random() * 380 + 120);
    }

    spawn();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', heroSparkles);
  } else {
    heroSparkles();
  }
})();

