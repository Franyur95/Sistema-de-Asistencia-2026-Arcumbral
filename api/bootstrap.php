<?php
require __DIR__ . '/config.php';
date_default_timezone_set('America/Argentina/Jujuy');
session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax', 'secure' => !empty($_SERVER['HTTPS'])]);
session_start();

function out($data, int $code = 200) {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}
function body(): array { $j = json_decode(file_get_contents('php://input'), true); return is_array($j) ? $j : []; }

try {
  $pdo = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
  ]);
} catch (PDOException $e) { out(['error' => 'No se pudo conectar a la base de datos'], 500); }

set_exception_handler(function ($e) use ($pdo) {
  if ($pdo->inTransaction()) $pdo->rollBack();
  if ($e instanceof PDOException && $e->getCode() === '23000')
    out(['error' => 'Registro duplicado o en uso por otros datos: no se puede completar.'], 409);
  error_log($e->getMessage());
  out(['error' => 'Error interno del servidor'], 500);
});

// ---------- Sesión y permisos ----------
function usuario_actual() {
  global $pdo;
  if (empty($_SESSION['uid'])) return null;
  $st = $pdo->prepare('SELECT * FROM usuarios WHERE id = ?');
  $st->execute([$_SESSION['uid']]);
  return $st->fetch() ?: null;
}
function publico(array $u): array {
  return ['usuario' => $u['usuario'], 'nombre' => $u['nombre'], 'rol' => $u['rol'], 'cambiar_clave' => (bool)$u['cambiar_clave']];
}
function need(array $roles): array {
  $u = usuario_actual();
  if (!$u) out(['error' => 'No autenticado'], 401);
  if ($u['cambiar_clave']) out(['error' => 'Debés cambiar tu contraseña primero'], 403);
  if (!in_array($u['rol'], $roles, true)) out(['error' => 'Sin permiso'], 403);
  return $u;
}

// ---------- Ajustes, IP y MAC ----------
function ajuste(string $k): string {
  global $pdo;
  $st = $pdo->prepare('SELECT valor FROM ajustes WHERE clave = ?');
  $st->execute([$k]);
  return (string)$st->fetchColumn();
}
function ip_cliente(): string {
  if (CONFIAR_PROXY) {
    if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) return trim($_SERVER['HTTP_CF_CONNECTING_IP']);
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) return trim(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0]);
  }
  return $_SERVER['REMOTE_ADDR'] ?? '';
}
function ip_permitida(): bool {
  $ip = ip_cliente();
  foreach (explode(',', ajuste('ips_permitidas')) as $p) {
    $p = trim($p);
    if ($p === '') continue;
    if ($p === $ip) return true;
    if (substr($p, -1) === '*' && strpos($ip, rtrim($p, '*')) === 0) return true; // ej: 2800:abc:*
  }
  return false;
}
function norm_mac(string $m): ?string {
  $p = preg_split('/[:-]/', trim($m));
  if (count($p) !== 6) return null;
  foreach ($p as $x) if (!preg_match('/^[0-9a-fA-F]{1,2}$/', $x)) return null;
  return strtoupper(implode(':', array_map(fn($x) => str_pad($x, 2, '0', STR_PAD_LEFT), $p)));
}

// ---------- Asistencia (WiFi, agente y marca manual) ----------
function materia_actual(int $cursoId): ?array {
  global $pdo;
  $st = $pdo->prepare('SELECT * FROM materias WHERE curso_id = ?');
  $st->execute([$cursoId]);
  $dia = (int)date('N'); $ahora = time();
  foreach ($st->fetchAll() as $m)
    foreach (json_decode($m['horarios'], true) ?: [] as $h) {
      if ((int)$h['dia'] !== $dia) continue;
      $ini = strtotime(date('Y-m-d') . ' ' . $h['desde']) - MIN_ANTES * 60;
      $fin = strtotime(date('Y-m-d') . ' ' . $h['hasta']);
      if ($ahora >= $ini && $ahora <= $fin) return $m;
    }
  return null;
}
function registrar(string $codigo, int $materiaId, string $metodo): string {
  global $pdo;
  $st = $pdo->prepare('INSERT IGNORE INTO asistencias (codigo, materia_id, dia, fecha, metodo) VALUES (?,?,?,?,?)');
  $st->execute([$codigo, $materiaId, date('Y-m-d'), date('Y-m-d H:i:s'), $metodo]);
  return $st->rowCount() ? 'registrada' : 'duplicada';
}