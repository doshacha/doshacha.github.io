# Doshacha — sitio web

Sitio de una sola página, estático (HTML + CSS + JavaScript sin dependencias), inspirado en la
estructura de la página de Figlia Studio y adaptado a **Doshacha**: corte, costura, diseños y
sublimación.

- **Ciudades:** Los Teques (Miranda) y El Vigía (Mérida)
- **WhatsApp Diseño:** +58 416-9184756
- **WhatsApp Costura:** +58 412-2685632
- **Instagram / TikTok:** [@\_doshacha\_](https://www.instagram.com/_doshacha_)
- **Formulario de servicio:** https://tally.so/r/rjZErL
- **Cuestionario de identidad visual:** https://tally.so/r/rj4jpv

---

## 1. Cómo ver la web

Haz doble clic en `index.html`. Funciona sin servidor.

Si quieres verla como se verá publicada (las rutas y los formularios se comportan mejor), abre una
terminal en esta carpeta y ejecuta:

```powershell
python -m http.server 5500
```

Y visita `http://localhost:5500`.

---

## 2. Cómo publicarla (gratis y en minutos)

### Opción A · Netlify Drop (la más rápida)
1. Entra a https://app.netlify.com/drop
2. Arrastra **la carpeta completa** `doshacha-web` a la página.
3. Netlify te da una URL tipo `doshacha-123.netlify.app`. Puedes conectar tu dominio después.

### Opción B · Vercel
```powershell
npx vercel --prod
```

### Opción C · GitHub Pages
1. Crea un repositorio y sube el contenido de esta carpeta.
2. Settings → Pages → Branch: `main` / carpeta `/root` → Save.

### Opción D · Hosting tradicional (Hostinger, cPanel, etc.)
Sube todos los archivos por FTP a `public_html`. El `index.html` debe quedar en la raíz.

> Cuando tengas el dominio real, cambia `<link rel="canonical" href="https://doshacha.com/">` en el
> `<head>` de `index.html` por tu URL.

---

## 3. Qué editar y dónde

Todo está en `index.html` (textos, enlaces), `assets/css/styles.css` (colores y tipografía) y
`assets/js/tasas.js` (tasas del BCV, que se actualizan solas).

| Qué quiero cambiar | Dónde |
|---|---|
| Nombre, descripción y vista previa al compartir | `<head>` de `index.html` (title, description, og:*) |
| Aviso de la barra superior (cupón) | Busca `topbar__item` |
| Titular del inicio | Busca `hero__title` |
| Textos de cada sección | Busca el comentario `<!-- ===== NOMBRE ===== -->` |
| Productos y precios del catálogo | Busca `data-cat=` (cada `<article class="pcard">`) |
| **Subir fotos y cambiar la lista de piezas** | **`panel.html`** (ver sección 6) |
| Lista de productos en crudo | `assets/js/productos.js` |
| Tasa del dólar y del euro | Se actualizan solas desde el BCV al abrir la web (y con el botón ↻) |
| Botones de WhatsApp | Busca `wa.me/584169184756` (diseño) y `wa.me/584122685632` (costura) |
| Datos de pago (PayPal, Binance, pago móvil) | Sección `id="pagos"` (busca `pay__card`) |
| Formularios Tally | Busca `data-tally=` en la sección Contacto |
| Preguntas frecuentes | Busca `faq__item` (cada `<details>`) |
| Colores | `:root` en `assets/css/styles.css` (`--clay`, `--paper`, `--ink`…) |
| Datos del negocio para Google | Bloque `<script type="application/ld+json">` |

### Cambiar los formularios de Tally
En cada pestaña de la sección Contacto hay un `data-tally` con la URL de inserción. Si creas un
formulario nuevo, reemplaza la parte final:

```
https://tally.so/embed/CODIGO?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1
```

El código es lo que aparece después de `tally.so/r/` en tu enlace público.

---

## 4. Precios en dólares y bolívares

El catálogo muestra cada precio en **USD** (base) y en **Bs** calculados con la tasa del BCV.

### Cómo se actualizan las tasas

**No hay que editar nada.** Al abrir la web, `assets/js/tasas.js` consulta el dólar y el euro
oficiales del BCV, actualiza la franja debajo del logo y recalcula todos los precios en bolívares.
La consulta se guarda en el navegador durante 30 minutos para no repetirla en cada visita.

- La franja muestra la fecha de la tasa, el estado («Tasa oficial del BCV») y un botón ↻ para
  forzar una consulta nueva.
- Si no hay conexión, se usa la última tasa guardada y el estado cambia a «Sin conexión».
- Si tampoco hay caché, se usan los valores de respaldo de `assets/js/precios.js` (el archivo que
  escribe la app al publicar). Ese archivo ya **no** es la fuente principal: solo es el respaldo.

La tasa oficial se puede verificar en https://www.bcv.org.ve.

### Lista de precios publicada

La web muestra únicamente **dólares** y **bolívares**: no aparece ninguna otra moneda.

| Pieza | USD | Bs (tasa del día) | Nota |
|---|---|---|---|
| Caja rectangular 10×15×5 | $34,00 | Bs 30.995 | pack de 25 · $1,36 c/u |
| Caja gaveta 10×15×4 | $37,25 | Bs 33.958 | pack de 25 · $1,49 c/u |
| Caja con visor 8×23×3,5 | $43,63 | Bs 39.774 | pack de 25 · $1,75 c/u |
| Stickers troquelados | $14,26 | Bs 13.000 | por paquete |
| Tarjetas de agradecimiento 10×10 | $24,24 | Bs 22.098 | pack de 100 · $0,24 c/u |

Las piezas de costura, invitaciones y kit de marca quedaron **“Cotizar”** porque dependen de medidas,
telas y cantidades: no conviene publicar un precio fijo.

> ⚠️ **Estos precios son de referencia, no tu estructura de costos.** Revísalos con tus materiales,
> tu mano de obra y tu margen antes de publicar. Para cambiarlos: en el HTML busca
> `pcard__usd` y edita el texto visible (ej. `$34,00`) y el atributo `data-usd` de la línea siguiente
> (ej. `data-usd="34"`). El monto en Bs se recalcula solo.

---

## 5. Fotos: cómo reemplazar las ilustraciones

**Por qué hay ilustraciones y no fotos:** las fotos de la página de referencia son de otra marca
(Figlia Studio) y tienen derechos de autor; usarlas como si fueran tus productos sería engañoso para
tus clientes y un riesgo legal para ti. Por eso el sitio usa ilustraciones propias de Doshacha, con
tu logo y tu paleta, y está preparado para que pongas **tus fotos** desde el panel (sección 6).

Cada pieza tiene su hueco de foto y se recorta sola a 4:5 (1000 × 1250 px), así que no tienes que
preparar los archivos a mano: subes la foto como salga del teléfono y el panel la optimiza.

Si alguna vez quieres hacerlo a mano, las fotos viven en `assets/img/fotos/` y la tarjeta apunta a
`assets/img/fotos/<nombre-de-la-pieza>.webp`.

La imagen para compartir en redes es `assets/img/og-image.jpg` (1200 × 630 px); puedes reemplazarla
manteniendo el nombre.

---

## 6. Panel para subir fotos, precios y descripciones

El sitio ya no tiene los productos escritos a mano: se pintan desde `assets/js/productos.js`.
Para editarlos sin tocar código está **`panel.html`**, una herramienta local con vista previa.

### Cómo usarlo

1. Abre **`panel.html`** (doble clic) en tu computadora.
2. Elige una pieza de la lista o pulsa **“+ Añadir”**.
3. **Foto:** arrástrala o haz clic. Se recorta a 4:5 y se comprime a WebP (o JPG si el navegador no
   soporta WebP). Si no pones foto, se queda la ilustración actual.
4. **Datos:** nombre, etiqueta (la palabra pequeña de arriba), categoría (la que filtra el catálogo),
   descripción y **precio en USD** (+ nota tipo “Pack de 25 · $1,36 c/u”). Si el precio queda vacío,
   la pieza dice “Cotizar”.
5. **Dónde aparece:** marca *Catálogo* y/o *Carrusel de inicio*. El orden de la lista es el orden en
   la web (muévelo con ↑ ↓).
6. Pulsa **“Descargar cambios (.zip)”**.
7. Descomprime el `.zip` **dentro de la carpeta de la web** (reemplaza archivos).
8. Vuelve a subir la carpeta a Netlify/Vercel/FTP. Listo.

### Qué trae el paquete

```
assets/js/productos.js      la lista completa (nombre, precio, descripción, ubicación)
assets/img/fotos/<id>.webp  solo las fotos nuevas
LEEME.txt                   recordatorio de los pasos
```

### Cosas que conviene saber

- El panel guarda un **borrador automático** en el navegador: puedes cerrar y volver. El botón
  **“Descartar”** vuelve a la lista publicada.
- El monto en **bolívares no se guarda**: se calcula al abrir la web con la tasa del BCV
  (`assets/js/tasas.js`). Si cambia el BCV, la web se actualiza sola: no hay que editar archivos.
- Los cambios no se publican solos: siempre hay que descomprimir el `.zip` y volver a subir.
- `panel.html` **no está enlazado** desde la web y no expone nada: trabaja con archivos locales.
- El catálogo de la web sigue funcionando aunque se borre `productos.js` (quedan las tarjetas de
  respaldo escritas en el HTML).

### Si prefieres editar a mano

`assets/js/productos.js` es una lista legible:

```js
{
  id: "caja-rectangular",
  nombre: "Caja rectangular 10×15×5",
  etiqueta: "Cajas",
  categoria: "cajas",
  descripcion: "Con tapa, arte externo y estampa interna opcional.",
  usd: 34,
  nota: "Pack de 25 · $1,36 c/u",
  imagen: "assets/img/art/art-cajas.svg",
  wa: "https://wa.me/584169184756?...",
  ubicaciones: ["catalogo", "rail"]
}
```

---

## 7. Formas de pago

La sección **“Tres formas de pagar”** (`id="pagos"`) muestra los métodos activos. Si cambias de cuenta,
estos son los tres puntos a editar dentro de esa sección:

| Método | Dato | Dónde |
|---|---|---|
| PayPal | `israelmarval@gmail.com` | texto de la tarjeta + atributo `data-copy` del botón |
| Binance (USDT) | UID `197073463` | texto de la tarjeta + atributo `data-copy` del botón |
| Pago móvil | pedido al `0416-9184756` | enlace `wa.me/584169184756` del botón y el número del texto |

Los botones “Copiar correo” y “Copiar UID” copian el dato al portapapeles (con respaldo para cuando la
web se abre directamente como archivo). Si algún día no quieres mostrar un método, borra su
`<article class="pay__card">` y la cuadrícula se reacomoda sola.

---

## 8. Datos que debes confirmar antes de publicar

- **Precios:** revisa la tabla de la sección 4 con tus costos reales.
- **Cupón de bienvenida:** el aviso dice “Cupón de bienvenida · ahorra en tu primer pedido”. Si no
  tienes una promoción activa, cámbialo o quítalo.
- **Mínimos:** “cajas desde 25 piezas”, “tarjetas desde 100”.
- **Tiempos de entrega:** “entre 5 y 15 días hábiles”.
- **Pagos:** “50% para iniciar y 50% al entregar”.
- **Horario:** “Lunes a viernes · 10:00 a 18:00” y “sábados: proyectos especiales”.
- **Devoluciones:** 7 días por fallas de fabricación.
- **Textos legales:** el modal “Privacidad” y “Condiciones de pedido” (al final del HTML).

---

## 9. Estructura

```
doshacha-web/
├─ index.html                 Página completa
├─ panel.html                 Panel para editar productos y subir fotos
├─ assets/
│  ├─ css/
│  │  ├─ styles.css           Sistema de diseño (tokens, componentes, responsive)
│  │  └─ panel.css            Estilos del panel
│  ├─ js/
│  │  ├─ tasas.js             Consulta automática del BCV (dólar y euro)
│  │  ├─ precios.js           Tasas de respaldo si no hay conexión
│  │  ├─ productos.js         Lista de piezas (la genera el panel)
│  │  ├─ tarjeta.js           Plantilla de la tarjeta (web + panel)
│  │  ├─ foto.js              Recorte 4:5 y compresión de fotos
│  │  ├─ zip.js               Empaquetador .zip del panel
│  │  ├─ main.js              Menú, filtros, carrusel, pestañas, precios en Bs
│  │  └─ panel.js             Lógica del panel
│  └─ img/
│     ├─ logo.png             Logotipo completo, tinta sobre transparente
│     ├─ logo-claro.png       Versión blanca para fondos oscuros
│     ├─ marca.png            Solo la cabeza del gato
│     ├─ favicon-32.png, favicon-64.png, icon-192.png, icon-512.png
│     ├─ og-image.jpg         Imagen para redes (1200 × 630)
│     ├─ art/                 Ilustraciones vectoriales de la marca
│     └─ fotos/               Fotos subidas desde el panel
├─ tools/                     Scripts auxiliares (no se publican)
└─ README.md
```

`tools/` contiene los scripts de recorte del logo, generación de productos y capturas de revisión.
**No es necesario subirlo** al hosting; puedes borrarlo sin afectar la web.

---

## 10. Detalles técnicos

- Sin frameworks ni build: se sube tal cual.
- Tipografías: Fraunces (títulos), Inter (texto) y Caveat (acentos manuscritos) desde Google Fonts.
- El catálogo se pinta desde `productos.js`; si ese archivo no carga, quedan las tarjetas de respaldo
  escritas en el HTML (la web no se queda vacía).
- Los precios en USD están en `productos.js`; el monto en Bs se recalcula al cargar con la tasa
  automática del BCV (`tasas.js`), usando `precios.js` solo como respaldo.
- Accesible: navegación por teclado, textos alternativos, foco visible, animaciones desactivadas
  si el sistema tiene “reducir movimiento”.
- Formularios con carga diferida: el iframe de Tally solo se inyecta cuando llegas a Contacto.

---

## 11. Créditos

Diseño y desarrollo: hecho a medida para Doshacha.
Referencia de estructura: [figliastudio.com.br](https://www.figliastudio.com.br/figlia-studio)
(solo estructura y criterio de secciones; textos, ilustraciones y precios fueron adaptados).
Tasa de cambio: consulta automática al [BCV](https://www.bcv.org.ve).
