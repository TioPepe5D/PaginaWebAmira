const { MercadoPagoConfig, Payment } = require("mercadopago");
const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  // MercadoPago valida la URL con GET al registrar el webhook
  if (event.httpMethod === "GET") {
    return { statusCode: 200, body: "OK" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    console.log("[Webhook MP] Notificación recibida:", JSON.stringify(body));

    // MP envía distintos tipos de eventos; solo nos interesan los de pago
    const tipo = body.type || body.topic;
    if (tipo !== "payment") {
      return { statusCode: 200, body: "OK" };
    }

    const paymentId = body.data?.id || body.id;
    if (!paymentId) return { statusCode: 200, body: "OK" };

    // Obtener detalles del pago desde MP
    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const paymentApi = new Payment(client);
    const pago = await paymentApi.get({ id: paymentId });

    const mpStatus = pago.status;             // approved, rejected, pending, cancelled, etc.
    const pedidoId  = pago.external_reference; // el ID que guardamos al crear la preferencia

    console.log("[Webhook MP] Payment status:", mpStatus, "| pedidoId:", pedidoId);

    if (!pedidoId) return { statusCode: 200, body: "OK" };

    // Mapear estado de MP a nuestro sistema
    let estado;
    if (mpStatus === "approved")                            estado = "pagado";
    else if (mpStatus === "rejected" || mpStatus === "cancelled") estado = "fallido";
    else                                                    estado = "pendiente";

    // Actualizar en Supabase con la service role key (privilegiada, solo en servidor)
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { error } = await supabase
      .from("pedidos")
      .update({ estado, mp_payment_id: String(paymentId) })
      .eq("id", pedidoId);

    if (error) console.error("[Webhook MP] Error actualizando Supabase:", error);
    else console.log("[Webhook MP] Pedido", pedidoId, "→", estado);

    return { statusCode: 200, body: "OK" };

  } catch (err) {
    // Siempre retornar 200 a MP para que no reintente indefinidamente
    console.error("[Webhook MP] Error:", err.message);
    return { statusCode: 200, body: "OK" };
  }
};
