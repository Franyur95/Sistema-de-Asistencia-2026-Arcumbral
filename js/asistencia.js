let cursos = [], materias = [];

document.addEventListener('DOMContentLoaded', async () => {
  await iniciarPagina(['admin', 'profesor']);
  [cursos, materias] = await Promise.all([DB.listar('cursos'), DB.listar('materias')]);
  llenarCarreras();
  $('carreraAsistencia').onchange = llenarMaterias;
  $('cursoAsistencia').onchange = listar;
  llenarMaterias();
  setInterval(() => { if ($('cursoAsistencia').value) listar(); }, 15000);
});

function llenarCarreras() {
  const carreras = [...new Set(cursos.map(c => c.carrera))].sort();
  $('carreraAsistencia').innerHTML = '<option value="">Seleccione una carrera</option>' +
    carreras.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
}

function llenarMaterias() {
  const carrera = $('carreraAsistencia').value;
  const cs = cursos.filter(c => c.carrera === carrera);
  const ms = materias.filter(m => cs.some(c => String(c.id) === String(m.curso_id))).sort((a, b) => a.nombre.localeCompare(b.nombre));
  $('cursoAsistencia').innerHTML =
    `<option value="">${carrera ? 'Seleccione una materia' : 'Primero elige una carrera'}</option>` +
    ms.map(m => { const c = cs.find(x => String(x.id) === String(m.curso_id)); return `<option value="${esc(m.id)}">${esc(m.nombre)} (${c.anio}° ${esc(c.division)})</option>`; }).join('');
  listar();
}

async function listar() {
  const id = $('cursoAsistencia').value;
  if (!id) { $('lista').innerHTML = '<p>Elegí una materia.</p>'; return; }
  $('lista').innerHTML = '<p>Cargando alumnos...</p>';
  try {
    const alumnos = await api('api/asistencia.php?accion=alumnos&materia_id=' + encodeURIComponent(id));
    $('lista').innerHTML = alumnos.length ? alumnos.map(a => {
      const presente = !!a.fecha;
      return `<div class="item">
        <div><strong>${esc(a.codigo)} - ${esc(a.nombre)}</strong><br>
        <small>${presente ? '✅ Presente · ' + esc(a.metodo) + ' · ' + new Date(a.fecha.replace(' ', 'T')).toLocaleTimeString('es-AR') : '⏳ Sin asistencia registrada'}</small></div>
        <div>${presente ? '<span class="badge ok">Presente</span>' : `<button class="btn-verde" data-marcar="${esc(a.codigo)}">Marcar presente</button>`}</div>
      </div>`;
    }).join('') : '<p>No hay alumnos registrados en este curso.</p>';
  } catch (e) { $('lista').innerHTML = `<p>${esc(e.message)}</p>`; }
}

$('lista').addEventListener('click', async e => {
  const b = e.target.closest('[data-marcar]');
  if (!b) return;
  b.disabled = true;
  try {
    const r = await api('api/asistencia.php?accion=manual', {
      materia_id: $('cursoAsistencia').value,
      codigo: b.dataset.marcar
    });
    alert(r.estado === 'registrada' ? `Asistencia manual registrada para ${r.nombre}.` : `${r.nombre} ya tenía asistencia registrada hoy.`);
    await listar();
  } catch (err) {
    alert(err.message);
    b.disabled = false;
  }
});
