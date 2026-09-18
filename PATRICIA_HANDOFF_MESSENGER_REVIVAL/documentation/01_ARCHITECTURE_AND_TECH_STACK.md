# 01 — Arquitectura y tecnologías

## 1. Arquitectura general

Messenger Revival es una SPA ligera sin framework. La aplicación vive en archivos estáticos y se conecta directamente desde el navegador a Supabase.

Flujo general:

```
index.html
  ├─ CSS clásicos MSN
  ├─ scripts visuales
  ├─ clean-test-profile.js
  │   ├─ retro-surround-2005.js
  │   ├─ chat-scroll-follow-2005.js
  │   ├─ profile-notes-realtime-2005.js
  │   ├─ conversation-room-2005.js
  │   └─ auth-bootstrap-2005.js
  │       ├─ Supabase JS CDN
  │       ├─ supabase-config.js
  │       ├─ profile-sync.js
  │       ├─ presence-heartbeat-2005.js
  │       ├─ chat-real.js
  │       ├─ realtime-resilience-2005.js
  │       ├─ contacts-real.js
  │       ├─ chat-usability-hardening.js
  │       ├─ auth-profile-hardening.js
  │       └─ auth-2005.js
  └─ módulos de UI, media, perfil, video y toolbar
```

## 2. Tecnologías

### Frontend
- HTML5
- CSS3
- JavaScript ES moderno
- DOM API
- CustomEvent
- MutationObserver
- MediaRecorder
- Web Notifications API
- WebRTC
- localStorage
- Fetch API

### Backend
- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Realtime
- Supabase Storage
- PostgreSQL RLS
- RPC/functions en PostgreSQL
- triggers PostgreSQL

### Distribución
- GitHub
- GitHub Pages / hosting estático compatible
- CDN de `@supabase/supabase-js`

No hay:
- React
- Vue
- Angular
- Node runtime obligatorio
- build step obligatorio
- bundler

## 3. Estado global de runtime

Los módulos comparten estado mediante objetos globales controlados:

- `window.MessengerSession`: cliente Supabase, usuario y perfil actual.
- `window.MessengerAuth`: operaciones de sesión.
- `window.MessengerProfileSync`: sincronización del perfil.
- `window.MessengerContacts`: contactos reales y recarga.
- `window.MessengerChat`: chat persistente 1:1.
- `window.MessengerConversationRoom`: conversación con participantes.
- `window.MessengerPresence`: cálculo/actualización de presencia.
- `window.MessengerWinks`: catálogo y reproducción de guiños.
- `window.MessengerNudges`: zumbidos.
- `window.MessengerSounds`: sonidos.
- `window.MessengerRealtimeHealth`: estado de canales principales.

También se usan `CustomEvent` para desacoplar módulos.

Eventos relevantes:
- `messenger-revival:auth-ready`
- `messenger-revival:auth-signed-out`
- `messenger-revival:profile-updated`
- `messenger-revival:unread`
- `messenger-revival:block-state`
- `messenger-revival:conversation-opened`
- `messenger-revival:friend-removed`

## 4. Bootstrap

### `index.html`
Contiene:
- ventana principal de contactos;
- ventana de chat;
- dialog de display picture;
- actionbar;
- composer;
- rail de imagen/video;
- carga de CSS;
- carga inicial de scripts.

### `clean-test-profile.js`
Actúa como loader intermedio de módulos auxiliares y del bootstrap de Auth.

### `auth-bootstrap-2005.js`
Crea el shell de login/registro y carga los módulos reales conectados con Supabase.

Este encadenamiento significa que borrar un archivo aparentemente no referenciado directamente en `index.html` puede romper la aplicación si se carga dinámicamente.

## 5. Autenticación

`auth-2005.js`:
- crea el cliente Supabase;
- registra usuarios;
- inicia sesión;
- restaura sesión;
- obtiene `profiles`;
- controla remember/auto sign-in;
- dispara `auth-ready`;
- cierra sesión;
- sincroniza estado inicial.

Supabase crea la fila de `profiles` mediante trigger/function de base de datos.

## 6. Persistencia de perfil

`profile-sync.js`:
- actualiza `profiles`;
- sincroniza nombre, mensaje personal y display picture;
- sube imágenes a Storage;
- mantiene una copia local de UX;
- repinta avatars.

`profile-customizer.js`:
- tipografía;
- estilo;
- tamaño;
- color del nombre.

`personal-profile-2005.js`:
- información extendida de perfil;
- lectura del perfil de contactos;
- edición del perfil propio;
- integración con `profile_details`.

## 7. Contactos y amistad

`contacts-real.js` implementa:
- lista real de contactos;
- contactos mutuos;
- búsqueda;
- solicitudes;
- aceptar/rechazar;
- eliminar amistad;
- unread badges;
- estado online/offline;
- integración con perfiles.

UX actual:
- clic en avatar → perfil;
- clic en nombre → chat.

## 8. Chat

`chat-real.js` es el núcleo de conversación 1:1:
- tabla `messages`;
- mensajes de texto;
- imágenes;
- audio;
- archivos;
- emoji;
- nudge;
- wink;
- read state;
- clear state por usuario;
- bloqueo;
- Realtime;
- reconexión;
- render.

`realtime-resilience-2005.js` aporta fallback cuando el canal Realtime de mensajes no está disponible.

`chat-scroll-follow-2005.js` controla seguimiento del último mensaje y respeta scroll manual del usuario.

## 9. Conversaciones con participantes

`conversation-room-2005.js`:
- usa `group_conversations`;
- usa `group_conversation_members`;
- usa `group_messages`;
- administra host/administrador;
- invita contactos;
- permite retirar participantes;
- integra la conversación multipersona con la misma ventana visual de chat.

Hay dos modelos físicos de persistencia de mensajes:
- directos: `messages`;
- con participantes: `group_messages`.

Es una zona importante si en el futuro se desea unificar el modelo.

## 10. Presencia

`presence-heartbeat-2005.js`:
- heartbeat periódico;
- `last_seen_at`;
- marca offline al cerrar sesión;
- calcula stale state.

`presence-2005.js` pinta estados y controla opciones visuales.

La presencia combina:
- status explícito;
- `last_seen_at`;
- cálculo de expiración.

## 11. Videollamadas

`video-conversation-2005.js` funciona como loader.

La implementación funcional está en:
`video-conversation-reliable-2005.js`.

Tecnología:
- `RTCPeerConnection`;
- `getUserMedia`;
- audio/video tracks;
- offer;
- answer;
- ICE;
- STUN;
- TURN fallback;
- signaling mediante `video_call_signals`;
- Supabase Realtime;
- fallback controlado.

La UI reutiliza el rail lateral del chat para:
- video remoto;
- video local;
- estado;
- aceptar/rechazar/finalizar.

## 12. Storage

Buckets usados por el runtime:
- `display-pictures`;
- `chat-attachments`.

`display-pictures` contiene fotos de usuario.
`chat-attachments` contiene imágenes, audios y archivos de conversaciones.

Los assets estáticos del repositorio están en `assets/` y no dependen de Storage.

## 13. Diseño visual

La estética se divide en CSS especializados:
- `styles.css`: layout base;
- `auth-2005.css`: login;
- `window-controls.css`: comportamiento de ventanas;
- `compose-toolbar-*.css`: toolbar;
- `media-2005.css`: controles media;
- `video-conversation-2005.css`: videollamada;
- `personal-profile-2005.css`: perfiles;
- `presence-2005.css`: estados;
- `winks-2005.css`: guiños;
- otros CSS de compatibilidad visual.

## 14. Principio de seguridad

La UI no es la autoridad.

Las restricciones importantes deben vivir en:
- RLS;
- constraints;
- funciones RPC;
- validaciones contra `auth.uid()`.

Ocultar un botón solo es UX, no seguridad.

## 15. Áreas técnicas prioritarias a futuro

1. consolidar handlers históricos que hayan quedado duplicados;
2. mantener bajo el número de requests;
3. considerar unificar mensajes directos y multipersona;
4. mantener WebRTC con lifecycle explícito;
5. revisar RLS después de cada cambio de esquema;
6. eliminar compatibilidad antigua solo tras verificar referencias reales.
