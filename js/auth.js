/* =============================================
   AUTH — Joyería Aravena
   Login, Registro, Panel de usuario
   ============================================= */

let usuarioActual = null;

function initAuth() {
  // ── 1. Registrar TODOS los event listeners primero (síncronos) ──
  // Botón Mi Cuenta
  document.getElementById('cuenta-btn')?.addEventListener('click', () => {
    if (usuarioActual) abrirUsuarioPanel();
    else abrirAuthPanel('login');
  });

  // Overlay
  document.getElementById('auth-overlay')?.addEventListener('click', cerrarTodosPaneles);

  // Cerrar botones
  document.getElementById('auth-cerrar')?.addEventListener('click', cerrarAuthPanel);
  document.getElementById('usuario-panel-cerrar')?.addEventListener('click', cerrarUsuarioPanel);

  // Tabs
  document.getElementById('tab-login')?.addEventListener('click', () => cambiarTab('login'));
  document.getElementById('tab-registro')?.addEventListener('click', () => cambiarTab('registro'));

  // Formularios
  document.getElementById('form-login')?.addEventListener('submit', manejarLogin);
  document.getElementById('form-registro')?.addEventListener('submit', manejarRegistro);

  // Logout
  document.getElementById('btn-logout')?.addEventListener('click', logout);

  // Toggle contraseña
  document.querySelectorAll('.auth-toggle-pass').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      const esPassword = input.type === 'password';
      input.type = esPassword ? 'text' : 'password';
      btn.querySelector('.ojo-abierto').style.display = esPassword ? 'none' : 'block';
      btn.querySelector('.ojo-cerrado').style.display = esPassword ? 'block' : 'none';
    });
  });

  // ESC cierra paneles
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarTodosPaneles();
  });

  // ── 2. Verificar sesión existente de forma asíncrona ──
  if (!db) return; // sin Supabase no hay sesión que revisar

  db.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      usuarioActual = session.user;
      actualizarHeaderUsuario(session.user);
      if (typeof inicializarFavoritos === 'function') inicializarFavoritos(session.user.id);
    }
  }).catch(e => console.warn('[Auth] getSession:', e));

  // Escuchar cambios de sesión
  db.auth.onAuthStateChange((event, session) => {
    usuarioActual = session?.user || null;
    actualizarHeaderUsuario(usuarioActual);
    if (event === 'SIGNED_IN') {
      cerrarAuthPanel();
      const nombre = usuarioActual?.user_metadata?.nombre || usuarioActual?.email?.split('@')[0] || 'Usuario';
      mostrarToastAuth(`¡Bienvenido, ${nombre.split(' ')[0]}!`);
      if (typeof inicializarFavoritos === 'function') inicializarFavoritos(usuarioActual.id);
    }
    if (event === 'SIGNED_OUT') {
      mostrarToastAuth('Sesión cerrada correctamente');
      // Limpiar favoritos al cerrar sesión
      if (typeof favoritosSet !== 'undefined') { favoritosSet.clear(); favoritosMap = {}; }
      if (typeof renderizarProductos === 'function') renderizarProductos();
    }
  });
}

const ADMIN_EMAILS_AUTH = ['diegoaravenavera@gmail.com'];

/* ── Header ──────────────────────────────── */
function actualizarHeaderUsuario(user) {
  const btn = document.getElementById('cuenta-btn');
  const icono = document.getElementById('cuenta-icono');
  const nombreEl = document.getElementById('cuenta-nombre');
  if (!btn) return;

  if (user) {
    const nombre = user.user_metadata?.nombre || user.email?.split('@')[0] || 'Usuario';
    const inicial = nombre.charAt(0).toUpperCase();
    btn.classList.add('cuenta-activa');
    btn.title = nombre;
    if (icono) icono.style.display = 'none';
    if (nombreEl) {
      nombreEl.textContent = inicial;
      nombreEl.style.display = 'flex';
    }
    // Mostrar acceso rápido al admin si es administrador
    mostrarBtnAdmin(ADMIN_EMAILS_AUTH.includes(user.email));
  } else {
    btn.classList.remove('cuenta-activa');
    btn.title = 'Mi cuenta';
    if (icono) icono.style.display = 'block';
    if (nombreEl) nombreEl.style.display = 'none';
    mostrarBtnAdmin(false);
  }
}

function mostrarBtnAdmin(mostrar) {
  // No mostrar en admin.html (ya está ahí)
  if (window.location.pathname.includes('admin.html')) return;

  let btnAdmin = document.getElementById('btn-acceso-admin');
  if (mostrar) {
    if (!btnAdmin) {
      btnAdmin = document.createElement('a');
      btnAdmin.id = 'btn-acceso-admin';
      btnAdmin.href = 'admin.html';
      btnAdmin.className = 'btn-acceso-admin';
      btnAdmin.title = 'Panel de administración';
      btnAdmin.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
        Admin
      `;
      // Insertar antes del botón de cuenta
      const headerIconos = document.querySelector('.header-iconos');
      const cuentaBtn = document.getElementById('cuenta-btn');
      if (headerIconos && cuentaBtn) {
        headerIconos.insertBefore(btnAdmin, cuentaBtn);
      }
    }
    btnAdmin.style.display = 'inline-flex';
  } else if (btnAdmin) {
    btnAdmin.style.display = 'none';
  }
}

/* ── Auth Panel (login/registro) ─────────── */
function abrirAuthPanel(tab = 'login') {
  document.getElementById('auth-overlay')?.classList.add('activo');
  document.getElementById('auth-panel')?.classList.add('activo');
  cambiarTab(tab);
  document.body.style.overflow = 'hidden';
}

function cerrarAuthPanel() {
  document.getElementById('auth-panel')?.classList.remove('activo');
  const overlay = document.getElementById('auth-overlay');
  if (!document.getElementById('usuario-panel')?.classList.contains('activo')) {
    overlay?.classList.remove('activo');
    document.body.style.overflow = '';
  }
  limpiarMensajes();
}

function cambiarTab(tab) {
  const tabLogin = document.getElementById('tab-login');
  const tabReg = document.getElementById('tab-registro');
  const formLogin = document.getElementById('form-login');
  const formReg = document.getElementById('form-registro');

  if (tab === 'login') {
    tabLogin?.classList.add('activo');
    tabReg?.classList.remove('activo');
    if (formLogin) formLogin.style.display = 'flex';
    if (formReg) formReg.style.display = 'none';
  } else {
    tabReg?.classList.add('activo');
    tabLogin?.classList.remove('activo');
    if (formReg) formReg.style.display = 'flex';
    if (formLogin) formLogin.style.display = 'none';
  }
  limpiarMensajes();
}

/* ── Usuario Panel (logueado) ────────────── */
function abrirUsuarioPanel() {
  if (!usuarioActual) return;
  const nombre = usuarioActual.user_metadata?.nombre || usuarioActual.email?.split('@')[0] || 'Usuario';
  const email = usuarioActual.email;

  const panelNombre = document.getElementById('panel-nombre');
  const panelEmail = document.getElementById('panel-email');
  const panelAvatar = document.getElementById('panel-avatar');

  if (panelNombre) panelNombre.textContent = nombre;
  if (panelEmail) panelEmail.textContent = email;
  if (panelAvatar) panelAvatar.textContent = nombre.charAt(0).toUpperCase();

  document.getElementById('auth-overlay')?.classList.add('activo');
  document.getElementById('usuario-panel')?.classList.add('activo');
  document.body.style.overflow = 'hidden';
}

function cerrarUsuarioPanel() {
  document.getElementById('usuario-panel')?.classList.remove('activo');
  const overlay = document.getElementById('auth-overlay');
  if (!document.getElementById('auth-panel')?.classList.contains('activo')) {
    overlay?.classList.remove('activo');
    document.body.style.overflow = '';
  }
}

function cerrarTodosPaneles() {
  cerrarAuthPanel();
  cerrarUsuarioPanel();
  document.getElementById('auth-overlay')?.classList.remove('activo');
  document.body.style.overflow = '';
}

/* ── Formularios ─────────────────────────── */
async function manejarLogin(e) {
  e.preventDefault();
  if (!db) { mostrarMsg('msg-login', 'Error de conexión. Intenta más tarde.', 'error'); return; }

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('btn-login-submit');

  setLoading(btn, true, 'Iniciando sesión...');
  try {
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) mostrarMsg('msg-login', traducirError(error.message), 'error');
  } catch(e) {
    mostrarMsg('msg-login', 'Error de conexión. Intenta más tarde.', 'error');
  }
  setLoading(btn, false, 'Iniciar sesión');
}

async function manejarRegistro(e) {
  e.preventDefault();
  if (!db) { mostrarMsg('msg-registro', 'Error de conexión. Intenta más tarde.', 'error'); return; }

  const nombre = document.getElementById('reg-nombre').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const btn = document.getElementById('btn-registro-submit');

  if (password.length < 6) {
    mostrarMsg('msg-registro', 'La contraseña debe tener al menos 6 caracteres', 'error');
    return;
  }
  if (!nombre) {
    mostrarMsg('msg-registro', 'Ingresa tu nombre completo', 'error');
    return;
  }

  setLoading(btn, true, 'Creando cuenta...');
  try {
    const { data, error } = await db.auth.signUp({
      email, password,
      options: { data: { nombre } }
    });
    if (error) {
      mostrarMsg('msg-registro', traducirError(error.message), 'error');
    } else if (data.user && !data.session) {
      mostrarMsg('msg-registro', '✓ Revisa tu email para confirmar tu cuenta', 'exito');
      document.getElementById('form-registro').reset();
    }
  } catch(e) {
    mostrarMsg('msg-registro', 'Error de conexión. Intenta más tarde.', 'error');
  }
  setLoading(btn, false, 'Crear cuenta');
}

async function logout() {
  cerrarUsuarioPanel();
  if (db) await db.auth.signOut();
}

/* ── Helpers ─────────────────────────────── */
function setLoading(btn, loading, texto) {
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = texto;
}

function mostrarMsg(id, msg, tipo) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = `auth-msg auth-msg-${tipo}`;
  el.style.display = 'block';
}

function limpiarMensajes() {
  ['msg-login', 'msg-registro'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.display = 'none'; el.textContent = ''; }
  });
}

function traducirError(msg) {
  if (msg.includes('Invalid login') || msg.includes('invalid_credentials')) return 'Email o contraseña incorrectos';
  if (msg.includes('Email not confirmed')) return 'Confirma tu email antes de ingresar';
  if (msg.includes('User already registered')) return 'Este email ya está registrado';
  if (msg.includes('Password should')) return 'La contraseña debe tener al menos 6 caracteres';
  if (msg.includes('Unable to validate')) return 'Email inválido';
  return 'Ocurrió un error, intenta de nuevo';
}

function mostrarToastAuth(msg) {
  let toast = document.getElementById('toast-auth');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-auth';
    toast.className = 'toast-carrito';
    toast.innerHTML = `<span>✓</span> <span id="toast-auth-msg"></span>`;
    document.body.appendChild(toast);
  }
  document.getElementById('toast-auth-msg').textContent = msg;
  toast.classList.add('activo');
  setTimeout(() => toast.classList.remove('activo'), 2800);
}
