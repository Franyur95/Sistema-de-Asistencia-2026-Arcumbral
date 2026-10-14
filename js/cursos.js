// ABM de cursos
// Alta: guardar con el formulario vacío | Modificación: botón Editar | Baja: botón Eliminar
let editandoId = null; // null = estamos creando; con valor = estamos editando ese curso

document.addEventListener('DOMContentLoaded', () => {
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

function guardar(ev) {
  ev.preventDefault();
  const anio = Number($('anio').value);
  const division = $('division').value.trim().toUpperCase();
  const carrera = $('carrera').value.trim();
  if (!anio || !division || !carrera) return alert('Completa año, división y carrera.');

  // Evita duplicados (mismo año + división + carrera), ignorando el que se está editando
  const repetido = DB.cursos().some(c =>
    c.id !== editandoId && c.anio === anio && c.division === division &&
    c.carrera.toLowerCase() === carrera.toLowerCase());
  if (repetido) return alert('Ese curso ya existe.');

  try {
    if (editandoId) DB.actualizar('cursos', editandoId, { anio, division, carrera });
    else DB.crear('cursos', { anio, division, carrera });
  } catch (e) { return alert(e.message); }

  limpiarForm();
  listar();
}

function editar(id) {
  const c = DB.buscar('cursos', id);
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

function eliminar(id) {
  if (!confirm('¿Eliminar este curso?')) return;
  try { DB.eliminar('cursos', id); }
  catch (e) { return alert(e.message); } // "hay alumnos/materias en este curso"
  listar();
}

function limpiarForm() {
  editandoId = null;
  $('cursoForm').reset();
  $('tituloForm').textContent = 'Nuevo curso';
  $('guardarBtn').textContent = 'Guardar curso';
  $('cancelarBtn').style.display = 'none';
}

function listar() {
  const cursos = DB.cursos().sort((a, b) =>
    a.carrera.localeCompare(b.carrera) || a.anio - b.anio || a.division.localeCompare(b.division));

  // Sugerencias de carreras ya cargadas
  const carreras = [...new Set(cursos.map(c => c.carrera))];
  $('carreras').innerHTML = carreras.map(c => `<option value="${esc(c)}">`).join('');

  $('listaCursos').innerHTML = cursos.length ? cursos.map(c => {
    const alumnos = DB.estudiantes().filter(e => e.cursoId === c.id).length;
    const materias = DB.materias().filter(m => m.cursoId === c.id).length;
    return `
    <div class="item">
      <div><strong>${esc(etiquetaCurso(c))}</strong><br>
      <small>${alumnos} alumno(s) • ${materias} materia(s)</small></div>
      <div><button data-edit="${esc(c.id)}">Editar</button>
      <button class="btn-rojo" data-del="${esc(c.id)}">Eliminar</button></div>
    </div>`;
  }).join('') : '<p>No hay cursos cargados.</p>';
}