# Respaldo de base de datos para Patricia

## Archivos

### `RESPALDO_BASE_DE_DATOS_PARA_PATRICIA.json`
Snapshot generado desde el Supabase vivo de Messenger Revival.

Incluye datos de:
- `public.profiles`
- `public.contacts`
- `public.friend_requests`
- `public.blocks`
- `public.messages`
- `public.conversation_state`
- `public.video_call_signals`
- `public.group_conversations`
- `public.group_conversation_members`
- `public.group_messages`
- `public.profile_details`

También incluye:
- buckets de Storage;
- metadatos de objetos de Storage.

No incluye los bytes de imágenes, audios o adjuntos guardados en Storage.

### `LIVE_SCHEMA_MANIFEST_FOR_PATRICIA.json`
Referencia técnica del esquema vivo:
- tablas;
- columnas;
- tipos;
- defaults;
- constraints;
- índices;
- RLS;
- policies;
- funciones PostgreSQL;
- triggers.

## Restauración recomendada

1. Crear un proyecto Supabase nuevo.
2. Aplicar las migraciones de `/supabase/migrations/`.
3. Comparar el esquema resultante con `LIVE_SCHEMA_MANIFEST_FOR_PATRICIA.json`.
4. Crear/configurar los buckets requeridos.
5. Actualizar `supabase-config.js`.
6. Crear cuentas nuevas.
7. Probar la plataforma sin datos históricos.
8. Importar/remapear datos históricos solo si se necesitan.

## Remapeo de IDs

Los UUID del snapshot pertenecen al proyecto original. Si las cuentas nuevas tienen otros UUID, antes de importar historial hay que transformar las referencias de:

- `profiles.id`
- `contacts.owner_id`
- `contacts.contact_id`
- `friend_requests.sender_id`
- `friend_requests.receiver_id`
- `messages.sender_id`
- `messages.recipient_id`
- `conversation_state.owner_id`
- `conversation_state.peer_id`
- `group_conversations.created_by`
- `group_conversation_members.user_id`
- `group_conversation_members.invited_by`
- `group_messages.sender_id`
- `profile_details.user_id`

## Señales de videollamada

`video_call_signals` se incluyó para que el snapshot sea fiel al estado de la base de datos. Es información efímera de signaling WebRTC y normalmente no conviene restaurarla en una instalación nueva.

## Storage

La aplicación utiliza rutas/URLs relacionadas con Storage. Si se desea conservar archivos históricos:

1. copiar los objetos de los buckets originales;
2. subirlos al proyecto nuevo;
3. actualizar las rutas o URLs de los registros históricos.

## Validación final

Comprobar con al menos dos cuentas distintas:
1. registro e inicio de sesión;
2. perfil;
3. imagen para mostrar;
4. solicitud de contacto;
5. contacto mutuo;
6. mensaje 1:1;
7. adjunto;
8. presencia;
9. unread;
10. conversación con participantes;
11. zumbido;
12. guiño;
13. videollamada;
14. acceso correcto según RLS.
