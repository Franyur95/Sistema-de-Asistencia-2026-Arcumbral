// db.js - cliente de la API (reemplaza al localStorage)
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function hoy() { return new Date().toLocaleDateString('sv-SE'); } // YYYY-MM-DD

// Si pasás "datos" hace POST con JSON; si no, GET
async function api(url, datos) {
  const opts = { credentials: 'same-origin' };
  if (datos !== undefined) {
    opts.method = 'POST';
    opts.headers = { 'Content-Type': 'application/json' };
    opts.body = JSON.stringify(datos);
  }
  const r = await fetch(url, opts);
  let j = {};
  try { j = await r.json(); } catch (e) {}
  if (r.status === 401 && !location.pathname.endsWith('login.html')) { location.href = 'login.html'; throw new Error('Sesión vencida'); }
  if (!r.ok) throw new Error(j.error || 'Error del servidor');
  return j;
}

const DB = {
  listar:    t => api('api/crud.php?t=' + t),
  guardar:   (t, data, pk) => api('api/crud.php?t=' + t, { accion: 'guardar', pk: pk ?? null, data }),
  eliminar:  (t, pk) => api('api/crud.php?t=' + t, { accion: 'eliminar', pk }),
  resetClave:(t, pk) => api('api/crud.php?t=' + t, { accion: 'reset_clave', pk })
};

function etiquetaCurso(c) { return c ? `${c.anio}° ${c.division} - ${c.carrera}` : 'Sin curso'; }

const MENU = [
  ['index.html', 'Inicio', ['admin', 'profesor', 'alumno']],
  ['cursos.html', 'Cursos', ['admin']],
  ['profesores.html', 'Profesores', ['admin']],
  ['materias.html', 'Materias', ['admin']],
  ['registro.html', 'Alumnos', ['admin']],
  ['asistencia.html', 'Tomar asistencia', ['admin', 'profesor']],
  ['historial.html', 'Historial', ['admin', 'profesor']],
  ['alumno.html', 'Mi asistencia', ['alumno']],
  ['ajustes.html', 'Ajustes', ['admin']]
];

// Se llama al inicio de cada página: valida sesión/rol y arma el menú
async function iniciarPagina(roles) {
  const { usuario } = await api('api/auth.php?accion=me');
  if (usuario.cambiar_clave) { location.href = 'login.html'; throw new Error('Cambiá tu clave'); }
  if (!roles.includes(usuario.rol)) { location.href = 'index.html'; throw new Error('Sin permiso'); }
  const nav = $('nav');
  if (nav) {
    nav.innerHTML = MENU.filter(m => m[2].includes(usuario.rol)).map(m => `<a href="${m[0]}">${m[1]}</a>`).join('') +
      `<a href="#" id="salir">Salir (${esc(usuario.usuario)})</a>`;
    $('salir').onclick = async e => { e.preventDefault(); await api('api/auth.php?accion=logout', {}); location.href = 'login.html'; };
  }
  return usuario;
}

function beep() {
  try {
    const c = new (window.AudioContext || window.webkitAudioContext)();
    const o = c.createOscillator();
    o.connect(c.destination); o.frequency.value = 880; o.start();
    setTimeout(() => { o.stop(); c.close(); }, 150);
  } catch (e) {}
}