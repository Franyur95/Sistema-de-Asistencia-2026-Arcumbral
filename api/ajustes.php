<?php
require __DIR__ . '/bootstrap.php';
need(['admin']);
function guardar_ajuste($k, $v) {
  global $pdo;
  $pdo->prepare('INSERT INTO ajustes (clave, valor) VALUES (?,?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)')->execute([$k, $v]);
}
if ($_SERVER['REQUEST_METHOD'] === 'GET')
  out(['ip_actual' => ip_cliente(), 'ips_permitidas' => ajuste('ips_permitidas'), 'token_agente' => ajuste('token_agente')]);

$b = body();
if (($b['accion'] ?? '') === 'nuevo_token') { $t = bin2hex(random_bytes(24)); guardar_ajuste('token_agente', $t); out(['token_agente' => $t]); }
guardar_ajuste('ips_permitidas', substr(trim((string)($b['ips_permitidas'] ?? '')), 0, 500));
out(['ok' => true]);