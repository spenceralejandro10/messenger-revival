# 03 — Supabase, modelo de datos y restauración

## 1. Rol de Supabase

Supabase cumple cinco funciones principales:
1. autenticación;
2. PostgreSQL;
3. Realtime;
4. Storage;
5. seguridad mediante RLS y RPC.

El frontend habla directamente con Supabase usando `@supabase/supabase-js`.

## 2. Configuración frontend

Archivo:
`supabase-config.js`

Contiene:
- URL pública del proyecto;
- publishable key;
- nombre de bucket de display pictures.

En el proyecto nuevo de Patricia hay que sustituir esa configuración por la del nuevo Supabase.

## 3. Tablas principales

### `profiles`
Perfil público/aplicativo del usuario.

Responsabilidades:
- email;
- display_name;
- personal_message;
- display_picture;
- status;
- last_seen_at;
- formato del nombre;
- formato del texto de chat;
- timestamps.

Está vinculada a la identidad de Auth mediante UUID.

### `profile_details`
Datos extendidos:
- age;
- gender;
- orientation;
- nationality;
- interests;
- looking_for;
- updated_at.

### `contacts`
Relación de contactos.

Claves principales:
- owner_id;
- contact_id.

El sistema evolucionó para trabajar con amistad recíproca.

### `friend_requests`
Solicitudes:
- sender_id;
- receiver_id;
- status;
- timestamps.

### `blocks`
Bloqueos por usuario:
- owner_id;
- blocked_id.

### `messages`
Mensajes directos 1:1.

Contiene:
- id;
- sender_id;
- recipient_id;
- kind;
- body;
- attachment_url;
- attachment_name;
- attachment_mime;
- attachment_size;
- format JSON;
- created_at;
- read_at.

Kinds actuales:
- text;
- image;
- audio;
- file;
- emoji;
- nudge;
- wink.

### `conversation_state`
Estado local por usuario/conversación:
- owner_id;
- peer_id;
- cleared_at;
- muted;
- updated_at.

Se usa para limpiar una conversación solo para una cuenta sin destruir el historial global.

### `video_call_signals`
Signaling WebRTC.

Campos:
- id;
- call_id;
- sender_id;
- recipient_id;
- signal_type;
- payload JSON;
- created_at;
- expires_at.

Es tabla efímera y puede crecer si no se depura.

### `group_conversations`
Conversaciones multipersona.

Campos relevantes:
- id;
- created_by;
- title;
- created_at;
- member_signature.

### `group_conversation_members`
Membresía:
- conversation_id;
- user_id;
- invited_by;
- joined_at.

### `group_messages`
Mensajes de conversación multipersona:
- id;
- conversation_id;
- sender_id;
- kind;
- body;
- format;
- created_at.

## 4. Funciones PostgreSQL importantes

El esquema vivo incluye, entre otras:
- `add_member_to_group`;
- `can_send_message`;
- `cancel_friend_request`;
- `clear_conversation`;
- `create_group_from_direct`;
- `direct_conversation_host`;
- `find_latest_conversation_room`;
- `get_direct_invite_candidates`;
- `get_group_invite_candidates`;
- `get_mutual_contact_ids`;
- `handle_new_user`;
- `heartbeat_presence`;
- `is_group_member`;
- `mark_conversation_read`;
- `mark_presence_offline`;
- `remove_conversation_participant`;
- `remove_friend`;
- `rename_group`;
- `respond_friend_request`;
- `send_friend_request`;
- funciones de control de señales de video;
- función de sincronización de eliminación recíproca.

La definición exacta de cada función está guardada en:
`database/LIVE_SCHEMA_MANIFEST_FOR_PATRICIA.json`.

## 5. RLS

Las tablas sensibles usan Row Level Security.

Objetivos:
- usuarios solo ven/modifican lo permitido;
- mensajes solo disponibles para participantes correspondientes;
- grupos solo visibles para miembros;
- operaciones privilegiadas pasan por RPC validando identidad;
- Storage limita escritura según usuario/ruta.

Nunca reemplazar una policy por una simple restricción de UI.

## 6. Migraciones

Carpeta:
`supabase/migrations/`

Incluye evolución de:
- auth/perfiles;
- contactos;
- video signaling;
- grupos;
- presencia;
- display name;
- perfil personal;
- storage;
- formato de chat;
- winks;
- conversation rooms;
- friendship;
- vida útil de invitaciones de video.

Hay números repetidos porque algunas migraciones se crearon en paralelo durante el desarrollo. Patricia debe mantener el orden lógico/temporal y validar el resultado contra el manifest vivo.

## 7. Historia del esquema vivo

En el Supabase original también existen entradas de migración aplicadas mediante tooling durante el desarrollo. Algunas no tienen un archivo histórico con el mismo nombre en el repo.

Por esa razón:
- los archivos `supabase/migrations/` son el historial versionado;
- `LIVE_SCHEMA_MANIFEST_FOR_PATRICIA.json` es la fotografía autoritativa del estado vivo al momento de la entrega.

## 8. Respaldo de datos

Archivo:
`database/RESPALDO_BASE_DE_DATOS_PARA_PATRICIA.json`

Se generó consultando directamente el proyecto activo.

Incluye:
- todas las filas públicas relevantes;
- señales WebRTC actuales;
- buckets;
- metadatos de objetos Storage.

## 9. Por qué el JSON no se importa directamente

Las filas contienen UUID del proyecto original.

Una instalación nueva tendrá otras identidades. Importar sin remapeo produciría:
- foreign keys inválidas;
- ownership incorrecto;
- mensajes asignados a IDs inexistentes.

El camino correcto es crear primero usuarios nuevos y después, si se quiere conservar historia, remapear IDs.

## 10. Orden de remapeo recomendado

1. crear mapa de usuarios antiguos → usuarios nuevos;
2. adaptar `profiles`;
3. adaptar `profile_details`;
4. adaptar `contacts`;
5. adaptar `friend_requests`;
6. adaptar `blocks`;
7. adaptar `messages`;
8. adaptar `conversation_state`;
9. adaptar `group_conversations`;
10. adaptar `group_conversation_members`;
11. adaptar `group_messages`;
12. omitir normalmente `video_call_signals`.

## 11. Storage

### `display-pictures`
Fotos de usuario.

### `chat-attachments`
Adjuntos del chat.

El snapshot solo guarda metadatos. Para migración real:
- copiar objetos;
- subirlos al nuevo proyecto;
- actualizar URLs/rutas históricas.

## 12. Realtime

Tablas escuchadas por distintos módulos:
- messages;
- profiles;
- contacts;
- friend_requests;
- group_messages;
- group_conversation_members;
- video_call_signals.

Cuando se cambie una tabla o policy, comprobar si afecta payloads de Realtime.

## 13. Presencia

La presencia depende de:
- `profiles.status`;
- `profiles.last_seen_at`;
- RPC de heartbeat;
- lógica frontend de stale timeout.

No implementar online/offline únicamente por conexión WebSocket; la aplicación actual usa heartbeat persistente.

## 14. Video signaling

El signaling es datos de control, no media.

Audio/video viajan por WebRTC entre peers/TURN.
Supabase solo coordina:
- invitación;
- aceptación;
- offer/answer;
- ICE;
- cierre.

La vida útil de invitaciones está limitada para evitar llamadas viejas reapareciendo.

## 15. Prueba de RLS recomendada

Usar dos o tres cuentas diferentes y verificar:
- A no modifica perfil de B;
- A no lee chat ajeno;
- usuario no miembro no lee group_messages;
- participante eliminado deja de tener acceso;
- signal de llamada solo pertenece a emisor/receptor;
- upload de Storage respeta ownership.

## 16. Auditoría posterior a migración

Después de desplegar el esquema nuevo comparar:
- nombres de tablas;
- columnas;
- constraints;
- funciones;
- RLS;
- policies;
- triggers;
- índices.

Referencia:
`LIVE_SCHEMA_MANIFEST_FOR_PATRICIA.json`.

## 17. Datos del snapshot al momento de la entrega

El snapshot se generó del proyecto activo, no de fixtures.

Como la aplicación estaba en pruebas, incluye conversaciones y señales reales de test. Antes de reutilizar datos en otro entorno revisar si realmente son necesarios.
