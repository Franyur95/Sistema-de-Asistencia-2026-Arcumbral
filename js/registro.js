let editando = null, cursos = [], estudiantes = [];

document.addEventListener('DOMContentLoaded', async () => {
  await iniciarPagina(['admin']);
  $('carrera').onchange = llenarCursosPorCarrera;
  $('registroForm').onsubmit = registrar;
  $('cancelarBtn').onclick = limpiar;
  $('listaEstudiantes').onclick = async e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.edit) editar(b.dataset.edit);
    if (b.dataset.del) eliminar(b.dataset.del);
    if (b.dataset.reset && confirm('¿Reiniciar contraseña? Pasará a ser su código.')) {
      try { await DB.resetClave('estudiantes', b.dataset.reset); alert('Listo.'); } catch (err) { alert(err.message); }
    }
  };
  await listar();
});

async function registrar(ev) {
  ev.preventDefault();
  const datos = { codigo: $('codigo').value.trim(), nombre: $('nombre').value.trim(),
                  curso_id: $('curso').value, mac: $('mac').value.trim() };
  if (!datos.codigo || !datos.nombre || !datos.curso_id) return alert('Completá código, nombre, carrera y curso.');
  const eraNuevo = !editando;
  try { await DB.guardar('estudiantes', datos, editando); }
  catch (e) { return alert(e.message); }
  const cod = datos.codigo;
  limpiar();
  await listar();
}

function editar(codigo) {
  const e = estudiantes.find(x => String(x.codigo) === String(codigo));
  if (!e) return;
  editando = codigo;
  const c = cursos.find(x => String(x.id) === String(e.curso_id));
  $('codigo').value = e.codigo; $('codigo').readOnly = true;
  $('nombre').value = e.nombre; $('mac').value = e.mac || '';
  $('carrera').value = c ? c.carrera : '';
  llenarCursosPorCarrera();
  $('curso').value = e.curso_id;
  $('tituloForm').textContent = 'Editar alumno';
  $('guardarBtn').textContent = 'Guardar cambios';
  $('cancelarBtn').style.display = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limpiar() {
  editando = null;
  $('registroForm').reset();
  $('codigo').readOnly = false;
  $('tituloForm').textContent = 'Nuevo alumno';
  $('guardarBtn').textContent = 'Registrar alumno';
  $('cancelarBtn').style.display = 'none';
  llenarCursosPorCarrera();
}

async function eliminar(codigo) {
  if (!confirm('¿Eliminar este alumno? Se borran también su usuario y TODAS sus asistencias.')) return;
  try { await DB.eliminar('estudiantes', codigo); } catch (e) { return alert(e.message); }
  listar();
}

function cursoTexto(e) { return etiquetaCurso(cursos.find(c => String(c.id) === String(e.curso_id))); }

async function listar() {
  [cursos, estudiantes] = await Promise.all([DB.listar('cursos'), DB.listar('estudiantes')]);
  const carreras = [...new Set(cursos.map(c => c.carrera))].sort();
  const sel = $('carrera').value;
  $('carrera').innerHTML = '<option value="">Seleccione una carrera</option>' +
    carreras.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  $('carrera').value = sel;
  llenarCursosPorCarrera();
  $('listaEstudiantes').innerHTML = estudiantes.length ? estudiantes.map(e => `
    <div class="item">
      <div><strong>${esc(e.codigo)}</strong> - ${esc(e.nombre)}<br>
      <small>${esc(cursoTexto(e))} • ${e.mac ? '📶 MAC: ' + esc(e.mac) : 'sin MAC registrada'}</small></div>
      <div><button data-edit="${esc(e.codigo)}">Editar</button>
      <button class="btn-gris" data-reset="${esc(e.codigo)}">Reiniciar clave</button>
      <button class="btn-rojo" data-del="${esc(e.codigo)}">Eliminar</button></div>
    </div>`).join('') : '<p>No hay alumnos registrados.</p>';
}

function llenarCursosPorCarrera() {
  const carrera = $('carrera').value;
  const cs = cursos.filter(c => c.carrera === carrera).sort((a, b) => a.anio - b.anio || a.division.localeCompare(b.division));
  $('curso').innerHTML = `<option value="">${carrera ? 'Seleccione un curso' : 'Primero elige la carrera'}</option>` +
    cs.map(c => `<option value="${esc(c.id)}">${c.anio}° ${esc(c.division)}</option>`).join('');
}