document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("productos-grid")) inicializarCatalogo();
  inicializarCarrito();
  inicializarAnimaciones();
  inicializarBuscador();
  if (typeof initAuth === "function") initAuth();
});

function inicializarBuscador() {
  const btn = document.getElementById("buscar-btn");
  const overlay = document.getElementById("buscador-overlay");
  const cerrar = document.getElementById("buscador-cerrar");
  const input = document.getElementById("buscador-input");

  if (!btn || !overlay) return;

  btn.addEventListener("click", () => {
    overlay.classList.add("activo");
    input.focus();
  });

  cerrar.addEventListener("click", () => {
    overlay.classList.remove("activo");
    input.value = "";
    const filtroNombre = document.getElementById("filtro-nombre");
    if (filtroNombre) { filtroNombre.value = ""; renderizarProductos(); }
  });

  input.addEventListener("input", () => {
    const filtroNombre = document.getElementById("filtro-nombre");
    if (!filtroNombre) return;
    filtroNombre.value = input.value;
    renderizarProductos();
    if (input.value.trim()) {
      document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      overlay.classList.remove("activo");
      input.value = "";
      const filtroNombre = document.getElementById("filtro-nombre");
      if (filtroNombre) { filtroNombre.value = ""; renderizarProductos(); }
    }
  });
}
