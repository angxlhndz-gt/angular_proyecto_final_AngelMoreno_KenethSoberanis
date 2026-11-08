# Gestión académica — Proyecto final de Programación Web

Aplicación web para administrar estudiantes e inscripciones académicas. Está construida con Angular 20 y Angular Material. No necesita backend ni base de datos remota: los catálogos se cargan desde archivos JSON y los registros se guardan en el navegador.

## Funciones

- **Estudiantes:** crear, consultar, buscar, editar y eliminar registros; agregar contactos y activar o desactivar cada uno. No permite repetir códigos ni eliminar estudiantes vinculados a inscripciones.
- **Inscripciones:** crear y consultar inscripciones; buscar y filtrar por estudiante, período y estado; editar y cancelar. Una cancelación conserva el registro en el historial.
- **Respaldo:** exportar estudiantes e inscripciones como un único archivo JSON versionado. La importación comprueba la estructura, los campos, los duplicados y las referencias a catálogos. Los datos existentes solo se reemplazan después de una validación correcta y de confirmar la acción.
- **Diseño adaptable:** navegación y formularios adaptados a escritorio, tableta y teléfono.

## Requisitos

- Node.js y npm instalados.
- Un navegador web actualizado.

## Instalación y ejecución

Desde una terminal, clona el repositorio e instala las dependencias:

```bash
git clone https://github.com/angxlhndz-gt/angular_proyecto_final_AngelMoreno_KenethSoberanis.git
cd angular_proyecto_final_AngelMoreno_KenethSoberanis
npm ci
```

Inicia el servidor de desarrollo:

```bash
npm start
```

Abre [http://localhost:4200/](http://localhost:4200/) en el navegador. Angular CLI reconstruye la aplicación cuando detecta cambios en los archivos. Para detener el servidor, presiona `Ctrl+C` en la terminal.

## Estructura del proyecto

```text
public/data/                 Catálogos JSON de cursos, períodos, estados y opciones
src/app/core/models/         Modelos de estudiantes, inscripciones y respaldos
src/app/core/services/       Catálogos, almacenamiento, datos y validación de respaldos
src/app/features/home/       Página de inicio
src/app/features/students/   Formulario y administración de estudiantes
src/app/features/enrollments/ Formulario, consulta y administración de inscripciones
src/app/shared/              Componentes compartidos, como el diálogo de confirmación
src/app/app.config*.ts       Configuración de Angular y renderizado en servidor
src/styles.scss              Tema global de Angular Material y estilos base
```

Los formularios usan Reactive Forms. Los componentes solicitan y guardan registros mediante servicios; el acceso a `localStorage` está centralizado y protegido para que no se ejecute durante el renderizado en servidor.

## Persistencia de datos

Estudiantes e inscripciones se guardan localmente en el navegador mediante `ApplicationDataService` y `BrowserStorageService`. Los datos no se sincronizan entre navegadores ni computadoras. Usa **Exportar datos** para guardar un respaldo y conservar una copia fuera del navegador.

Los catálogos se leen desde `public/data/`. Los cursos y períodos disponibles para las inscripciones dependen de esos archivos.
