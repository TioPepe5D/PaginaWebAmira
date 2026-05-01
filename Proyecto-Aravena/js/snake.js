/* ══════════════════════════════════════════════
   COLORFUL SNAKE — Diamond Edition
   ══════════════════════════════════════════════ */

(function () {
  const CELL  = 22;
  const COLS  = 20;
  const ROWS  = 20;
  const W     = CELL * COLS;
  const H     = CELL * ROWS;

  let snake, dir, nextDir, food, score, hiScore, loop, running, hueOffset, couponShown;

  const CUPON_META   = 50;
  const CUPON_CODIGO = 'SNAKE50';

  /* ── Mostrar cupón ganado ── */
  function mostrarCupon() {
    clearInterval(loop);
    running = false;
    const canvas = document.getElementById('snake-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Fondo festivo
    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.fillRect(0, 0, W, H);

    // Confeti simple
    for (let i=0; i<60; i++) {
      ctx.fillStyle = `hsl(${Math.random()*360},100%,60%)`;
      ctx.fillRect(
        Math.random()*W, Math.random()*H,
        6 + Math.random()*6, 6 + Math.random()*6
      );
    }

    ctx.textAlign = 'center';

    // Título
    ctx.font = 'bold 1.7rem "Open Sans", sans-serif';
    ctx.shadowColor = '#c9a227';
    ctx.shadowBlur  = 28;
    ctx.fillStyle   = '#ffe066';
    ctx.fillText('🏆 ¡FELICITACIONES!', W/2, H/2 - 80);

    // Subtítulo
    ctx.shadowBlur = 0;
    ctx.font = '0.95rem "Open Sans", sans-serif';
    ctx.fillStyle = '#e7e9ea';
    ctx.fillText('Juntaste 50 diamantes — ¡Eres increíble!', W/2, H/2 - 46);

    // Caja cupón
    const boxW = 280, boxH = 62;
    const bx = W/2 - boxW/2, by = H/2 - 20;
    ctx.fillStyle = 'rgba(30,157,241,0.18)';
    ctx.strokeStyle = '#1e9df1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 0.78rem "Open Sans", sans-serif';
    ctx.fillStyle = '#8aa8c0';
    ctx.fillText('TU CUPÓN DE DESCUENTO', W/2, H/2 + 8);

    ctx.font = 'bold 2.1rem "Menlo", "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#1e9df1';
    ctx.shadowBlur  = 16;
    ctx.fillText(CUPON_CODIGO, W/2, H/2 + 45);

    ctx.shadowBlur = 0;
    ctx.font = '0.8rem "Open Sans", sans-serif';
    ctx.fillStyle = '#71767b';
    ctx.fillText('Úsalo al finalizar tu compra • Válido por tiempo limitado', W/2, H/2 + 84);

    ctx.font = '0.78rem "Open Sans", sans-serif';
    ctx.fillStyle = '#1e9df1';
    ctx.fillText('Presiona R para jugar de nuevo', W/2, H/2 + 114);

    // Guardar en localStorage
    localStorage.setItem('snakeCupon', CUPON_CODIGO);
  }

  /* ── Inicializar / reiniciar ── */
  function init() {
    snake     = [{x:10,y:10},{x:9,y:10},{x:8,y:10}];
    dir       = {x:1, y:0};
    nextDir   = {x:1, y:0};
    score       = 0;
    running     = true;
    hueOffset   = 0;
    couponShown = false;
    hiScore   = parseInt(localStorage.getItem('snakeHi') || '0');
    spawnFood();
    updateScore();
    if (loop) clearInterval(loop);
    loop = setInterval(tick, 110);
    draw();
  }

  /* ── Spawn del diamante ── */
  function spawnFood() {
    let pos;
    do {
      pos = {x: Math.floor(Math.random()*COLS), y: Math.floor(Math.random()*ROWS)};
    } while (snake.some(s => s.x===pos.x && s.y===pos.y));
    food = pos;
  }

  /* ── Lógica por frame ── */
  function tick() {
    if (!running) return;
    dir = nextDir;
    const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};

    // Paredes
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) { end(); return; }
    // Auto-colisión
    if (snake.some(s => s.x===head.x && s.y===head.y))                  { end(); return; }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score++;
      if (score > hiScore) { hiScore = score; localStorage.setItem('snakeHi', hiScore); }
      spawnFood();
      // Cupón al llegar a 50 diamantes
      if (score >= CUPON_META && !couponShown) {
        couponShown = true;
        updateScore();
        draw();
        setTimeout(mostrarCupon, 200);
        return;
      }
      // Acelerar suavemente
      if (score % 5 === 0) {
        clearInterval(loop);
        const spd = Math.max(55, 110 - score * 4);
        loop = setInterval(tick, spd);
      }
    } else {
      snake.pop();
    }

    hueOffset = (hueOffset + 2) % 360;
    updateScore();
    draw();
  }

  /* ── Dibujo ── */
  function draw() {
    const canvas = document.getElementById('snake-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Fondo con cuadrícula sutil
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 0.5;
    for (let c=0; c<=COLS; c++) { ctx.beginPath(); ctx.moveTo(c*CELL,0); ctx.lineTo(c*CELL,H); ctx.stroke(); }
    for (let r=0; r<=ROWS; r++) { ctx.beginPath(); ctx.moveTo(0,r*CELL); ctx.lineTo(W,r*CELL); ctx.stroke(); }

    // Diamante (food)
    drawDiamond(ctx, food.x, food.y);

    // Serpiente arco-iris
    snake.forEach((seg, i) => {
      const hue = (hueOffset + i * 14) % 360;
      const isHead = i === 0;
      const r = isHead ? 6 : 4;
      const x = seg.x * CELL;
      const y = seg.y * CELL;

      if (isHead) {
        // Glow en la cabeza
        ctx.shadowColor = `hsl(${hue},100%,60%)`;
        ctx.shadowBlur  = 14;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = `hsl(${hue},100%,58%)`;
      ctx.beginPath();
      ctx.roundRect(x+1, y+1, CELL-2, CELL-2, r);
      ctx.fill();

      // Brillo interior
      const grad = ctx.createLinearGradient(x, y, x+CELL, y+CELL);
      grad.addColorStop(0, 'rgba(255,255,255,0.3)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x+1, y+1, CELL-2, CELL-2, r);
      ctx.fill();
    });

    ctx.shadowBlur = 0;
  }

  function drawDiamond(ctx, cx, cy) {
    const px  = cx * CELL + CELL/2;
    const py  = cy * CELL + CELL/2;
    const s   = CELL/2 - 2;
    const now = Date.now();
    const pulse = 1 + 0.12 * Math.sin(now / 200);

    ctx.save();
    ctx.translate(px, py);
    ctx.scale(pulse, pulse);

    // Glow externo
    ctx.shadowColor = '#fff';
    ctx.shadowBlur  = 18;

    // Forma de diamante (rombo)
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.7, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(-s * 0.7, 0);
    ctx.closePath();

    // Gradiente facetas
    const g = ctx.createLinearGradient(-s, -s, s, s);
    g.addColorStop(0.0,  '#ffffff');
    g.addColorStop(0.25, '#a8d8f8');
    g.addColorStop(0.5,  '#1e9df1');
    g.addColorStop(0.75, '#c9a227');
    g.addColorStop(1.0,  '#fff8dc');
    ctx.fillStyle = g;
    ctx.fill();

    // Faceta superior clara
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.7, 0);
    ctx.lineTo(0, -s * 0.2);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function updateScore() {
    const el  = document.getElementById('snake-score');
    const hi  = document.getElementById('snake-hi');
    const bar = document.getElementById('snake-progress-bar');
    if (el)  el.textContent = score;
    if (hi)  hi.textContent = hiScore;
    if (bar) bar.style.width = Math.min(100, (score / CUPON_META) * 100) + '%';
  }

  /* ── Game Over ── */
  function end() {
    running = false;
    clearInterval(loop);
    const canvas = document.getElementById('snake-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Overlay oscuro
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';

    ctx.font = 'bold 2rem "Open Sans", sans-serif';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#1e9df1';
    ctx.shadowBlur  = 20;
    ctx.fillText('GAME OVER', W/2, H/2 - 28);

    ctx.shadowBlur = 0;
    ctx.font = '1rem "Open Sans", sans-serif';
    ctx.fillStyle = '#e7e9ea';
    ctx.fillText(`Puntuación: ${score}  ·  Récord: ${hiScore}`, W/2, H/2 + 10);

    ctx.font = '0.85rem "Open Sans", sans-serif';
    ctx.fillStyle = '#1e9df1';
    ctx.fillText('Presiona R o el botón para reiniciar', W/2, H/2 + 42);
  }

  /* ── Controles teclado ── */
  const KEYS = {
    ArrowUp:    {x:0,  y:-1},
    ArrowDown:  {x:0,  y:1},
    ArrowLeft:  {x:-1, y:0},
    ArrowRight: {x:1,  y:0},
    w: {x:0, y:-1}, W: {x:0, y:-1},
    s: {x:0, y:1},  S: {x:0, y:1},
    a: {x:-1,y:0},  A: {x:-1,y:0},
    d: {x:1, y:0},  D: {x:1, y:0},
  };

  function onKey(e) {
    const modal = document.getElementById('snake-modal');
    if (!modal || !modal.classList.contains('activo')) return;

    if (e.key === 'r' || e.key === 'R') { init(); return; }
    if (e.key === 'Escape') { cerrarSnake(); return; }

    const d = KEYS[e.key];
    if (!d) return;
    // No permitir dirección opuesta
    if (d.x !== 0 && d.x === -dir.x) return;
    if (d.y !== 0 && d.y === -dir.y) return;
    nextDir = d;
    e.preventDefault();
  }

  /* ── Controles táctiles (swipe) ── */
  let touchX, touchY;
  function onTouchStart(e) { touchX = e.touches[0].clientX; touchY = e.touches[0].clientY; }
  function onTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - touchX;
    const dy = e.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      const d = dx > 0 ? {x:1,y:0} : {x:-1,y:0};
      if (d.x !== -dir.x) nextDir = d;
    } else {
      const d = dy > 0 ? {x:0,y:1} : {x:0,y:-1};
      if (d.y !== -dir.y) nextDir = d;
    }
  }

  /* ── Controles D-pad en pantalla ── */
  function bindDpad() {
    document.getElementById('dpad-up')?.addEventListener('click',    () => { if (dir.y!==1)  nextDir={x:0,y:-1}; });
    document.getElementById('dpad-down')?.addEventListener('click',  () => { if (dir.y!==-1) nextDir={x:0,y:1};  });
    document.getElementById('dpad-left')?.addEventListener('click',  () => { if (dir.x!==1)  nextDir={x:-1,y:0}; });
    document.getElementById('dpad-right')?.addEventListener('click', () => { if (dir.x!==-1) nextDir={x:1,y:0};  });
  }

  /* ── Abrir / Cerrar modal ── */
  window.abrirSnake = function () {
    const modal = document.getElementById('snake-modal');
    if (!modal) return;
    modal.classList.add('activo');
    document.body.style.overflow = 'hidden';

    // Ajustar canvas
    const canvas = document.getElementById('snake-canvas');
    canvas.width  = W;
    canvas.height = H;

    document.addEventListener('keydown', onKey);
    canvas.addEventListener('touchstart', onTouchStart, {passive:true});
    canvas.addEventListener('touchend',   onTouchEnd,   {passive:true});
    bindDpad();
    init();
  };

  window.cerrarSnake = function () {
    const modal = document.getElementById('snake-modal');
    if (!modal) return;
    modal.classList.remove('activo');
    document.body.style.overflow = '';
    clearInterval(loop);
    running = false;
    document.removeEventListener('keydown', onKey);
  };

  window.reiniciarSnake = init;
})();
