let actual = [];

document.addEventListener('DOMContentLoaded', async () => {
  await iniciarPagina(['admin', 'profesor']);
  const [cursos, materias] = await Promise.all([DB.listar('cursos'), DB.listar('materias')]);
  $('filtroMateria').innerHTML = '<option value="">Todas las materias</option>' + materias.map(m => {
    const c = cursos.find(x => String(x.id) === String(m.curso_id));
    return `<option value="${esc(m.id)}">${esc(m.nombre)}${c ? ' (' + esc(etiquetaCurso(c)) + ')' : ''}</option>`;
  }).join('');
  $('desde').value = hoy().slice(0, 8) + '01';
  $('hasta').value = hoy();
  $('aplicarFiltros').onclick = cargar;
  $('exportarBtn').onclick = exportarCSV;
  $('pdfBtn').onclick = descargarPDF;
  cargar();
});

async function cargar() {
  const p = new URLSearchParams({ accion: 'historial', materia_id: $('filtroMateria').value, desde: $('desde').value,
                                  hasta: $('hasta').value, q: $('filtroEstudiante').value.trim() });
  try { actual = await api('api/asistencia.php?' + p); } catch (e) { return alert(e.message); }
  if (!actual.length) { $('tablaHistorial').innerHTML = '<p>No hay registros.</p>'; return; }
  $('tablaHistorial').innerHTML = `<table>
    <thead><tr><th>Fecha</th><th>Hora</th><th>Código</th><th>Nombre</th><th>Materia</th><th>Estado</th><th>Método</th></tr></thead>
    <tbody>${actual.map(a => {
      const d = new Date(a.fecha.replace(' ', 'T'));
      return `<tr><td>${d.toLocaleDateString('es-AR')}</td><td>${d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</td>
      <td>${esc(a.codigo)}</td><td>${esc(a.nombre)}</td><td>${esc(a.materia)}</td><td>${a.estado === 'AUSENTE' ? '❌ Inasistencia' : '✅ Presente'}</td><td>${esc(a.metodo)}</td></tr>`;
    }).join('')}</tbody></table>`;
}

function descargarPDF() {
  if (!$('filtroMateria').value) return alert('Elegí una materia para generar el PDF.');
  location.href = `api/informe_pdf.php?materia_id=${$('filtroMateria').value}&desde=${$('desde').value}&hasta=${$('hasta').value}`;
}

function exportarCSV() {
  if (!actual.length) return alert('No hay datos para exportar.');
  const q = s => `"${String(s ?? '').replace(/"/g, '""')}"`;
  let csv = 'Fecha,Hora,Código,Nombre,Materia,Método\n';
  actual.forEach(a => {
    const d = new Date(a.fecha.replace(' ', 'T'));
    csv += [d.toLocaleDateString('es-AR'), d.toLocaleTimeString('es-AR'), a.codigo, a.nombre, a.materia, a.estado === 'AUSENTE' ? 'Inasistencia' : 'Presente', a.metodo].map(q).join(',') + '\n';
  });
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const l = document.createElement('a');
  l.href = URL.createObjectURL(blob);
  l.download = 'asistencia.csv';
  l.click();
  URL.revokeObjectURL(l.href);
}