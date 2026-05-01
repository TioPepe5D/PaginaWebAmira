const { createClient } = require('@supabase/supabase-js');

const ADMIN_EMAILS = ['diegoaravenavera@gmail.com'];

const SUPA_URL     = 'https://qcaxddxxmrwfihnyepbo.supabase.co';
const SUPA_ANON    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjYXhkZHh4bXJ3ZmlobnllcGJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MzE5NDgsImV4cCI6MjA5MjQwNzk0OH0.0WtrOUK3_SDCkpVBTPg_aMz8rUk1sJ_ms6Ak5p5Xi08';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { pedidoId, adminToken } = req.body || {};

  if (!pedidoId) {
    return res.status(400).json({ error: 'Falta pedidoId' });
  }

  // Verificar que el token pertenece a un admin
  const supabaseAuth = createClient(SUPA_URL, SUPA_ANON);
  let adminEmail = null;
  try {
    const { data: { user }, error } = await supabaseAuth.auth.getUser(adminToken);
    if (error || !user) return res.status(401).json({ error: 'Token inválido' });
    adminEmail = user.email;
  } catch (e) {
    return res.status(401).json({ error: 'Error de autenticación' });
  }

  if (!ADMIN_EMAILS.includes(adminEmail)) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  // Usar service role key para bypass RLS
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) {
    return res.status(500).json({ error: 'Service key no configurada' });
  }

  const supabaseAdmin = createClient(SUPA_URL, serviceKey);

  const { error } = await supabaseAdmin
    .from('pedidos')
    .delete()
    .eq('id', pedidoId);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ ok: true });
};
