ISLA INVENTORY — MVP PWA

Contenido:
- index.html
- manifest.json
- sw.js

Funcionamiento:
- Base local en el iPhone mediante localStorage.
- Escáner mediante BarcodeDetector cuando el navegador lo expone.
- Consulta de producto por EAN a Open Food Facts.
- Alta/edición de productos.
- Stock teórico, mínimo, proveedor, coste e IVA.
- Conteo físico y registro de diferencias.

Para instalarla como app en iPhone:
1. Sube esta carpeta a un alojamiento HTTPS.
2. Abre la URL en Safari.
3. Compartir -> Añadir a pantalla de inicio.

IMPORTANTE:
Esta entrega es un MVP funcional autocontenido. La persistencia es local en el navegador. Para una versión multi-dispositivo con base de datos online, autenticación y copias de seguridad hay que añadir backend.
