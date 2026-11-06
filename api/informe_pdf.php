<?php
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/../lib/fpdf19/fpdf.php';
$u = need(['admin', 'profesor', 'alumno']);

$desde = $_GET['desde'] ?? date('Y-m-01');
$hasta = $_GET['hasta'] ?? date('Y-m-d');
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $desde) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $hasta)) out(['error' => 'Fechas inválidas'], 422);

function t($s) { return iconv('UTF-8', 'windows-1252//TRANSLIT', (string)$s); }
function pct($p, $c) { return $c > 0 ? round($p * 100 / $c) . '%' : '-'; }
function tabla(FPDF $pdf, array $cab, array $w, array $filas) {
  $pdf->SetFont('Arial', 'B', 10); $pdf->SetFillColor(30, 58, 95); $pdf->SetTextColor(255);
  foreach ($cab as $i => $c) $pdf->Cell($w[$i], 7, t($c), 1, 0, 'C', true);
  $pdf->Ln(); $pdf->SetFont('Arial', '', 10); $pdf->SetTextColor(0);
  foreach ($filas as $f) {
    foreach (array_values($f) as $i => $v) $pdf->Cell($w[$i], 6, substr(t($v), 0, 48), 1, 0, $i < count($w) - 3 ? 'L' : 'C');
    $pdf->Ln();
  }
}

$pdf = new FPDF('P', 'mm', 'A4');
$pdf->AddPage(); $pdf->SetAutoPageBreak(true, 15);
$pdf->SetFont('Arial', 'B', 14);
$pdf->Cell(0, 8, t('I.E.S. N° 11 - Informe de asistencia'), 0, 1, 'C');
$pdf->SetFont('Arial', '', 10);

if ($u['rol'] === 'alumno') {
  $st = $pdo->prepare('SELECT * FROM estudiantes WHERE codigo = ?'); $st->execute([$u['estudiante_codigo']]);
  $e = $st->fetch();
  $pdf->Cell(0, 6, t("Alumno: {$e['nombre']} ({$e['codigo']})"), 0, 1);
  $pdf->Cell(0, 6, t("Período: $desde a $hasta"), 0, 1);
  $pdf->Ln(3);
  $st = $pdo->prepare('SELECT m.nombre,
      (SELECT COUNT(*) FROM asistencias a WHERE a.materia_id = m.id AND a.codigo = ? AND a.dia BETWEEN ? AND ?) AS presentes,
      (SELECT COUNT(DISTINCT a.dia) FROM asistencias a WHERE a.materia_id = m.id AND a.dia BETWEEN ? AND ?) AS clases
      FROM materias m WHERE m.curso_id = ? ORDER BY m.nombre');
  $st->execute([$e['codigo'], $desde, $hasta, $desde, $hasta, $e['curso_id']]);
  $filas = array_map(fn($r) => [$r['nombre'], $r['presentes'], $r['clases'], pct($r['presentes'], $r['clases'])], $st->fetchAll());
  tabla($pdf, ['Materia', 'Presentes', 'Clases', '% asistencia'], [90, 30, 30, 40], $filas);
} else {
  $st = $pdo->prepare('SELECT m.*, c.anio, c.division, c.carrera FROM materias m JOIN cursos c ON c.id = m.curso_id WHERE m.id = ?');
  $st->execute([(int)($_GET['materia_id'] ?? 0)]);
  $m = $st->fetch();
  if (!$m) out(['error' => 'Materia inexistente'], 404);
  if ($u['rol'] === 'profesor' && (int)$m['profesor_id'] !== (int)$u['profesor_id']) out(['error' => 'Esa materia no es tuya'], 403);

  $st = $pdo->prepare('SELECT COUNT(DISTINCT dia) FROM asistencias WHERE materia_id = ? AND dia BETWEEN ? AND ?');
  $st->execute([$m['id'], $desde, $hasta]);
  $clases = (int)$st->fetchColumn();

  $pdf->Cell(0, 6, t("Materia: {$m['nombre']}"), 0, 1);
  $pdf->Cell(0, 6, t("Curso: {$m['anio']}° {$m['division']} - {$m['carrera']}"), 0, 1);
  $pdf->Cell(0, 6, t("Período: $desde a $hasta   |   Clases con registro: $clases"), 0, 1);
  $pdf->Ln(3);
  $st = $pdo->prepare('SELECT e.codigo, e.nombre,
      (SELECT COUNT(*) FROM asistencias a WHERE a.materia_id = ? AND a.codigo = e.codigo AND a.dia BETWEEN ? AND ?) AS presentes
      FROM estudiantes e WHERE e.curso_id = ? ORDER BY e.nombre');
  $st->execute([$m['id'], $desde, $hasta, $m['curso_id']]);
  $filas = array_map(fn($r) => [$r['codigo'], $r['nombre'], $r['presentes'], $clases, pct($r['presentes'], $clases)], $st->fetchAll());
  tabla($pdf, ['Código', 'Alumno', 'Presentes', 'Clases', '%'], [30, 80, 25, 25, 25], $filas);
}
$pdf->Ln(4); $pdf->SetFont('Arial', 'I', 8);
$pdf->Cell(0, 5, t('Generado el ' . date('d/m/Y H:i') . '. "Clases" = días con al menos un registro de asistencia.'), 0, 1);
$pdf->Output('D', 'informe-asistencia.pdf');