/* =============================================
   SUPABASE CLIENT — Ammira Store
   ============================================= */
const SUPA_URL = 'https://jgtavepljzcwwagdihgx.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpndGF2ZXBsanpjd3dhZ2RpaGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MDMwOTcsImV4cCI6MjA5MzE3OTA5N30.wi2-xPIXWYKrxI5LBwGCkuNaAYybqnCLshwsUBe_PEk';

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
