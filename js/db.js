const CURSOS = {
  programacion: 'Programación', algebra: 'Álgebra', ingles: 'Inglés',
  arquitec: 'Arquitectura de computadora', analisis: 'Análisis Matemático',
  info: 'Informática', edi: 'EDI'
};

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const DB = {
  leer(k) { try { return JSON.parse(localStorage.getItem(k)) || []; } catch (e) { return []; } },
  guardar(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
  estudiantes() { return this.leer('estudiantes'); },
  asistencias() { return this.leer('asistencias'); }
};

// Fecha local YYYY-MM-DD
function hoy() { return new Date().toLocaleDateString('sv-SE'); }

function llenarCursos(id, primero) {
  $(id).innerHTML = `<option value="">${primero}</option>` +
    Object.entries(CURSOS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
}

// QR del estudiante (contenido: ASIST:codigo)
function qrDataURL(codigo) {
  const q = qrcode(0, 'M');
  q.addData('ASIST:' + codigo);
  q.make();
  return q.createDataURL(8, 4);
}

async function cargarModelos() {
  const u = 'public/models';
  await faceapi.nets.tinyFaceDetector.loadFromUri(u);
  await faceapi.nets.faceLandmark68Net.loadFromUri(u);
  await faceapi.nets.faceRecognitionNet.loadFromUri(u);
}

function beep() {
  try {
    const c = new (window.AudioContext || window.webkitAudioContext)();
    const o = c.createOscillator();
    o.connect(c.destination); o.frequency.value = 880; o.start();
    setTimeout(() => { o.stop(); c.close(); }, 150);
  } catch (e) {}
}

// ---------- Respaldo ----------
function exportarDatos() {
  const datos = { estudiantes: DB.estudiantes(), asistencias: DB.asistencias(), fecha: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(datos)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `respaldo-asistencia-${hoy()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function importarDatos(ev) {
  const file = ev.target.files[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = e => {
    try {
      const d = JSON.parse(e.target.result);
      const parse = v => {
        if (typeof v === 'string') v = JSON.parse(v);
        return v;
      };
      const estudiantes = parse(d.estudiantes ?? []);
      const asistencias = parse(d.asistencias ?? []);
      if (!Array.isArray(estudiantes) || !Array.isArray(asistencias)) {
        throw new Error('estudiantes y asistencias deben ser listas.');
      }
      const estudiantesValidos = estudiantes.every(e => e && typeof e === 'object' &&
        typeof e.codigo === 'string' && e.codigo.trim() &&
        typeof e.nombre === 'string' && e.nombre.trim() &&
        typeof e.curso === 'string' && CURSOS[e.curso]);
      const asistenciasValidas = asistencias.every(a => a && typeof a === 'object' &&
        typeof a.codigo === 'string' && a.codigo.trim() &&
        typeof a.nombre === 'string' && a.nombre.trim() &&
        typeof a.curso === 'string' && CURSOS[a.curso] &&
        typeof a.fecha === 'string' && !Number.isNaN(Date.parse(a.fecha)));
      if (!estudiantesValidos) throw new Error('Hay estudiantes con datos obligatorios inválidos.');
      if (!asistenciasValidas) throw new Error('Hay asistencias con datos obligatorios inválidos.');
      if (estudiantes.some((e, i) => estudiantes.findIndex(x => x.codigo === e.codigo) !== i)) {
        throw new Error('Hay códigos de estudiantes duplicados.');
      }
      if (!confirm('La importación reemplazará los datos actuales. ¿Continuar?')) return;
      DB.guardar('estudiantes', estudiantes);
      DB.guardar('asistencias', asistencias);
      alert('Datos importados correctamente.');
      location.reload();
    } catch (err) { alert('Archivo inválido: ' + err.message); }
    finally { ev.target.value = ''; }
  };
  r.readAsText(file);
}
