# 02 — Funcionalidades y flujos de runtime

## 1. Inicio de aplicación

1. El navegador carga `index.html`.
2. Se renderiza la estructura visual clásica.
3. Se cargan scripts visuales directos.
4. `clean-test-profile.js` carga utilidades y `auth-bootstrap-2005.js`.
5. El bootstrap carga Supabase JS y los módulos conectados al backend.
6. `auth-2005.js` crea/restaura sesión.
7. Cuando hay una sesión válida se dispara `messenger-revival:auth-ready`.
8. Los módulos de contactos, presencia, chat y perfil inicializan su estado.

## 2. Registro

Flujo:
1. usuario abre registro;
2. introduce correo, nombre e imagen opcional;
3. `auth-2005.js` llama a Supabase Auth;
4. el trigger de base de datos crea `public.profiles`;
5. la imagen pendiente se termina de subir al iniciar sesión;
6. el perfil se sincroniza.

La foto de perfil puede quedar en Storage y la URL en `profiles.display_picture`.

## 3. Inicio de sesión

`auth-2005.js`:
- autentica;
- obtiene `profiles`;
- actualiza status inicial;
- rellena la UI;
- crea `window.MessengerSession`;
- emite `auth-ready`.

Los módulos posteriores dependen de ese evento.

## 4. Perfil

### Perfil propio
- nombre;
- mensaje personal;
- status;
- display picture;
- datos personales extendidos;
- formato visual del display name.

### Perfil de contacto
El avatar de la lista abre el perfil.
El nombre abre directamente el chat.

Los datos extendidos están en `profile_details`.

## 5. Solicitudes y contactos

Modelo:
- `friend_requests`: relación pendiente;
- `contacts`: contactos aceptados;
- funciones RPC mantienen la reciprocidad.

Flujo:
1. buscar usuario;
2. enviar solicitud;
3. receptor acepta o rechaza;
4. al aceptar se crea relación mutua;
5. lista de contactos se actualiza;
6. eliminar amistad afecta ambos lados mediante lógica de backend.

## 6. Presencia

El usuario tiene:
- status seleccionado;
- `last_seen_at`.

El frontend decide si una persona está realmente online combinando ambos.

Heartbeat:
- actualiza presencia periódicamente;
- no debe ejecutarse de forma agresiva;
- al salir se intenta marcar offline.

Los status soportados incluyen:
- online;
- busy;
- away;
- brb;
- phone;
- lunch;
- invisible;
- offline.

## 7. Chat directo

Persistencia principal: `messages`.

Tipos:
- `text`;
- `image`;
- `audio`;
- `file`;
- `emoji`;
- `nudge`;
- `wink`.

Campos relevantes:
- sender;
- recipient;
- body;
- format;
- attachment metadata;
- created_at;
- read_at.

### Envío de texto

1. composer captura submit;
2. obtiene formato actual;
3. `MessengerChat.sendText`;
4. inserta en Supabase;
5. render local;
6. Realtime entrega al receptor;
7. receptor marca read cuando corresponde.

### Adjuntos

1. archivo local;
2. validación de tamaño;
3. upload a `chat-attachments`;
4. ruta se guarda en `messages`;
5. para lectura se obtiene URL apropiada;
6. se renderiza según tipo.

### Clear conversation

No borra globalmente la historia. Usa `conversation_state.cleared_at` por usuario para ocultar mensajes anteriores en su vista.

## 8. Unread

El sistema consulta mensajes recibidos con `read_at IS NULL` y genera contadores por sender.

Al abrir/leer conversación:
- se ejecuta RPC de mark read;
- se actualizan badges.

## 9. Bloqueo

Tabla: `blocks`.

El usuario puede bloquear/desbloquear un contacto.
La UI cambia, pero la política efectiva debe estar respaldada por backend cuando corresponda.

## 10. Scroll

`chat-scroll-follow-2005.js` implementa la regla:

- por defecto seguir el último mensaje;
- si el usuario sube manualmente, mantener su posición;
- no confundir cambios de layout, carga de imágenes o resize con intención del usuario;
- volver a follow mode al regresar abajo.

Usa:
- MutationObserver;
- wheel;
- touch;
- keyboard;
- pointer;
- load/loadedmetadata.

## 11. Zumbido

Un zumbido se persiste como `kind='nudge'`.

Al recibir:
- se ejecuta efecto visual;
- se reproduce sonido;
- se evita doble procesamiento mediante IDs vistos.

Debe respetar cooldown para evitar spam y requests excesivos.

## 12. Guiños

Un guiño usa `kind='wink'` y body con identificador del guiño.

`winks-2005.js` mantiene catálogo y animación.
`wink-sync-fix-2005.js` refuerza sincronización entre participantes del chat directo.

La animación no debe convertirse accidentalmente en un emoji de texto.

## 13. Conversation room / participantes

Al invitar una persona adicional:
- la UI debe continuar usando la misma ventana de chat;
- se crea/usa una conversación multipersona;
- aparecen participantes;
- se define administrador;
- mensajes nuevos se envían a `group_messages`.

El historial privado previo del chat 1:1 no debe exponerse automáticamente a la persona nueva.

### Administrador

Se usa `created_by` en `group_conversations`.

El administrador:
- invita;
- elimina participantes;
- controla membership.

### Candidatos de invitación

Se obtienen mediante RPC para no confiar en una lista calculada únicamente por frontend.

## 14. Notas personales

Existe soporte para conversación consigo mismo / notas.

Se distingue mediante `is_self`.

## 15. Voice Clip

MediaRecorder captura audio.
El blob se convierte en archivo y se sube como attachment de tipo audio.

Puntos de mantenimiento:
- detener tracks;
- no dejar recorder abierto;
- limitar duración;
- manejar permisos del navegador.

## 16. Videollamada

Backend de signaling: `video_call_signals`.

Signal types:
- invite;
- accept;
- reject;
- busy;
- cancel;
- offer;
- answer;
- ice;
- end.

### Llamada saliente

1. validar contacto;
2. validar presencia;
3. crear call id;
4. enviar invite;
5. esperar accept;
6. crear RTCPeerConnection;
7. capturar media;
8. createOffer;
9. setLocalDescription;
10. enviar offer;
11. intercambiar ICE;
12. recibir answer;
13. conexión activa.

### Llamada entrante

1. Realtime recibe invite;
2. mostrar banner;
3. reproducir alerta;
4. receptor acepta o rechaza;
5. al aceptar crea PeerConnection;
6. procesa offer;
7. createAnswer;
8. intercambia ICE;
9. renderiza stream remoto.

### Finalización

Debe:
- detener tracks;
- cerrar PeerConnection;
- vaciar pending ICE;
- limpiar timers;
- limpiar UI;
- cerrar alerta;
- comunicar end/cancel según caso.

## 17. TURN/STUN

La implementación usa STUN públicos y tiene fallback TURN.

Esto es importante porque:
- WebRTC P2P puro puede fallar tras NAT/firewall;
- TURN ayuda cuando conexión directa no es posible.

Patricia debería evaluar un TURN propio o servicio gestionado si el proyecto pasa a producción.

## 18. Realtime

Canales se crean para:
- mensajes;
- perfiles;
- contactos/requests;
- conversation rooms;
- video signaling.

La regla de mantenimiento es:
- un canal por responsabilidad;
- eliminar channel al limpiar sesión o contexto;
- evitar recreaciones innecesarias;
- Realtime primero;
- fallback de polling solo cuando falla.

## 19. Fallback de mensajes

`realtime-resilience-2005.js`:
- no sondea mientras Realtime está sano;
- espera una gracia inicial;
- limita frecuencia;
- usa cursor;
- evita reprocesar IDs.

## 20. UX de ventanas

`window-controls.js` maneja comportamientos de ventanas similares a desktop:
- minimizar;
- maximizar;
- restaurar;
- posición.

Hay lógica draggable en el runtime histórico.

## 21. Assets

`assets/` contiene:
- display pictures;
- status icons;
- action icons;
- emojis/toolbar;
- iconos de ventana.

Estos son assets estáticos versionados en Git.

## 22. Funciones actualmente más delicadas para pruebas regresivas

Después de tocar runtime, probar siempre:
1. login;
2. lista de contactos;
3. clic avatar vs nombre;
4. chat 1:1;
5. mensajes simultáneos;
6. scroll;
7. adjuntos;
8. nudge;
9. wink;
10. invitación de participante;
11. eliminar participante;
12. presence;
13. video call;
14. refresh de ambas sesiones.
