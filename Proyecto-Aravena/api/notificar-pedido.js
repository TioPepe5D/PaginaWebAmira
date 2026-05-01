/**
 * POST /api/notificar-pedido
 * Envía una notificación WhatsApp al dueño de la tienda via CallMeBot.
 *
 * Body esperado:
 *  { tipo, pedidoId, total, items: [{nombre, cantidad}], email }
 *
 * Variables de entorno requeridas:
 *  CALLMEBOT_APIKEY  → clave que entrega CallMeBot al activar el servicio
 *  NOTIF_PHONE       → número destino con código de país, sin + (ej: 56966497904)
 */
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const apiKey = process.env.CALLMEBOT_APIKEY;
  const phone  = process.env.NOTIF_PHONE || "56966497904";

  if (!apiKey) {
    console.warn("[Notif] CALLMEBOT_APIKEY no configurado — notificación omitida");
    return res.status(200).json({ ok: false, msg: "API key no configurada" });
  }

  const { tipo, pedidoId, total, items, email } = req.body || {};

  const emoji   = tipo === "transferencia" ? "🏦" : "💳";
  const metodo  = tipo === "transferencia"
    ? "Transferencia Bancaria (pendiente confirmación)"
    : "MercadoPago ✅";

  const resumenItems = Array.isArray(items) && items.length
    ? items.map(i => `• ${i.nombre} x${i.cantidad}`).join("\n")
    : "Sin detalle";

  const totalFormato = Number(total).toLocaleString("es-CL");

  const mensaje =
    `🔔 NUEVO PEDIDO — Joyería Aravena\n\n` +
    `${emoji} Método: ${metodo}\n` +
    `📦 ID: ${pedidoId || "N/A"}\n` +
    `💰 Total: $${totalFormato} CLP\n` +
    `👤 Cliente: ${email || "N/A"}\n\n` +
    `Productos:\n${resumenItems}`;

  try {
    const url =
      `https://api.callmebot.com/whatsapp.php` +
      `?phone=${phone}` +
      `&text=${encodeURIComponent(mensaje)}` +
      `&apikey=${apiKey}`;

    const resp = await fetch(url);
    const text = await resp.text();
    console.log("[Notif] CallMeBot:", resp.status, text.slice(0, 120));

    return res.status(200).json({ ok: resp.ok });
  } catch (err) {
    console.error("[Notif] Error al enviar WhatsApp:", err.message);
    return res.status(200).json({ ok: false, error: err.message });
  }
};
