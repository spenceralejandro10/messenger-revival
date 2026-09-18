# Messenger Revival — Entrega técnica para Patricia

Carpeta de transferencia técnica separada del código operativo del proyecto.

**Destinataria:** Patricia, ingeniera de sistemas  
**Proyecto:** Messenger Revival  
**Repositorio origen:** `spenceralejandro10/messenger-revival`

## Contenido de la entrega

### Base de datos
- `database/RESPALDO_BASE_DE_DATOS_PARA_PATRICIA.json`: snapshot de datos actuales del esquema público y metadatos de Storage.
- `database/LIVE_SCHEMA_MANIFEST_FOR_PATRICIA.json`: referencia del esquema vivo: tablas, columnas, constraints, índices, RLS, funciones, policies y triggers.
- `database/README_DATABASE_BACKUP.md`: guía de restauración y remapeo.

### Documentación
- `documentation/01_ARCHITECTURE_AND_TECH_STACK.md`
- `documentation/02_FEATURES_AND_RUNTIME_FLOWS.md`
- `documentation/03_DATABASE_SUPABASE_AND_RESTORE.md`
- `documentation/04_DEVELOPMENT_DEPLOYMENT_AND_OPERATIONS.md`
- `documentation/05_FILE_MAP_AND_MAINTENANCE.md`
- `documentation/06_AI_AGENT_INSTALLATION_AND_RUNTIME_GUIDE.md` — guía específica para Claude, ChatGPT Work u otros agentes de desarrollo.

## Resumen ejecutivo

Messenger Revival es una aplicación web inspirada en MSN Messenger 2005. El frontend está construido con HTML, CSS y JavaScript puro. Supabase proporciona autenticación, PostgreSQL, Row Level Security, Realtime y Storage. Las videollamadas utilizan WebRTC con signaling apoyado en Supabase.

## Punto de entrada

`index.html` carga la interfaz base. `clean-test-profile.js` y `auth-bootstrap-2005.js` cargan módulos adicionales de forma dinámica.

Antes de modificar un módulo conviene comprobar tanto las cargas directas de `index.html` como las cargas dinámicas.

## Backend original

El proyecto Supabase utilizado en el momento del respaldo tiene ref `ctjnmludmchanvjbqiai`.

Para continuar el proyecto en otra cuenta:
1. crear un Supabase nuevo;
2. aplicar las migraciones;
3. comparar el resultado contra el manifest vivo;
4. crear los buckets requeridos;
5. cambiar `supabase-config.js` a la configuración pública del nuevo proyecto;
6. crear cuentas nuevas de prueba;
7. validar cada flujo antes de importar historial.

## Nota sobre los UUID

El snapshot contiene UUID históricos del proyecto original. En una instalación nueva los UUID de las cuentas pueden ser distintos. Si se desea importar historial, hay que remapear las referencias relacionadas.

## Storage

El respaldo contiene metadatos de Storage, no los bytes de imágenes, audios y adjuntos. Los objetos reales deben copiarse por separado si se quieren conservar.

## Zonas delicadas

- Realtime y polling de respaldo;
- chat directo y conversación con participantes;
- guiños y zumbidos;
- presencia;
- WebRTC y signaling;
- limpieza de listeners, timers y channels.

## Recomendación de mantenimiento

Mantener una sola fuente de verdad por funcionalidad, usar Realtime como vía principal, conservar polling solo como fallback y hacer cambios pequeños con validación frecuente.

Leer los documentos de `documentation/` en orden numérico antes de una refactorización grande.
