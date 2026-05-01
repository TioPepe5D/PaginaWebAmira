const { createClient } = require('@supabase/supabase-js');
const productos = require('../js/products.js');

// Catálogo de precios en el servidor
const porId = new Map(productos.map(p => [String(p.id), p]));

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { items: itemsInput, estado, datosEnvio, userToken } = req.body || {};

  if (!Array.isArray(itemsInput) || !itemsInput.length || !estado) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) {
    return res.status(500).json({ error: 'Configuración del servidor incompleta' });
  }

  const supabaseAdmin = createClient(process.env.SUPABASE_URL, serviceKey);

  // Autenticación opcional
  let userId = null;
  if (userToken) {
    try {
      const { data: { user } } = await supabaseAdmin.auth.getUser(userToken);
      if (user?.id) userId = user.id;
    } catch (_) {}
  }

  // ── Validar precios SERVER-SIDE ──
  const itemsValidados = [];
  for (const it of itemsInput) {
    const p = porId.get(String(it.id));
    if (!p) return res.status(400).json({ error: `Producto no encontrado: ${it.id}` });
    const qty = Math.max(1, Math.min(99, parseInt(it.quantity ?? it.cantidad, 10) || 0));
    itemsValidados.push({
      id:       String(p.id),
      nombre:   p.nombre,
      cantidad: qty,
      precio:   Number(p.precio),
      imagen:   p.imagen || ""
    });
  }

  const subtotal = itemsValidados.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const comision = Math.round(subtotal * 0.05);
  const total    = subtotal + comision;

  const payload = { items: itemsValidados, total, estado };
  if (userId)     payload.user_id     = userId;
  if (datosEnvio) payload.datos_envio = datosEnvio;

  const { data: pedido, error } = await supabaseAdmin
    .from('pedidos')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    console.error('[guardar-pedido] Error Supabase:', error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ id: pedido.id });
};
