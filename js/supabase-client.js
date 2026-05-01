/* =============================================
   SUPABASE CLIENT — Joyería Aravena
   ============================================= */
const SUPA_URL = 'https://qcaxddxxmrwfihnyepbo.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjYXhkZHh4bXJ3ZmlobnllcGJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MzE5NDgsImV4cCI6MjA5MjQwNzk0OH0.0WtrOUK3_SDCkpVBTPg_aMz8rUk1sJ_ms6Ak5p5Xi08';

let db = null;
try {
  const supa = window.supabase || window.Supabase;
  if (supa && supa.createClient) {
    db = supa.createClient(SUPA_URL, SUPA_KEY);
  } else {
    console.warn('[Auth] Supabase CDN no cargó correctamente');
  }
} catch (e) {
  console.error('[Auth] Error al inicializar Supabase:', e);
}
