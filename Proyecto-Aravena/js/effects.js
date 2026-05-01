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


(function () {
  const canvas = document.createElement("canvas");
  canvas.id = "stars-canvas";
  Object.assign(canvas.style, {
    position: "fixed",
    top: "0", left: "0",
    width: "100%", height: "100%",
    pointerEvents: "none",
    zIndex: "0",
  });
  document.body.prepend(canvas);

  const ctx = canvas.getContext("2d");
  let W, H, stars, frost;

  /* ---------- Colores según tema ---------- */
  function isLight() {
    return document.documentElement.classList.contains("light");
  }

  function coloresEstrellas(alpha) {
    return isLight()
      ? `rgba(30,80,160,${alpha})`      // azul oscuro sobre blanco
      : `rgba(200,230,255,${alpha})`;   // celeste sobre oscuro
  }

  function coloresFrost() {
    return isLight()
      ? { stroke: "rgba(20,60,140,1)", fill: "rgba(30,80,180,1)" }
      : { stroke: "rgba(180,220,255,1)", fill: "rgba(210,240,255,1)" };
  }

  /* ---------- Helpers ---------- */
  const rand  = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max));

  /* ---------- Estrellas ---------- */
  function crearEstrellas(n) {
    return Array.from({ length: n }, () => ({
      x: rand(0, W),
      y: rand(0, H),
      r: rand(0.4, 1.6),
      alpha: rand(0.3, 1),
      speed: rand(0.003, 0.012),
      phase: rand(0, Math.PI * 2),
    }));
  }

  function drawStar(s, t) {
    const a = s.alpha * (0.5 + 0.5 * Math.sin(t * s.speed * 60 + s.phase));
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = coloresEstrellas(a);
    ctx.fill();
  }

  /* ---------- Escarcha ---------- */
  function spawnFrost() {
    return {
      x: rand(0, W),
      y: rand(0, H),
      size: rand(1.2, 3),
      alpha: 0,
      targetAlpha: rand(0.35, 0.9),
      vx: rand(-0.18, 0.18),
      vy: rand(-0.35, -0.06),
      life: 0,
      maxLife: randInt(130, 300),
      arms: randInt(4, 8),
      spin: rand(-0.018, 0.018),
      angle: rand(0, Math.PI * 2),
      type: Math.random() < 0.45 ? "dot" : "flake",
    };
  }

  function crearFrost(n) {
    return Array.from({ length: n }, () => spawnFrost());
  }

  function drawFlake(f) {
    const { stroke, fill } = coloresFrost();
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.angle);
    ctx.globalAlpha = f.alpha;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 0.8;

    if (f.type === "dot") {
      ctx.beginPath();
      ctx.arc(0, 0, f.size * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
    } else {
      const step = (Math.PI * 2) / f.arms;
      for (let i = 0; i < f.arms; i++) {
        const angle = step * i;
        const len = f.size * 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
        // ramitas laterales
        const mid = len * 0.5;
        ctx.moveTo(Math.cos(angle) * mid, Math.sin(angle) * mid);
        ctx.lineTo(
          Math.cos(angle) * mid + Math.cos(angle + 1.1) * (len * 0.35),
          Math.sin(angle) * mid + Math.sin(angle + 1.1) * (len * 0.35)
        );
        ctx.moveTo(Math.cos(angle) * mid, Math.sin(angle) * mid);
        ctx.lineTo(
          Math.cos(angle) * mid + Math.cos(angle - 1.1) * (len * 0.35),
          Math.sin(angle) * mid + Math.sin(angle - 1.1) * (len * 0.35)
        );
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, f.size * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- Resize ---------- */
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    stars = crearEstrellas(200);
    frost = crearFrost(55);
  }

  /* ---------- Loop ---------- */
  let t = 0;
  function loop() {
    ctx.clearRect(0, 0, W, H);
    t += 0.016;

    stars.forEach((s) => drawStar(s, t));

    frost.forEach((f, i) => {
      f.life++;
      f.x += f.vx;
      f.y += f.vy;
      f.angle += f.spin;

      const half = f.maxLife / 2;
      f.alpha = f.life < half
        ? Math.min(f.targetAlpha, (f.life / half) * f.targetAlpha)
        : Math.max(0, f.targetAlpha * (1 - (f.life - half) / half));

      if (f.life >= f.maxLife) frost[i] = spawnFrost();

      drawFlake(f);
    });

    requestAnimationFrame(loop);
  }

  /* ---------- Init ---------- */
  window.addEventListener("resize", resize);
  resize();
  loop();
})();
