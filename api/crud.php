<?php
require __DIR__ . '/bootstrap.php';

$T = ['cursos' => 'id', 'profesores' => 'id', 'materias' => 'id', 'estudiantes' => 'codigo'];
$t = $_GET['t'] ?? '';
if (!isset($T[$t])) out(['error' => 'Tabla inválida'], 400);
$pk = $T[$t];

// ---------- LEER (admin: todo | profesor: solo lo suyo) ----------
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $u = need(['admin', 'profesor']);
  if ($u['rol'] === 'admin') {
    $st = $pdo->query("SELECT * FROM $t");
  } else {
    $sub = 'SELECT curso_id FROM materias WHERE profesor_id = ?';
    $sql = [
      'materias'    => 'SELECT * FROM materias WHERE profesor_id = ?',
      'cursos'      => "SELECT * FROM cursos WHERE id IN ($sub)",
      'estudiantes' => "SELECT * FROM estudiantes WHERE curso_id IN ($sub)",
      'profesores'  => 'SELECT * FROM profesores WHERE id = ?',
    ][$t];
    $st = $pdo->prepare($sql);
    $st->execute([$u['profesor_id']]);
  }
  $rows = $st->fetchAll();
  if ($t === 'materias') foreach ($rows as &$r) $r['horarios'] = json_decode($r['horarios'], true) ?: [];
  unset($r);
  out($rows);
}

// ---------- ESCRIBIR (solo admin) ----------
need(['admin']);
$b = body();
$accion = $b['accion'] ?? '';
$id = $b['pk'] ?? null;

if ($accion === 'eliminar') {
  $pdo->prepare("DELETE FROM $t WHERE $pk = ?")->execute([$id]);
  out(['ok' => true]);
}
if ($accion === 'reset_clave') {
  if (!in_array($t, ['profesores', 'estudiantes'], true)) out(['error' => 'No aplica'], 400);
  $col = $t === 'profesores' ? 'profesor_id' : 'estudiante_codigo';
  $st = $pdo->prepare("SELECT usuario FROM usuarios WHERE $col = ?");
  $st->execute([$id]);
  $us = $st->fetchColumn();
  if (!$us) out(['error' => 'Ese registro no tiene usuario'], 404);
  $pdo->prepare('UPDATE usuarios SET clave_hash = ?, cambiar_clave = 1 WHERE usuario = ?')
      ->execute([password_hash($us, PASSWORD_DEFAULT), $us]);   // clave = su usuario (DNI/código)
  out(['ok' => true]);
}
if ($accion !== 'guardar') out(['error' => 'Acción inválida'], 400);

function datos(string $t, array $in, bool $nuevo): array {
  $s = fn($k) => trim((string)($in[$k] ?? ''));
  $falla = fn($m) => out(['error' => $m], 422);
  switch ($t) {
    case 'cursos':
      $d = ['anio' => (int)$s('anio'), 'division' => strtoupper($s('division')), 'carrera' => $s('carrera')];
      if ($d['anio'] < 1 || $d['anio'] > 6 || $d['division'] === '' || $d['carrera'] === '') $falla('Completá año, división y carrera.');
      return $d;
    case 'profesores':
      $d = ['dni' => $s('dni'), 'nombre' => $s('nombre'), 'email' => $s('email')];
      if (!preg_match('/^\d{6,9}$/', $d['dni'])) $falla('El DNI debe tener entre 6 y 9 números.');
      if ($d['nombre'] === '' || !filter_var($d['email'], FILTER_VALIDATE_EMAIL)) $falla('Nombre o email inválido.');
      return $d;
    case 'materias':
      $hs = is_array($in['horarios'] ?? null) ? $in['horarios'] : [];
      foreach ($hs as $h)
        if (!isset($h['dia'], $h['desde'], $h['hasta']) || $h['dia'] < 1 || $h['dia'] > 6 ||
            !preg_match('/^\d{2}:\d{2}$/', $h['desde']) || !preg_match('/^\d{2}:\d{2}$/', $h['hasta']) || $h['desde'] >= $h['hasta'])
          $falla('Horario inválido.');
      $d = ['nombre' => $s('nombre'), 'curso_id' => (int)$s('curso_id'),
            'profesor_id' => $s('profesor_id') === '' ? null : (int)$s('profesor_id'),
            'horarios' => json_encode(array_values($hs))];
      if ($d['nombre'] === '' || !$d['curso_id']) $falla('Completá nombre y curso.');
      return $d;
    case 'estudiantes':
      $mac = $s('mac') === '' ? null : norm_mac($s('mac'));
      if ($s('mac') !== '' && !$mac) $falla('MAC inválida (ej: AA:BB:CC:DD:EE:FF).');
      $d = ['nombre' => $s('nombre'), 'email' => '', 'curso_id' => (int)$s('curso_id'), 'mac' => $mac];
      if ($nuevo) {
        $d = ['codigo' => $s('codigo')] + $d;
        if (!preg_match('/^[A-Za-z0-9]{3,20}$/', $d['codigo'])) $falla('El código debe ser alfanumérico (3 a 20).');
      }
      if ($d['nombre'] === '' || !$d['curso_id']) $falla('Completá nombre y curso.');
      return $d;
  }
}
function crear_usuario($usuario, $rol, $nombre, $profId, $codigo) {
  global $pdo;
  $pdo->prepare('INSERT INTO usuarios (usuario, clave_hash, rol, nombre, profesor_id, estudiante_codigo) VALUES (?,?,?,?,?,?)')
      ->execute([$usuario, password_hash($usuario, PASSWORD_DEFAULT), $rol, $nombre, $profId, $codigo]);
}

$nuevo = ($id === null || $id === '');
$d = datos($t, $b['data'] ?? [], $nuevo);

$pdo->beginTransaction();
if ($nuevo) {
  $cols = implode(',', array_keys($d));
  $ph = implode(',', array_fill(0, count($d), '?'));
  $pdo->prepare("INSERT INTO $t ($cols) VALUES ($ph)")->execute(array_values($d));
  $nid = $pdo->lastInsertId();
  // Se crea el usuario de acceso automáticamente: usuario = DNI/código, clave inicial = lo mismo (obliga a cambiarla)
  if ($t === 'profesores')  crear_usuario($d['dni'], 'profesor', $d['nombre'], (int)$nid, null);
  if ($t === 'estudiantes') crear_usuario($d['codigo'], 'alumno', $d['nombre'], null, $d['codigo']);
} else {
  $set = implode(',', array_map(fn($k) => "$k = ?", array_keys($d)));
  $pdo->prepare("UPDATE $t SET $set WHERE $pk = ?")->execute(array_merge(array_values($d), [$id]));
  if ($t === 'profesores')  $pdo->prepare('UPDATE usuarios SET nombre = ?, usuario = ? WHERE profesor_id = ?')->execute([$d['nombre'], $d['dni'], $id]);
  if ($t === 'estudiantes') $pdo->prepare('UPDATE usuarios SET nombre = ? WHERE estudiante_codigo = ?')->execute([$d['nombre'], $id]);
}
$pdo->commit();
out(['ok' => true]);