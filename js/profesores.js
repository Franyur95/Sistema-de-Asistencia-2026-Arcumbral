let editandoId = null, cache = [];

document.addEventListener('DOMContentLoaded', async () => {
  await iniciarPagina(['admin']);
  $('profForm').onsubmit = guardar;
  $('cancelarBtn').onclick = limpiarForm;
  $('listaProfesores').onclick = async e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.edit) editar(b.dataset.edit);
    if (b.dataset.del) eliminar(b.dataset.del);
    if (b.dataset.reset && confirm('¿Reiniciar la contraseña? Pasará a ser su DNI.')) {
      try { await DB.resetClave('profesores', b.dataset.reset); alert('Listo: su clave ahora es su DNI y deberá cambiarla.'); }
      catch (err) { alert(err.message); }
    }
  };
  listar();
});

async function guardar(ev) {
  ev.preventDefault();
  const dni = $('dni').value.trim(), nombre = $('nombre').value.trim(), email = $('email').value.trim();
  if (!/^\d{6,9}$/.test(dni)) return alert('El DNI debe tener entre 6 y 9 números.');
  if (!nombre) return alert('Completa el nombre.');
  try { await DB.guardar('profesores', { dni, nombre, email }, editandoId); }
  catch (e) { return alert(e.message); }
  limpiarForm();
  listar();
}

function editar(id) {
  const p = cache.find(x => String(x.id) === String(id));
  if (!p) return;
  editandoId = id;
  $('dni').value = p.dni; $('nombre').value = p.nombre; $('email').value = p.email;
  $('tituloForm').textContent = 'Editar profesor';
  $('guardarBtn').textContent = 'Guardar cambios';
  $('cancelarBtn').style.display = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function eliminar(id) {
  if (!confirm('¿Eliminar este profesor? También se borra su usuario.')) return;
  try { await DB.eliminar('profesores', id); }
  catch (e) { return alert('No se puede eliminar: el profesor tiene materias asignadas.'); }
  listar();
}

function limpiarForm() {
  editandoId = null;
  $('profForm').reset();
  $('tituloForm').textContent = 'Nuevo profesor';
  $('guardarBtn').textContent = 'Guardar profesor';
  $('cancelarBtn').style.display = 'none';
}

async function listar() {
  const [profes, materias] = await Promise.all([DB.listar('profesores'), DB.listar('materias')]);
  profes.sort((a, b) => a.nombre.localeCompare(b.nombre));
  cache = profes;
  $('listaProfesores').innerHTML = profes.length ? profes.map(p => {
    const mias = materias.filter(m => String(m.profesor_id) === String(p.id));
    const detalle = mias.length ? mias.map(m => esc(m.nombre)).join(', ') : 'sin materias asignadas';
    return `
    <div class="item">
      <div><strong>${esc(p.nombre)}</strong> · DNI ${esc(p.dni)}<br><small>${esc(p.email)} • ${detalle}</small></div>
      <div><button data-edit="${esc(p.id)}">Editar</button>
      <button class="btn-gris" data-reset="${esc(p.id)}">Reiniciar clave</button>
      <button class="btn-rojo" data-del="${esc(p.id)}">Eliminar</button></div>
    </div>`;
  }).join('') : '<p>No hay profesores cargados.</p>';
}