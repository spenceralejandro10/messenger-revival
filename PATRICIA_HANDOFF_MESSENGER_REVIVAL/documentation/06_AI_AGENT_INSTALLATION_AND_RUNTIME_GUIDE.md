# 06 — Guía para IA / Claude / agentes de desarrollo

Este documento está escrito para que una IA de desarrollo (por ejemplo Claude, ChatGPT Work u otro agente con acceso al repositorio) entienda rápidamente cómo está instalado Messenger Revival, cómo se ejecuta y qué piezas debe inspeccionar antes de modificarlo.

## 1. Qué es este proyecto

Messenger Revival es una aplicación web estática inspirada en MSN Messenger 2005.

No usa framework frontend moderno ni build system obligatorio.

Stack principal:
- HTML
- CSS
- JavaScript puro
- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Realtime
- Supabase Storage
- WebRTC

La aplicación funciona directamente en el navegador y se conecta a Supabase desde frontend.

## 2. Punto de entrada

El punto de entrada es:

`index.html`

Ese archivo contiene:
- ventana principal de contactos;
- ventana de chat;
- toolbar;
- composer;
- display rail;
- diálogos;
- CSS principales;
- scripts iniciales.

Pero atención: no todo se carga directamente desde `index.html`.

También existe carga dinámica.

## 3. Cadena real de carga

La ruta aproximada de carga es:

```
index.html
  ↓
clean-test-profile.js
  ↓
auth-bootstrap-2005.js
  ↓
Supabase SDK
supabase-config.js
profile-sync.js
presence-heartbeat-2005.js
chat-real.js
realtime-resilience-2005.js
contacts-real.js
chat-usability-hardening.js
auth-profile-hardening.js
auth-2005.js
```

Además, `index.html` carga directamente otros módulos visuales y funcionales.

Nunca asumir que un archivo "no se usa" solo porque no aparece directamente en `index.html`.

Antes de borrar algo:
1. buscar referencias del nombre del archivo;
2. buscar globals que exporta;
3. buscar listeners/eventos;
4. revisar loaders;
5. comprobar Network en navegador.

## 4. Configuración de backend

Archivo:

`supabase-config.js`

Contiene la URL pública de Supabase y la publishable key.

En una instalación nueva hay que reemplazar ambos valores por los del proyecto nuevo.

No usar claves privadas ni service_role en frontend.

## 5. Base de datos

Las migraciones versionadas están en:

`supabase/migrations/`

Pero el estado real de la base original también está documentado en:

`PATRICIA_HANDOFF_MESSENGER_REVIVAL/database/LIVE_SCHEMA_MANIFEST_FOR_PATRICIA.json`

Si las migraciones y el manifest difieren, el manifest representa la fotografía del esquema vivo al momento de la entrega.

## 6. Tablas principales

Chat directo:
- `messages`

Chat multipersona:
- `group_conversations`
- `group_conversation_members`
- `group_messages`

Usuarios/perfiles:
- `profiles`
- `profile_details`

Contactos:
- `contacts`
- `friend_requests`
- `blocks`

Estado:
- `conversation_state`

Videollamada:
- `video_call_signals`

## 7. Globals importantes

La aplicación usa varios objetos globales de coordinación.

No crear otro sistema paralelo sin comprobar primero estos objetos:

- `window.MessengerSession`
- `window.MessengerAuth`
- `window.MessengerProfileSync`
- `window.MessengerContacts`
- `window.MessengerChat`
- `window.MessengerConversationRoom`
- `window.MessengerPresence`
- `window.MessengerWinks`
- `window.MessengerNudges`
- `window.MessengerSounds`
- `window.MessengerRealtimeHealth`

## 8. Eventos globales

Se usa `CustomEvent` para comunicación entre módulos.

Eventos relevantes:

- `messenger-revival:auth-ready`
- `messenger-revival:auth-signed-out`
- `messenger-revival:profile-updated`
- `messenger-revival:unread`
- `messenger-revival:block-state`
- `messenger-revival:conversation-opened`
- `messenger-revival:friend-removed`

Una IA no debe crear un segundo bus de eventos sin necesidad.

## 9. Chat 1:1

Archivo principal:

`chat-real.js`

Responsabilidades:
- cargar conversación;
- enviar mensajes;
- recibir por Realtime;
- renderizar;
- unread;
- archivos;
- audio;
- imágenes;
- nudge;
- wink;
- bloqueo;
- limpieza de conversación;
- cleanup.

La tabla principal es `messages`.

## 10. Chat con participantes

Archivo:

`conversation-room-2005.js`

Responsabilidades:
- crear/abrir conversación con varios participantes;
- administrar miembros;
- administrar host;
- invitar;
- eliminar participantes;
- group messages;
- integración visual dentro del mismo chat.

Muy importante:
el chat directo y el chat multipersona tienen persistencia distinta.

No mezclar ambas tablas sin comprender el flujo.

## 11. Realtime

Realtime es la vía principal.

Archivo de fallback:

`realtime-resilience-2005.js`

Ese archivo solo debe consultar cuando Realtime no está sano.

No introducir polling frecuente.

Regla:
- Realtime primero;
- polling solo fallback;
- limpiar channels al cerrar sesión;
- no crear múltiples channels para la misma responsabilidad.

## 12. Presencia

Archivos:
- `presence-heartbeat-2005.js`
- `presence-2005.js`

La presencia depende de:
- status;
- last_seen_at;
- heartbeat;
- timeout de stale state.

No decidir online/offline únicamente por si existe WebSocket.

## 13. Videollamada

Loader:

`video-conversation-2005.js`

Implementación real:

`video-conversation-reliable-2005.js`

Usa:
- `RTCPeerConnection`
- `getUserMedia`
- offer/answer
- ICE
- STUN
- TURN fallback
- Supabase signaling

Tabla:
`video_call_signals`

La media de audio/video no pasa por Supabase.
Supabase solo transporta signaling.

## 14. Storage

Buckets principales:
- `display-pictures`
- `chat-attachments`

Usos:
- imágenes de perfil;
- imágenes enviadas;
- audios;
- archivos.

Si se mueve a otro Supabase, hay que recrear buckets y policies.

## 15. Instalación local

No hay build.

Servidor local recomendado:

```bash
python -m http.server 8080
```

Luego:

```
http://localhost:8080
```

Para cámara/micrófono:
- localhost funciona;
- en despliegue se necesita HTTPS.

## 16. Pruebas correctas

Para probar dos usuarios:
- usar dos navegadores;
- o incógnito + normal;
- o perfiles de navegador separados;
- o dispositivos diferentes.

No usar dos pestañas de la misma sesión si se pretende simular dos usuarios reales.

## 17. Cache busting

Muchos archivos se cargan como:

`archivo.js?v=VERSION`

Cuando se modifica un script cargado dinámicamente:
1. cambiar el archivo;
2. aumentar su versión en el loader;
3. si el loader también se cachea, aumentar la versión del loader padre.

Ejemplo:
- cambias `chat-real.js`;
- subes versión en `auth-bootstrap-2005.js`;
- si hace falta, subes versión de `auth-bootstrap-2005.js` en `clean-test-profile.js`;
- si hace falta, subes versión de `clean-test-profile.js` en `index.html`.

## 18. Archivos delicados

Antes de modificar estos, revisar dependencias:

- `chat-real.js`
- `conversation-room-2005.js`
- `realtime-resilience-2005.js`
- `contacts-real.js`
- `media-2005.js`
- `compose-toolbar-2005.js`
- `compose-toolbar-actions-2005.js`
- `chat-usability-hardening.js`
- `video-conversation-reliable-2005.js`
- `presence-heartbeat-2005.js`
- `profile-sync.js`

## 19. Riesgo de listeners duplicados

Antes de añadir listeners a:
- mensaje;
- nudge;
- emoji;
- send files;
- video;
- voice clip;

buscar listeners existentes.

El proyecto evolucionó por capas y algunos módulos pueden tocar controles similares.

Preferir consolidar antes que superponer otro handler.

## 20. Riesgo de exceso de requests

El proyecto tuvo un problema histórico de requests excesivas.

Antes de agregar polling o reload automático:
1. revisar Realtime existente;
2. revisar setInterval;
3. revisar setTimeout;
4. revisar listeners que disparan consultas;
5. mirar Network con la app quieta.

No aceptar miles de requests por minuto.

## 21. Cleanup obligatorio

Cualquier cambio que cree:
- timer;
- channel;
- MediaStream;
- RTCPeerConnection;
- Notification;
- listener temporal;

debe tener cleanup.

Cleanup esperado en:
- logout;
- cierre de llamada;
- cambio de conversación;
- cambio de usuario;
- desmontaje de estado.

## 22. Cómo modificar el proyecto de forma segura

Orden recomendado para una IA:

1. identificar exactamente el bug;
2. localizar archivo principal;
3. buscar referencias;
4. revisar runtime activo;
5. cambiar lo mínimo;
6. verificar sintaxis;
7. probar flujo relevante;
8. revisar Network;
9. hacer commit;
10. continuar.

No hacer una reescritura completa si no es necesaria.

## 23. Qué debe leer una IA antes de trabajar

Orden recomendado:

1. `PATRICIA_HANDOFF_MESSENGER_REVIVAL/README_PATRICIA.md`
2. `documentation/01_ARCHITECTURE_AND_TECH_STACK.md`
3. este documento;
4. `documentation/05_FILE_MAP_AND_MAINTENANCE.md`
5. archivo específico del bug;
6. migraciones relacionadas si toca backend.

## 24. Prioridades de mantenimiento

1. estabilidad;
2. requests razonables;
3. chat;
4. videollamada;
5. permisos;
6. cleanup;
7. refactor;
8. diseño.

## 25. Regla final para agentes IA

No asumir.

Antes de cambiar arquitectura:
- confirmar qué archivo se ejecuta;
- confirmar qué tabla usa;
- confirmar qué evento recibe;
- confirmar qué loader lo carga;
- confirmar qué cleanup existe.

Este proyecto funciona por composición de módulos históricos y modernos. La mejor estrategia es hacer cambios pequeños, trazables y verificables.
