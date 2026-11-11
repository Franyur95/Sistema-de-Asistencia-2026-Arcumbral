# Sistema de Asistencia ARCUMBRAL

Sistema web para administrar cursos, materias, profesores y estudiantes, registrar presentes e inasistencias y consultar o descargar informes de asistencia en PDF.

## 1. Funciones principales

- Administración de cursos, profesores, materias y estudiantes.
- Creación de usuarios de acceso para profesores y estudiantes.
- Registro de asistencia por QR, WiFi del instituto y marcación manual.
- Marcación manual de **presente** o **inasistencia** desde «Tomar asistencia».
- Historial con filtros por materia, fechas y estudiante.
- Exportación del historial a CSV.
- Descarga de informes PDF para una materia o para el alumno que inició sesión.
- Acceso según rol: administrador, profesor o alumno.

## 2. Requisitos

- PHP compatible con la versión utilizada por el hosting (se recomienda PHP 7.4 o superior).
- MySQL o MariaDB.
- Apache o un hosting PHP.
- Navegador actualizado.
- Para instalación local: XAMPP.

## 3. Instalación nueva con XAMPP

1. Descomprimir la carpeta del proyecto dentro de `C:\xampp\htdocs\`.
2. Abrir el panel de XAMPP e iniciar **Apache** y **MySQL**.
3. Entrar en `http://localhost/phpmyadmin`.
4. Crear una base de datos llamada `sia` (codificación recomendada: `utf8mb4`).
5. Seleccionar `sia` e importar `sql/sia.sql`.
6. Abrir `api/config.php` y colocar los datos de conexión locales. En una instalación habitual de XAMPP son:

   ```php
   const DB_HOST = 'localhost';
   const DB_NAME = 'sia';
   const DB_USER = 'root';
   const DB_PASS = '';
   ```

   No reemplazar las demás constantes del archivo; modificar únicamente los datos que correspondan a tu instalación.
7. Abrir `http://localhost/Sistema-de-Asistencia-2026-Arcumbral/login.html`.

La base de instalación incluye un usuario administrador inicial (`admin`). La contraseña inicial indicada por el proyecto es `contra123`; cambiarla al ingresar y no conservarla en producción.

## 4. Actualizar una instalación existente sin borrar datos

**No importes `sql/sia.sql` sobre una base de datos que ya contiene información.** Es el archivo único de instalación nueva e incluye instrucciones `DROP TABLE`; importarlo sobre una base en uso puede borrar tablas y datos.

El archivo `sql/sia.sql` de esta versión ya incluye la columna `estado` (`PRESENTE`/`AUSENTE`) en la tabla `asistencias`. Por eso, una instalación nueva necesita importar solamente ese archivo y no requiere migraciones adicionales.

Para actualizar una instalación anterior que todavía no tiene la columna `estado`:

1. Hacer una copia de seguridad desde phpMyAdmin: seleccionar la base → **Exportar** → SQL → **Continuar**.
2. Subir los archivos actualizados, conservando el `api/config.php` de esa instalación.
3. Seleccionar la base de datos existente en phpMyAdmin y abrir la pestaña **SQL**.
4. Ejecutar esta instrucción **una sola vez**, únicamente si la columna `estado` todavía no existe:

   ```sql
   ALTER TABLE asistencias
     ADD COLUMN estado ENUM('PRESENTE','AUSENTE') NOT NULL DEFAULT 'PRESENTE' AFTER metodo;
   ```

5. Comprobar que la tabla `asistencias` ahora tiene la columna `estado` y probar con datos de prueba.

Los registros anteriores quedan como `PRESENTE` automáticamente. Si la columna ya existe, no ejecutes el `ALTER TABLE` nuevamente.

## 5. Cómo usar el sistema

### Administrador

1. Iniciar sesión con la cuenta de administrador. ADMIN ....  contra123 
2. Crear los cursos desde **Cursos** (año, división y carrera).
3. Cargar los profesores desde **Profesores**.
4. Crear las materias desde **Materias**, asociándolas a su curso, profesor y horarios.
5. Cargar los alumnos desde **Alumnos**, asignándolos al curso correcto.
6. Entregar a cada usuario sus credenciales iniciales y pedirle que cambie la contraseña.

Al crear un profesor o alumno, el sistema genera su usuario con el DNI o código correspondiente. La contraseña inicial también se basa en ese identificador y el sistema solicita cambiarla.

### Profesor: tomar asistencia

1. Entrar en **Tomar asistencia**.
2. Elegir primero la **carrera**.
3. Elegir la **materia**. La lista muestra los alumnos inscriptos en el curso de esa materia.
4. Para cada alumno, elegir una de estas acciones:
   - **Marcar presente**: registra su asistencia manual.
   - **Marcar inasistencia**: registra que estuvo ausente en esa materia durante el día actual. El sistema pide confirmar la acción.
5. Si el alumno ya tiene un registro para ese día y materia, se muestra el estado y no se ofrecen nuevamente los botones para evitar duplicados.

La asistencia por WiFi o QR sigue funcionando. Si un alumno que tenía una inasistencia registrada luego marca su asistencia válida por WiFi/QR, el registro pasa a **PRESENTE**. Una marcación manual de presente también puede corregir una inasistencia previa.

**Importante:** la inasistencia se registra por alumno, materia y fecha. Revisá que la materia seleccionada sea la correcta antes de confirmar.

### Historial de asistencia

1. Abrir **Historial**.
2. Seleccionar una materia o «Todas las materias» si la pantalla lo permite.
3. Elegir las fechas **Desde** y **Hasta**.
4. Opcionalmente, escribir el código o nombre del estudiante.
5. Presionar **Filtrar**.
6. La tabla muestra fecha, hora, alumno, materia, estado (presente o inasistencia) y método de registro.
7. El botón **CSV** descarga los resultados filtrados para abrirlos en una planilla.

### Cómo descargar el PDF de asistencia (administrador o profesor)

1. Entrar en **Historial de Asistencia**.
2. Seleccionar la **materia** que se desea informar.
3. Elegir el rango de fechas en **Desde** y **Hasta**.
4. Presionar el botón **PDF**.
5. El navegador descargará un archivo llamado `informe-asistencia.pdf`. Si no se descarga automáticamente, revisar la carpeta **Descargas** o permitir las descargas del sitio.

El PDF de la materia incluye el curso, el período, la cantidad de clases registradas y una tabla por alumno con presentes, inasistencias y porcentaje de asistencia.

### Cómo descargar el PDF como alumno

1. Iniciar sesión con la cuenta de alumno.
2. En la pantalla del alumno, seleccionar las fechas **Desde** y **Hasta**.
3. Presionar **PDF**.
4. Se descargará el informe personal con el resumen por materia, incluyendo presentes, inasistencias, clases registradas y porcentaje de asistencia.

## 6. Asistencia por WiFi

Para que el registro automático funcione:

- El administrador debe configurar la IP pública o los rangos autorizados de la red del instituto en **Ajustes**.
- El estudiante debe conectarse a la red WiFi del instituto.
- La materia debe tener horarios configurados y debe estar dentro del horario habilitado.
- En Android, si el sistema identifica el equipo mediante MAC, puede ser necesario usar la MAC del dispositivo en vez de una MAC aleatoria, según la configuración implementada.

La conexión a la red y la existencia de una clase en ese horario son condiciones distintas: estar conectado no significa que haya una materia activa en ese momento.

## 7. Instalación o actualización en hosting

**Instalación nueva:** crear una base MySQL vacía desde el panel del hosting e importar únicamente `sql/sia.sql`. Ese archivo ya contiene todas las tablas y el campo `estado` para presentes e inasistencias. Luego configurar `api/config.php` con los datos de conexión del hosting.

**Instalación existente:** no importar `sql/sia.sql`, porque puede eliminar tablas y datos. Hacer una copia de seguridad y seguir la actualización puntual de la sección 4. Conservar el `api/config.php` que ya funciona en ese hosting.

Finalmente, probar el inicio de sesión, la toma de asistencia, el historial y la descarga PDF.

## 8. Copias de seguridad y seguridad

- Exportar periódicamente la base de datos desde phpMyAdmin.
- Guardar una copia de los archivos del sitio antes de actualizarlos.
- Cambiar las contraseñas iniciales.
- No publicar `api/config.php` ni compartir credenciales.
- No subir copias de la base de datos con información personal a repositorios públicos.
- Probar las modificaciones con datos de prueba antes de utilizarlas en clases reales.

## 9. Estructura principal

```text
Sistema-de-Asistencia-2026-Arcumbral/
├── agente/
├── api/
├── css/
├── js/
├── lib/
├── public/
├── sql/
│   └── sia.sql
├── asistencia.html
├── historial.html
├── alumno.html
├── README.md
└── ...
```

## Repositorio

https://github.com/Franyur95/Sistema-de-Asistencia-2026-Arcumbral

**Sistema de Asistencia ARCUMBRAL**
