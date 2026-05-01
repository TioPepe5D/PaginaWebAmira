const { MercadoPagoConfig, Preference } = require("mercadopago");
const { createClient } = require("@supabase/supabase-js");
const productos = require("../js/products.js");

// Catálogo de precios en el servidor — el cliente no puede modificarlo
const porId = new Map(productos.map(p => [String(p.id), p]));

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { items: itemsInput, datosEnvio } = req.body || {};

  if (!Array.isArray(itemsInput) || itemsInput.length === 0) {
    return res.status(400).json({ error: "Items inválidos" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // Autenticación opcional (soporta invitados)
  let userId = null;
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  if (token) {
    try {
      const { data } = await supabase.auth.getUser(token);
      if (data?.user) userId = data.user.id;
    } catch (_) {}
  }

  // ── Validar precios SERVER-SIDE contra el catálogo real ──
  const itemsValidados = [];
  for (const it of itemsInput) {
    const p = porId.get(String(it.id));
    if (!p) {
      return res.status(400).json({ error: `Producto no encontrado: ${it.id}` });
    }
    const qty = Math.max(1, Math.min(99, parseInt(it.quantity, 10) || 0));
    if (qty < 1) {
      return res.status(400).json({ error: `Cantidad inválida para ${p.nombre}` });
    }
    itemsValidados.push({
      id:       String(p.id),
      nombre:   p.nombre,
      cantidad: qty,
      precio:   Number(p.precio),   // ← precio real del servidor
      imagen:   p.imagen || ""
    });
  }

  const subtotal = itemsValidados.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const comision = Math.round(subtotal * 0.05);
  const total    = subtotal + comision;

  // ── Guardar pedido con total verificado ──
  const payload = { items: itemsValidados, total, estado: "pendiente" };
  if (userId)    payload.user_id    = userId;
  if (datosEnvio) payload.datos_envio = datosEnvio;

  const { data: pedido, error: pedidoErr } = await supabase
    .from("pedidos")
    .insert(payload)
    .select("id")
    .single();

  if (pedidoErr || !pedido) {
    console.error("[crear-preferencia] Error guardando pedido:", pedidoErr);
    return res.status(500).json({ error: "No se pudo crear el pedido" });
  }

  // ── Crear preferencia en MercadoPago con precios reales ──
  const siteUrl   = process.env.SITE_URL;
  const vercelUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : siteUrl;

  const mpItems = itemsValidados.map(i => ({
    id:         i.id,
    title:      i.nombre,
    quantity:   i.cantidad,
    unit_price: i.precio,
    currency_id: "CLP"
  }));

  if (comision > 0) {
    mpItems.push({
      id:         "comision-bancaria",
      title:      "Comisión Bancaria",
      quantity:   1,
      unit_price: comision,
      currency_id: "CLP"
    });
  }

  try {
    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const preference = new Preference(client);
    const response = await preference.create({
      body: {
        items: mpItems,
        back_urls: {
          success: `${siteUrl}/pago-exitoso.html`,
          failure: `${siteUrl}/pago-fallido.html`,
          pending: `${siteUrl}/pago-pendiente.html`
        },
        auto_return:          "approved",
        statement_descriptor: "Joyería Aravena",
        external_reference:   String(pedido.id),
        notification_url:     `${vercelUrl}/api/mp-webhook`
      }
    });

    return res.status(200).json({ init_point: response.init_point, pedidoId: pedido.id });

  } catch (err) {
    console.error("[crear-preferencia] Error MP:", err.message);
    return res.status(500).json({ error: "Error al crear preferencia", detail: err.message });
  }
};
