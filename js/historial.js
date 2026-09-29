let actual = [];

document.addEventListener('DOMContentLoaded', () => {
  llenarCursos('filtroCurso', 'Todos los cursos');
  $('aplicarFiltros').onclick = cargar;
  $('exportarBtn').onclick = exportarCSV;
  $('borrarBtn').onclick = () => {
    if (confirm('¿Borrar TODO el historial de asistencias?')) { DB.guardar('asistencias', []); cargar(); }
  };
  cargar();
});

const diaDe = a => a.dia || a.fecha.slice(0, 10);

function cargar() {
  const c = $('filtroCurso').value, f = $('filtroFecha').value;
  const t = $('filtroEstudiante').value.toLowerCase().trim();
  actual = DB.asistencias()
    .filter(a => (!c || a.curso === c) && (!f || diaDe(a) === f) &&
      (!t || a.codigo.toLowerCase().includes(t) || a.nombre.toLowerCase().includes(t)))
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  if (!actual.length) { $('tablaHistorial').innerHTML = '<p>No hay registros.</p>'; return; }
  $('tablaHistorial').innerHTML = `<table>
    <thead><tr><th>Fecha</th><th>Hora</th><th>Código</th><th>Nombre</th><th>Curso</th><th>Método</th></tr></thead>
    <tbody>${actual.map(a => {
      const d = new Date(a.fecha);
      return `<tr><td>${d.toLocaleDateString('es-AR')}</td><td>${d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</td>
      <td>${esc(a.codigo)}</td><td>${esc(a.nombre)}</td><td>${esc(CURSOS[a.curso] || a.curso)}</td><td>${esc(a.metodo || '-')}</td></tr>`;
    }).join('')}</tbody></table>`;
}

function exportarCSV() {
  if (!actual.length) return alert('No hay datos para exportar.');
  const q = s => `"${String(s ?? '').replace(/"/g, '""')}"`;
  let csv = 'Fecha,Hora,Código,Nombre,Curso,Método\n';
  actual.forEach(a => {
    const d = new Date(a.fecha);
    csv += [d.toLocaleDateString('es-AR'), d.toLocaleTimeString('es-AR'), a.codigo, a.nombre, CURSOS[a.curso] || a.curso, a.metodo || '-'].map(q).join(',') + '\n';
  });
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const l = document.createElement('a');
  l.href = URL.createObjectURL(blob);
  l.download = 'asistencia.csv';
  l.click();
  URL.revokeObjectURL(l.href);
}