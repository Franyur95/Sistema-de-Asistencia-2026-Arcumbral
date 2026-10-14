// ABM de profesores (misma idea que cursos.js)
let editandoId = null; // null = creando | con valor = editando ese profesor

document.addEventListener('DOMContentLoaded', () => {
  $('profForm').onsubmit = guardar;
  $('cancelarBtn').onclick = limpiarForm;
  $('listaProfesores').onclick = e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.edit) editar(b.dataset.edit);
    if (b.dataset.del) eliminar(b.dataset.del);
  };
  listar();
});

function guardar(ev) {
  ev.preventDefault();
  const dni = $('dni').value.trim();
  const nombre = $('nombre').value.trim();
  const email = $('email').value.trim();

  if (!/^\d{6,9}$/.test(dni)) return alert('El DNI debe tener entre 6 y 9 números.');
  if (!nombre) return alert('Completa el nombre.');

  // El DNI no puede repetirse (se ignora el profesor que se está editando)
  if (DB.profesores().some(p => p.id !== editandoId && p.dni === dni))
    return alert('Ya existe un profesor con ese DNI.');

  try {
    if (editandoId) DB.actualizar('profesores', editandoId, { dni, nombre, email });
    else DB.crear('profesores', { dni, nombre, email });
  } catch (e) { return alert(e.message); }

  limpiarForm();
  listar();
}

function editar(id) {
  const p = DB.buscar('profesores', id);
  if (!p) return;
  editandoId = id;
  $('dni').value = p.dni;
  $('nombre').value = p.nombre;
  $('email').value = p.email;
  $('tituloForm').textContent = 'Editar profesor';
  $('guardarBtn').textContent = 'Guardar cambios';
  $('cancelarBtn').style.display = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function eliminar(id) {
  if (!confirm('¿Eliminar este profesor?')) return;
  try { DB.eliminar('profesores', id); }
  catch (e) { return alert(e.message); } // "tiene materias asignadas"
  listar();
}

function limpiarForm() {
  editandoId = null;
  $('profForm').reset();
  $('tituloForm').textContent = 'Nuevo profesor';
  $('guardarBtn').textContent = 'Guardar profesor';
  $('cancelarBtn').style.display = 'none';
}

function listar() {
  const profes = DB.profesores().sort((a, b) => a.nombre.localeCompare(b.nombre));
  const materias = DB.materias();
  $('listaProfesores').innerHTML = profes.length ? profes.map(p => {
    const mias = materias.filter(m => m.profesorId === p.id);
    const detalle = mias.length ? mias.map(m => esc(m.nombre)).join(', ') : 'sin materias asignadas';
    return `
    <div class="item">
      <div><strong>${esc(p.nombre)}</strong> · DNI ${esc(p.dni)}<br>
      <small>${esc(p.email)} • ${detalle}</small></div>
      <div><button data-edit="${esc(p.id)}">Editar</button>
      <button class="btn-rojo" data-del="${esc(p.id)}">Eliminar</button></div>
    </div>`;
  }).join('') : '<p>No hay profesores cargados.</p>';
}