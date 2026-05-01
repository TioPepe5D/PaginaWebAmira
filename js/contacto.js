document.addEventListener("DOMContentLoaded", () => {
  const formulario = document.getElementById("formulario-contacto");
  if (!formulario) return;

  formulario.addEventListener("submit", (e) => {
    e.preventDefault();

    const aviso = document.getElementById("form-aviso");
    aviso.textContent = "Mensaje enviado. Te contactaremos pronto.";
    aviso.style.color = "#2e7d32";
    formulario.reset();

    setTimeout(() => { aviso.textContent = ""; }, 5000);
  });
});
