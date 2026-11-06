# Sistema de Asistencia ARCUMBRAL

Sistema web de gestión y registro de asistencia para instituciones educativas. Permite administrar alumnos, cursos, profesores y materias, y registrar y consultar asistencias.

## Características

- Gestión de alumnos.
- Gestión de cursos.
- Gestión de profesores.
- Gestión de materias.
- Registro de asistencia mediante los métodos disponibles en el sistema.
- Detección de conexión a la red WiFi del instituto.
- Historial de asistencias.
- Interfaz web adaptable.

## Tecnologías

- HTML5
- CSS3
- JavaScript
- PHP
- MySQL

## Requisitos

Para ejecutar el proyecto localmente se necesita:

- Windows, Linux o un sistema compatible.
- XAMPP.
- Apache.
- MySQL o MariaDB.
- Navegador web actualizado.
- Git (opcional, para clonar el repositorio).

## Instalación local con XAMPP

### 1. Descargar el proyecto

Clonar el repositorio:

```bash
git clone https://github.com/Franyur95/Sistema-de-Asistencia-2026-Arcumbral.git
```

También se puede descargar el proyecto desde GitHub mediante la opción **Code → Download ZIP**.

### 2. Colocar el proyecto en XAMPP

Copiar la carpeta del proyecto dentro de:

```text
C:\xampp\htdocs\
```

La ruta final debería ser similar a:

```text
C:\xampp\htdocs\Sistema-de-Asistencia-2026-Arcumbral
```

### 3. Iniciar los servicios

Abrir el panel de control de XAMPP e iniciar:

- Apache
- MySQL

### 4. Crear la base de datos

Abrir phpMyAdmin:

```text
http://localhost/phpmyadmin
```

Crear una base de datos con el nombre:

```text
sia
```

Se recomienda utilizar la codificación `utf8mb4` con una intercalación compatible, por ejemplo `utf8mb4_unicode_ci`.

### 5. Importar la base de datos

1. Seleccionar la base de datos `sia`.
2. Entrar en la pestaña **Importar**.
3. Seleccionar el archivo `sql/sia.sql` del proyecto.
4. Presionar **Importar** o **Continuar**.
5. Esperar el mensaje de importación correcta.

**Importante:** realizar la importación en una base de datos nueva y vacía. No importar este archivo sobre una base que ya contenga información importante.

### 6. Configurar la conexión a MySQL

Abrir el archivo:

```text
api/config.php
```

Configurar los datos de conexión según la instalación local:

```php
<?php
const DB_HOST = 'localhost';
const DB_NAME = 'sia';
const DB_USER = 'root';
const DB_PASS = '';
const CONFIAR_PROXY = false;
const MIN_ANTES = 10;
```

En una instalación típica de XAMPP, el usuario suele ser `root` y la contraseña puede estar vacía.

Si MySQL tiene una contraseña configurada, modificar `DB_PASS` con la contraseña correspondiente.

Cada instalación puede tener credenciales diferentes.

### 7. Ingresar al sistema

Abrir en el navegador:

```text
http://localhost/Sistema-de-Asistencia-2026-Arcumbral/
```

Si es necesario, ingresar directamente desde:

```text
http://localhost/Sistema-de-Asistencia-2026-Arcumbral/login.html
```

### 8. Administrador inicial

La base de datos de instalación incluye un administrador inicial:

- **Usuario:** `admin`
- **Contraseña inicial:** `contra123`

Cambiar la contraseña después del primer ingreso, si el sistema solicita hacerlo.

No utilizar estas credenciales iniciales en un entorno de producción.

## Estructura del proyecto

```text
Sistema-de-Asistencia-2026-Arcumbral/
│
├── agente/
├── api/
├── css/
├── js/
├── lib/
├── public/
├── sql/
│   └── sia.sql
│
├── ajustes.html
├── alumno.html
├── asistencia.html
├── cursos.html
├── historial.html
├── index.html
├── login.html
├── materias.html
├── profesores.html
├── registro.html
└── README.md
```

## Instalación en un hosting

Para instalar el sistema en un hosting:

1. Crear una base de datos MySQL desde el panel del proveedor.
2. Importar el archivo `sql/sia.sql` desde phpMyAdmin.
3. Subir los archivos del proyecto al directorio público del hosting.
4. Modificar `api/config.php` con el host, nombre de base de datos, usuario y contraseña proporcionados por el hosting.
5. Comprobar el acceso al sistema y el funcionamiento de sus funciones.

**Importante:** los datos de conexión de un hosting no son los mismos que los de XAMPP. No copiar las credenciales locales sin modificarlas.

## Recomendaciones de seguridad

- Cambiar la contraseña inicial del administrador.
- No publicar contraseñas reales de MySQL.
- No compartir copias de bases de datos que contengan información personal.
- Realizar copias de seguridad periódicas.
- Mantener protegidos los archivos de configuración.

## Repositorio

GitHub:

https://github.com/Franyur95/Sistema-de-Asistencia-2026-Arcumbral

## Proyecto

**Sistema de Asistencia ARCUMBRAL**