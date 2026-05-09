const crypto = require("crypto");
const { MercadoPagoConfig, Payment, MerchantOrder } = require("mercadopago");
const { createClient } = require("@supabase/supabase-js");

/* ── Helper: notificación WhatsApp via CallMeBot ── */
async function enviarNotifWhatsApp({ tipo, pedidoId, total, items, email }) {
  const apiKey = process.env.CALLMEBOT_APIKEY;
  const phone  = process.env.NOTIF_PHONE || "56994813489";
  if (!apiKey) return;

  const emoji  = tipo === "transferencia" ? "🏦" : "💳";
  const metodo = tipo === "transferencia"
    ? "Transferencia Bancaria (pendiente)"
    : "MercadoPago ✅";

  const resumen = Array.isArray(items) && items.length
    ? items.map(i => `• ${i.nombre} x${i.cantidad}`).join("\n")
    : "Sin detalle";

  const mensaje =
    `🔔 NUEVO PEDIDO — Ammira Store\n\n` +
    `${emoji} Método: ${metodo}\n` +
    `📦 ID: ${pedidoId || "N/A"}\n` +
    `💰 Total: $${Number(total).toLocaleString("es-CL")} CLP\n` +
    `👤 Cliente: ${email || "N/A"}\n\n` +
    `Productos:\n${resumen}`;

  const url =
    `https://api.callmebot.com/whatsapp.php` +
    `?phone=${phone}` +
    `&text=${encodeURIComponent(mensaje)}` +
    `&apikey=${apiKey}`;

  try {
    const resp = await fetch(url);
    console.log("[Notif] WhatsApp enviado:", resp.status);
  } catch (e) {
    console.warn("[Notif] Error CallMeBot:", e.message);
  }
}

/* ── Validación de firma MP ──
   Ver: https://www.mercadopago.cl/developers/es/docs/your-integrations/notifications/webhooks
   MP firma con HMAC-SHA256 sobre: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
*/
function validarFirmaMP({ headers, dataId }) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return { ok: true, motivo: "sin-secret-configurado" };

  const xSignature = headers["x-signature"];
  const xRequestId = headers["x-request-id"];
  if (!xSignature || !xRequestId) return { ok: false, motivo: "headers-faltantes" };

  // x-signature viene como "ts=1234567890,v1=hashvalue"
  const partes = Object.fromEntries(
    String(xSignature).split(",").map(p => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    })
  );
  const ts   = partes.ts;
  const hash = partes.v1;
  if (!ts || !hash) return { ok: false, motivo: "firma-malformada" };

  // Reject timestamps older than 10 min (anti-replay)
  const ahora = Math.floor(Date.now() / 1000);
  if (Math.abs(ahora - Number(ts)) > 600) return { ok: false, motivo: "timestamp-viejo" };

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const esperado = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  const ok = crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(esperado));
  return { ok, motivo: ok ? "ok" : "hash-no-coincide" };
}

/* ── Helper: extraer tipo + id del webhook (POST o GET legacy) ── */
function parseEvento(req) {
  const body  = req.body || {};
  const query = req.query || {};

  const tipo = body.type || body.topic || query.type || query.topic || null;
  const id =
    body.data?.id ||
    body.id ||
    query["data.id"] ||
    query.id ||
    null;

  return { tipo, id: id ? String(id) : null };
}

/* ── Procesar pago aprobado/rechazado ── */
async function procesarPayment({ paymentId, supabase, mpClient, requestId }) {
  const paymentApi = new Payment(mpClient);
  const pago = await paymentApi.get({ id: paymentId });

  const mpStatus = pago.status;
  const pedidoId = pago.external_reference;

  console.log(`[Webhook MP][${requestId}] Payment ${paymentId} status=${mpStatus} pedido=${pedidoId}`);

  if (!pedidoId) return { ok: false, motivo: "sin-external-reference" };

  // Mapear estado MP → nuestro sistema
  let estado;
  if (mpStatus === "approved")                                   estado = "pagado";
  else if (mpStatus === "rejected" || mpStatus === "cancelled")  estado = "fallido";
  else                                                           estado = "pendiente";

  // Idempotencia: leer estado actual antes de actualizar
  const { data: pedidoActual } = await supabase
    .from("pedidos")
    .select("estado, total, items")
    .eq("id", pedidoId)
    .single();

  if (!pedidoActual) {
    console.warn(`[Webhook MP][${requestId}] Pedido ${pedidoId} no existe`);
    return { ok: false, motivo: "pedido-no-existe" };
  }

  const yaEstabaPagado = pedidoActual.estado === "pagado";

  // Solo actualizar si cambia el estado
  if (pedidoActual.estado !== estado) {
    const { error } = await supabase
      .from("pedidos")
      .update({ estado, mp_payment_id: String(paymentId) })
      .eq("id", pedidoId);

    if (error) {
      console.error(`[Webhook MP][${requestId}] Error Supabase:`, error);
      return { ok: false, motivo: "error-supabase" };
    }
    console.log(`[Webhook MP][${requestId}] Pedido ${pedidoId} → ${estado}`);
  } else {
    console.log(`[Webhook MP][${requestId}] Pedido ${pedidoId} ya estaba en ${estado} (idempotente)`);
  }

  // Notificar SOLO en la primera transición a "pagado"
  if (estado === "pagado" && !yaEstabaPagado) {
    await enviarNotifWhatsApp({
      tipo:     "mercadopago",
      pedidoId,
      total:    pedidoActual.total ?? pago.transaction_amount ?? 0,
      items:    pedidoActual.items ?? [],
      email:    pago.payer?.email || "N/A"
    });
  }

  return { ok: true, estado, pedidoId };
}

/* ── Procesar merchant_order (Checkout Pro) ── */
async function procesarMerchantOrder({ orderId, supabase, mpClient, requestId }) {
  const moApi = new MerchantOrder(mpClient);
  const orden = await moApi.get({ merchantOrderId: orderId });

  const pedidoId = orden.external_reference;
  const pagos    = Array.isArray(orden.payments) ? orden.payments : [];
  const aprobado = pagos.find(p => p.status === "approved");

  console.log(`[Webhook MP][${requestId}] MerchantOrder ${orderId} pedido=${pedidoId} pagos=${pagos.length} aprobado=${!!aprobado}`);

  if (!aprobado) return { ok: true, motivo: "sin-pago-aprobado" };

  // Reusar lógica de payment para evitar duplicación
  return procesarPayment({
    paymentId: aprobado.id,
    supabase,
    mpClient,
    requestId
  });
}

module.exports = async (req, res) => {
  const requestId = req.headers["x-request-id"] || `local-${Date.now()}`;

  // Headers CORS / aceptar cualquier preflight
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, HEAD");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-signature, x-request-id");

  // OPTIONS / HEAD → 200 OK sin procesar (algunos clientes hacen preflight)
  if (req.method === "OPTIONS" || req.method === "HEAD") {
    return res.status(200).end();
  }

  try {
    // GET con query string vacío = ping de validación de MP al registrar URL
    if (req.method === "GET" && !req.query?.id && !req.query?.["data.id"] && !req.query?.topic && !req.query?.type) {
      return res.status(200).send("OK");
    }

    // Cualquier otro método raro → 200 OK (no romper el test de MP)
    if (req.method !== "POST" && req.method !== "GET") {
      console.log(`[Webhook MP][${requestId}] Método no estándar: ${req.method}`);
      return res.status(200).send("OK");
    }

    const { tipo, id } = parseEvento(req);
    console.log(`[Webhook MP][${requestId}] ${req.method} tipo=${tipo} id=${id}`);

    if (!tipo || !id) {
      console.warn(`[Webhook MP][${requestId}] Evento sin tipo/id, ignorado`);
      return res.status(200).send("OK");
    }

    // Validar firma SOLO en POST (los GET legacy no traen firma)
    if (req.method === "POST") {
      const firma = validarFirmaMP({ headers: req.headers, dataId: id });
      // Si no hay headers de firma (test panel MP, IPN legacy) → continuar.
      // La validación real ocurre cuando llamamos a paymentApi.get() con MP_ACCESS_TOKEN:
      // si el paymentId es falso, MP devuelve error y no actualizamos nada.
      // Si en cambio HAY firma pero es inválida (hash no coincide, ts viejo, malformada)
      // → rechazar con 401 porque es un intento deliberado de spoofing.
      const motivosBenignos = ["sin-secret-configurado", "headers-faltantes"];
      if (!firma.ok && !motivosBenignos.includes(firma.motivo)) {
        console.warn(`[Webhook MP][${requestId}] Firma inválida: ${firma.motivo}`);
        return res.status(401).send("Invalid signature");
      }
      if (firma.motivo === "headers-faltantes") {
        console.warn(`[Webhook MP][${requestId}] Sin firma (test panel/legacy); validando vía MP API`);
      }
    }

    if (!process.env.MP_ACCESS_TOKEN) {
      console.error(`[Webhook MP][${requestId}] Falta MP_ACCESS_TOKEN`);
      return res.status(200).send("OK"); // 200 para que MP no reintente eternamente
    }
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      console.error(`[Webhook MP][${requestId}] Faltan vars Supabase`);
      return res.status(200).send("OK");
    }

    const mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    if (tipo === "payment") {
      await procesarPayment({ paymentId: id, supabase, mpClient, requestId });
    } else if (tipo === "merchant_order") {
      await procesarMerchantOrder({ orderId: id, supabase, mpClient, requestId });
    } else {
      console.log(`[Webhook MP][${requestId}] Tipo "${tipo}" no manejado`);
    }

    return res.status(200).send("OK");

  } catch (err) {
    // Siempre 200 → MP no reintenta indefinidamente
    console.error(`[Webhook MP][${requestId}] Error:`, err.message, err.stack);
    return res.status(200).send("OK");
  }
};
