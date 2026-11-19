/* ==========================================================================
   Doshacha — panel de productos
   Permite editar la lista, subir fotos, poner precios y descargar un paquete
   con productos.js + las imágenes listas para reemplazar en la web.
   ========================================================================== */
(function () {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const CLAVE = "doshacha-panel-v1";
  const ART_POR_DEFECTO = "assets/img/fotos/cajas.jpg";
  const WA_POR_DEFECTO = "https://wa.me/584169184756?text=Hola%20Doshacha%2C%20quiero%20cotizar.";

  const esc = (t) => (window.DoshachaTarjeta ? window.DoshachaTarjeta.esc(t) : String(t || ""));
  const clonar = (x) => JSON.parse(JSON.stringify(x));

  const estado = { productos: [], sel: null };
  let sucio = false;
  let tmpGuardado = null;
  let tmpAviso = null;

  /* ------------------------------------------------------------------ estado */

  function cargar() {
    let desdeBorrador = false;
    try {
      const crudo = localStorage.getItem(CLAVE);
      if (crudo) {
        const datos = JSON.parse(crudo);
        if (datos && Array.isArray(datos.productos) && datos.productos.length) {
          estado.productos = datos.productos;
          estado.sel = datos.sel || datos.productos[0].id;
          desdeBorrador = true;
        }
      }
    } catch (e) {
      /* borrador corrupto: se ignora */
    }
    if (!desdeBorrador) {
      estado.productos = clonar(window.DOSHACHA_PRODUCTOS || []);
      estado.sel = estado.productos[0] ? estado.productos[0].id : null;
    }
    // Si el borrador perdió la foto (por espacio), la pieza vuelve a su ilustración.
    estado.productos.forEach((p) => {
      if (p.fotoArchivo && !p.foto && p._arte) {
        p.imagen = p._arte;
        delete p.fotoArchivo;
      }
    });
  }

  function serializar(conFotos) {
    const productos = estado.productos.map((p) => {
      const copia = {};
      Object.keys(p).forEach((k) => { copia[k] = p[k]; });
      if (!conFotos) delete copia.foto;
      return copia;
    });
    return JSON.stringify({ productos: productos, sel: estado.sel });
  }

  function programarGuardado() {
    clearTimeout(tmpGuardado);
    tmpGuardado = setTimeout(() => {
      try {
        localStorage.setItem(CLAVE, serializar(true));
      } catch (e) {
        try {
          localStorage.setItem(CLAVE, serializar(false));
          aviso("Borrador guardado sin las fotos (pesan mucho). Descarga el .zip para conservarlas.");
        } catch (e2) {
          aviso("No se pudo guardar el borrador. Descarga el .zip para no perder los cambios.");
        }
      }
    }, 350);
  }

  function actual() {
    return estado.productos.find((p) => p.id === estado.sel) || null;
  }

  function marcarCambio() {
    sucio = true;
    programarGuardado();
    pintarLista();
    pintarPreview();
    pintarEstado();
  }

  /* ------------------------------------------------------------------ pintado */

  function pintarLista() {
    const lista = $("#lista");
    lista.innerHTML = estado.productos
      .map((p) => {
        const precio = p.usd === null || p.usd === undefined || p.usd === "" ? "Cotizar" : window.DoshachaTarjeta.fmtUsd(p.usd);
        const sub = esc(p.etiqueta || p.categoria || "") + " · " + precio;
        return (
          '<li class="pitem' + (p.id === estado.sel ? " is-sel" : "") + '" data-id="' + esc(p.id) + '">' +
          '<img class="pitem__thumb" src="' + esc(p.foto || p.imagen) + '" alt="">' +
          '<div class="pitem__meta"><strong>' + esc(p.nombre || "Sin nombre") + "</strong><span>" + sub + "</span></div>" +
          '<div class="pitem__ops">' +
          '<button type="button" data-op="subir" aria-label="Subir">↑</button>' +
          '<button type="button" data-op="bajar" aria-label="Bajar">↓</button>' +
          "</div></li>"
        );
      })
      .join("");
    $("#contador").textContent = estado.productos.length + (estado.productos.length === 1 ? " pieza" : " piezas");
  }

  function pintarFormulario() {
    const p = actual();
    const bloqueados = ["fNombre", "fEtiqueta", "fCategoria", "fDescripcion", "fUsd", "fNota", "fWa", "chkCatalogo", "chkRail", "btnEliminar", "btnQuitarFoto"];
    bloqueados.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.disabled = !p;
    });

    const zona = $("#zonaFoto");
    const foto = $("#fotoPreview");

    if (!p) {
      ["fNombre", "fEtiqueta", "fCategoria", "fDescripcion", "fNota", "fWa", "fUsd"].forEach((id) => { document.getElementById(id).value = ""; });
      $("#chkCatalogo").checked = false;
      $("#chkRail").checked = false;
      foto.removeAttribute("src");
      zona.classList.add("is-vacia");
      $("#fotoInfo").textContent = "Sin foto: se usa la ilustración actual.";
      return;
    }

    $("#fNombre").value = p.nombre || "";
    $("#fEtiqueta").value = p.etiqueta || "";
    $("#fCategoria").value = p.categoria || "cajas";
    $("#fDescripcion").value = p.descripcion || "";
    $("#fUsd").value = p.usd === null || p.usd === undefined ? "" : p.usd;
    $("#fNota").value = p.nota || "";
    $("#fWa").value = p.wa || "";
    $("#chkCatalogo").checked = (p.ubicaciones || []).indexOf("catalogo") !== -1;
    $("#chkRail").checked = (p.ubicaciones || []).indexOf("rail") !== -1;

    if (p.foto) {
      foto.src = p.foto;
      zona.classList.remove("is-vacia");
      $("#fotoInfo").textContent = "Foto optimizada" + (p.fotoArchivo ? " · " + p.fotoArchivo : "") + ".";
    } else {
      foto.removeAttribute("src");
      zona.classList.add("is-vacia");
      $("#fotoInfo").textContent = "Sin foto: se usa la ilustración actual.";
    }
  }

  function pintarPreview() {
    const p = actual();
    if (!p) {
      $("#preview").innerHTML = '<p class="phelp">Añade una pieza para verla aquí.</p>';
      return;
    }
    // Mientras la foto no esté publicada, la vista previa usa la copia local.
    const paraVista = {};
    Object.keys(p).forEach((k) => { paraVista[k] = p[k]; });
    paraVista.imagen = p.foto || p.imagen;
    $("#preview").innerHTML = window.DoshachaTarjeta.html(paraVista);
  }

  function pintarEstado() {
    $("#pbarDatos").textContent =
      estado.productos.length + " piezas · " + (sucio ? "cambios sin descargar" : "sin cambios");
  }

  function pintarTodo() {
    pintarLista();
    pintarFormulario();
    pintarPreview();
    pintarEstado();
  }

  function aviso(texto) {
    $("#pbarMsg").textContent = texto;
    clearTimeout(tmpAviso);
    tmpAviso = setTimeout(() => { $("#pbarMsg").textContent = ""; }, 6000);
  }

  /* ------------------------------------------------------------------ foto */

  async function cargarFoto(file) {
    if (!file || !/^image\//.test(file.type)) {
      aviso("Elige una imagen (JPG, PNG o WebP).");
      return;
    }
    if (!window.DoshachaFoto) {
      aviso("Falta cargar el optimizador de fotos (assets/js/foto.js).");
      return;
    }
    aviso("Optimizando foto…");
    try {
      const foto = await window.DoshachaFoto.preparar(file);
      const p = actual();
      if (!p) return;
      if (!p._arte) p._arte = p.imagen;
      p.foto = foto.dataUrl;
      p.fotoArchivo = p.id + "." + foto.ext;
      p.imagen = "assets/img/fotos/" + p.fotoArchivo;
      pintarFormulario();
      marcarCambio();
      aviso("Foto lista · " + Math.round(foto.bytes / 1024) + " kB (" + foto.ext + ", " + foto.ancho + "×" + foto.alto + ").");
    } catch (e) {
      aviso("No se pudo procesar la imagen: " + e.message);
    }
  }

  /* ------------------------------------------------------------------ acciones */

  function nuevoProducto() {
    const id = "pieza-" + Date.now().toString(36);
    const p = {
      id: id,
      nombre: "Pieza nueva",
      etiqueta: "Cajas",
      categoria: "cajas",
      categoriaNombre: "Cajas",
      descripcion: "",
      usd: null,
      nota: "",
      imagen: ART_POR_DEFECTO,
      wa: WA_POR_DEFECTO,
      ubicaciones: ["catalogo"],
      origen: "manual"
    };
    estado.productos.push(p);
    estado.sel = id;
    pintarTodo();
    marcarCambio();
    $("#fNombre").focus();
    $("#fNombre").select();
  }

  function eliminar() {
    const p = actual();
    if (!p) return;
    if (!confirm('¿Eliminar "' + (p.nombre || "esta pieza") + '"? Luego puedes descartar los cambios si te arrepientes.')) return;
    estado.productos = estado.productos.filter((x) => x.id !== p.id);
    estado.sel = estado.productos[0] ? estado.productos[0].id : null;
    pintarTodo();
    marcarCambio();
  }

  function mover(id, dir) {
    const i = estado.productos.findIndex((p) => p.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= estado.productos.length) return;
    const tmp = estado.productos[i];
    estado.productos[i] = estado.productos[j];
    estado.productos[j] = tmp;
    marcarCambio();
  }

  /* ------------------------------------------------------------------ exportar */

  const CABECERA =
    "/* ==========================================================================\n" +
    "   Doshacha — productos\n" +
    "   --------------------------------------------------------------------------\n" +
    "   Esta lista pinta el catálogo y el carrusel de inicio.\n" +
    "   Generado con panel.html el " + new Date().toLocaleDateString("es-VE") + ".\n" +
    "   ========================================================================== */\n";

  function generarJS() {
    const items = estado.productos.map((p) => {
      const copia = {};
      Object.keys(p).forEach((k) => {
        // La foto viaja como archivo en el .zip, no como data URL gigante.
        if (k === "foto" || k === "_arte") return;
        if (p[k] !== undefined) copia[k] = p[k];
      });

      copia.id = p.id;
      copia.nombre = p.nombre || "";
      copia.etiqueta = p.etiqueta || "";
      copia.categoria = p.categoria || "cajas";
      copia.categoriaNombre = p.categoriaNombre || p.etiqueta || p.categoria || "";
      copia.descripcion = p.descripcion || "";
      copia.usd = p.usd === null || p.usd === undefined || p.usd === "" ? null : Number(Number(p.usd).toFixed(2));
      copia.nota = p.nota || "";
      copia.imagen = p.imagen || ART_POR_DEFECTO;
      copia.wa = p.wa || WA_POR_DEFECTO;
      copia.ubicaciones = Array.isArray(p.ubicaciones) ? p.ubicaciones : ["catalogo"];

      return "  " + JSON.stringify(copia, null, 2).replace(/\n/g, "\n  ");
    });
    return CABECERA + "window.DOSHACHA_PRODUCTOS = [\n" + items.join(",\n") + "\n];\n";
  }

  function dataUrlABytes(dataUrl) {
    const base64 = dataUrl.split(",")[1] || "";
    const binario = atob(base64);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return bytes;
  }

  function textoLeeme(fotos) {
    return [
      "PAQUETE DE PRODUCTOS — DOSHACHA",
      "",
      "Este paquete reemplaza la lista de productos de la web.",
      "",
      "CÓMO USARLO",
      "1. Descomprime el .zip dentro de la carpeta doshacha-web",
      "   (debe quedar assets/js/productos.js y las fotos en assets/img/fotos/).",
      "2. Abre index.html y revisa el catálogo.",
      "3. Sube la carpeta completa a tu hosting (Netlify, Vercel o FTP).",
      "",
      "CONTENIDO",
      "- assets/js/productos.js  · lista de " + estado.productos.length + " piezas",
      "- assets/img/fotos/       · " + fotos + " foto(s) optimizadas (1000 px de ancho, 4:5)",
      "",
      "RECUERDA",
      "- Los precios en bolívares se calculan solos con la tasa oficial del BCV (assets/js/tasas.js).",
      "- No hay que actualizar tasas a mano: la web consulta el BCV y guarda la última tasa como respaldo.",
      ""
    ].join("\n");
  }

  function descargar() {
    if (!window.DoshachaZip) {
      aviso("Falta cargar el empaquetador (assets/js/zip.js).");
      return;
    }
    const archivos = [{ name: "assets/js/productos.js", data: new TextEncoder().encode(generarJS()) }];
    let fotos = 0;
    estado.productos.forEach((p) => {
      if (!p.foto || !p.fotoArchivo) return;
      archivos.push({ name: "assets/img/fotos/" + p.fotoArchivo, data: dataUrlABytes(p.foto) });
      fotos++;
    });
    archivos.push({ name: "LEEME.txt", data: new TextEncoder().encode(textoLeeme(fotos)) });

    const blob = window.DoshachaZip.store(archivos);
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(blob);
    enlace.download = "doshacha-productos-" + new Date().toISOString().slice(0, 10) + ".zip";
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(enlace.href), 5000);

    sucio = false;
    pintarEstado();
    aviso("Paquete descargado (" + archivos.length + " archivos). Descomprímelo en la carpeta de la web y vuelve a subirla.");
  }

  /* ------------------------------------------------------------------ eventos */

  function enlazar() {
    $("#btnNuevo").addEventListener("click", nuevoProducto);
    $("#btnEliminar").addEventListener("click", eliminar);
    $("#btnDescargar").addEventListener("click", descargar);

    $("#btnDescartar").addEventListener("click", () => {
      if (!confirm("¿Descartar los cambios y volver a la lista publicada en la web?")) return;
      localStorage.removeItem(CLAVE);
      cargar();
      sucio = false;
      pintarTodo();
      aviso("Cambios descartados.");
    });

    $("#lista").addEventListener("click", (e) => {
      const fila = e.target.closest(".pitem");
      if (!fila) return;
      const id = fila.dataset.id;
      const op = e.target.closest("button");
      if (op) {
        mover(id, op.dataset.op === "subir" ? -1 : 1);
        return;
      }
      estado.sel = id;
      programarGuardado();
      pintarLista();
      pintarFormulario();
      pintarPreview();
    });

    const campos = {
      fNombre: (p, v) => { p.nombre = v; },
      fEtiqueta: (p, v) => { p.etiqueta = v; p.categoriaNombre = v; },
      fCategoria: (p, v) => {
        p.categoria = v.trim();
        if (!p.categoriaNombre) p.categoriaNombre = v.trim();
      },
      fDescripcion: (p, v) => { p.descripcion = v; },
      fUsd: (p, v) => { p.usd = v === "" ? null : Number(v); },
      fNota: (p, v) => { p.nota = v; },
      fWa: (p, v) => { p.wa = v; }
    };
    Object.keys(campos).forEach((id) => {
      document.getElementById(id).addEventListener("input", (e) => {
        const p = actual();
        if (!p) return;
        campos[id](p, e.target.value);
        marcarCambio();
      });
    });

    [["chkCatalogo", "catalogo"], ["chkRail", "rail"]].forEach(([id, clave]) => {
      document.getElementById(id).addEventListener("change", (e) => {
        const p = actual();
        if (!p) return;
        p.ubicaciones = p.ubicaciones || [];
        const i = p.ubicaciones.indexOf(clave);
        if (e.target.checked && i === -1) p.ubicaciones.push(clave);
        if (!e.target.checked && i !== -1) p.ubicaciones.splice(i, 1);
        marcarCambio();
      });
    });

    const zona = $("#zonaFoto");
    const inputFoto = $("#inpFoto");
    zona.addEventListener("click", () => inputFoto.click());
    zona.addEventListener("dragover", (e) => { e.preventDefault(); zona.classList.add("is-over"); });
    zona.addEventListener("dragleave", () => zona.classList.remove("is-over"));
    zona.addEventListener("drop", (e) => {
      e.preventDefault();
      zona.classList.remove("is-over");
      if (e.dataTransfer.files[0]) cargarFoto(e.dataTransfer.files[0]);
    });
    inputFoto.addEventListener("change", (e) => {
      if (e.target.files[0]) cargarFoto(e.target.files[0]);
      e.target.value = "";
    });

    $("#btnQuitarFoto").addEventListener("click", () => {
      const p = actual();
      if (!p) return;
      p.imagen = p._arte || ART_POR_DEFECTO;
      delete p.foto;
      delete p.fotoArchivo;
      delete p._arte;
      pintarFormulario();
      marcarCambio();
    });

    $("#inpImport").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      e.target.value = "";
      if (!file) return;
      try {
        const datos = JSON.parse(await file.text());
        const lista = Array.isArray(datos) ? datos : datos.productos;
        if (!Array.isArray(lista) || !lista.length) throw new Error("formato");
        estado.productos = lista.map((p) => {
          const copia = Object.assign({}, p);
          copia.id = p.id || "pieza-" + Math.random().toString(36).slice(2, 8);
          copia.nombre = p.nombre || "";
          copia.etiqueta = p.etiqueta || "";
          copia.categoria = p.categoria || "cajas";
          copia.categoriaNombre = p.categoriaNombre || p.etiqueta || "";
          copia.descripcion = p.descripcion || "";
          copia.usd = p.usd === undefined ? null : p.usd;
          copia.nota = p.nota || "";
          copia.imagen = p.imagen || (p.fotoArchivo
            ? "assets/img/fotos/" + p.fotoArchivo
            : ART_POR_DEFECTO);
          copia.wa = p.wa || WA_POR_DEFECTO;
          copia.ubicaciones = Array.isArray(p.ubicaciones) ? p.ubicaciones : ["catalogo"];
          copia.foto = p.foto || "";
          copia.fotoArchivo = p.fotoArchivo || "";
          copia.origen = p.origen || "manual";
          return copia;
        });
        estado.sel = estado.productos[0].id;
        pintarTodo();
        marcarCambio();
        aviso("Importadas " + estado.productos.length + " piezas.");
      } catch (err) {
        aviso("El archivo no tiene el formato de productos.js.");
      }
    });

    window.addEventListener("beforeunload", (e) => {
      if (!sucio) return;
      e.preventDefault();
      e.returnValue = "";
    });
  }

  /* ------------------------------------------------------------------ arranque */

  cargar();
  enlazar();
  pintarTodo();
})();
