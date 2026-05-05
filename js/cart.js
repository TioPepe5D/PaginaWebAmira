let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

function guardarCarrito() {
  localStorage.setItem("carrito", JSON.stringify(carrito));
}

function inicializarCarrito() {
  actualizarContador();
  renderizarCarrito();

  document.getElementById("carrito-btn").addEventListener("click", abrirCarrito);
  document.getElementById("carrito-cerrar").addEventListener("click", cerrarCarrito);
  document.getElementById("carrito-overlay").addEventListener("click", cerrarCarrito);

  // El botón sidebar ahora es un enlace a carrito.html — no necesita listener
}

function agregarAlCarrito(id) {
  const producto = productos.find(p => p.id === id);
  const existente = carrito.find(p => p.id === id);

  if (existente) {
    existente.cantidad++;
  } else {
    carrito.push({ ...producto, cantidad: 1 });
  }

  guardarCarrito();
  actualizarContador();
  renderizarCarrito();
  if (typeof renderizarProductos === "function") renderizarProductos();
  mostrarToast(producto.nombre);
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
  renderizarCarrito();
  if (typeof renderizarProductos === "function") renderizarProductos();
}

function eliminarDelCarrito(id) {
  carrito = carrito.filter(p => String(p.id) !== String(id));
  guardarCarrito();
  actualizarContador();
  renderizarCarrito();
  if (typeof renderizarProductos === "function") renderizarProductos();
}

function renderizarCarrito() {
  const contenedor = document.getElementById("carrito-items");
  const totalEl = document.getElementById("carrito-total");
  const badge = document.getElementById("carrito-header-badge");

  const totalItems = carrito.reduce((s, i) => s + i.cantidad, 0);
  if (badge) badge.textContent = totalItems;

  if (carrito.length === 0) {
    contenedor.innerHTML = "<p class='carrito-vacio'>Tu carrito está vacío</p>";
    if (totalEl) totalEl.textContent = "$0 CLP";
    return;
  }

  contenedor.innerHTML = carrito.map(item => `
    <div class="carrito-item">
      <img src="${item.imagen}" alt="${item.nombre}">
      <div class="carrito-item-info">
        <p class="carrito-item-nombre">${item.nombre}</p>
        <p class="carrito-item-categoria">${item.categoria}</p>
        <p class="carrito-item-precio">$${item.precio.toLocaleString("es-CL")}</p>
        <div class="cantidad-selector">
          <button onclick="cambiarCantidad(${item.id}, -1)">−</button>
          <span class="cantidad-valor">${item.cantidad}</span>
          <button onclick="cambiarCantidad(${item.id}, 1)">+</button>
        </div>
      </div>
      <button class="carrito-item-eliminar" onclick="eliminarDelCarrito(${item.id})" title="Eliminar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6"/><path d="M14 11v6"/>
          <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    </div>
  `).join("");

  const subtotal = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const comision = Math.round(subtotal * 0.05);
  const total = subtotal + comision;

  const desglose = document.getElementById("carrito-desglose");
  if (desglose) {
    desglose.innerHTML = `
      <div class="carrito-desglose-row">
        <span>Subtotal</span>
        <span>$${subtotal.toLocaleString("es-CL")} CLP</span>
      </div>
      <div class="carrito-desglose-row">
        <span style="font-size:0.7rem">Comisión Bancaria impuesto (5%)</span>
        <span>$${comision.toLocaleString("es-CL")} CLP</span>
      </div>
    `;
  }

  if (totalEl) totalEl.textContent = "$" + total.toLocaleString("es-CL") + " CLP";
}

function abrirCarrito() {
  document.getElementById("carrito-panel").classList.add("activo");
  document.getElementById("carrito-overlay").classList.add("activo");
}

function cerrarCarrito() {
  document.getElementById("carrito-panel").classList.remove("activo");
  document.getElementById("carrito-overlay").classList.remove("activo");
}

function actualizarContador() {
  const total = carrito.reduce((s, i) => s + i.cantidad, 0);
  const contador = document.getElementById("carrito-contador");
  if (!contador) return;
  contador.textContent = total;
  contador.classList.remove("pulse");
  void contador.offsetWidth;
  contador.classList.add("pulse");
}

function mostrarToast(nombre) {
  let toast = document.getElementById("toast-carrito");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast-carrito";
    toast.className = "toast-carrito";
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span>✓</span> ${nombre} agregado`;
  toast.classList.remove("activo");
  void toast.offsetWidth;
  toast.classList.add("activo");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("activo"), 2200);
}
