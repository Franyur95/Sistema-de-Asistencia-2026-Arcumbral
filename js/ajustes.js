document.addEventListener('DOMContentLoaded', async () => {
  await iniciarPagina(['admin']);
  const d = await api('api/ajustes.php');
  $('ipActual').textContent = d.ip_actual;
  $('ips').value = d.ips_permitidas;
  $('token').value = d.token_agente;

  $('agregarIp').onclick = () => {
    const l = $('ips').value.split(',').map(s => s.trim()).filter(Boolean);
    if (!l.includes(d.ip_actual)) l.push(d.ip_actual);
    $('ips').value = l.join(', ');
  };
  $('guardarIps').onclick = async () => {
    try { await api('api/ajustes.php', { ips_permitidas: $('ips').value }); alert('Guardado.'); } catch (e) { alert(e.message); }
  };
  $('nuevoToken').onclick = async () => {
    if (!confirm('El agente dejará de funcionar hasta que le pegues el token nuevo. ¿Continuar?')) return;
    try { $('token').value = (await api('api/ajustes.php', { accion: 'nuevo_token' })).token_agente; } catch (e) { alert(e.message); }
  };
});