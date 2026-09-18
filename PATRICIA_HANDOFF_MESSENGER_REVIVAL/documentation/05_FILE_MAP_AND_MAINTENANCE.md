# 05 — Mapa de archivos y mantenimiento

Este documento sirve para localizar rápidamente qué archivo tocar y cuáles no deben modificarse sin revisar dependencias.

## Entrada y bootstrap

### `index.html`
Estructura principal:
- ventana de contactos;
- ventana de chat;
- actionbar;
- composer;
- rail de imágenes/video;
- dialog de display picture;
- carga directa de CSS y scripts.

### `clean-test-profile.js`
Loader auxiliar. Actualmente inyecta:
- `retro-surround-2005.js`;
- `chat-scroll-follow-2005.js`;
- `profile-notes-realtime-2005.js`;
- `conversation-room-2005.js`;
- `auth-bootstrap-2005.js`.

### `auth-bootstrap-2005.js`
Bootstrap de autenticación y carga dinámica del runtime conectado a Supabase.

Carga:
- SDK Supabase;
- config;
- profile sync;
- presence heartbeat;
- chat;
- resilience;
- contacts;
- hardening;
- auth.

## Configuración

### `supabase-config.js`
Configuración pública de conexión al proyecto Supabase.

Cambiarla al migrar a otro proyecto.

## Autenticación

### `auth-2005.js`
- registro;
- login;
- logout;
- sesión;
- remembered account;
- entrada a la app;
- evento `auth-ready`.

### `auth-2005.css`
Diseño de login/registro.

### `auth-profile-hardening.js`
Hardening adicional del flujo de perfil/auth.

## Perfil

### `profile-sync.js`
Fuente principal para persistencia de perfil y display picture.

### `profile-customizer.js`
Formato del display name:
- fuente;
- color;
- tamaño;
- estilo.

### `profile-customizer.css`
UI correspondiente.

### `personal-profile-2005.js`
Perfil extendido y dialog personal.

### `personal-profile-2005.css`
Estilos del perfil.

### `display-pictures-original.js`
Selector clásico de imágenes para mostrar.

### `display-pictures-original.css`
Estilos del selector.

## Contactos

### `contacts-real.js`
Núcleo de contactos reales:
- mutual contacts;
- friend requests;
- búsqueda;
- aceptar/rechazar;
- eliminar;
- unread badges;
- lista;
- perfil vs chat.

### `contact-avatars.js`
Código histórico/demo de avatares. Antes de usarlo o eliminarlo verificar si sigue cargado o referenciado.

### `contact-avatars.css`
Estilos de avatars.

## Chat directo

### `chat-real.js`
Núcleo de mensajería 1:1:
- cargar conversación;
- insert;
- render;
- attachments;
- read;
- blocking;
- Realtime;
- cleanup.

Si se cambia formato de la tabla `messages`, este archivo casi siempre necesita actualización.

### `chat-usability-hardening.js`
Captura y refuerzo de acciones persistentes:
- submit;
- emoji;
- nudge;
- send files;
- voice.

Es una zona a vigilar por posibles handlers duplicados.

### `chat-scroll-follow-2005.js`
Seguimiento del último mensaje.

### `realtime-resilience-2005.js`
Fallback controlado cuando el canal de mensajes no está sano.

No convertirlo en polling permanente.

## Conversaciones con participantes

### `conversation-room-2005.js`
Gestiona:
- room;
- members;
- admin;
- invite;
- participant removal;
- group messages;
- integración en la misma ventana visual.

Persistencia:
- `group_conversations`;
- `group_conversation_members`;
- `group_messages`.

Zona delicada: coexistencia con `chat-real.js`.

## Emoticonos, guiños y zumbidos

### `winks-2005.js`
Catálogo y animaciones de guiños.

### `winks-2005.css`
Animación/estilos.

### `wink-sync-fix-2005.js`
Compatibilidad adicional para sincronizar wink por Realtime.

A futuro convendría consolidar esta lógica si se reestructura el chat.

### `nudge-boost.js`
Efecto visual/sonoro reforzado para zumbidos.

### `compose-toolbar-2005.js`
Comportamiento de toolbar.

### `compose-toolbar-actions-2005.js`
Acciones avanzadas/pickers/formato.

### `compose-toolbar-2005.css`
Estilos base.

### `compose-toolbar-functional-2005.css`
Estilos funcionales.

### `media-2005.js`
Toolbar multimedia y Voice Clip.

### `media-2005.css`
Estilos media.

Estos archivos se superponen históricamente en algunas responsabilidades. Cualquier limpieza debe hacerse con búsquedas de referencias y pruebas de regresión.

## Videollamada

### `video-conversation-2005.js`
Loader pequeño de la implementación actual.

### `video-conversation-reliable-2005.js`
Implementación WebRTC principal:
- invite lifecycle;
- camera/mic;
- RTCPeerConnection;
- offer;
- answer;
- ICE;
- TURN/STUN;
- Supabase signaling;
- Realtime;
- fallback;
- cleanup;
- UI de video.

### `video-conversation-2005.css`
UI de videollamada.

Al depurar video, empezar por `video-conversation-reliable-2005.js`, no por el loader.

## Presencia

### `presence-heartbeat-2005.js`
Heartbeat real y last_seen.

### `presence-2005.js`
UI y estados de presencia.

### `presence-2005.css`
Estilos.

### `profile-notes-realtime-2005.js`
Sincronización auxiliar de perfil/notas mediante Realtime.

## Ventanas y layout

### `window-controls.js`
Control de ventana:
- minimizar;
- maximizar;
- restaurar.

### `window-controls.css`
Estilos.

### `retro-surround-2005.js`
Ajustes de comportamiento/entorno visual retro.

### `conversation-toolbar-scale-2005.css`
Escalado de toolbar de conversación.

### `identity-layout-2005.css`
Layout del área de identidad.

### `titlebar-icon.css`
Icono de titlebar.

### `msn-logo-2005.css`
Logo visual.

### `service-buttons-2005.css`
Botones de servicio.

### `menus-2005.js` / `menus-2005.css`
Menús clásicos.

## Código histórico

### `app.js`
Contiene el runtime original/localStorage y varias utilidades de UI.

El proyecto evolucionó después hacia `chat-real.js`, `contacts-real.js` y Supabase. Algunas partes de `app.js` siguen participando en UI/compatibilidad.

No eliminarlo completo sin análisis de referencias.

### `contact-avatars.js`
También pertenece a etapas demo/históricas.

## Assets

### `assets/display-pictures/`
Galería de imágenes de perfil estáticas.

### `assets/emojis-msn-2005/`
Iconos de toolbar y funciones MSN.

### `assets/status-icons/`
Estados y acciones de contactos.

### `assets/community-avatars/`
Iconos de actionbar:
- invite;
- send files;
- video;
- voice;
- activities;
- games.

### `assets/ui/`
Recursos generales UI.

## CSS base

### `styles.css`
Layout general y estilo central.

### `avatar-default.css`
Avatar por defecto.

### `nicknames-2005.css`
Estilos de nombres/apodos.

## Supabase

### `supabase/migrations/`
Historial versionado de cambios de esquema.

No reescribir migraciones que ya se aplicaron en un entorno compartido. Crear una nueva migración para cambios posteriores.

## Mapa rápido: “quiero cambiar X”

| Necesidad | Archivo principal |
|---|---|
| login/registro | `auth-2005.js` |
| config Supabase | `supabase-config.js` |
| guardar perfil | `profile-sync.js` |
| perfil personal | `personal-profile-2005.js` |
| contactos | `contacts-real.js` |
| chat 1:1 | `chat-real.js` |
| fallback chat | `realtime-resilience-2005.js` |
| scroll | `chat-scroll-follow-2005.js` |
| participantes | `conversation-room-2005.js` |
| guiños | `winks-2005.js` |
| zumbido | `nudge-boost.js` |
| Voice Clip | `media-2005.js` |
| videollamada | `video-conversation-reliable-2005.js` |
| presencia | `presence-heartbeat-2005.js` |
| ventanas | `window-controls.js` |
| esquema DB | `supabase/migrations/` |

## Riesgo de handlers duplicados

Antes de añadir un listener nuevo a:
- `#messageForm`;
- `#nudgeBtn`;
- botones emoji;
- `#sendFilesBtn`;
- `#videoBtn`;
- `.voice-clip-btn`;

buscar primero listeners existentes en:
- `media-2005.js`;
- `compose-toolbar-2005.js`;
- `compose-toolbar-actions-2005.js`;
- `chat-usability-hardening.js`;
- módulos específicos.

Preferir consolidar antes que superponer otro listener.

## Riesgo de polling duplicado

Buscar:
- `setInterval`;
- `setTimeout`;
- `.from(...).select(...)`;
- `client.channel`.

Antes de añadir polling comprobar si ya existe Realtime para la misma tabla.

## Convención de cleanup

Todo módulo con runtime persistente debería poder:
- cancelar timers;
- remover channels;
- detener media;
- limpiar estado;
- ignorar eventos tardíos.

## Procedimiento recomendado para refactor

1. buscar todas las referencias del archivo/función;
2. identificar quién lo carga;
3. medir comportamiento actual;
4. cambiar una sola responsabilidad;
5. probar dos usuarios;
6. revisar network;
7. commit;
8. continuar.

## Documentos de transferencia

La carpeta `PATRICIA_HANDOFF_MESSENGER_REVIVAL/` es solo documentación y respaldo. No participa en el runtime.
