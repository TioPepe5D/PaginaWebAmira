let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

function guardarCarrito() {
  localStorage.setItem("carrito", JSON.stringify(carrito));
}

function actualizarContador() {
  const total = carrito.reduce((sum, i) => sum + i.cantidad, 0);
  const el = document.getElementById("carrito-contador");
  if (el) el.textContent = total;
  const badge = document.getElementById("carrito-badge");
  if (badge) badge.textContent = total;
}

function cambiarCantidad(id, delta) {
  const item = carrito.find(p => String(p.id) === String(id));
  if (!item) return;
  item.cantidad += delta;
  if (item.cantidad <= 0) {
    carrito = carrito.filter(p => String(p.id) !== String(id));
  }
  guardarCarrito();
  actualizarContador();
  renderizarCarritoPage();
  habilitarBotonPago();
}

let _pendienteEliminarId = null;

function pedirConfirmacionEliminar(id) {
  const item = carrito.find(p => String(p.id) === String(id));
  if (!item) return;
  _pendienteEliminarId = id;
  document.getElementById('confirm-eliminar-nombre').textContent = item.nombre;
  document.getElementById('modal-confirm-overlay').classList.add('activo');
}

function cerrarConfirmEliminar() {
  _pendienteEliminarId = null;
  document.getElementById('modal-confirm-overlay').classList.remove('activo');
}

function confirmarEliminar() {
  if (_pendienteEliminarId === null) return;
  carrito = carrito.filter(p => String(p.id) !== String(_pendienteEliminarId));
  guardarCarrito();
  cerrarConfirmEliminar();
  actualizarContador();
  renderizarCarritoPage();
  habilitarBotonPago();
}

function renderizarCarritoPage() {
  const contenedor = document.getElementById("carrito-page-items");
  const totalEl = document.getElementById("carrito-aside-total");

  if (carrito.length === 0) {
    contenedor.innerHTML = '<p class="carrito-vacio-msg">Tu carrito está vacío. <a href="index.html#catalogo">Ver productos →</a></p>';
    if (totalEl) totalEl.textContent = "$0 CLP";
    return;
  }

  contenedor.innerHTML = carrito.map(item => `
    <div class="carrito-page-item">
      <img src="${item.imagen}" alt="${item.nombre}">
      <div class="carrito-page-item-info">
        <p class="carrito-page-item-nombre">${item.nombre}</p>
        <p class="carrito-page-item-cat">${item.categoria}</p>
        <p class="carrito-page-item-precio">$${item.precio.toLocaleString("es-CL")}</p>
      </div>
      <div class="cantidad-selector">
        <button onclick="cambiarCantidad(${item.id}, -1)">−</button>
        <span class="cantidad-valor">${item.cantidad}</span>
        <button onclick="cambiarCantidad(${item.id}, 1)">+</button>
      </div>
      <button class="carrito-page-item-eliminar" onclick="pedirConfirmacionEliminar(${item.id})" title="Eliminar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6"/><path d="M14 11v6"/>
          <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    </div>
  `).join("");

  const subtotal  = carrito.reduce((sum, i) => sum + i.precio * i.cantidad, 0);
  const comision  = Math.round(subtotal * 0.05);
  const total     = subtotal + comision;

  const subtotalEl  = document.getElementById("carrito-aside-subtotal");
  const comisionEl  = document.getElementById("carrito-aside-comision");
  const comisionRow = document.getElementById("carrito-aside-comision-row");

  if (subtotalEl)  subtotalEl.textContent  = "$" + subtotal.toLocaleString("es-CL") + " CLP";
  if (comisionEl)  comisionEl.textContent  = "$" + comision.toLocaleString("es-CL") + " CLP";
  if (comisionRow) comisionRow.style.display = subtotal > 0 ? "flex" : "none";
  if (totalEl)     totalEl.textContent = "$" + total.toLocaleString("es-CL") + " CLP";
}

function habilitarBotonPago() {
  const btn = document.getElementById("btn-pagar");
  if (btn) btn.disabled = carrito.length === 0;
}

// ── Datos de envío temporales (guest checkout) ──
let _datosEnvio = null;
let _tipoPagoEnvio = null;

function abrirFormularioEnvio(tipo) {
  if (carrito.length === 0) return;
  _tipoPagoEnvio = tipo;

  // 1. Pre-rellenar desde localStorage (funciona para todos)
  const guardados = JSON.parse(localStorage.getItem('checkout_datos') || 'null');
  if (guardados) {
    const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
    set('env-nombre-pago',      guardados.nombre);
    set('env-telefono-pago',    guardados.telefono);
    set('env-rut-pago',         guardados.rut);
    set('env-ciudad-pago',      guardados.ciudad);
    set('env-correo-pago',      guardados.correo);
    set('env-empresa-pago',     guardados.empresa);
    set('env-preferencia-pago', guardados.preferencia);
    set('env-sucursal-pago',    guardados.sucursal);
    set('env-domicilio-pago',   guardados.domicilio);
  }

  // 2. Si hay sesión, sobreescribir con datos de Supabase (más confiables)
  if (typeof db !== 'undefined' && db) {
    db.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Email del usuario autenticado
        const correoEl = document.getElementById('env-correo-pago');
        if (correoEl && !correoEl.value) correoEl.value = session.user.email || '';

        // Datos de direcciones guardados en perfil
        db.from('direcciones').select('*').eq('user_id', session.user.id).limit(1)
          .then(({ data }) => {
            if (data && data[0]) {
              const d = data[0];
              const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
              if (d.nombre)    set('env-nombre-pago',   d.nombre + (d.apellido ? ' ' + d.apellido : ''));
              if (d.telefono)  set('env-telefono-pago', d.telefono);
              if (d.ciudad)    set('env-ciudad-pago',   d.ciudad);
              if (d.direccion) set('env-domicilio-pago',d.direccion);
            }
          });
      }
    });
  }

  document.getElementById('modal-envio-overlay').classList.add('activo');
}

function cerrarFormularioEnvio() {
  document.getElementById('modal-envio-overlay').classList.remove('activo');
}

/* ── RUT helpers ── */
function _rutDigito(rut) {
  let suma = 0, mul = 2;
  for (let i = String(rut).length - 1; i >= 0; i--) {
    suma += parseInt(String(rut)[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const r = 11 - (suma % 11);
  return r === 11 ? '0' : r === 10 ? 'K' : String(r);
}
function _rutValido(raw) {
  const clean = raw.replace(/[\.\-\s]/g, '').toUpperCase();
  if (clean.length < 2) return false;
  const cuerpo = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!/^\d+$/.test(cuerpo)) return false;
  return _rutDigito(cuerpo) === dv;
}
function _formatearRut(val) {
  let clean = val.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length === 0) return '';
  const dv = clean.slice(-1);
  let cuerpo = clean.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return clean.length === 1 ? clean : `${cuerpo}-${dv}`;
}

/* ── Field validation ── */
function _setField(id, msgId, ok, msg) {
  const el = document.getElementById(id);
  const m  = document.getElementById(msgId);
  el.classList.toggle('campo-ok',    ok);
  el.classList.toggle('campo-error', !ok);
  if (m) { m.textContent = ok ? '' : msg; m.classList.toggle('visible', !ok); }
  return ok;
}
function _validarNombre(v)   { return /^[A-Za-záéíóúÁÉÍÓÚñÑüÜ\s]{3,60}$/.test(v); }
function _validarTelefono(v) { return /^[\d\+\s]{8,15}$/.test(v); }
function _validarCiudad(v)   { return /^[A-Za-záéíóúÁÉÍÓÚñÑüÜ\s]{3,40}$/.test(v); }
function _validarCorreo(v)   { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 80; }

function _adjuntarValidaciones() {
  const nombre   = document.getElementById('env-nombre-pago');
  const telefono = document.getElementById('env-telefono-pago');
  const rut      = document.getElementById('env-rut-pago');
  const ciudad   = document.getElementById('env-ciudad-pago');
  const correo   = document.getElementById('env-correo-pago');
  const domicilio= document.getElementById('env-domicilio-pago');
  const sucursal = document.getElementById('env-sucursal-pago');
  const pref     = document.getElementById('env-preferencia-pago');

  // Bloqueo en tiempo real — solo letras/espacios
  nombre.addEventListener('input', () => {
    nombre.value = nombre.value.replace(/[^A-Za-záéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
    if (nombre.value.length > 0)
      _setField('env-nombre-pago','msg-nombre', _validarNombre(nombre.value.trim()), 'Mínimo 3 letras, solo letras y espacios');
  });
  nombre.addEventListener('blur', () =>
    _setField('env-nombre-pago','msg-nombre', _validarNombre(nombre.value.trim()), 'Mínimo 3 letras, solo letras y espacios'));

  // Bloqueo teléfono
  telefono.addEventListener('input', () => {
    telefono.value = telefono.value.replace(/[^\d\+\s]/g, '');
    if (telefono.value.length > 0)
      _setField('env-telefono-pago','msg-telefono', _validarTelefono(telefono.value.trim()), '8–15 dígitos, puede incluir + y espacios');
  });
  telefono.addEventListener('blur', () =>
    _setField('env-telefono-pago','msg-telefono', _validarTelefono(telefono.value.trim()), '8–15 dígitos, puede incluir + y espacios'));

  // RUT: formateo automático + validación DV
  rut.addEventListener('input', () => {
    const pos = rut.selectionStart;
    rut.value = _formatearRut(rut.value);
    if (rut.value.length > 0)
      _setField('env-rut-pago','msg-rut', _rutValido(rut.value), 'RUT inválido (dígito verificador incorrecto)');
  });
  rut.addEventListener('blur', () =>
    _setField('env-rut-pago','msg-rut', _rutValido(rut.value), 'RUT inválido (dígito verificador incorrecto)'));

  // Ciudad — solo letras/espacios
  ciudad.addEventListener('input', () => {
    ciudad.value = ciudad.value.replace(/[^A-Za-záéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
    if (ciudad.value.length > 0)
      _setField('env-ciudad-pago','msg-ciudad', _validarCiudad(ciudad.value.trim()), 'Mínimo 3 letras, solo letras y espacios');
  });
  ciudad.addEventListener('blur', () =>
    _setField('env-ciudad-pago','msg-ciudad', _validarCiudad(ciudad.value.trim()), 'Mínimo 3 letras, solo letras y espacios'));

  // Correo
  correo.addEventListener('blur', () =>
    _setField('env-correo-pago','msg-correo', _validarCorreo(correo.value.trim()), 'Ingresa un correo válido'));

  // Domicilio/Sucursal — obligatorio según preferencia
  function _validarCondicionales() {
    const esDomicilio = pref.value === 'Domicilio';
    const esSucursal  = pref.value === 'Sucursal';
    if (domicilio.value.trim() || esDomicilio)
      _setField('env-domicilio-pago','msg-domicilio', !esDomicilio || domicilio.value.trim().length > 0, 'Ingresa tu domicilio para envío a domicilio');
    if (sucursal.value.trim() || esSucursal)
      _setField('env-sucursal-pago','msg-sucursal', !esSucursal || sucursal.value.trim().length > 0, 'Ingresa la sucursal más cercana');
  }
  pref.addEventListener('change', _validarCondicionales);
  domicilio.addEventListener('blur', _validarCondicionales);
  sucursal.addEventListener('blur', _validarCondicionales);
}

function confirmarEnvioYPagar() {
  const nombre    = document.getElementById('env-nombre-pago').value.trim();
  const telefono  = document.getElementById('env-telefono-pago').value.trim();
  const rut       = document.getElementById('env-rut-pago').value.trim();
  const ciudad    = document.getElementById('env-ciudad-pago').value.trim();
  const correo    = document.getElementById('env-correo-pago').value.trim();
  const empresa   = document.getElementById('env-empresa-pago').value;
  const preferencia = document.getElementById('env-preferencia-pago').value;
  const sucursal  = document.getElementById('env-sucursal-pago').value.trim();
  const domicilio = document.getElementById('env-domicilio-pago').value.trim();

  // Validate all fields at submit time
  const errEl = document.getElementById('env-form-error');
  let ok = true;
  if (!_setField('env-nombre-pago',   'msg-nombre',   _validarNombre(nombre),     'Mínimo 3 letras, solo letras y espacios')) ok = false;
  if (!_setField('env-telefono-pago', 'msg-telefono', _validarTelefono(telefono), '8–15 dígitos, puede incluir + y espacios')) ok = false;
  if (!_setField('env-rut-pago',      'msg-rut',      _rutValido(rut),            'RUT inválido (dígito verificador incorrecto)')) ok = false;
  if (!_setField('env-ciudad-pago',   'msg-ciudad',   _validarCiudad(ciudad),     'Mínimo 3 letras, solo letras y espacios')) ok = false;
  if (!_setField('env-correo-pago',   'msg-correo',   _validarCorreo(correo),     'Ingresa un correo válido')) ok = false;
  if (!empresa) ok = false;
  if (preferencia === 'Domicilio' && !domicilio)
    { _setField('env-domicilio-pago','msg-domicilio', false, 'Ingresa tu domicilio para envío a domicilio'); ok = false; }
  if (preferencia === 'Sucursal' && !sucursal)
    { _setField('env-sucursal-pago','msg-sucursal', false, 'Ingresa la sucursal más cercana'); ok = false; }

  if (!ok) {
    errEl.textContent = 'Corrige los campos marcados en rojo';
    errEl.style.display = 'block';
    return;
  }
  errEl.style.display = 'none';

  _datosEnvio = { nombre, telefono, rut, ciudad, correo, empresa, preferencia, sucursal, domicilio };

  // Guardar en localStorage para próximas compras (funciona para todos)
  localStorage.setItem('checkout_datos', JSON.stringify(_datosEnvio));

  // Si hay sesión, guardar también en tabla direcciones de Supabase
  if (typeof db !== 'undefined' && db) {
    db.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        db.from('direcciones').upsert({
          user_id:  session.user.id,
          nombre:   nombre.split(' ')[0] || nombre,
          apellido: nombre.split(' ').slice(1).join(' ') || '',
          telefono,
          ciudad,
          direccion: domicilio || '',
        }, { onConflict: 'user_id' }).then(({ error }) => {
          if (error) console.warn('[Envío] No se pudo guardar en Supabase:', error.message);
        });
      }
    });
  }

  cerrarFormularioEnvio();

  if (_tipoPagoEnvio === 'mp') {
    _iniciarPagoMP();
  }
}

async function _iniciarPagoMP() {
  const btn = document.getElementById("btn-pagar");
  const estado = document.getElementById("btn-mp-estado");
  if (carrito.length === 0) return;

  btn.disabled = true;
  btn.textContent = "Procesando...";
  if (estado) estado.textContent = "";

  // Solo enviar id y quantity — el servidor calcula los precios reales
  const items = carrito.map(i => ({
    id:       String(i.id),
    quantity: i.cantidad
  }));

  // Token de sesión para asociar el pedido al usuario (opcional)
  let token = null;
  try {
    const { data: { session } } = await db.auth.getSession();
    if (session) token = session.access_token;
  } catch (_) {}

  try {
    const res = await fetch("/api/crear-preferencia", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ items, datosEnvio: _datosEnvio || null })
    });

    if (!res.ok) throw new Error("Error del servidor");

    const data = await res.json();
    if (data.pedidoId) localStorage.setItem('pedido_pendiente_id', data.pedidoId);
    window.location.href = data.init_point;
  } catch (err) {
    if (estado) {
      estado.textContent = "⚠ Error al conectar con MercadoPago. Intenta de nuevo.";
      estado.style.color = "#dc2626";
    }
    btn.disabled = false;
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="24" fill="#009EE3"/><path d="M13 24c0-6.075 4.925-11 11-11s11 4.925 11 11-4.925 11-11 11S13 30.075 13 24z" fill="white"/><path d="M20 24l3 3 6-6" stroke="#009EE3" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Pagar con MercadoPago`;
  }
}

// Wrapper que abre el formulario de envío primero
function iniciarPago() {
  abrirFormularioEnvio('mp');
}

/* ── Guardar pedido vía API — solo {id, quantity}, precios calculados server-side ── */
async function guardarPedidoPendiente(estadoInicial = 'pendiente') {
  try {
    // Solo enviar id y quantity — el servidor calcula precios reales
    const itemsInput = carrito.map(i => ({ id: String(i.id), quantity: i.cantidad }));

    let userToken = null;
    if (typeof db !== 'undefined' && db) {
      try {
        const { data: { session } } = await db.auth.getSession();
        if (session) userToken = session.access_token;
      } catch (_) {}
    }

    const res = await fetch('/api/guardar-pedido', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items:      itemsInput,
        estado:     estadoInicial,
        datosEnvio: _datosEnvio || null,
        userToken
      })
    });

    const data = await res.json();
    if (res.ok && data.id) {
      localStorage.setItem('pedido_pendiente_id', data.id);
    } else {
      console.warn('[Pedidos] Error al guardar pedido:', data.error);
    }
  } catch (e) {
    console.warn('[Pedidos] No se pudo guardar el pedido:', e);
  }
}

/* ── Manejar retorno desde MercadoPago ────── */
async function manejarRetornoPago() {
  const params = new URLSearchParams(window.location.search);
  const pago = params.get('pago');
  if (!pago) return;

  // Limpiar URL sin recargar la página
  history.replaceState({}, '', window.location.pathname);

  const pedidoId = localStorage.getItem('pedido_pendiente_id');

  if (pago === 'ok') {
    // Actualizar estado en Supabase
    if (pedidoId && typeof db !== 'undefined' && db) {
      try {
        const { data: { session } } = await db.auth.getSession();
        if (session) {
          await db.from('pedidos')
            .update({ estado: 'pagado' })
            .eq('id', pedidoId)
            .eq('user_id', session.user.id);
          localStorage.removeItem('pedido_pendiente_id');
        }
      } catch (e) { console.warn('[Pedidos] Error al actualizar estado:', e); }
    }

    // Vaciar carrito
    carrito = [];
    guardarCarrito();
    actualizarContador();
    renderizarCarritoPage();
    habilitarBotonPago();

    mostrarBannerPago(
      '¡Pago realizado con éxito! Gracias por tu compra, pronto te contactaremos.',
      'ok',
      'Ver mis pedidos →',
      'perfil.html#pedidos'
    );

  } else if (pago === 'pendiente') {
    mostrarBannerPago(
      'Tu pago está siendo procesado. Te avisaremos cuando se confirme.',
      'pendiente'
    );

  } else if (pago === 'error') {
    // Marcar pedido como fallido
    if (pedidoId && typeof db !== 'undefined' && db) {
      try {
        const { data: { session } } = await db.auth.getSession();
        if (session) {
          await db.from('pedidos')
            .update({ estado: 'fallido' })
            .eq('id', pedidoId)
            .eq('user_id', session.user.id);
          localStorage.removeItem('pedido_pendiente_id');
        }
      } catch (e) {}
    }

    mostrarBannerPago(
      'Hubo un problema con el pago. Puedes intentarlo de nuevo.',
      'error'
    );
  }
}

function mostrarBannerPago(texto, tipo, linkTexto = '', linkUrl = '') {
  const main = document.querySelector('.carrito-page');
  if (!main) return;

  const banner = document.createElement('div');
  banner.className = `pago-banner pago-banner-${tipo}`;
  const icono = tipo === 'ok' ? '✓' : tipo === 'pendiente' ? '⏳' : '⚠';
  banner.innerHTML = `
    <span class="pago-banner-icono">${icono}</span>
    <span>${texto}</span>
    ${linkTexto ? `<a href="${linkUrl}" class="pago-banner-link">${linkTexto}</a>` : ''}
  `;
  main.prepend(banner);
}

/* ══════════════════════════════════════════
   TRANSFERENCIA BANCARIA
   ══════════════════════════════════════════ */

// ── Datos bancarios (actualizar con los datos reales) ──

/* ── Configurar botones ── */
function configurarPago() {
  const btn = document.getElementById("btn-pagar");

  // Modal de envío
  const btnConfEnvio   = document.getElementById("btn-confirmar-envio");
  const btnCerrarEnvio = document.getElementById("modal-envio-cerrar");
  const overlayEnvio   = document.getElementById("modal-envio-overlay");

  if (btn) btn.addEventListener("click", iniciarPago);

  _adjuntarValidaciones();

  if (btnConfEnvio) btnConfEnvio.addEventListener("click", confirmarEnvioYPagar);
  if (btnCerrarEnvio)  btnCerrarEnvio.addEventListener("click", cerrarFormularioEnvio);
  if (overlayEnvio)    overlayEnvio.addEventListener("click", e => {
    if (e.target === overlayEnvio) cerrarFormularioEnvio();
  });

  // Modal confirmar eliminar
  document.getElementById("btn-confirm-si")?.addEventListener("click", confirmarEliminar);
  document.getElementById("btn-confirm-no")?.addEventListener("click", cerrarConfirmEliminar);
  document.getElementById("modal-confirm-overlay")?.addEventListener("click", e => {
    if (e.target.id === "modal-confirm-overlay") cerrarConfirmEliminar();
  });
}

actualizarContador();
renderizarCarritoPage();
habilitarBotonPago();
configurarPago();
