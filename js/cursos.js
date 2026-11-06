let editandoId = null, cache = [];

document.addEventListener('DOMContentLoaded', async () => {
  await iniciarPagina(['admin']);
  $('cursoForm').onsubmit = guardar;
  $('cancelarBtn').onclick = limpiarForm;
  $('listaCursos').onclick = e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.edit) editar(b.dataset.edit);
    if (b.dataset.del) eliminar(b.dataset.del);
  };
  listar();
});

async function guardar(ev) {
  ev.preventDefault();
  const anio = Number($('anio').value);
  const division = $('division').value.trim().toUpperCase();
  const carrera = $('carrera').value.trim();
  if (!anio || !division || !carrera) return alert('Completa año, división y carrera.');
  try { await DB.guardar('cursos', { anio, division, carrera }, editandoId); }
  catch (e) { return alert(e.message); }
  limpiarForm();
  listar();
}

function editar(id) {
  const c = cache.find(x => String(x.id) === String(id));
  if (!c) return;
  editandoId = id;
  $('anio').value = c.anio;
  $('division').value = c.division;
  $('carrera').value = c.carrera;
  $('tituloForm').textContent = 'Editar curso';
  $('guardarBtn').textContent = 'Guardar cambios';
  $('cancelarBtn').style.display = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function eliminar(id) {
  if (!confirm('¿Eliminar este curso?')) return;
  try { await DB.eliminar('cursos', id); }
  catch (e) { return alert('No se puede eliminar: tiene materias o alumnos.'); }
  listar();
}

function limpiarForm() {
  editandoId = null;
  $('cursoForm').reset();
  $('tituloForm').textContent = 'Nuevo curso';
  $('guardarBtn').textContent = 'Guardar curso';
  $('cancelarBtn').style.display = 'none';
}

async function listar() {
  const [cursos, estudiantes, materias] = await Promise.all([DB.listar('cursos'), DB.listar('estudiantes'), DB.listar('materias')]);
  cursos.sort((a, b) => a.carrera.localeCompare(b.carrera) || a.anio - b.anio || a.division.localeCompare(b.division));
  cache = cursos;
  $('carreras').innerHTML = [...new Set(cursos.map(c => c.carrera))].map(c => `<option value="${esc(c)}">`).join('');
  $('listaCursos').innerHTML = cursos.length ? cursos.map(c => {
    const al = estudiantes.filter(e => String(e.curso_id) === String(c.id)).length;
    const ma = materias.filter(m => String(m.curso_id) === String(c.id)).length;
    return `
    <div class="item">
      <div><strong>${esc(etiquetaCurso(c))}</strong><br><small>${al} alumno(s) • ${ma} materia(s)</small></div>
      <div><button data-edit="${esc(c.id)}">Editar</button>
      <button class="btn-rojo" data-del="${esc(c.id)}">Eliminar</button></div>
    </div>`;
  }).join('') : '<p>No hay cursos cargados.</p>';
}