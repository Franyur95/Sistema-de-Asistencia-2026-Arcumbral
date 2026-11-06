const DIAS = { 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado' };
let editandoId = null, cursos = [], profesores = [], materias = [];

document.addEventListener('DOMContentLoaded', async () => {
  await iniciarPagina(['admin']);
  $('materiaForm').onsubmit = guardar;
  $('cancelarBtn').onclick = limpiarForm;
  $('agregarHorario').onclick = () => agregarFila();
  $('horarios').onclick = e => { const b = e.target.closest('button'); if (b) b.closest('.fila-horario').remove(); };
  $('listaMaterias').onclick = e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.edit) editar(b.dataset.edit);
    if (b.dataset.del) eliminar(b.dataset.del);
  };
  listar();
});

function llenarSelects() {
  const cs = [...cursos].sort((a, b) => a.carrera.localeCompare(b.carrera) || a.anio - b.anio);
  $('cursoId').innerHTML = cs.length
    ? '<option value="">Seleccione un curso</option>' + cs.map(c => `<option value="${esc(c.id)}">${esc(etiquetaCurso(c))}</option>`).join('')
    : '<option value="">Primero crea un curso</option>';
  $('profesorId').innerHTML = '<option value="">Sin asignar</option>' +
    [...profesores].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(p => `<option value="${esc(p.id)}">${esc(p.nombre)}</option>`).join('');
}

function agregarFila(h = { dia: 1, desde: '18:00', hasta: '20:00' }) {
  const fila = document.createElement('div');
  fila.className = 'fila-horario';
  fila.innerHTML = `
    <select class="h-dia">${Object.entries(DIAS).map(([k, v]) => `<option value="${k}" ${Number(k) === Number(h.dia) ? 'selected' : ''}>${v}</option>`).join('')}</select>
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

const chocan = (a, b) => a.dia === b.dia && a.desde < b.hasta && b.desde < a.hasta;
const textoHorario = h => `${DIAS[h.dia].slice(0, 3)} ${h.desde}-${h.hasta}`;

async function guardar(ev) {
  ev.preventDefault();
  const nombre = $('nombre').value.trim();
  const curso_id = $('cursoId').value;
  const profesor_id = $('profesorId').value || null;
  const horarios = leerHorarios();
  if (!nombre || !curso_id) return alert('Completa el nombre y el curso.');
  if (horarios.some(h => !h.desde || !h.hasta || h.desde >= h.hasta)) return alert('En cada horario, "desde" debe ser anterior a "hasta".');
  for (let i = 0; i < horarios.length; i++)
    for (let j = i + 1; j < horarios.length; j++)
      if (chocan(horarios[i], horarios[j])) return alert('Hay dos horarios que se pisan en esta materia.');

  const otras = materias.filter(m => String(m.id) !== String(editandoId));
  if (otras.some(m => String(m.curso_id) === curso_id && m.nombre.toLowerCase() === nombre.toLowerCase()))
    return alert('Ese curso ya tiene una materia con ese nombre.');
  for (const m of otras) {
    const mismoCurso = String(m.curso_id) === curso_id;
    const mismoProfe = profesor_id && String(m.profesor_id) === profesor_id;
    if (!mismoCurso && !mismoProfe) continue;
    for (const a of horarios) for (const b of m.horarios || [])
      if (chocan(a, b)) return alert(`El horario ${textoHorario(a)} choca con "${m.nombre}" (${textoHorario(b)}) ${mismoCurso ? 'del mismo curso' : 'del mismo profesor'}.`);
  }
  try { await DB.guardar('materias', { nombre, curso_id, profesor_id, horarios }, editandoId); }
  catch (e) { return alert(e.message); }
  limpiarForm();
  listar();
}

function editar(id) {
  const m = materias.find(x => String(x.id) === String(id));
  if (!m) return;
  editandoId = id;
  $('nombre').value = m.nombre;
  $('cursoId').value = m.curso_id || '';
  $('profesorId').value = m.profesor_id || '';
  $('horarios').innerHTML = '';
  (m.horarios || []).forEach(h => agregarFila(h));
  $('tituloForm').textContent = 'Editar materia';
  $('guardarBtn').textContent = 'Guardar cambios';
  $('cancelarBtn').style.display = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function eliminar(id) {
  if (!confirm('¿Eliminar esta materia?')) return;
  try { await DB.eliminar('materias', id); }
  catch (e) { return alert('No se puede eliminar: la materia tiene asistencias registradas.'); }
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

async function listar() {
  [cursos, profesores, materias] = await Promise.all([DB.listar('cursos'), DB.listar('profesores'), DB.listar('materias')]);
  llenarSelects();
  const ms = [...materias].sort((a, b) => a.nombre.localeCompare(b.nombre));
  $('listaMaterias').innerHTML = ms.length ? ms.map(m => {
    const curso = cursos.find(c => String(c.id) === String(m.curso_id));
    const profe = profesores.find(p => String(p.id) === String(m.profesor_id));
    const hor = (m.horarios || []).length ? m.horarios.map(textoHorario).join(' · ') : 'sin horario';
    return `
    <div class="item">
      <div><strong>${esc(m.nombre)}</strong><br>
      <small>${curso ? esc(etiquetaCurso(curso)) : '⚠️ sin curso'} • ${profe ? esc(profe.nombre) : 'sin profesor'} • ${esc(hor)}</small></div>
      <div><button data-edit="${esc(m.id)}">Editar</button>
      <button class="btn-rojo" data-del="${esc(m.id)}">Eliminar</button></div>
    </div>`;
  }).join('') : '<p>No hay materias cargadas.</p>';
}