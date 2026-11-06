const mostrarCambio = () => { $('loginForm').classList.add('hidden'); $('claveForm').classList.remove('hidden'); };

document.addEventListener('DOMContentLoaded', async () => {
  try { // ¿ya hay sesión?
    const { usuario } = await api('api/auth.php?accion=me');
    if (usuario.cambiar_clave) mostrarCambio(); else location.href = 'index.html';
  } catch (e) {}
});

$('loginForm').onsubmit = async ev => {
  ev.preventDefault();
  try {
    const { usuario } = await api('api/auth.php?accion=login', { usuario: $('usuario').value, clave: $('clave').value });
    if (usuario.cambiar_clave) { $('actual').value = $('clave').value; mostrarCambio(); }
    else location.href = 'index.html';
  } catch (e) { alert(e.message); }
};

$('claveForm').onsubmit = async ev => {
  ev.preventDefault();
  try {
    await api('api/auth.php?accion=cambiar_clave', { actual: $('actual').value, nueva: $('nueva').value });
    location.href = 'index.html';
  } catch (e) { alert(e.message); }
};