<?php
const URL_API = 'https://TU-DOMINIO/api/wifi_agent.php';
const TOKEN   = 'PEGAR_TOKEN_DESDE_AJUSTES';
const RED     = '192.168.1.';    // prefijo de tu red /24; revisalo con ipconfig / ip a

$win = stripos(PHP_OS, 'WIN') === 0;
// 1) "Despertar" la red para que la tabla ARP se llene
for ($i = 1; $i < 255; $i++) {
  $ip = RED . $i;
  pclose(popen($win ? "start /b ping -n 1 -w 300 $ip >nul" : "ping -c1 -W1 $ip >/dev/null 2>&1 &", 'r'));
}
sleep(6);
// 2) Leer MACs
$salida = $win ? shell_exec('arp -a') : (shell_exec('arp -an 2>/dev/null') ?: shell_exec('ip neigh'));
preg_match_all('/[0-9a-f]{1,2}(?:[:-][0-9a-f]{1,2}){5}/i', (string)$salida, $m);
$macs = array_values(array_unique($m[0]));
// 3) Enviar
$ctx = stream_context_create(['http' => [
  'method' => 'POST', 'timeout' => 20,
  'header' => "Content-Type: application/json\r\n",
  'content' => json_encode(['token' => TOKEN, 'macs' => $macs]),
]]);
echo @file_get_contents(URL_API, false, $ctx) ?: "Error al contactar el servidor\n";