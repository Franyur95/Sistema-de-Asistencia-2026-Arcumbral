let stream = null, activo = false, modo = 'qr';
let faceTimer = null, matcher = null, modelosOK = false;
const ultimo = {};
const video = () => $('video');

document.addEventListener('DOMContentLoaded', () => {
  llenarCursos('cursoAsistencia', 'Seleccione una materia');
  $('iniciar').onclick = iniciar;
  $('detener').onclick = detener;
  listar();
});

function mostrar(tipo, html) { $('estado').className = tipo; $('estado').innerHTML = html; }

async function iniciar() {
  const curso = $('cursoAsistencia').value;
  if (!curso) return alert('Selecciona un curso.');
  if (!DB.estudiantes().length) return alert('No hay estudiantes registrados.');
  modo = $('modo').value;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } });
    video().srcObject = stream;
    video().classList.toggle('espejo', modo === 'rostro');
    await video().play();
    activo = true;
    $('iniciar').disabled = true; $('detener').disabled = false;
    $('cursoAsistencia').disabled = true; $('modo').disabled = true;
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
  $('cursoAsistencia').disabled = false; $('modo').disabled = false;
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
    .filter(e => e.curso === curso && (e.descriptor || e.faceDescriptor))
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
  if (est.curso !== curso) {
    return mostrar('warn', `⚠️ ${esc(est.nombre)} pertenece a ${esc(CURSOS[est.curso] || est.curso)}, no a ${esc(CURSOS[curso] || curso)}`);
  }

  const dia = hoy();
  const as = DB.asistencias();
  if (as.some(a => a.codigo === codigo && a.curso === curso && a.dia === dia))
    return mostrar('warn', `⚠️ ${esc(est.nombre)} ya está registrado hoy`);

  as.push({ codigo, nombre: est.nombre, curso, dia, fecha: new Date().toISOString(), metodo: modo === 'qr' ? 'QR' : 'Rostro' });
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
    <small>${esc(CURSOS[a.curso] || a.curso)} • ${new Date(a.fecha).toLocaleTimeString()} • ${esc(a.metodo || '-')}</small></div></div>`).join('')
    : '<p>Aún no hay asistencias hoy.</p>';
}