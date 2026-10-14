
let stream = null;
let descriptor = null;
let modelosRegistroOK = false;

document.addEventListener('DOMContentLoaded', () => {
  llenarCarreras();

  $('carrera').onchange = () => {
    llenarCursosPorCarrera();
    llenarMateriasPorCurso();
  };

  $('curso').onchange = llenarMateriasPorCurso;

  $('activarCamara').onclick = activarCamara;
  $('capturarBtn').onclick = capturar;
  $('registroForm').onsubmit = registrar;

  $('listaEstudiantes').onclick = e => {
    const b = e.target.closest('button');
    if (!b) return;

    if (b.dataset.qr) mostrarQR(b.dataset.qr);
    if (b.dataset.del) eliminar(b.dataset.del);
  };

  llenarCursosPorCarrera();
  llenarMateriasPorCurso();
  listar();
});

async function activarCamara() {
  try {
    $('activarCamara').disabled = true;
    $('faceMsg').textContent = 'Cargando modelos...';

    if (!modelosRegistroOK) {
      await cargarModelos();
      modelosRegistroOK = true;
    }

    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' }
    });

    $('video').srcObject = stream;
    await $('video').play();

    $('capturarBtn').disabled = false;
    $('faceMsg').textContent =
      'Cámara lista. Mira de frente y captura.';
  } catch (e) {
    $('faceMsg').textContent = 'Error: ' + e.message;
    $('activarCamara').disabled = false;
  }
}

async function capturar() {
  try {
    const d = await faceapi
      .detectSingleFace(
        $('video'),
        new faceapi.TinyFaceDetectorOptions()
      )
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!d) {
      $('faceMsg').textContent =
        '⚠️ No se detectó rostro, intenta de nuevo.';
      return;
    }

    descriptor = Array.from(d.descriptor);
    $('faceMsg').textContent = '✅ Rostro capturado';
  } catch (e) {
    $('faceMsg').textContent =
      'Error al capturar el rostro: ' + e.message;
  }
}

function registrar(ev) {
  ev.preventDefault();

  const codigo = $('codigo').value.trim();
  const nombre = $('nombre').value.trim();
  const email = $('email').value.trim();
  const cursoId = $('curso').value;
  const materiaId = $('materia').value;

  if (!codigo || !nombre || !email || !cursoId || !materiaId) {
    return alert(
      'Completa código, nombre, email, carrera, curso y materia.'
    );
  }

  const materia = DB.materias().find(
    m => String(m.id) === String(materiaId)
  );

  if (!materia || String(materia.cursoId) !== String(cursoId)) {
    return alert(
      'La materia seleccionada no corresponde al curso elegido.'
    );
  }

  const est = {
    codigo,
    nombre,
    email,
    cursoId,
    materiaId,
    descriptor,
    fechaRegistro: new Date().toISOString()
  };

  const lista = DB.estudiantes();

  if (
    lista.some(
      e =>
        String(e.codigo).trim().toLowerCase() ===
        codigo.toLowerCase()
    )
  ) {
    return alert('Ya existe un estudiante con ese código.');
  }

  lista.push(est);
  DB.guardar('estudiantes', lista);

  $('registroForm').reset();

  descriptor = null;
  $('faceMsg').textContent = '';
  $('capturarBtn').disabled = true;

  llenarCursosPorCarrera();
  llenarMateriasPorCurso();

  listar();
  mostrarQR(codigo);
}

function mostrarQR(codigo) {
  const e = DB.estudiantes().find(
    x => String(x.codigo) === String(codigo)
  );

  if (!e) return;

  const url = qrDataURL(codigo);
  const materia = DB.materias().find(
    m => String(m.id) === String(e.materiaId)
  );

  $('qrResultado').innerHTML = `
    <div class="qr-card">
      <h3>QR de ${esc(e.nombre)}</h3>
      <img src="${url}" alt="QR">
      <p>
        <strong>${esc(e.codigo)}</strong>
        · ${esc(cursoTexto(e))}
      </p>
      ${
        materia
          ? `<p>Materia: ${esc(materia.nombre)}</p>`
          : ''
      }
      <a href="${url}" download="QR-${esc(e.codigo)}.gif">
        <button type="button" class="btn-verde">
          ⬇️ Descargar
        </button>
      </a>
      <button type="button" onclick="window.print()">
        🖨️ Imprimir
      </button>
    </div>`;

  $('qrResultado').scrollIntoView({ behavior: 'smooth' });
}

function eliminar(codigo) {
  if (!confirm('¿Eliminar este estudiante?')) return;

  DB.guardar(
    'estudiantes',
    DB.estudiantes().filter(
      e => String(e.codigo) !== String(codigo)
    )
  );

  listar();
  $('qrResultado').innerHTML = '';
}

function listar() {
  const l = DB.estudiantes();

  $('listaEstudiantes').innerHTML = l.length
    ? l.map(e => {
        const materia = DB.materias().find(
          m => String(m.id) === String(e.materiaId)
        );

        return `
          <div class="item">
            <div>
              <strong>${esc(e.codigo)}</strong> -
              ${esc(e.nombre)}<br>
              <small>
                ${esc(cursoTexto(e))}
                ${materia ? ' • ' + esc(materia.nombre) : ''}
                • ${esc(e.email)}
                • ${
                  (e.descriptor || e.faceDescriptor)
                    ? '🙂 con rostro'
                    : 'sin rostro'
                }
              </small>
            </div>
            <div>
              <button data-qr="${esc(e.codigo)}">
                Ver QR
              </button>
              <button class="btn-rojo" data-del="${esc(e.codigo)}">
                Eliminar
              </button>
            </div>
          </div>`;
      }).join('')
    : '<p>No hay estudiantes registrados.</p>';
}

function llenarCarreras() {
  const carreras = [
    ...new Set(DB.cursos().map(c => c.carrera))
  ].sort();

  $('carrera').innerHTML =
    '<option value="">Seleccione una carrera</option>' +
    carreras
      .map(
        c => `<option value="${esc(c)}">${esc(c)}</option>`
      )
      .join('');
}

function llenarCursosPorCarrera() {
  const carrera = $('carrera').value;

  const cursos = DB.cursos()
    .filter(c => c.carrera === carrera)
    .sort(
      (a, b) =>
        a.anio - b.anio ||
        a.division.localeCompare(b.division)
    );

  $('curso').innerHTML =
    `<option value="">${
      carrera
        ? 'Seleccione un curso'
        : 'Primero elige la carrera'
    }</option>` +
    cursos
      .map(
        c =>
          `<option value="${esc(c.id)}">${c.anio}° ${esc(c.division)}</option>`
      )
      .join('');
}

function llenarMateriasPorCurso() {
  const materiaSelect = $('materia');

  if (!materiaSelect) return;

  const cursoId = $('curso').value;

  const materias = DB.materias()
    .filter(m => String(m.cursoId) === String(cursoId))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  materiaSelect.innerHTML =
    `<option value="">${
      cursoId
        ? 'Seleccione una materia'
        : 'Primero elige un curso'
    }</option>` +
    materias
      .map(
        m =>
          `<option value="${esc(m.id)}">${esc(m.nombre)}</option>`
      )
      .join('');
}

// Texto "2° 1 - Desarrollo de software"
function cursoTexto(e) {
  const c = DB.buscar('cursos', e.cursoId);
  return c ? etiquetaCurso(c) : 'Sin curso';
}
