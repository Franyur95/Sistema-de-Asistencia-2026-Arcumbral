let stream = null, activo = false, modo = 'qr';
let faceTimer = null, matcher = null, modelosOK = false;
const ultimo = {};
const video = () => $('video');

document.addEventListener('DOMContentLoaded', () => {
  llenarCarreras();
  $('carreraAsistencia').onchange = llenarMaterias;
  llenarMaterias();

  $('iniciar').onclick = iniciar;
  $('detener').onclick = detener;
  listar();
});

function mostrar(tipo, html) { $('estado').className = tipo; $('estado').innerHTML = html; }
function llenarCarreras() {
  const carreras = [...new Set(DB.cursos().map(c => c.carrera))].sort();
  $('carreraAsistencia').innerHTML = '<option value="">Seleccione una carrera</option>' +
    carreras.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
}

function llenarMaterias() {
  const carrera = $('carreraAsistencia').value;
  const cursos = DB.cursos().filter(c => c.carrera === carrera);
  const materias = DB.materias()
    .filter(m => cursos.some(c => c.id === m.cursoId))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  $('cursoAsistencia').innerHTML =
    `<option value="">${carrera ? 'Seleccione una materia' : 'Primero elige la carrera'}</option>` +
    materias.map(m => {
      const c = cursos.find(x => x.id === m.cursoId);
      return `<option value="${esc(m.id)}">${esc(m.nombre)} (${c.anio}° ${esc(c.division)})</option>`;
    }).join('');
}


async function iniciar() {
  const curso = $('cursoAsistencia').value;
  if (!curso) return alert('Selecciona carrera y materia.');
  if (!DB.estudiantes().length) return alert('No hay estudiantes registrados.');
  modo = $('modo').value;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } });
    video().srcObject = stream;
    video().classList.toggle('espejo', modo === 'rostro');
    await video().play();
    activo = true;
    $('iniciar').disabled = true; $('detener').disabled = false;
    $('cursoAsistencia').disabled = true; $('carreraAsistencia').disabled = true;
    if (modo === 'qr') { mostrar('info', '📱 Muestra el QR frente a la cámara'); bucleQR(); }
    else await iniciarRostro();
  } catch (e) {
    alert('Error: ' + e.message);
    detener();
  }
}

function detener() {
  activo = false;
  if (faceTimer) { clearInterval(faceTimer); faceTimer = null; }
  matcher = null;
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  $('iniciar').disabled = false; $('detener').disabled = true;
  $('cursoAsistencia').disabled = false; $('carreraAsistencia').disabled = false;
  mostrar('info', 'Asistencia detenida');
}

// ---------- Modo QR ----------
function bucleQR() {
  if (!activo || modo !== 'qr') return;
  const v = video(), c = $('canvas');
  if (v.readyState === v.HAVE_ENOUGH_DATA) {
    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(v, 0, 0);
    const img = ctx.getImageData(0, 0, c.width, c.height);
    const code = jsQR(img.data, img.width, img.height);
    if (code && code.data.startsWith('ASIST:')) procesar(code.data.slice(6));
  }
  requestAnimationFrame(bucleQR);
}

// ---------- Modo rostro ----------
async function iniciarRostro() {
  mostrar('info', 'Cargando modelos...');
  if (!modelosOK) { await cargarModelos(); modelosOK = true; }
  const curso = $('cursoAsistencia').value;
  const etiquetas = DB.estudiantes()
    .filter(e => pertenece(e, curso) && (e.descriptor || e.faceDescriptor))
    .map(e => new faceapi.LabeledFaceDescriptors(e.codigo, [new Float32Array(e.descriptor || e.faceDescriptor)]));
  if (!etiquetas.length) throw new Error('Ningún estudiante de este curso tiene rostro registrado.');
  matcher = new faceapi.FaceMatcher(etiquetas, 0.5);
  mostrar('info', '🙂 Mira a la cámara');
  faceTimer = setInterval(async () => {
    if (!activo) return;
    const d = await faceapi.detectSingleFace(video(), new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks().withFaceDescriptor();
    if (!d) return;
    const m = matcher.findBestMatch(d.descriptor);
    if (m.label === 'unknown') mostrar('err', '❌ Rostro no reconocido');
    else procesar(m.label);
  }, 1000);
}

// ---------- Registro ----------
function procesar(codigo) {
  if (ultimo[codigo] && Date.now() - ultimo[codigo] < 4000) return; // evita repetidos
  ultimo[codigo] = Date.now();
  const est = DB.estudiantes().find(e => e.codigo === codigo);
  if (!est) return mostrar('err', '❌ Estudiante no registrado en el sistema');

  const curso = $('cursoAsistencia').value;
  if (!pertenece(est, curso)) {
    return mostrar('warn', `⚠️ ${esc(est.nombre)} no pertenece al curso de ${esc(CURSOS[curso] || curso)}`);
  }

  const dia = hoy();
  const as = DB.asistencias();
  if (as.some(a => a.codigo === codigo && a.curso === curso && a.dia === dia))
    return mostrar('warn', `⚠️ ${esc(est.nombre)} ya está registrado hoy`);

  as.push({ codigo, nombre: est.nombre, curso,materiaId: curso, dia, fecha: new Date().toISOString(), metodo: modo === 'qr' ? 'QR' : 'Rostro' });
  DB.guardar('asistencias', as);
  beep();
  mostrar('ok', `✅ ${esc(est.nombre)}<br><small>Asistencia registrada · ${new Date().toLocaleTimeString()}</small>`);
  listar();
}

function listar() {
  const l = DB.asistencias().filter(a => (a.dia || a.fecha.slice(0, 10)) === hoy())
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  $('lista').innerHTML = l.length ? l.map(a => `
    <div class="item"><div><strong>${esc(a.codigo)}</strong> - ${esc(a.nombre)}<br>
    <small>${esc(carreraDe(a))} • ${esc(CURSOS[a.curso] || a.curso)} • ${new Date(a.fecha).toLocaleTimeString()} • ${esc(a.metodo || '-')}</small></div>`).join('')
    : '<p>Aún no hay asistencias hoy.</p>';
  
}
function carreraDe(a) {
  const m = DB.buscar('materias', a.materiaId || a.curso);
  const c = m && DB.buscar('cursos', m.cursoId);
  return c ? c.carrera : 'Sin carrera';
}

// ¿El alumno cursa la materia elegida? (usa cursoId; si es un alumno viejo, usa el dato anterior)
function pertenece(est, materiaId) {
  const m = DB.buscar('materias', materiaId);
  if (est.cursoId) return !!m && est.cursoId === m.cursoId;
  return est.curso === materiaId;
}