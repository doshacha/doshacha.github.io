/* ==========================================================================
   Doshacha — carrito y pedido online
   --------------------------------------------------------------------------
   Carrito persistente (localStorage), montos en USD y Bs con la tasa BCV y
   checkout por WhatsApp. La web es estática: aquí se prepara el pedido y se
   confirma con el taller; no se cobra automáticamente.
   ========================================================================== */
(function () {
  "use strict";

  const CLAVE = "doshacha-carrito-v1";
  const CLAVE_CLIENTE = "doshacha-cliente-v1";
  const MAX_ITEMS = 50;
  const MAX_CANTIDAD = 99;
  const WA_POR_DEFECTO = "584169184756";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const esc = (t) => (window.DoshachaTarjeta ? window.DoshachaTarjeta.esc(t) : String(t == null ? "" : t));
  const fmtUsd = (v) => (window.DoshachaTarjeta ? window.DoshachaTarjeta.fmtUsd(v) : "$" + Number(v).toFixed(2));
  const fmtBs = (v) => (window.DoshachaTarjeta ? window.DoshachaTarjeta.fmtBs(v) : "Bs " + Math.round(Number(v)));

  const estado = {
    items: [],
    abierto: false,
    nodo: null,
    lista: null,
    vacio: null,
    form: null,
    pie: null,
    totalUsd: null,
    totalBs: null,
    contador: null,
    boton: null,
    aviso: null,
    tmpAviso: null,
    honeypot: null
  };

  /* ------------------------------------------------------------------ datos */

  function productos() {
    return Array.isArray(window.DOSHACHA_PRODUCTOS) ? window.DOSHACHA_PRODUCTOS : [];
  }

  function buscarProducto(id) {
    return productos().find((p) => String(p.id) === String(id)) || null;
  }

  function tienePrecio(p) {
    return p && p.usd !== null && p.usd !== undefined && p.usd !== "" && !Number.isNaN(Number(p.usd));
  }

  function cargar() {
    try {
      const crudo = localStorage.getItem(CLAVE);
      if (!crudo) return;
      const datos = JSON.parse(crudo);
      if (!Array.isArray(datos)) return;

      estado.items = datos
        .filter((i) => i && i.id && tienePrecio({ usd: i.usd }))
        .slice(0, MAX_ITEMS)
        .map((i) => ({
          id: String(i.id),
          nombre: String(i.nombre || "Producto"),
          usd: Math.max(0, Number(i.usd)),
          imagen: String(i.imagen || ""),
          categoria: String(i.categoria || ""),
          cantidad: Math.min(MAX_CANTIDAD, Math.max(1, parseInt(i.cantidad, 10) || 1))
        }));
    } catch (e) {
      estado.items = [];
    }
  }

  function guardar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(estado.items));
    } catch (e) {
      /* El carrito funciona igual en memoria. */
    }
  }

  function sincronizarCatalogo() {
    const lista = productos();
    if (!lista.length) return;

    estado.items = estado.items.map((item) => {
      const actual = lista.find((p) => String(p.id) === item.id);
      if (!actual || !tienePrecio(actual)) return item;
      return {
        ...item,
        nombre: actual.nombre || item.nombre,
        usd: Math.max(0, Number(actual.usd)),
        imagen: actual.imagen || item.imagen,
        categoria: actual.categoria || item.categoria
      };
    });
  }

  function totales() {
    const usd = estado.items.reduce((suma, i) => suma + i.usd * i.cantidad, 0);
    return { usd: usd, unidades: estado.items.reduce((suma, i) => suma + i.cantidad, 0) };
  }

  /* ------------------------------------------------------------------ pintado */

  function pintar() {
    if (!estado.nodo) return;

    const total = totales();
    const hay = estado.items.length > 0;

    if (estado.contador) {
      estado.contador.textContent = total.unidades > 99 ? "99+" : String(total.unidades);
      estado.contador.hidden = total.unidades === 0;
    }

    if (estado.vacio) estado.vacio.hidden = hay;
    if (estado.form) estado.form.hidden = !hay;
    if (estado.pie) estado.pie.hidden = !hay;

    if (estado.lista) {
      estado.lista.innerHTML = estado.items
        .map((item) => (
          '<li class="cart-item" data-id="' + esc(item.id) + '">' +
            '<div class="cart-item__media">' +
              (item.imagen
                ? '<img src="' + esc(item.imagen) + '" alt="' + esc(item.nombre) + '" loading="lazy">'
                : "") +
            "</div>" +
            '<div class="cart-item__body">' +
              '<p class="cart-item__name">' + esc(item.nombre) + "</p>" +
              '<p class="cart-item__price">' + fmtUsd(item.usd) + " · " + fmtBs(item.usd) + "</p>" +
              '<div class="cart-item__row">' +
                '<div class="cart-qty" role="group" aria-label="Cantidad de ' + esc(item.nombre) + '">' +
                  '<button type="button" data-cart-op="menos" aria-label="Quitar una unidad">−</button>' +
                  '<span aria-live="polite">' + item.cantidad + "</span>" +
                  '<button type="button" data-cart-op="mas" aria-label="Añadir una unidad">+</button>' +
                "</div>" +
                '<strong class="cart-item__sub">' + fmtUsd(item.usd * item.cantidad) + "</strong>" +
              "</div>" +
            "</div>" +
            '<button class="cart-item__remove" type="button" data-cart-op="quitar" aria-label="Quitar ' + esc(item.nombre) + ' del carrito">×</button>' +
          "</li>"
        ))
        .join("");
    }

    if (estado.totalUsd) estado.totalUsd.textContent = fmtUsd(total.usd);
    if (estado.totalBs) estado.totalBs.textContent = fmtBs(total.usd);
    if (estado.boton) estado.boton.disabled = !hay;
  }

  function aviso(texto) {
    if (!estado.aviso) {
      estado.aviso = document.createElement("div");
      estado.aviso.className = "cart-toast";
      estado.aviso.setAttribute("role", "status");
      document.body.appendChild(estado.aviso);
    }

    estado.aviso.textContent = texto;
    estado.aviso.classList.add("is-visible");
    clearTimeout(estado.tmpAviso);
    estado.tmpAviso = setTimeout(() => estado.aviso.classList.remove("is-visible"), 2200);
  }

  /* ------------------------------------------------------------------ carrito */

  function agregar(id, cantidad) {
    const producto = buscarProducto(id);
    if (!producto || !tienePrecio(producto)) {
      aviso("Esta pieza se cotiza a medida. Escríbenos por WhatsApp.");
      return;
    }

    const existente = estado.items.find((i) => i.id === String(id));
    if (existente) {
      existente.cantidad = Math.min(MAX_CANTIDAD, existente.cantidad + (cantidad || 1));
    } else {
      if (estado.items.length >= MAX_ITEMS) {
        aviso("El carrito llegó al máximo de piezas. Escríbenos para un pedido grande.");
        return;
      }
      estado.items.push({
        id: String(id),
        nombre: producto.nombre || "Producto",
        usd: Math.max(0, Number(producto.usd)),
        imagen: producto.imagen || "",
        categoria: producto.categoria || "",
        cantidad: Math.min(MAX_CANTIDAD, Math.max(1, cantidad || 1))
      });
    }

    guardar();
    pintar();
    aviso("«" + (producto.nombre || "Producto") + "» está en el carrito.");
  }

  function cambiar(id, delta) {
    const item = estado.items.find((i) => i.id === String(id));
    if (!item) return;

    if (delta === 0) {
      estado.items = estado.items.filter((i) => i.id !== String(id));
      aviso("Pieza quitada del carrito.");
    } else {
      item.cantidad = Math.min(MAX_CANTIDAD, Math.max(1, item.cantidad + delta));
    }

    guardar();
    pintar();
  }

  function vaciar() {
    if (!estado.items.length) return;
    if (!window.confirm("¿Vaciar el carrito?")) return;
    estado.items = [];
    guardar();
    pintar();
    aviso("Carrito vacío.");
  }

  function abrir() {
    if (!estado.nodo) return;
    if (estado.nodo.showModal) {
      if (!estado.nodo.open) estado.nodo.showModal();
    } else {
      estado.nodo.setAttribute("open", "");
    }
    estado.abierto = true;
    document.body.classList.add("cart-open");
    pintar();
  }

  function cerrar() {
    if (!estado.nodo) return;
    if (estado.nodo.close) {
      if (estado.nodo.open) estado.nodo.close();
    } else {
      estado.nodo.removeAttribute("open");
    }
    estado.abierto = false;
    document.body.classList.remove("cart-open");
  }

  /* ------------------------------------------------------------------ checkout */

  function telefonoTienda() {
    const config = window.DOSHACHA_TIENDA || {};
    const candidatos = [config.whatsapp];

    productos().forEach((p) => {
      if (p && p.origen && p.wa) candidatos.push(p.wa);
    });

    for (const valor of candidatos) {
      if (!valor) continue;

      const enlace = String(valor).match(/wa\.me\/(\d+)/i);
      const digitos = enlace ? enlace[1] : String(valor).replace(/\D/g, "");
      if (digitos.length >= 10) {
        return digitos.startsWith("00") ? digitos.slice(2) : digitos;
      }
    }

    return WA_POR_DEFECTO;
  }

  function guardarCliente() {
    if (!estado.form) return;
    const datos = {
      nombre: $("#cartNombre") ? $("#cartNombre").value.trim() : "",
      telefono: $("#cartTelefono") ? $("#cartTelefono").value.trim() : "",
      ciudad: $("#cartCiudad") ? $("#cartCiudad").value.trim() : "",
      entrega: $("#cartEntrega") ? $("#cartEntrega").value : "",
      nota: $("#cartNota") ? $("#cartNota").value.trim() : ""
    };

    try {
      localStorage.setItem(CLAVE_CLIENTE, JSON.stringify(datos));
    } catch (e) {
      /* Sin persistencia, el pedido sigue funcionando. */
    }

    return datos;
  }

  function cargarCliente() {
    try {
      const crudo = localStorage.getItem(CLAVE_CLIENTE);
      if (!crudo) return;
      const datos = JSON.parse(crudo);
      if ($("#cartNombre")) $("#cartNombre").value = datos.nombre || "";
      if ($("#cartTelefono")) $("#cartTelefono").value = datos.telefono || "";
      if ($("#cartCiudad")) $("#cartCiudad").value = datos.ciudad || "";
      if ($("#cartEntrega") && datos.entrega) $("#cartEntrega").value = datos.entrega;
      if ($("#cartNota")) $("#cartNota").value = datos.nota || "";
    } catch (e) {
      /* Datos viejos o corruptos: se ignoran. */
    }
  }

  function mensajePedido(datos) {
    const total = totales();
    const lineas = estado.items.map((item) =>
      "• " + item.cantidad + " × " + item.nombre + " — " + fmtUsd(item.usd * item.cantidad)
    );

    const partes = [
      "Hola Doshacha, quiero hacer este pedido:",
      "",
      lineas.join("\n"),
      "",
      "Total: " + fmtUsd(total.usd) + " (" + fmtBs(total.usd) + ")",
      "",
      "Nombre: " + (datos.nombre || "—"),
      "WhatsApp: " + (datos.telefono || "—"),
      "Ciudad: " + (datos.ciudad || "—"),
      "Entrega: " + (datos.entrega || "Coordinar por WhatsApp")
    ];

    if (datos.nota) {
      partes.push("Nota: " + datos.nota);
    }

    partes.push("", "Quedo atenta a la confirmación de disponibilidad, envío y pago.");
    return partes.join("\n");
  }

  function pedir(evento) {
    evento.preventDefault();
    if (!estado.items.length) return;

    if (estado.form && !estado.form.reportValidity()) return;

    // Trampa para robots: un humano nunca llena este campo oculto.
    if (estado.honeypot && estado.honeypot.value.trim()) return;

    const datos = guardarCliente();
    const url = "https://wa.me/" + telefonoTienda() + "?text=" + encodeURIComponent(mensajePedido(datos));
    const ventana = window.open(url, "_blank");

    if (!ventana) {
      window.location.href = url;
      return;
    }

    aviso("Pedido preparado en WhatsApp. Confirma allí el pago y la entrega.");
  }

  /* ------------------------------------------------------------------ eventos */

  function enlazar() {
    document.addEventListener("click", (e) => {
      const agregarBtn = e.target.closest("[data-add-cart]");
      if (agregarBtn) {
        e.preventDefault();
        agregar(agregarBtn.dataset.addCart, 1);
        return;
      }

      const toggle = e.target.closest("[data-cart-open]");
      if (toggle) {
        e.preventDefault();
        abrir();
        return;
      }

      const cerrarBtn = e.target.closest("[data-cart-close]");
      if (cerrarBtn) {
        if (cerrarBtn.tagName !== "A") e.preventDefault();
        cerrar();
        return;
      }

      const operacion = e.target.closest("[data-cart-op]");
      if (operacion) {
        const fila = operacion.closest(".cart-item");
        if (!fila) return;
        const op = operacion.dataset.cartOp;
        if (op === "mas") cambiar(fila.dataset.id, 1);
        else if (op === "menos") cambiar(fila.dataset.id, -1);
        else if (op === "quitar") cambiar(fila.dataset.id, 0);
      }
    });

    if (estado.nodo) {
      estado.nodo.addEventListener("click", (e) => {
        if (e.target === estado.nodo) cerrar();
      });
      estado.nodo.addEventListener("close", () => {
        estado.abierto = false;
        document.body.classList.remove("cart-open");
      });
    }

    if (estado.form) estado.form.addEventListener("submit", pedir);

    const vaciarBtn = $("#cartClear");
    if (vaciarBtn) vaciarBtn.addEventListener("click", vaciar);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && estado.abierto) cerrar();
    });
  }

  function iniciar() {
    estado.nodo = $("#cartDrawer");
    estado.lista = $("#cartItems");
    estado.vacio = $("#cartEmpty");
    estado.form = $("#cartForm");
    estado.pie = $("#cartFoot");
    estado.totalUsd = $("#cartTotalUsd");
    estado.totalBs = $("#cartTotalBs");
    estado.contador = $("#cartCount");
    estado.boton = $("#cartCheckout");
    estado.honeypot = $("#cartWebsite");

    cargar();
    sincronizarCatalogo();
    cargarCliente();
    pintar();
    enlazar();
  }

  window.DoshachaCarrito = {
    agregar: agregar,
    abrir: abrir,
    cerrar: cerrar,
    vaciar: vaciar,
    refrescar: pintar,
    total: totales
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
