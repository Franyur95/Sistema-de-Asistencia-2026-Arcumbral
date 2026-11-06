document.addEventListener('DOMContentLoaded', async () => {
  await iniciarPagina(['alumno']);
  $('desde').value = hoy().slice(0, 8) + '01';
  $('hasta').value = hoy();
  $('marcarBtn').onclick = () => marcar(false);
  $('pdfBtn').onclick = () => { location.href = `api/informe_pdf.php?desde=${$('desde').value}&hasta=${$('hasta').value}`; };
  cargar(true);
});

async function cargar(auto) {
  const d = await api('api/asistencia.php?accion=mias');
  $('saludo').textContent = d.nombre;
  $('redEstado').textContent = d.en_red ? '✅ Conectado' : '❌ Fuera de la red';
  $('redEstado').className = 'badge ' + (d.en_red ? 'ok' : 'err');
  $('claseActual').textContent = d.materia_actual || 'ninguna';
  $('macEstado').textContent = d.mac || 'no registrado (pedile al administrador que cargue tu MAC)';
  $('resumen').innerHTML = d.resumen.length ? `<table><thead><tr><th>Materia</th><th>Presentes</th><th>Clases</th></tr></thead><tbody>` +
    d.resumen.map(r => `<tr><td>${esc(r.materia)}</td><td>${r.presentes}</td><td>${r.clases}</td></tr>`).join('') + '</tbody></table>' : '<p>Sin materias.</p>';
  $('ultimos').innerHTML = d.ultimos.length ? d.ultimos.map(u => `
    <div class="item"><div><strong>${esc(u.materia)}</strong><br>
    <small>${new Date(u.fecha.replace(' ', 'T')).toLocaleString('es-AR')} • ${esc(u.metodo)}</small></div></div>`).join('') : '<p>Todavía no hay asistencias.</p>';
  if (auto && d.en_red && d.materia_actual) marcar(true); // intento automático al abrir la página
}

async function marcar(silencioso) {
  try {
    const r = await api('api/asistencia.php?accion=wifi', {});
    if (!silencioso || r.estado === 'registrada') alert(r.estado === 'registrada' ? `✅ Presente en ${r.materia}` : 'Ya estabas registrado hoy.');
    cargar(false);
  } catch (e) { if (!silencioso) alert(e.message); }
}