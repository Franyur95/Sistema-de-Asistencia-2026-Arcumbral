<?php
require __DIR__ . '/bootstrap.php';
$a = $_GET['accion'] ?? '';
$b = body();

if ($a === 'login') {
  $st = $pdo->prepare('SELECT * FROM usuarios WHERE usuario = ?');
  $st->execute([trim((string)($b['usuario'] ?? ''))]);
  $u = $st->fetch();
  if (!$u || !password_verify((string)($b['clave'] ?? ''), $u['clave_hash'])) {
    sleep(1); // frena fuerza bruta
    out(['error' => 'Usuario o contraseña incorrectos'], 401);
  }
  session_regenerate_id(true);
  $_SESSION['uid'] = $u['id'];
  out(['usuario' => publico($u)]);
}
if ($a === 'logout') { session_destroy(); out(['ok' => true]); }

$u = usuario_actual();
if (!$u) out(['error' => 'No autenticado'], 401);
if ($a === 'me') out(['usuario' => publico($u)]);

if ($a === 'cambiar_clave') {
  $nueva = (string)($b['nueva'] ?? '');
  if (!password_verify((string)($b['actual'] ?? ''), $u['clave_hash'])) out(['error' => 'La contraseña actual no es correcta'], 422);
  if (strlen($nueva) < 8 || $nueva === $u['usuario']) out(['error' => 'La nueva contraseña debe tener 8+ caracteres y no ser tu usuario'], 422);
  $pdo->prepare('UPDATE usuarios SET clave_hash = ?, cambiar_clave = 0 WHERE id = ?')
      ->execute([password_hash($nueva, PASSWORD_DEFAULT), $u['id']]);
  out(['ok' => true]);
}
out(['error' => 'Acción inválida'], 400);