<?php
require __DIR__ . '/bootstrap.php';
$a = $_GET['accion'] ?? '';

function materia_de(array $u, int $id): array {
  global $pdo;
  $st = $pdo->prepare('SELECT * FROM materias WHERE id = ?');
  $st->execute([$id]);
  $m = $st->fetch();
  if (!$m) out(['error' => 'Materia inexistente'], 404);
  if ($u['rol'] === 'profesor' && (int)$m['profesor_id'] !== (int)$u['profesor_id']) out(['error' => 'Esa materia no es tuya'], 403);
  return $m;
}
function alumno_de(array $u): array {
  global $pdo;
  $st = $pdo->prepare('SELECT * FROM estudiantes WHERE codigo = ?');
  $st->execute([$u['estudiante_codigo']]);
  return $st->fetch() ?: out(['error' => 'Alumno no encontrado'], 404);
}

// Asistencias de hoy de una materia (profesor/admin)
if ($a === 'hoy') {
  $u = need(['admin', 'profesor']);
  $m = materia_de($u, (int)($_GET['materia_id'] ?? 0));
  $st = $pdo->prepare('SELECT a.codigo, e.nombre, a.fecha, a.metodo FROM asistencias a
                       JOIN estudiantes e ON e.codigo = a.codigo
                       WHERE a.materia_id = ? AND a.dia = ? ORDER BY a.fecha DESC');
  $st->execute([$m['id'], date('Y-m-d')]);
  out($st->fetchAll());
}

// Lista de alumnos de la materia y estado de asistencia de hoy.
if ($a === 'alumnos') {
  $u = need(['admin', 'profesor']);
  $m = materia_de($u, (int)($_GET['materia_id'] ?? 0));
  $st = $pdo->prepare('SELECT e.codigo, e.nombre, a.fecha, a.metodo, a.estado
    FROM estudiantes e
    LEFT JOIN asistencias a ON a.codigo = e.codigo AND a.materia_id = ? AND a.dia = ?
    WHERE e.curso_id = ? ORDER BY e.nombre');
  $st->execute([$m['id'], date('Y-m-d'), $m['curso_id']]);
  out($st->fetchAll());
}

// Registrar inasistencia manual desde la cuenta de profesor o administrador.
if ($a === 'inasistencia') {
  $u = need(['admin', 'profesor']);
  $b = body();
  $m = materia_de($u, (int)($b['materia_id'] ?? 0));
  $codigo = trim((string)($b['codigo'] ?? ''));
  $st = $pdo->prepare('SELECT codigo, nombre FROM estudiantes WHERE codigo = ? AND curso_id = ?');
  $st->execute([$codigo, $m['curso_id']]);
  $e = $st->fetch();
  if (!$e) out(['error' => 'El alumno no pertenece al curso de esta materia.'], 422);
  $st = $pdo->prepare("INSERT IGNORE INTO asistencias (codigo, materia_id, dia, fecha, metodo, estado) VALUES (?,?,?,?, 'MANUAL', 'AUSENTE')");
  $st->execute([$e['codigo'], $m['id'], date('Y-m-d'), date('Y-m-d H:i:s')]);
  if (!$st->rowCount()) out(['error' => 'El alumno ya tiene un registro de asistencia para hoy.'], 409);
  out(['estado' => 'registrada', 'nombre' => $e['nombre']]);
}

// Marcación manual desde la cuenta de profesor o administrador.
if ($a === 'manual') {
  $u = need(['admin', 'profesor']);
  $b = body();
  $m = materia_de($u, (int)($b['materia_id'] ?? 0));
  $codigo = trim((string)($b['codigo'] ?? ''));
  $st = $pdo->prepare('SELECT codigo, nombre FROM estudiantes WHERE codigo = ? AND curso_id = ?');
  $st->execute([$codigo, $m['curso_id']]);
  $e = $st->fetch();
  if (!$e) out(['error' => 'El alumno no pertenece al curso de esta materia.'], 422);
  out(['estado' => registrar($e['codigo'], (int)$m['id'], 'MANUAL'), 'nombre' => $e['nombre']]);
}

// Historial con filtros (profesor: solo sus materias)
if ($a === 'historial') {
  $u = need(['admin', 'profesor']);
  $w = ['a.dia BETWEEN ? AND ?'];
  $p = [$_GET['desde'] ?? '2000-01-01', $_GET['hasta'] ?? '2999-12-31'];
  if (!empty($_GET['materia_id'])) { $w[] = 'a.materia_id = ?'; $p[] = (int)$_GET['materia_id']; }
  if ($u['rol'] === 'profesor') { $w[] = 'm.profesor_id = ?'; $p[] = $u['profesor_id']; }
  $q = trim((string)($_GET['q'] ?? ''));
  if ($q !== '') { $w[] = '(a.codigo LIKE ? OR e.nombre LIKE ?)'; $p[] = "%$q%"; $p[] = "%$q%"; }
  $st = $pdo->prepare('SELECT a.codigo, e.nombre, m.nombre AS materia, a.dia, a.fecha, a.metodo, a.estado
                       FROM asistencias a JOIN estudiantes e ON e.codigo = a.codigo JOIN materias m ON m.id = a.materia_id
                       WHERE ' . implode(' AND ', $w) . ' ORDER BY a.fecha DESC LIMIT 2000');
  $st->execute($p);
  out($st->fetchAll());
}

// Panel del alumno
if ($a === 'mias') {
  $u = need(['alumno']);
  $e = alumno_de($u);
  $act = materia_actual((int)$e['curso_id']);
  $st = $pdo->prepare('SELECT m.nombre AS materia,
      (SELECT COUNT(*) FROM asistencias a WHERE a.materia_id = m.id AND a.codigo = ? AND a.estado = \'PRESENTE\') AS presentes,
      (SELECT COUNT(*) FROM asistencias a WHERE a.materia_id = m.id AND a.codigo = ? AND a.estado = \'AUSENTE\') AS ausentes,
      (SELECT COUNT(DISTINCT a.dia) FROM asistencias a WHERE a.materia_id = m.id) AS clases
      FROM materias m WHERE m.curso_id = ? ORDER BY m.nombre');
  $st->execute([$e['codigo'], $e['codigo'], $e['curso_id']]);
  $resumen = $st->fetchAll();
  $st = $pdo->prepare('SELECT a.fecha, m.nombre AS materia, a.metodo, a.estado FROM asistencias a
                       JOIN materias m ON m.id = a.materia_id WHERE a.codigo = ? ORDER BY a.fecha DESC LIMIT 15');
  $st->execute([$e['codigo']]);
  out(['codigo' => $e['codigo'], 'nombre' => $e['nombre'], 'mac' => $e['mac'],
       'en_red' => ip_permitida(), 'materia_actual' => $act['nombre'] ?? null,
       'resumen' => $resumen, 'ultimos' => $st->fetchAll()]);
}

// Marcar presente por WiFi (IP del instituto)
if ($a === 'wifi') {
  $u = need(['alumno']);
  $e = alumno_de($u);
  if (!ip_permitida()) out(['error' => 'No estás conectado a la red WiFi del instituto.'], 403);
  $m = materia_actual((int)$e['curso_id']);
  if (!$m) out(['error' => 'No hay una clase en este momento para tu curso.'], 409);
  out(['estado' => registrar($e['codigo'], (int)$m['id'], 'WiFi'), 'materia' => $m['nombre']]);
}
out(['error' => 'Acción inválida'], 400);