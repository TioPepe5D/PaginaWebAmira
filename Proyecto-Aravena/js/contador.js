// Lee el carrito de localStorage y actualiza el contador del header
(function () {
  const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
  const total = carrito.reduce((sum, i) => sum + i.cantidad, 0);
  const el = document.getElementById("carrito-contador");
  if (el) el.textContent = total;
})();
