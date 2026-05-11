const { MercadoPagoConfig, Payment } = require("mercadopago");
const { createClient } = require("@supabase/supabase-js");

const ADMIN_EMAILS = ['Valentina.belen1905@gmail.com'];

const SUPA_URL  = 'https://qcaxddxxmrwfihnyepbo.supabase.co';
const SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjYXhkZHh4bXJ3ZmlobnllcGJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MzE5NDgsImV4cCI6MjA5MjQwNzk0OH0.0WtrOUK3_SDCkpVBTPg_aMz8rUk1sJ_ms6Ak5p5Xi08';

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { adminToken, limit, estado } = req.body || {};

  // ── Verificar que el token pertenece a un admin ──
  const supabaseAuth = createClient(SUPA_URL, SUPA_ANON);
  let adminEmail = null;
  try {
    const { data: { user }, error } = await supabaseAuth.auth.getUser(adminToken);
    if (error || !user) return res.status(401).json({ error: "Token inválido" });
    adminEmail = user.email;
  } catch (e) {
    return res.status(401).json({ error: "Error de autenticación" });
  }
  if (!ADMIN_EMAILS.includes(adminEmail)) {
    return res.status(403).json({ error: "No autorizado" });
  }

  if (!process.env.MP_ACCESS_TOKEN) {
    return res.status(500).json({ error: "MP_ACCESS_TOKEN no configurado" });
  }

  const lim = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));

  try {
    const client     = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const paymentApi  = new Payment(client);

    const options = { sort: "date_created", criteria: "desc", limit: lim, offset: 0 };
    if (estado && estado !== "todos") options.status = String(estado);

    const data = await paymentApi.search({ options });
    const results = Array.isArray(data?.results) ? data.results : [];

    const pagos = results.map(p => ({
      id:                p.id,
      estado:            p.status,
      detalleEstado:     p.status_detail,
      monto:             p.transaction_amount,
      montoNeto:         p.transaction_details?.net_received_amount ?? null,
      moneda:            p.currency_id,
      metodo:            p.payment_method_id,
      tipoMetodo:        p.payment_type_id,
      descripcion:       p.description,
      email:             p.payer?.email || null,
      pedidoId:          p.external_reference || null,
      fechaCreado:       p.date_created,
      fechaAprobado:     p.date_approved,
    }));

    return res.status(200).json({
      total: data?.paging?.total ?? pagos.length,
      pagos
    });
  } catch (err) {
    console.error("[mp-pagos] Error MP:", err.message);
    return res.status(500).json({ error: "Error consultando MercadoPago", detail: err.message });
  }
};
