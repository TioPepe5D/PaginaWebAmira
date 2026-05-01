const { MercadoPagoConfig, Preference } = require("mercadopago");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN
  });

  let items, pedidoId;
  try {
    ({ items, pedidoId } = JSON.parse(event.body));
    if (!Array.isArray(items) || items.length === 0) throw new Error();
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Items inválidos" }) };
  }

  const siteUrl = process.env.SITE_URL || process.env.URL;
  const netlifyUrl = process.env.URL;

  try {
    const preference = new Preference(client);
    const response = await preference.create({
      body: {
        items: items.map(i => ({
          id: i.id,
          title: i.title,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
          currency_id: "CLP"
        })),
        back_urls: {
          success: `${siteUrl}/carrito.html?pago=ok`,
          failure: `${siteUrl}/carrito.html?pago=error`,
          pending: `${siteUrl}/carrito.html?pago=pendiente`
        },
        auto_return: "approved",
        statement_descriptor: "Joyería Aravena",
        // ID del pedido → MP lo incluye en el webhook para que sepamos cuál actualizar
        external_reference: pedidoId || "",
        // URL que MP llama automáticamente cuando el pago cambia de estado
        notification_url: `${netlifyUrl}/.netlify/functions/mp-webhook`
      }
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ init_point: response.init_point })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error al crear preferencia", detail: err.message })
    };
  }
};
