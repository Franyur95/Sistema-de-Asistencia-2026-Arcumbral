<?php
require __DIR__ . '/bootstrap.php';
$b = body();
if (!hash_equals(ajuste('token_agente'), (string)($b['token'] ?? ''))) out(['error' => 'Token inválido'], 403);

$macs = [];
foreach (array_slice((array)($b['macs'] ?? []), 0, 1000) as $m) { $n = norm_mac((string)$m); if ($n) $macs[$n] = 1; }

$st = $pdo->prepare('SELECT codigo, curso_id FROM estudiantes WHERE mac = ?');
$conocidos = 0; $registrados = 0;
foreach (array_keys($macs) as $mac) {
  $st->execute([$mac]);
  $e = $st->fetch();
  if (!$e) continue;
  $conocidos++;
  $m = materia_actual((int)$e['curso_id']);          // usa el horario de la materia
  if ($m && registrar($e['codigo'], (int)$m['id'], 'WiFi') === 'registrada') $registrados++;
}
out(['detectados' => count($macs), 'alumnos' => $conocidos, 'registrados' => $registrados]);