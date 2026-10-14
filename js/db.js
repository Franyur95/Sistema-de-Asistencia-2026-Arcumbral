// =====================================================================
//  db.js  -  Capa de datos del SIA (localStorage)
//  Versión 2: cursos, materias, profesores, estudiantes, asistencias
// =====================================================================

// ---------- Utilidades ----------
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Fecha local YYYY-MM-DD
function hoy() { return new Date().toLocaleDateString('sv-SE'); }

// ---------- Estructura de datos ----------
// Campo que identifica a cada registro en cada "tabla"
const CLAVE = {
  cursos: 'id',
  materias: 'id',
  profesores: 'id',
  estudiantes: 'codigo'
};

/*
  FORMA DE CADA REGISTRO
  curso:      { id, anio, division, carrera }
  profesor:   { id, dni, nombre, email }
  materia:    { id, nombre, cursoId, profesorId, horarios:[{dia, desde, hasta}] }
                dia: 1=lunes ... 5=viernes   |  desde/hasta: "18:00"
  estudiante: { codigo, nombre, email, cursoId, descriptor, fechaRegistro }
                (el año sale del curso: no se guarda aparte)
  asistencia: { codigo, nombre, materiaId, dia, fecha, metodo }
*/

// Materias que antes estaban fijas en el código (se usan solo en la migración)
const MATERIAS_INICIALES = {
  programacion: 'Programación', algebra: 'Álgebra', ingles: 'Inglés',
  arquitec: 'Arquitectura de computadora', analisis: 'Análisis Matemático',
  info: 'Informática', edi: 'EDI'
};

// Compatibilidad: las pantallas viejas usan CURSOS[id] -> nombre.
// Ahora se llena solo desde las materias guardadas.
const CURSOS = {};
function refrescarCursos() {
  Object.keys(CURSOS).forEach(k => delete CURSOS[k]);
  DB.materias().forEach(m => { CURSOS[m.id] = m.nombre; });
}

// ---------- Acceso a datos ----------
const DB = {
  leer(k) { try { return JSON.parse(localStorage.getItem(k)) || []; } catch (e) { return []; } },
  guardar(k, v) {
    localStorage.setItem(k, JSON.stringify(v));
    if (k === 'materias') refrescarCursos();
  },

  // Atajos
  cursos() { return this.leer('cursos'); },
  materias() { return this.leer('materias'); },
  profesores() { return this.leer('profesores'); },
  estudiantes() { return this.leer('estudiantes'); },
  asistencias() { return this.leer('asistencias'); },

  // ----- CRUD genérico (sirve para los 4 ABM) -----
  nuevoId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); },

  buscar(k, valor) {
    const c = CLAVE[k];
    return this.leer(k).find(x => String(x[c]) === String(valor));
  },

  crear(k, obj) {
    const c = CLAVE[k], lista = this.leer(k);
    if (c === 'id' && !obj.id) obj.id = this.nuevoId();
    if (lista.some(x => String(x[c]).trim().toLowerCase() === String(obj[c]).trim().toLowerCase()))
      throw new Error('Ya existe un registro con ese ' + c + '.');
    lista.push(obj);
    this.guardar(k, lista);
    return obj;
  },

  actualizar(k, valor, cambios) {
    const c = CLAVE[k], lista = this.leer(k);
    const i = lista.findIndex(x => String(x[c]) === String(valor));
    if (i < 0) throw new Error('No se encontró el registro.');
    lista[i] = { ...lista[i], ...cambios, [c]: lista[i][c] }; // la clave no se cambia
    this.guardar(k, lista);
    return lista[i];
  },

  eliminar(k, valor) {
    const motivo = this.enUso(k, valor);
    if (motivo) throw new Error(motivo);
    const c = CLAVE[k];
    this.guardar(k, this.leer(k).filter(x => String(x[c]) !== String(valor)));
  },

  // Impide borrar algo que otro registro está usando
  enUso(k, valor) {
    if (k === 'cursos') {
      if (this.materias().some(m => m.cursoId === valor)) return 'No se puede eliminar: hay materias en este curso.';
      if (this.estudiantes().some(e => e.cursoId === valor)) return 'No se puede eliminar: hay alumnos en este curso.';
    }
    if (k === 'profesores' && this.materias().some(m => m.profesorId === valor))
      return 'No se puede eliminar: el profesor tiene materias asignadas.';
    if (k === 'materias' && this.asistencias().some(a => a.materiaId === valor))
      return 'No se puede eliminar: la materia tiene asistencias registradas.';
    return null;
  }
};

// Texto legible de un curso: "1° A - Desarrollo de Software"
function etiquetaCurso(c) {
  return c ? `${c.anio}° ${c.division} - ${c.carrera}` : 'Sin curso';
}

// ---------- Migración (datos viejos -> versión 2) ----------
function migrar() {
  const version = Number(localStorage.getItem('version') || 1);
  if (version >= 2) { refrescarCursos(); return; }

  // 1) Lo que antes se llamaba "curso" en realidad eran materias
  if (!DB.materias().length) {
    DB.guardar('materias', Object.entries(MATERIAS_INICIALES).map(([id, nombre]) =>
      ({ id, nombre, cursoId: null, profesorId: null, horarios: [] })));
  }
  // 2) Alumnos: se agrega cursoId (se asigna luego desde el ABM)
  DB.guardar('estudiantes', DB.estudiantes().map(e => ({ cursoId: null, ...e })));
  // 3) Asistencias: materiaId toma el valor del viejo campo "curso"
  DB.guardar('asistencias', DB.asistencias().map(a => ({ materiaId: a.curso, ...a })));

  localStorage.setItem('version', '2');
  refrescarCursos();
}
migrar();

// ---------- Helpers de pantalla ----------
// (por ahora lista las materias; las pantallas viejas siguen funcionando)
function llenarCursos(id, primero) {
  $(id).innerHTML = `<option value="">${primero}</option>` +
    Object.entries(CURSOS).map(([k, v]) => `<option value="${esc(k)}">${esc(v)}</option>`).join('');
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
const TABLAS = ['cursos', 'materias', 'profesores', 'estudiantes', 'asistencias'];

function exportarDatos() {
  const datos = { version: 2, fecha: new Date().toISOString() };
  TABLAS.forEach(t => { datos[t] = DB.leer(t); });
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
      const parse = v => (typeof v === 'string' ? JSON.parse(v) : v);
      const datos = {};
      TABLAS.forEach(t => { datos[t] = parse(d[t] ?? []); });
      TABLAS.forEach(t => {
        if (!Array.isArray(datos[t])) throw new Error(t + ' debe ser una lista.');
      });
      if (!datos.estudiantes.every(x => x && typeof x.codigo === 'string' && x.codigo.trim() &&
          typeof x.nombre === 'string' && x.nombre.trim()))
        throw new Error('Hay estudiantes con datos obligatorios inválidos.');
      if (!datos.asistencias.every(a => a && typeof a.codigo === 'string' &&
          typeof a.fecha === 'string' && !Number.isNaN(Date.parse(a.fecha))))
        throw new Error('Hay asistencias con datos obligatorios inválidos.');
      if (datos.estudiantes.some((x, i) => datos.estudiantes.findIndex(y => y.codigo === x.codigo) !== i))
        throw new Error('Hay códigos de estudiantes duplicados.');
      if (!confirm('La importación reemplazará los datos actuales. ¿Continuar?')) return;

      // Un respaldo viejo (sin versión) se vuelve a migrar al recargar
      const esViejo = !d.version || d.version < 2;
      TABLAS.forEach(t => {
        // en un respaldo viejo no pisamos materias/cursos/profesores con listas vacías
        if (esViejo && ['cursos', 'materias', 'profesores'].includes(t)) return;
        DB.guardar(t, datos[t]);
      });
      if (esViejo) localStorage.setItem('version', '1');
      alert('Datos importados correctamente.');
      location.reload();
    } catch (err) { alert('Archivo inválido: ' + err.message); }
    finally { ev.target.value = ''; }
  };
  r.readAsText(file);
}