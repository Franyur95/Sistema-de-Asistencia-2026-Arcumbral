let stream = null;
let descriptor = null;
let modelosRegistroOK = false;

document.addEventListener('DOMContentLoaded', () => {
  llenarCursos('curso', 'Seleccione un curso');
  $('activarCamara').onclick = activarCamara;
  $('capturarBtn').onclick = capturar;
  $('registroForm').onsubmit = registrar;
  $('listaEstudiantes').onclick = e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.qr) mostrarQR(b.dataset.qr);
    if (b.dataset.del) eliminar(b.dataset.del);
  };
  listar();
});

async function activarCamara() {
  try {
    $('activarCamara').disabled = true;
    $('faceMsg').textContent = 'Cargando modelos...';
    if (!modelosRegistroOK) { await cargarModelos(); modelosRegistroOK = true; }
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
    $('video').srcObject = stream;
    await $('video').play();
    $('capturarBtn').disabled = false;
    $('faceMsg').textContent = 'Cámara lista. Mira de frente y captura.';
  } catch (e) {
    $('faceMsg').textContent = 'Error: ' + e.message;
    $('activarCamara').disabled = false;
  }
}

async function capturar() {
  const d = await faceapi.detectSingleFace($('video'), new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks().withFaceDescriptor();
  if (!d) { $('faceMsg').textContent = '⚠️ No se detectó rostro, intenta de nuevo.'; return; }
  descriptor = Array.from(d.descriptor);
  $('faceMsg').textContent = '✅ Rostro capturado';
}

function registrar(ev) {
  ev.preventDefault();
  const codigo = $('codigo').value.trim();
  const nombre = $('nombre').value.trim();
  const email = $('email').value.trim();
  const curso = $('curso').value;
  if (!codigo || !nombre || !curso) return alert('Completa código, nombre y curso.');
  const est = {
    codigo,
    nombre,
    email,
    curso,
    descriptor,
    fechaRegistro: new Date().toISOString()
  };
  const lista = DB.estudiantes();
  if (lista.some(e => String(e.codigo).trim().toLowerCase() === codigo.toLowerCase())) return alert('Ya existe un estudiante con ese código.');
  lista.push(est);
  DB.guardar('estudiantes', lista);
  $('registroForm').reset();
  descriptor = null;
  $('faceMsg').textContent = '';
  listar();
  mostrarQR(codigo);
}

function mostrarQR(codigo) {
  const e = DB.estudiantes().find(x => x.codigo === codigo);
  if (!e) return;
  const url = qrDataURL(codigo);
  $('qrResultado').innerHTML = `
    <div class="qr-card">
      <h3>QR de ${esc(e.nombre)}</h3>
      <img src="${url}" alt="QR">
      <p><strong>${esc(e.codigo)}</strong> · ${esc(CURSOS[e.curso] || e.curso)}</p>
      <a href="${url}" download="QR-${esc(e.codigo)}.gif"><button type="button" class="btn-verde">⬇️ Descargar</button></a>
      <button type="button" onclick="window.print()">🖨️ Imprimir</button>
    </div>`;
  $('qrResultado').scrollIntoView({ behavior: 'smooth' });
}

function eliminar(codigo) {
  if (!confirm('¿Eliminar este estudiante?')) return;
  DB.guardar('estudiantes', DB.estudiantes().filter(e => e.codigo !== codigo));
  listar();
}

function listar() {
  const l = DB.estudiantes();
  $('listaEstudiantes').innerHTML = l.length ? l.map(e => `
    <div class="item">
      <div><strong>${esc(e.codigo)}</strong> - ${esc(e.nombre)}<br>
      <small>${esc(CURSOS[e.curso] || e.curso)} • ${esc(e.email)} • ${(e.descriptor || e.faceDescriptor) ? '🙂 con rostro' : 'sin rostro'}</small></div>
      <div><button data-qr="${esc(e.codigo)}">Ver QR</button>
      <button class="btn-rojo" data-del="${esc(e.codigo)}">Eliminar</button></div>
    </div>`).join('') : '<p>No hay estudiantes registrados.</p>';
}