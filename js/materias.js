// ABM de materias (con curso, profesor y horarios)
const DIAS = { 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado' };
let editandoId = null;

document.addEventListener('DOMContentLoaded', () => {
  llenarSelects();
  $('materiaForm').onsubmit = guardar;
  $('cancelarBtn').onclick = limpiarForm;
  $('agregarHorario').onclick = () => agregarFila();
  $('horarios').onclick = e => {                       // botón ✖ de cada fila
    const b = e.target.closest('button');
    if (b) b.closest('.fila-horario').remove();
  };
  $('listaMaterias').onclick = e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.edit) editar(b.dataset.edit);
    if (b.dataset.del) eliminar(b.dataset.del);
  };
  listar();
});

// ---------- Selectores de curso y profesor ----------
function llenarSelects() {
  const cursos = DB.cursos().sort((a, b) => a.carrera.localeCompare(b.carrera) || a.anio - b.anio);
  $('cursoId').innerHTML = cursos.length
    ? '<option value="">Seleccione un curso</option>' +
      cursos.map(c => `<option value="${esc(c.id)}">${esc(etiquetaCurso(c))}</option>`).join('')
    : '<option value="">Primero crea un curso</option>';

  $('profesorId').innerHTML = '<option value="">Sin asignar</option>' +
    DB.profesores().sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map(p => `<option value="${esc(p.id)}">${esc(p.nombre)}</option>`).join('');
}

// ---------- Filas de horario ----------
function agregarFila(h = { dia: 1, desde: '18:00', hasta: '20:00' }) {
  const fila = document.createElement('div');
  fila.className = 'fila-horario';
  fila.innerHTML = `
    <select class="h-dia">${Object.entries(DIAS).map(([k, v]) =>
      `<option value="${k}" ${Number(k) === h.dia ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <input type="time" class="h-desde" value="${h.desde}" required>
    <input type="time" class="h-hasta" value="${h.hasta}" required>
    <button type="button" class="btn-rojo" title="Quitar">✖</button>`;
  $('horarios').appendChild(fila);
}

function leerHorarios() {
  return [...document.querySelectorAll('.fila-horario')].map(f => ({
    dia: Number(f.querySelector('.h-dia').value),
    desde: f.querySelector('.h-desde').value,
    hasta: f.querySelector('.h-hasta').value
  }));
}

// Dos horarios chocan si son el mismo día y se pisan (las horas "HH:MM" se comparan como texto)
const chocan = (a, b) => a.dia === b.dia && a.desde < b.hasta && b.desde < a.hasta;
const textoHorario = h => `${DIAS[h.dia].slice(0, 3)} ${h.desde}-${h.hasta}`;

// ---------- Guardar ----------
function guardar(ev) {
  ev.preventDefault();
  const nombre = $('nombre').value.trim();
  const cursoId = $('cursoId').value;
  const profesorId = $('profesorId').value || null;
  const horarios = leerHorarios();

  if (!nombre || !cursoId) return alert('Completa el nombre y el curso.');

  // 1) Cada horario: desde < hasta
  if (horarios.some(h => !h.desde || !h.hasta || h.desde >= h.hasta))
    return alert('En cada horario, "desde" debe ser anterior a "hasta".');

  // 2) Horarios de la misma materia no pueden pisarse entre sí
  for (let i = 0; i < horarios.length; i++)
    for (let j = i + 1; j < horarios.length; j++)
      if (chocan(horarios[i], horarios[j])) return alert('Hay dos horarios que se pisan en esta materia.');

  // 3) Nombre repetido dentro del mismo curso
  const otras = DB.materias().filter(m => m.id !== editandoId);
  if (otras.some(m => m.cursoId === cursoId && m.nombre.toLowerCase() === nombre.toLowerCase()))
    return alert('Ese curso ya tiene una materia con ese nombre.');

  // 4) Choque con otras materias del mismo curso o del mismo profesor
  for (const m of otras) {
    const mismoCurso = m.cursoId === cursoId;
    const mismoProfe = profesorId && m.profesorId === profesorId;
    if (!mismoCurso && !mismoProfe) continue;
    for (const a of horarios)
      for (const b of (m.horarios || []))
        if (chocan(a, b))
          return alert(`El horario ${textoHorario(a)} choca con "${m.nombre}" (${textoHorario(b)}) ` +
                       `${mismoCurso ? 'del mismo curso' : 'del mismo profesor'}.`);
  }

  try {
    if (editandoId) DB.actualizar('materias', editandoId, { nombre, cursoId, profesorId, horarios });
    else DB.crear('materias', { nombre, cursoId, profesorId, horarios });
  } catch (e) { return alert(e.message); }

  limpiarForm();
  listar();
}

// ---------- Editar / eliminar ----------
function editar(id) {
  const m = DB.buscar('materias', id);
  if (!m) return;
  editandoId = id;
  $('nombre').value = m.nombre;
  $('cursoId').value = m.cursoId || '';
  $('profesorId').value = m.profesorId || '';
  $('horarios').innerHTML = '';
  (m.horarios || []).forEach(h => agregarFila(h));
  $('tituloForm').textContent = 'Editar materia';
  $('guardarBtn').textContent = 'Guardar cambios';
  $('cancelarBtn').style.display = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function eliminar(id) {
  if (!confirm('¿Eliminar esta materia?')) return;
  try { DB.eliminar('materias', id); }
  catch (e) { return alert(e.message); } // "tiene asistencias registradas"
  listar();
}

function limpiarForm() {
  editandoId = null;
  $('materiaForm').reset();
  $('horarios').innerHTML = '';
  $('tituloForm').textContent = 'Nueva materia';
  $('guardarBtn').textContent = 'Guardar materia';
  $('cancelarBtn').style.display = 'none';
}

// ---------- Lista ----------
function listar() {
  const materias = DB.materias().sort((a, b) => a.nombre.localeCompare(b.nombre));
  $('listaMaterias').innerHTML = materias.length ? materias.map(m => {
    const curso = DB.buscar('cursos', m.cursoId);
    const profe = DB.buscar('profesores', m.profesorId);
    const hor = (m.horarios || []).length ? m.horarios.map(textoHorario).join(' · ') : 'sin horario';
    return `
    <div class="item">
      <div><strong>${esc(m.nombre)}</strong><br>
      <small>${curso ? esc(etiquetaCurso(curso)) : '⚠️ sin curso asignado'} •
      ${profe ? esc(profe.nombre) : 'sin profesor'} • ${esc(hor)}</small></div>
      <div><button data-edit="${esc(m.id)}">Editar</button>
      <button class="btn-rojo" data-del="${esc(m.id)}">Eliminar</button></div>
    </div>`;
  }).join('') : '<p>No hay materias cargadas.</p>';
}