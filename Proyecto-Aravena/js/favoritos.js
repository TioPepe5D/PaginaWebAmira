/* =============================================
   FAVORITOS — Joyería Aravena
   ============================================= */

let favoritosSet = new Set();   // IDs de productos favoritos del usuario
let favoritosMap = {};           // productoId -> id del registro en Supabase

/* ── Inicialización (se llama cuando hay sesión) ── */
async function inicializarFavoritos(userId) {
  if (!db || !userId) return;
  try {
    const { data, error } = await db
      .from('favoritos')
      .select('id, producto_id')
      .eq('user_id', userId);

    if (error) throw error;

    favoritosSet = new Set((data || []).map(f => String(f.producto_id)));
    favoritosMap = {};
    (data || []).forEach(f => { favoritosMap[String(f.producto_id)] = f.id; });

    // Re-renderizar tarjetas para mostrar estado de corazones
    if (typeof renderizarProductos === 'function') renderizarProductos();
  } catch (e) {
    console.warn('[Favoritos] Error al cargar:', e);
  }
}

/* ── Toggle favorito ──────────────────────── */
async function toggleFavorito(productoId) {
  // Sin sesión → abrir login
  if (!db) {
    if (typeof abrirAuthPanel === 'function') abrirAuthPanel('login');
    return;
  }

  let session = null;
  try {
    const res = await db.auth.getSession();
    session = res?.data?.session;
  } catch (e) {}

  if (!session) {
    if (typeof abrirAuthPanel === 'function') abrirAuthPanel('login');
    return;
  }

  const idStr = String(productoId);

  try {
    if (favoritosSet.has(idStr)) {
      // Quitar favorito
      const favId = favoritosMap[idStr];
      await db.from('favoritos').delete().eq('id', favId);
      favoritosSet.delete(idStr);
      delete favoritosMap[idStr];
    } else {
      // Agregar favorito
      const { data, error } = await db
        .from('favoritos')
        .insert({ user_id: session.user.id, producto_id: productoId })
        .select('id')
        .single();

      if (error) throw error;
      if (data) {
        favoritosSet.add(idStr);
        favoritosMap[idStr] = data.id;
      }
    }

    // Actualizar botones sin re-renderizar toda la grilla
    actualizarBotonesCorazon(idStr);

    // Toast rápido
    const esFav = favoritosSet.has(idStr);
    mostrarToastFavorito(esFav);

  } catch (e) {
    console.warn('[Favoritos] Error al toggle:', e);
  }
}

/* ── Actualizar solo los botones del producto ── */
function actualizarBotonesCorazon(productoId) {
  const esFav = favoritosSet.has(String(productoId));
  document.querySelectorAll(`[data-fav-id="${productoId}"]`).forEach(btn => {
    btn.classList.toggle('favorito-activo', esFav);
    btn.setAttribute('title', esFav ? 'Quitar de favoritos' : 'Guardar en favoritos');
  });
}

/* ── Helpers para renderizar ─────────────────── */
function iconCorazon(productoId) {
  const activo = favoritosSet.has(String(productoId));
  return `
    <button
      class="btn-favorito${activo ? ' favorito-activo' : ''}"
      data-fav-id="${productoId}"
      onclick="event.stopPropagation(); toggleFavorito(${productoId})"
      title="${activo ? 'Quitar de favoritos' : 'Guardar en favoritos'}"
      aria-label="Favorito"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="${activo ? 'currentColor' : 'none'}">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    </button>`;
}

/* ── Toast ───────────────────────────────────── */
function mostrarToastFavorito(agregado) {
  let toast = document.getElementById('toast-favorito');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-favorito';
    toast.className = 'toast-carrito';
    document.body.appendChild(toast);
  }
  toast.innerHTML = agregado
    ? '<span>♥</span> Guardado en favoritos'
    : '<span>♡</span> Quitado de favoritos';
  toast.classList.remove('activo');
  void toast.offsetWidth;
  toast.classList.add('activo');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('activo'), 2000);
}
