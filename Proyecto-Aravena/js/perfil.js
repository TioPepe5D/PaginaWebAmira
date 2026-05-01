/* =============================================
   PERFIL — Joyería Aravena
   ============================================= */

const REGIONES_CL = [
  'Región de Arica y Parinacota',
  'Región de Tarapacá',
  'Región de Antofagasta',
  'Región de Atacama',
  'Región de Coquimbo',
  'Región de Valparaíso',
  'Región Metropolitana de Santiago',
  'Región del Libertador Gral. Bernardo O\'Higgins',
  'Región del Maule',
  'Región de Ñuble',
  'Región del Biobío',
  'Región de La Araucanía',
  'Región de Los Ríos',
  'Región de Los Lagos',
  'Región de Aysén del Gral. Carlos Ibáñez del Campo',
  'Región de Magallanes y de la Antártica Chilena',
];

document.addEventListener('DOMContentLoaded', () => {
  // Rellenar select de región
  const selRegion = document.getElementById('env-region');
  if (selRegion) {
    REGIONES_CL.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r;
      opt.textContent = r;
      selRegion.appendChild(opt);
    });
  }

  if (!db) {
    mostrarErrorGlobal('No se pudo conectar con el servidor.');
    return;
  }

  // Verificar sesión
  db.auth.getSession().then(({ data: { session } }) => {
    if (!session) {
      window.location.href = 'index.html';
      return;
    }
    inicializar(session.user);
  }).catch(() => {
    window.location.href = 'index.html';
  });

  // Si cierra sesión desde otro tab
  db.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') window.location.href = 'index.html';
  });
});

/* ── Inicialización ───────────────────────── */
function inicializar(user) {
  // Mostrar datos del usuario en el hero
  const nombre = user.user_metadata?.nombre || user.email?.split('@')[0] || 'Usuario';
  const inicial = nombre.charAt(0).toUpperCase();

  document.getElementById('perfil-avatar-inicial').textContent = inicial;
  document.getElementById('perfil-hero-nombre').textContent = nombre;
  document.getElementById('perfil-hero-email').textContent = user.email;

  // Tab inicial según hash
  const hash = window.location.hash.replace('#', '') || 'pedidos';
  activarTab(hash);

  // Click en tabs
  document.querySelectorAll('.perfil-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activarTab(btn.dataset.tab);
      history.replaceState(null, '', `#${btn.dataset.tab}`);
    });
  });

  // Cargar datos de todas las secciones
  cargarPedidos(user.id);
  cargarFavoritos(user.id);
  cargarDireccion(user.id);
  poblarFormPerfil(user);

  // Formulario dirección
  document.getElementById('form-envio')?.addEventListener('submit', e => guardarDireccion(e, user.id));

  // Formulario datos personales
  document.getElementById('form-perfil-datos')?.addEventListener('submit', e => guardarDatosPersonales(e, user));

  // Formulario contraseña
  document.getElementById('form-cambiar-password')?.addEventListener('submit', e => cambiarPassword(e));
}

/* ── Tabs ─────────────────────────────────── */
function activarTab(tab) {
  const tabs = ['pedidos', 'favoritos', 'envio', 'perfil'];
  if (!tabs.includes(tab)) tab = 'pedidos';

  document.querySelectorAll('.perfil-tab').forEach(btn => {
    btn.classList.toggle('activo', btn.dataset.tab === tab);
  });

  document.querySelectorAll('.perfil-seccion').forEach(sec => {
    sec.classList.toggle('activo', sec.id === `sec-${tab}`);
  });
}

/* ── Pedidos ──────────────────────────────── */
async function cargarPedidos(userId) {
  const contenedor = document.getElementById('lista-pedidos');
  if (!contenedor) return;

  contenedor.innerHTML = '<div class="perfil-loading">Cargando pedidos…</div>';

  try {
    const { data, error } = await db
      .from('pedidos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      contenedor.innerHTML = `
        <div class="perfil-vacio">
          <div class="perfil-vacio-icono">📦</div>
          <h3>Aún no tienes pedidos</h3>
          <p>Cuando realices una compra, aparecerá aquí con todos los detalles.</p>
          <a href="index.html#catalogo" class="btn-primary" style="margin-top:8px">Ver productos</a>
        </div>`;
      return;
    }

    contenedor.innerHTML = data.map(p => renderPedidoCard(p)).join('');

  } catch (e) {
    console.error('[Pedidos] Error:', e);
    contenedor.innerHTML = `<p style="color:#f4212e;font-size:.85rem">Error al cargar pedidos: ${e?.message || 'Intenta de nuevo.'}</p>`;
  }
}

function renderPedidoCard(p) {
  const items   = Array.isArray(p.items) ? p.items : [];
  const estado  = p.estado || 'pendiente';
  const total   = (p.total || 0).toLocaleString('es-CL');
  const fecha   = new Date(p.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
  const idCorto = String(p.id).slice(0, 8).toUpperCase();

  // Método de pago
  const esTransferencia = estado === 'transferencia_pendiente';
  const metodoBadge = esTransferencia
    ? `<span class="pedido-metodo pedido-metodo-transferencia">🏦 Transferencia</span>`
    : `<span class="pedido-metodo pedido-metodo-mp">💳 MercadoPago</span>`;

  // Badge de estado
  const estadoTextos = {
    pagado:                  '✓ Pagado',
    pendiente:               '⏳ Pendiente',
    transferencia_pendiente: '🏦 Transferencia pendiente',
    fallido:                 '✗ Fallido',
    enviado:                 '🚚 Enviado',
    entregado:               '✅ Entregado',
  };
  const estadoLabel = estadoTextos[estado] || estado;

  // Miniaturas de productos (máx. 4)
  const imagenes = items.filter(i => i.imagen).slice(0, 4);
  const masItems = items.length - 4;
  const thumbnails = imagenes.length
    ? `<div class="pedido-thumbs">
        ${imagenes.map(i => `<img src="${i.imagen}" alt="${i.nombre}" class="pedido-thumb" loading="lazy">`).join('')}
        ${masItems > 0 ? `<div class="pedido-thumb-mas">+${masItems}</div>` : ''}
      </div>`
    : '';

  // Resumen de items
  const resumen = items.map(i => `${i.nombre} ×${i.cantidad}`).join(' · ') || '—';

  // Botón acción según estado
  let accion = '';
  if (estado === 'transferencia_pendiente') {
    const msg = encodeURIComponent(`Hola! Realicé una transferencia por mi pedido #${idCorto} por $${total} CLP. ¿Pueden confirmarlo?`);
    accion = `<a href="https://wa.me/56966497904?text=${msg}" target="_blank" class="pedido-btn-wsp">
      <svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor"><path d="M16 2C8.268 2 2 8.268 2 16c0 2.478.678 4.797 1.856 6.785L2 30l7.43-1.82A13.94 13.94 0 0 0 16 30c7.732 0 14-6.268 14-14S23.732 2 16 2zm6.29 19.366c-.344-.172-2.036-1.004-2.352-1.118-.316-.116-.546-.172-.776.172-.23.344-.892 1.118-1.094 1.348-.2.23-.402.258-.746.086-.344-.172-1.452-.536-2.766-1.706-1.022-.912-1.712-2.036-1.912-2.38-.2-.344-.022-.53.15-.702.154-.154.344-.402.516-.602.172-.2.23-.344.344-.574.116-.23.058-.43-.028-.602-.086-.172-.776-1.87-1.064-2.562-.28-.674-.564-.582-.776-.594-.2-.01-.43-.012-.66-.012s-.602.086-.918.43c-.316.344-1.204 1.176-1.204 2.868s1.232 3.326 1.404 3.556c.172.23 2.426 3.706 5.878 5.198.822.354 1.464.566 1.964.724.826.262 1.578.226 2.172.138.662-.1 2.036-.832 2.322-1.634.288-.802.288-1.49.202-1.634-.086-.144-.316-.23-.66-.402z"/></svg>
      Enviar comprobante
    </a>`;
  } else if (estado === 'pendiente') {
    const msg = encodeURIComponent(`Hola! Tengo una consulta sobre mi pedido #${idCorto}.`);
    accion = `<a href="https://wa.me/56966497904?text=${msg}" target="_blank" class="pedido-btn-wsp">
      <svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor"><path d="M16 2C8.268 2 2 8.268 2 16c0 2.478.678 4.797 1.856 6.785L2 30l7.43-1.82A13.94 13.94 0 0 0 16 30c7.732 0 14-6.268 14-14S23.732 2 16 2zm6.29 19.366c-.344-.172-2.036-1.004-2.352-1.118-.316-.116-.546-.172-.776.172-.23.344-.892 1.118-1.094 1.348-.2.23-.402.258-.746.086-.344-.172-1.452-.536-2.766-1.706-1.022-.912-1.712-2.036-1.912-2.38-.2-.344-.022-.53.15-.702.154-.154.344-.402.516-.602.172-.2.23-.344.344-.574.116-.23.058-.43-.028-.602-.086-.172-.776-1.87-1.064-2.562-.28-.674-.564-.582-.776-.594-.2-.01-.43-.012-.66-.012s-.602.086-.918.43c-.316.344-1.204 1.176-1.204 2.868s1.232 3.326 1.404 3.556c.172.23 2.426 3.706 5.878 5.198.822.354 1.464.566 1.964.724.826.262 1.578.226 2.172.138.662-.1 2.036-.832 2.322-1.634.288-.802.288-1.49.202-1.634-.086-.144-.316-.23-.66-.402z"/></svg>
      Consultar pedido
    </a>`;
  }

  return `
    <div class="pedido-card pedido-card-${estado}">
      <div class="pedido-header">
        <div class="pedido-header-left">
          <span class="pedido-id">#${idCorto}</span>
          <span class="pedido-fecha">${fecha}</span>
          ${metodoBadge}
        </div>
        <span class="pedido-estado ${estado}">${estadoLabel}</span>
      </div>
      ${thumbnails}
      <p class="pedido-items">${resumen}</p>
      <div class="pedido-footer">
        <span class="pedido-total">$${total} <small>CLP</small></span>
        ${accion}
      </div>
    </div>`;
}

/* ── Favoritos ────────────────────────────── */
async function cargarFavoritos(userId) {
  const contenedor = document.getElementById('lista-favoritos');
  if (!contenedor) return;

  contenedor.innerHTML = '<div class="perfil-loading">Cargando favoritos…</div>';

  try {
    const { data, error } = await db
      .from('favoritos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      contenedor.innerHTML = `
        <div class="perfil-vacio">
          <div class="perfil-vacio-icono">🤍</div>
          <h3>No tienes favoritos guardados</h3>
          <p>Guarda las joyas que más te gustan para encontrarlas fácil.</p>
          <a href="index.html#catalogo" class="btn-primary" style="margin-top:8px">Explorar catálogo</a>
        </div>`;
      return;
    }

    // Obtener los productos del catálogo (desde products.js que ya los cargó)
    const todosProductos = typeof PRODUCTOS !== 'undefined' ? PRODUCTOS : [];

    contenedor.innerHTML = `<div class="favoritos-grid">${
      data.map(fav => {
        const prod = todosProductos.find(p => String(p.id) === String(fav.producto_id));
        const nombre = prod?.nombre || prod?.name || `Producto ${fav.producto_id}`;
        const precio = prod?.precio ? `$${prod.precio.toLocaleString('es-CL')} CLP` : '';
        const img = prod?.imagen || prod?.image || '';
        return `
          <div class="favorito-card" data-fav-id="${fav.id}" data-prod-id="${fav.producto_id}">
            ${img
              ? `<img src="${img}" alt="${nombre}" class="favorito-img" loading="lazy">`
              : `<div class="favorito-img-placeholder">💎</div>`
            }
            <div class="favorito-info">
              <p class="favorito-nombre">${nombre}</p>
              ${precio ? `<p class="favorito-precio">${precio}</p>` : ''}
              <button class="btn-quitar-favorito" onclick="quitarFavorito('${fav.id}', '${userId}')">
                × Quitar de favoritos
              </button>
            </div>
          </div>`;
      }).join('')
    }</div>`;

  } catch (e) {
    contenedor.innerHTML = `<p style="color:#f4212e;font-size:.85rem">Error al cargar favoritos.</p>`;
  }
}

async function quitarFavorito(favId, userId) {
  try {
    await db.from('favoritos').delete().eq('id', favId);
    cargarFavoritos(userId);
  } catch (e) {
    console.error('Error al quitar favorito:', e);
  }
}

/* ── Datos de envío ───────────────────────── */
async function cargarDireccion(userId) {
  try {
    const { data, error } = await db
      .from('direcciones')
      .select('*')
      .eq('user_id', userId)
      .limit(1);

    if (error || !data || data.length === 0) return;
    const fila = data[0];

    // Rellenar campos
    const campos = ['nombre', 'apellido', 'telefono', 'direccion', 'ciudad', 'codigo_postal', 'region'];
    campos.forEach(c => {
      const el = document.getElementById(`env-${c}`);
      if (el && fila[c]) el.value = fila[c];
    });
  } catch (e) {
    // No hay dirección guardada, está bien
  }
}

async function guardarDireccion(e, userId) {
  e.preventDefault();
  const btn = document.getElementById('btn-guardar-envio');
  const msg = document.getElementById('msg-envio');

  const payload = {
    user_id: userId,
    nombre: document.getElementById('env-nombre').value.trim(),
    apellido: document.getElementById('env-apellido').value.trim(),
    telefono: document.getElementById('env-telefono').value.trim(),
    direccion: document.getElementById('env-direccion').value.trim(),
    ciudad: document.getElementById('env-ciudad').value.trim(),
    codigo_postal: document.getElementById('env-codigo_postal').value.trim(),
    region: document.getElementById('env-region').value,
  };

  if (!payload.nombre || !payload.direccion || !payload.ciudad || !payload.region) {
    mostrarMsg(msg, 'Completa los campos obligatorios.', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Guardando…';

  try {
    const { error } = await db
      .from('direcciones')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) throw error;
    mostrarMsg(msg, '✓ Dirección guardada correctamente', 'ok');
  } catch (err) {
    mostrarMsg(msg, 'Error al guardar. Intenta de nuevo.', 'error');
  }

  btn.disabled = false;
  btn.textContent = 'Guardar dirección';
}

/* ── Perfil personal ──────────────────────── */
function poblarFormPerfil(user) {
  const nombre = user.user_metadata?.nombre || '';
  const email = user.email || '';
  const elNombre = document.getElementById('prof-nombre');
  const elEmail = document.getElementById('prof-email');
  if (elNombre) elNombre.value = nombre;
  if (elEmail) elEmail.value = email;
}

async function guardarDatosPersonales(e, user) {
  e.preventDefault();
  const btn = document.getElementById('btn-guardar-perfil');
  const msg = document.getElementById('msg-perfil');
  const nombre = document.getElementById('prof-nombre').value.trim();

  if (!nombre) { mostrarMsg(msg, 'Ingresa tu nombre.', 'error'); return; }

  btn.disabled = true;
  btn.textContent = 'Guardando…';

  try {
    const { error } = await db.auth.updateUser({ data: { nombre } });
    if (error) throw error;

    // Actualizar también en la tabla perfiles
    await db.from('perfiles').upsert({ id: user.id, nombre }, { onConflict: 'id' });

    mostrarMsg(msg, '✓ Datos actualizados', 'ok');

    // Actualizar header + hero
    document.getElementById('perfil-hero-nombre').textContent = nombre;
    const ini = nombre.charAt(0).toUpperCase();
    document.getElementById('perfil-avatar-inicial').textContent = ini;
    const headerNombre = document.getElementById('cuenta-nombre');
    if (headerNombre) headerNombre.textContent = ini;

  } catch (err) {
    mostrarMsg(msg, 'Error al actualizar. Intenta de nuevo.', 'error');
  }

  btn.disabled = false;
  btn.textContent = 'Guardar cambios';
}

async function cambiarPassword(e) {
  e.preventDefault();
  const nueva = document.getElementById('prof-password-nueva').value;
  const confirmar = document.getElementById('prof-password-confirmar').value;
  const btn = document.getElementById('btn-cambiar-pass');
  const msg = document.getElementById('msg-password');

  if (nueva.length < 6) { mostrarMsg(msg, 'Mínimo 6 caracteres.', 'error'); return; }
  if (nueva !== confirmar) { mostrarMsg(msg, 'Las contraseñas no coinciden.', 'error'); return; }

  btn.disabled = true;
  btn.textContent = 'Actualizando…';

  try {
    const { error } = await db.auth.updateUser({ password: nueva });
    if (error) throw error;
    mostrarMsg(msg, '✓ Contraseña actualizada', 'ok');
    e.target.reset();
  } catch (err) {
    mostrarMsg(msg, 'Error al cambiar contraseña.', 'error');
  }

  btn.disabled = false;
  btn.textContent = 'Cambiar contraseña';
}

/* ── Helpers ─────────────────────────────── */
function mostrarMsg(el, texto, tipo) {
  if (!el) return;
  el.textContent = texto;
  el.className = `perfil-msg perfil-msg-${tipo}`;
  el.style.display = 'block';
  setTimeout(() => { if (el) el.style.display = 'none'; }, 4000);
}

function mostrarErrorGlobal(msg) {
  const main = document.getElementById('perfil-contenedor');
  if (main) main.innerHTML = `
    <div class="perfil-vacio">
      <div class="perfil-vacio-icono">⚠️</div>
      <h3>${msg}</h3>
      <a href="index.html" class="btn-primary" style="margin-top:8px">Volver al inicio</a>
    </div>`;
}
