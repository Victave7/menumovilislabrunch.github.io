# ISLA CONTROL — Android TCL, sin Google Sheets ni cuotas

## Qué incluye

Esta carpeta contiene **solo el código público** de la aplicación web instalable: `index.html`, `app.js`, `vault.js`, `styles.css`, `sw.js`, `manifest.webmanifest` y `icons/`.

El archivo `ISLA_COMPRAS_PRIVADO_IMPORTAR.json` es **un archivo privado independiente** y **NO está incluido aquí por seguridad**. Contiene los precios, proveedores y facturas de ISLA: **NO lo subas a GitHub, no lo incluyas en tu repositorio y no lo publiques en tu dominio**. Descárgalo aparte desde esta conversación y guárdalo en tu tablet para importarlo desde la app.

## Instalación en GitHub Pages

1. Crea o usa un repositorio de GitHub para alojar tu sitio. Si ya tienes tu dominio y una carpeta publicada, crea una carpeta llamada `isla-control` dentro de la carpeta que GitHub Pages publica.
2. Extrae **solo el ZIP público** `ISLA_CONTROL_PUBLICAR_GITHUB.zip` y copia los archivos en esa carpeta, manteniendo `index.html`, `app.js`, `vault.js`, `styles.css`, `sw.js`, `manifest.webmanifest` e `icons/` al mismo nivel que corresponde.
3. Activa GitHub Pages en `Settings → Pages` si todavía no está habilitado (por ejemplo, rama `main`, carpeta `/` si ahí están los archivos). Según tu configuración, abre la URL de la carpeta `https://tu-dominio/isla-control/` o `https://tuusuario.github.io/turepo/isla-control/`.
4. Comprueba que la web se abre mediante **HTTPS**. El cifrado requiere conexión segura en la primera visita. No basta con abrir `index.html` desde el gestor de archivos.
5. En Chrome de tu tablet TCL: abre la dirección de la aplicación → menú `⋮` → `Añadir a pantalla de inicio` o `Instalar aplicación` (el texto depende de Android).
6. Abre ISLA CONTROL; crea una **contraseña única de 12 caracteres o más** y guárdala fuera de la tablet.
7. Descarga **aparte** el archivo privado `ISLA_COMPRAS_PRIVADO_IMPORTAR.json` en la TCL. En la app entra en **Ajustes → Seleccionar archivo privado JSON** y elige ese archivo. Importará de golpe 340 líneas de compras y 4 gastos generales reales. Volver a seleccionar el mismo archivo no duplica las filas.
8. Ve a Inventario; busca `puré`, `brioche`, `matcha` y marca **Bien / Poco / Nada**. En **Editar** puedes indicar cantidad real, unidad y mínimo. Los productos comprados antes **no empiezan con un stock físico inventado**.
9. En Ajustes, **Descargar copia cifrada**; guarda la copia fuera de la TCL. Repite a menudo, especialmente al terminar cada día con cambios importantes.

## Funcionamiento

- **Inventario:** catálogo inicial de productos (las líneas de servicios y portes no se convierten en productos), nombre, proveedor, categoría, disponibilidad, conteo y umbral.
- **Por comprar:** agrupa por proveedor los productos marcados como Poco/Agotado; permite copiar la lista.
- **Compras y facturas:** conserva la información original del Excel, fechas, facturas, importes e incidencias. El importe que muestra es el **total de línea**, NO el precio de una unidad. Mantiene un aviso de posible duplicado sin eliminarlo.
- **Nueva compra:** registro manual rápido de próximas compras. Solo suma unidades a stock cuando ya tienes un conteo inicial real confirmado.
- **Operaciones:** registra mermas, tareas diarias y descuadres de efectivo introducidos manualmente.
- **Seguridad:** contraseña y cifrado de la bóveda local mediante PBKDF2-SHA256 + AES-256-GCM; la copia de seguridad también está cifrada.

## Límites importantes

- **No es una aplicación Android nativa APK:** es una PWA instalable con interfaz Android, que funciona en GitHub Pages.
- **GitHub Pages es público**: la pantalla inicial y el código son accesibles desde internet, aunque el repo sea privado. El inventario y las compras privadas importadas no se envían a GitHub; permanecen cifrados en IndexedDB dentro de ese navegador y ese origen web.
- El JSON de importación está **sin cifrar** antes de importarlo; consérvalo como un documento privado y bórralo de la carpeta Descargas si no lo necesitas, una vez confirmada la importación y creada una copia cifrada.
- Los datos **NO se sincronizan** entre móviles/tablets; el modo de trabajo es un dispositivo principal. Para uso en varios dispositivos necesitarías una base de datos y autenticación real en un servidor.
- Si borras los datos de Chrome, cambias el dominio o pierdes la tablet sin copia, no hay garantía de recuperación. Guarda copias cifradas fuera de la tablet. La misma contraseña es necesaria para restaurarlas.
- No calcula el stock físico real ni beneficios netos solo con facturas. Necesita un conteo físico inicial y registros de cambios para un control cuantitativo fiable.
- No importa automáticamente compras nuevas desde proveedores ni extrae datos de facturas PDF. Las compras históricas solicitadas se incluyen en el JSON privado para importarlas en un solo paso.

## Consejos de protección

Usa una contraseña exclusiva para ISLA CONTROL, mantén Chrome/Android actualizado, bloquea físicamente la tablet y restringe quién la usa. El cifrado local no sustituye las copias de seguridad ni protege de una persona que acceda al dispositivo mientras la sesión está desbloqueada.
