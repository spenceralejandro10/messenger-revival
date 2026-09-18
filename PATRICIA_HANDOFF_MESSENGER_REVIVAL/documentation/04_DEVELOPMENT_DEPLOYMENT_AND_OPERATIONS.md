# 04 — Desarrollo, despliegue y operación

## 1. Requisitos locales

No existe build obligatorio.

Se necesita:
- navegador moderno;
- servidor HTTP estático;
- proyecto Supabase configurado;
- dos o más cuentas para pruebas multiusuario.

Para WebRTC:
- usar HTTPS o localhost;
- permitir cámara/micrófono;
- probar idealmente en dos dispositivos/redes.

## 2. Ejecución local

Ejemplo con Python:

```bash
python -m http.server 8080
```

Abrir:

```
http://localhost:8080
```

No se recomienda trabajar abriendo `index.html` como `file://` para funciones de media/realtime.

## 3. Configuración de Supabase

Editar:
`supabase-config.js`

Cambiar la URL y publishable key al proyecto de Patricia.

El frontend usa el SDK Supabase cargado desde CDN.

## 4. Preparación del backend

1. crear proyecto Supabase;
2. aplicar migraciones;
3. verificar contra manifest vivo;
4. crear/configurar buckets;
5. confirmar RLS;
6. confirmar Realtime de tablas necesarias;
7. crear cuentas de prueba.

## 5. Despliegue

La aplicación es compatible con hosting estático:
- GitHub Pages;
- Netlify;
- Vercel estático;
- Hostinger;
- servidor web tradicional.

No requiere backend Node propio para el funcionamiento actual.

## 6. GitHub Pages

El repositorio actual se ha usado como sitio estático.

Al moverlo:
1. importar repo;
2. configurar Pages sobre la rama deseada;
3. esperar deployment;
4. comprobar que rutas de assets son relativas;
5. revisar consola de navegador por 404.

## 7. Cache busting

Muchos scripts se cargan con:

`archivo.js?v=...`

Al modificar módulos cargados dinámicamente puede ser necesario aumentar el query parameter de versión para evitar cache vieja del navegador.

Ejemplo:
`chat-real.js?v=20260918-2`

También revisar el loader padre.

## 8. Carga dinámica

No asumir que un script eliminado de `index.html` deja de ejecutarse.

Revisar:
- `clean-test-profile.js`;
- `auth-bootstrap-2005.js`;
- loaders especializados como video.

Antes de borrar:
1. buscar nombre del archivo;
2. buscar variables globales que exporta;
3. buscar eventos/listeners;
4. verificar network panel.

## 9. Prueba multiusuario

No probar chat usando dos pestañas con una sola sesión si se necesita simular dos usuarios.

Usar:
- dos perfiles de navegador;
- incógnito + normal;
- dos navegadores;
- dos dispositivos.

Esto evita compartir localStorage/session de forma accidental.

## 10. Matriz mínima de regresión

### Auth
- registro;
- confirmación;
- login;
- auto sign-in;
- cambio de cuenta;
- logout.

### Perfil
- nombre;
- personal message;
- status;
- foto;
- datos personales;
- estilo de nombre.

### Contactos
- buscar;
- solicitar;
- aceptar;
- rechazar;
- eliminar;
- avatar → perfil;
- nombre → chat.

### Chat
- texto;
- formato;
- emoji;
- nudge;
- wink;
- imagen;
- archivo;
- audio;
- unread;
- clear chat;
- bloqueo;
- refresh.

### Conversación multipersona
- invitar;
- mismo chat visual;
- administrador;
- participantes;
- mensajes;
- eliminar participante.

### Presence
- online;
- away;
- busy;
- offline;
- stale timeout.

### Video
- invite;
- accept;
- reject;
- cancel;
- end;
- cámara local;
- cámara remota;
- audio;
- pérdida temporal de red.

## 11. Herramientas de diagnóstico del navegador

### Console
Buscar:
- excepciones JS;
- errores Supabase;
- errores WebRTC;
- errores de media;
- archivos 404.

### Network
Observar:
- número de requests;
- loops;
- Realtime websocket;
- uploads;
- signed URL;
- polling.

### Application
Revisar:
- localStorage;
- sesión;
- cache.

### WebRTC internals
Chrome:
`chrome://webrtc-internals/`

Útil para:
- ICE;
- candidate pairs;
- codecs;
- connection state;
- estadísticas RTP.

## 12. Control de requests

El proyecto tuvo una etapa con demasiadas solicitudes.

Regla actual:
- Realtime primero;
- polling únicamente fallback;
- polling de mensajes no debe ejecutarse mientras Realtime está sano;
- presencia tiene heartbeat separado;
- evitar setInterval redundantes.

Al modificar:
1. dejar aplicación quieta unos minutos;
2. medir network;
3. confirmar que no hay cientos/miles de requests;
4. confirmar que no se crean channels repetidos.

## 13. Cleanup

Todo módulo con recursos persistentes debe tener cleanup.

Revisar:
- `setInterval`;
- `setTimeout`;
- Realtime channels;
- MediaRecorder;
- MediaStream tracks;
- RTCPeerConnection;
- Notifications;
- DOM temporales.

Cleanup debe ejecutarse:
- logout;
- cierre de conversación si aplica;
- final de llamada;
- cambio de contexto.

## 14. WebRTC

Puntos de diagnóstico:
- `getUserMedia` funciona;
- tracks añadidos al peer;
- offer enviada;
- answer recibida;
- ICE candidate exchange;
- remoteDescription aplicada;
- ICE pendiente vaciada;
- connectionState.

Un frame negro puede significar:
- no llegó track;
- autoplay;
- camera permission;
- candidate pair sin conexión;
- remote stream no asignado.

## 15. TURN

La implementación actual tiene fallback TURN además de STUN.

Para un entorno serio conviene:
- TURN estable;
- credenciales temporales controladas;
- métricas;
- límites de uso.

No depender eternamente de un relay público de demostración.

## 16. Seguridad operativa

Después de modificar base de datos:
- revisar RLS;
- probar con cuenta no autorizada;
- revisar policies;
- evitar lógica de permisos exclusivamente en frontend.

## 17. Estrategia de commits

Preferido:
- un bug por commit;
- mensaje descriptivo;
- push frecuente;
- no mezclar rediseño visual con cambio de backend;
- no acumular refactor grande sin pruebas.

Ejemplos:
- `fix: stabilize realtime message delivery`
- `fix: clean video call lifecycle`
- `perf: reduce redundant polling`
- `security: harden conversation membership`

## 18. Antes de entregar una versión

1. syntax check;
2. abrir página;
3. login;
4. chat dos usuarios;
5. revisar consola;
6. revisar network;
7. probar mobile/desktop si hubo CSS;
8. probar refresh;
9. comprobar último commit;
10. confirmar que configuración apunta al ambiente correcto.
